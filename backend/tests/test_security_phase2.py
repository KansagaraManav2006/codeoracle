import io
import os
import shutil
import time
import uuid
import zipfile
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.auth import (
    SESSION_COOKIE_NAME,
    create_user_session,
    delete_user_session,
    cleanup_expired_sessions,
    hash_password,
    hash_session_token,
)
from app.api.rate_limiter import limiter
from app.config import settings
from app.database import Base, get_db
from app.ingestion.discovery import IngestionError
from app.ingestion.github_ingest import validate_github_url, normalize_github_url
from app.ingestion.workspace import delete_project_workspace_and_records, get_workspace_dir
from app.ingestion.zip_ingest import extract_zip_safely, validate_zip_stream
from app.main import app
from app.models.db import (
    Job,
    JobState,
    Project,
    ProjectAnalysisRecord,
    ProjectFile,
    ProjectRefactorRecord,
    ProjectTestRecord,
    User,
    UserSession,
)

# Test Database setup
SQLALCHEMY_DATABASE_URL = "sqlite://"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_security_test():
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    limiter.reset()
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=test_engine)
    limiter.reset()


client = TestClient(app)


def _create_user(email: str = "security@example.com") -> tuple[str, str]:
    db = TestingSessionLocal()
    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    user = User(
        id=user_id,
        email=email,
        hashed_password=hash_password("SuperSecretPass123!"),
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    raw_token = create_user_session(db, user_id)
    db.close()
    return user_id, raw_token


# ==============================================================================
# 1. Session Security & Token Hashing at Rest
# ==============================================================================

def test_session_tokens_are_hashed_at_rest():
    """Verify raw session token is NEVER stored in plaintext in the database."""
    user_id, raw_token = _create_user("hash_check@example.com")
    db = TestingSessionLocal()
    session_row = db.query(UserSession).filter(UserSession.user_id == user_id).first()
    assert session_row is not None
    # Token in database must NOT equal raw_token
    assert session_row.token != raw_token
    # Token in database must equal SHA-256 hash
    expected_hash = hash_session_token(raw_token)
    assert session_row.token == expected_hash
    db.close()


def test_session_revocation_and_expiration():
    """Verify session deletion immediately invalidates access, and expired sessions are pruned."""
    user_id, raw_token = _create_user("expiry_check@example.com")
    client.cookies.set(SESSION_COOKIE_NAME, raw_token)

    # 1. Valid session accesses /api/auth/me
    resp = client.get("/api/auth/me")
    assert resp.status_code == 200
    assert resp.json()["email"] == "expiry_check@example.com"

    # 2. Invalidate session
    db = TestingSessionLocal()
    delete_user_session(db, raw_token)
    db.close()

    resp_after = client.get("/api/auth/me")
    assert resp_after.status_code == 401

    # 3. Test expired session cleanup
    user2_id, raw_token2 = _create_user("stale@example.com")
    db = TestingSessionLocal()
    s = db.query(UserSession).filter(UserSession.user_id == user2_id).first()
    s.expires_at = datetime.now(timezone.utc) - timedelta(days=1)
    db.commit()

    pruned = cleanup_expired_sessions(db)
    assert pruned >= 1
    assert db.query(UserSession).filter(UserSession.user_id == user2_id).first() is None
    db.close()



# ==============================================================================
# 2. Security Headers & CSRF Protection
# ==============================================================================

def test_security_headers_present_on_responses():
    """Verify standard defense-in-depth security headers are attached to responses."""
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.headers.get("X-Content-Type-Options") == "nosniff"
    assert resp.headers.get("X-Frame-Options") == "DENY"
    assert resp.headers.get("Referrer-Policy") == "strict-origin-when-cross-origin"
    assert "Content-Security-Policy" in resp.headers


def test_csrf_blocks_unauthorized_cross_site_cookie_mutation():
    """Verify cross-site state-changing cookie requests are blocked."""
    user, raw_token = _create_user("csrf_test@example.com")
    client.cookies.set(SESSION_COOKIE_NAME, raw_token)

    # Cross-site origin attempt
    headers = {
        "Origin": "https://malicious-site.com",
        "Sec-Fetch-Site": "cross-site",
    }
    resp = client.post("/api/auth/logout", headers=headers)
    assert resp.status_code == 403
    assert "CSRF" in resp.json()["detail"] or "Origin validation" in resp.json()["detail"]

    # Legitimate origin attempt succeeds
    good_headers = {
        "Origin": "http://localhost:5173",
        "Sec-Fetch-Site": "same-site",
    }
    good_resp = client.post("/api/auth/logout", headers=good_headers)
    assert good_resp.status_code == 200


# ==============================================================================
# 3. Malicious ZIP Extraction & Cleanup Protections
# ==============================================================================

def test_zip_slip_and_dir_cleanup(tmp_path):
    """Verify Zip Slip path traversal is blocked and target directory is cleaned up."""
    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(zip_bytes, "w") as zf:
        zf.writestr("../../etc/passwd", "root:x:0:0")
    zip_bytes.seek(0)

    target_dir = tmp_path / "ws_slip"
    target_dir.mkdir(parents=True, exist_ok=True)
    temp_zip = tmp_path / "slip.zip"
    temp_zip.write_bytes(zip_bytes.getvalue())

    with pytest.raises(IngestionError) as exc_info:
        extract_zip_safely(temp_zip, target_dir)

    assert exc_info.value.code == "PATH_TRAVERSAL"
    # Target directory must have been wiped on failure
    assert not target_dir.exists()


def test_zip_symlink_rejection(tmp_path):
    """Verify symlink archive entries are rejected and target directory is purged."""
    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(zip_bytes, "w") as zf:
        zinfo = zipfile.ZipInfo("symlink_entry")
        zinfo.create_system = 3  # Unix
        zinfo.external_attr = 0o120777 << 16  # S_IFLNK
        zf.writestr(zinfo, "/etc/passwd")
    zip_bytes.seek(0)

    target_dir = tmp_path / "ws_sym"
    target_dir.mkdir(parents=True, exist_ok=True)
    temp_zip = tmp_path / "sym.zip"
    temp_zip.write_bytes(zip_bytes.getvalue())

    with pytest.raises(IngestionError) as exc_info:
        extract_zip_safely(temp_zip, target_dir)

    assert exc_info.value.code == "SYMLINK_NOT_ALLOWED"
    assert not target_dir.exists()


# ==============================================================================
# 4. GitHub Ingestion URL & Protocol Validation
# ==============================================================================

def test_github_url_strict_https_and_sanitization():
    """Verify only https://github.com URLs are accepted and credentials/fragments are rejected."""
    # Valid
    assert validate_github_url("https://github.com/octocat/Hello-World") == "https://github.com/octocat/Hello-World.git"

    # Credentials rejected
    with pytest.raises(IngestionError) as exc_cred:
        validate_github_url("https://user:pass@github.com/octocat/Hello-World")
    assert exc_cred.value.code == "INVALID_GITHUB_URL"

    # Non-HTTPS rejected
    with pytest.raises(IngestionError) as exc_proto:
        validate_github_url("git://github.com/octocat/Hello-World")
    assert exc_proto.value.code == "INVALID_GITHUB_URL"

    # Query strings rejected
    with pytest.raises(IngestionError) as exc_query:
        validate_github_url("https://github.com/octocat/Hello-World?foo=bar")
    assert exc_query.value.code == "INVALID_GITHUB_URL"


# ==============================================================================
# 5. Rate Limiting Verification
# ==============================================================================

def test_auth_rate_limiting_triggers_429():
    """Verify rapid repeated login attempts trigger HTTP 429 Too Many Requests."""
    for i in range(15):
        resp = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
        assert resp.status_code == 401

    # 16th attempt breaches limit (15 req/60s)
    blocked_resp = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "wrong"})
    assert blocked_resp.status_code == 429
    assert "Retry-After" in blocked_resp.headers
    assert "Rate limit exceeded" in blocked_resp.json()["detail"]


# ==============================================================================
# 6. Project Deletion & Workspace Data Lifecycle
# ==============================================================================

def test_project_deletion_lifecycle_and_ownership(tmp_path, monkeypatch):
    """Verify project owner can delete workspace and cascade DB deletion, while unauthorized users are blocked."""
    user1_id, token1 = _create_user("owner@example.com")
    user2_id, token2 = _create_user("intruder@example.com")

    ws_dir = tmp_path / "workspaces" / "ws_del_test"
    ws_dir.mkdir(parents=True, exist_ok=True)
    (ws_dir / "app.py").write_text("print('test')", encoding="utf-8")
    monkeypatch.setattr("app.ingestion.workspace.get_workspace_dir", lambda _: ws_dir)

    db = TestingSessionLocal()
    proj = Project(
        id="proj_delete_me",
        user_id=user1_id,
        display_name="Deletable",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=1,
        content_hash="delhash",
        workspace_id="ws_del_test",
        is_public_demo=0,
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.add(ProjectFile(id="pf_del", project_id=proj.id, relative_path="app.py", language="python", size_bytes=10, line_count=1, sha256_hash="h"))
    db.add(Job(id="job_del", user_id=user1_id, state=JobState.COMPLETED, stage="Done", source_type="analysis", project_id=proj.id))
    db.commit()

    # 1. Intruder attempt to delete owner's project -> 403 Forbidden
    client.cookies.set(SESSION_COOKIE_NAME, token2)
    resp_unauth = client.delete(f"/api/projects/{proj.id}")
    assert resp_unauth.status_code == 403

    # Workspace directory must still exist
    assert ws_dir.exists()

    # 2. Legitimate owner deletes project -> 200 OK
    client.cookies.set(SESSION_COOKIE_NAME, token1)
    resp_owner = client.delete(f"/api/projects/{proj.id}")
    assert resp_owner.status_code == 200

    # Physical workspace must be deleted
    assert not ws_dir.exists()

    # Database records must be cascaded and removed
    assert db.query(Project).filter(Project.id == proj.id).first() is None
    assert db.query(ProjectFile).filter(ProjectFile.project_id == proj.id).first() is None
    assert db.query(Job).filter(Job.project_id == proj.id).first() is None
    db.close()


def test_public_demo_cannot_be_deleted():
    """Verify public demo projects cannot be deleted even by authenticated users."""
    user_id, token = _create_user("demo_deleter@example.com")
    db = TestingSessionLocal()
    demo_proj = Project(
        id="proj_demo_permanent",
        display_name="Public Demo",
        source_type="zip",
        content_hash="demohash",
        workspace_id="ws_demo_perm",
        is_public_demo=1,
        created_at=datetime.now(timezone.utc),
    )
    db.add(demo_proj)
    db.commit()

    client.cookies.set(SESSION_COOKIE_NAME, token)
    resp = client.delete(f"/api/projects/{demo_proj.id}")
    assert resp.status_code == 403
    assert "not authorized" in resp.json()["detail"].lower() or "public demo" in resp.json()["detail"].lower()
    db.close()


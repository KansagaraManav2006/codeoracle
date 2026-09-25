import io
import uuid
import zipfile
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.db import Job, JobState, Project, User
from app.api.auth import create_user_session, hash_password

SQLALCHEMY_DATABASE_URL = "sqlite://"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    with patch("app.ingestion.service.SessionLocal", TestingSessionLocal), patch("app.database.SessionLocal", TestingSessionLocal):
        yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


client = TestClient(app)


def _create_user(email: str) -> tuple[str, str]:
    db = TestingSessionLocal()
    try:
        user_id = f"usr_{uuid.uuid4().hex[:10]}"
        user = User(
            id=user_id,
            email=email,
            hashed_password=hash_password("ValidPassword123!"),
            created_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        token = create_user_session(db, user_id)
        return user_id, token
    finally:
        db.close()


def test_guest_cannot_submit_zip_or_github():
    """Requirement 2: Unauthenticated guests MUST be rejected with HTTP 401 on upload/github."""
    client.cookies.clear()

    # 1. ZIP upload rejection
    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(zip_bytes, "w") as zf:
        zf.writestr("test.py", "x = 1\n")
    zip_bytes.seek(0)

    zip_resp = client.post("/api/jobs/upload", files={"file": ("test.zip", zip_bytes, "application/zip")})
    assert zip_resp.status_code == 401
    assert "sign in" in zip_resp.json().get("detail", "").lower()

    # 2. GitHub submission rejection
    git_resp = client.post("/api/jobs/github", json={"github_url": "https://github.com/octocat/Hello-World"})
    assert git_resp.status_code == 401
    assert "sign in" in git_resp.json().get("detail", "").lower()


def test_guest_sees_only_public_demos():
    """Requirement 3: Guests see only bundled demos, never private projects."""
    client.cookies.clear()
    user_id, user_token = _create_user("owner@example.com")

    db = TestingSessionLocal()
    try:
        # Create a private project
        priv_id = f"proj_priv_{uuid.uuid4().hex[:8]}"
        priv_proj = Project(
            id=priv_id,
            user_id=user_id,
            is_public_demo=0,
            display_name="Confidential Internal Repo",
            source_type="zip",
            total_files=5,
            total_lines=150,
            content_hash="h1",
            workspace_id=f"ws_{uuid.uuid4().hex[:8]}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(priv_proj)

        # Create a public demo project
        demo_id = f"proj_demo_{uuid.uuid4().hex[:8]}"
        demo_proj = Project(
            id=demo_id,
            user_id=None,
            is_public_demo=1,
            display_name="FastAPI Demo Specimen",
            source_type="demo_benchmark",
            total_files=8,
            total_lines=420,
            content_hash="h2",
            workspace_id=f"ws_{uuid.uuid4().hex[:8]}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(demo_proj)
        db.commit()

        # Guest queries recent projects
        guest_resp = client.get("/api/projects")
        assert guest_resp.status_code == 200
        guest_projects = guest_resp.json().get("projects", [])
        assert len(guest_projects) == 1
        assert guest_projects[0]["project_id"] == demo_id
        assert guest_projects[0]["display_name"] == "FastAPI Demo Specimen"

        # Guest cannot access private project directly
        guest_access = client.get(f"/api/projects/{priv_id}")
        assert guest_access.status_code == 404

        # Signed-in user queries recent projects
        client.cookies.set("codeoracle_session", user_token)
        user_resp = client.get("/api/projects")
        assert user_resp.status_code == 200
        user_projects = user_resp.json().get("projects", [])
        assert len(user_projects) == 1
        assert user_projects[0]["project_id"] == priv_id

        # Signed in user CAN access their private project
        user_access = client.get(f"/api/projects/{priv_id}")
        assert user_access.status_code == 200

        # Dedicated demo catalog returns demo projects
        demo_cat = client.get("/api/demo/projects")
        assert demo_cat.status_code == 200
        demos = demo_cat.json().get("projects", [])
        assert any(d["project_id"] == demo_id for d in demos)
    finally:
        db.close()


def test_cross_user_isolation_for_jobs_and_projects():
    """Requirement 3: Complete cross-user isolation for projects and jobs."""
    user_a_id, token_a = _create_user("user_a@example.com")
    user_b_id, token_b = _create_user("user_b@example.com")

    db = TestingSessionLocal()
    try:
        proj_a_id = f"proj_a_{uuid.uuid4().hex[:8]}"
        proj_a = Project(
            id=proj_a_id,
            user_id=user_a_id,
            is_public_demo=0,
            display_name="User A Secret Repo",
            source_type="zip",
            total_files=3,
            total_lines=90,
            content_hash="hash_a",
            workspace_id=f"ws_{uuid.uuid4().hex[:8]}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(proj_a)

        job_a_id = f"job_a_{uuid.uuid4().hex[:8]}"
        job_a = Job(
            id=job_a_id,
            user_id=user_a_id,
            project_id=proj_a_id,
            state=JobState.COMPLETED,
            stage="Completed",
            progress_percentage=100,
            source_type="zip",
            created_at=datetime.now(timezone.utc),
        )
        db.add(job_a)
        db.commit()

        # User A can inspect own job and project
        client.cookies.set("codeoracle_session", token_a)
        assert client.get(f"/api/projects/{proj_a_id}").status_code == 200
        assert client.get(f"/api/jobs/{job_a_id}").status_code == 200

        # User B cannot access User A's project (404) or job (404)
        client.cookies.set("codeoracle_session", token_b)
        assert client.get(f"/api/projects/{proj_a_id}").status_code == 404
        assert client.get(f"/api/jobs/{job_a_id}").status_code == 404

        # Anonymous user cannot access User A's project or job
        client.cookies.clear()
        assert client.get(f"/api/projects/{proj_a_id}").status_code == 404
        assert client.get(f"/api/jobs/{job_a_id}").status_code == 404
    finally:
        db.close()


def test_google_oauth_pending_configuration_behavior(monkeypatch):
    """Requirement 6: Google status returns configured=False and login returns 503 until configured."""
    from app.config import settings
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", None)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", None)
    client.cookies.clear()

    # Check status endpoint
    status_resp = client.get("/api/auth/google/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["configured"] is False
    assert "not configured" in data["message"].lower()

    # Attempting login without credentials returns 503 rather than broken redirect
    login_resp = client.get("/api/auth/google/login")
    assert login_resp.status_code == 503
    assert "not configured" in login_resp.json()["detail"].lower()


def test_google_oauth_configured_behavior(monkeypatch):
    """Requirement 6b: Google status returns configured=True and login returns 307 redirect with state cookie when configured."""
    from app.config import settings
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "fake-test-client-id.apps.googleusercontent.com")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "fake-test-client-secret-12345")
    client.cookies.clear()

    # Check status endpoint
    status_resp = client.get("/api/auth/google/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["configured"] is True
    assert "configured" in data["message"].lower()

    # Attempting login with credentials returns 307 redirect with state cookie
    login_resp = client.get("/api/auth/google/login?redirect_url=/workspace", follow_redirects=False)
    assert login_resp.status_code == 307
    location = login_resp.headers.get("location", "")
    assert "accounts.google.com/o/oauth2/v2/auth" in location
    assert "client_id=fake-test-client-id.apps.googleusercontent.com" in location
    # Verify protected state cookie is set
    assert "codeoracle_oauth_state" in login_resp.cookies


def test_cookie_security_policy(monkeypatch):
    """Requirement 2: Environment-aware cookie security policy."""
    from app.config import settings

    # 1. Explicit override to False
    monkeypatch.setattr(settings, "SESSION_COOKIE_SECURE", False)
    assert settings.is_cookie_secure is False

    # 2. Explicit override to True
    monkeypatch.setattr(settings, "SESSION_COOKIE_SECURE", True)
    assert settings.is_cookie_secure is True

    # 3. None with production environment defaults to True
    monkeypatch.setattr(settings, "SESSION_COOKIE_SECURE", None)
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert settings.is_cookie_secure is True

    # 4. None with https frontend defaults to True
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://codeoracle.example.com")
    assert settings.is_cookie_secure is True

    # 5. None with development environment and http defaults to False
    monkeypatch.setattr(settings, "FRONTEND_URL", "http://localhost:5173")
    assert settings.is_cookie_secure is False


def test_job_state_contract_completed_and_failed():
    """Requirement 1: Source of truth is backend job state, not 100% alone."""
    user_id, token = _create_user("analyst@example.com")
    client.cookies.set("codeoracle_session", token)

    db = TestingSessionLocal()
    try:
        # Completed job has state 'completed' and valid project_id
        job_comp_id = f"job_comp_{uuid.uuid4().hex[:8]}"
        job_comp = Job(
            id=job_comp_id,
            user_id=user_id,
            project_id=f"proj_res_{uuid.uuid4().hex[:8]}",
            state=JobState.COMPLETED,
            stage="Completed",
            progress_percentage=100,
            source_type="github",
            created_at=datetime.now(timezone.utc),
        )
        db.add(job_comp)

        # In-progress job at 100% (e.g. finalizing) is NOT completed
        job_fin_id = f"job_fin_{uuid.uuid4().hex[:8]}"
        job_fin = Job(
            id=job_fin_id,
            user_id=user_id,
            project_id=None,
            state=JobState.GENERATING,
            stage="Finalizing Architecture",
            progress_percentage=100,
            source_type="github",
            created_at=datetime.now(timezone.utc),
        )
        db.add(job_fin)

        # Failed job with error information
        job_fail_id = f"job_fail_{uuid.uuid4().hex[:8]}"
        job_fail = Job(
            id=job_fail_id,
            user_id=user_id,
            state=JobState.FAILED,
            stage="Failed",
            progress_percentage=45,
            source_type="github",
            error_code="CLONE_FAILED",
            error_message="Repository not found or private.",
            created_at=datetime.now(timezone.utc),
        )
        db.add(job_fail)
        db.commit()

        # Completed job check
        r_comp = client.get(f"/api/jobs/{job_comp_id}")
        assert r_comp.status_code == 200
        assert r_comp.json()["state"] == "completed"
        assert r_comp.json()["project_id"] is not None

        # Finalizing job check (100% but not completed)
        r_fin = client.get(f"/api/jobs/{job_fin_id}")
        assert r_fin.status_code == 200
        assert r_fin.json()["state"] == "generating"  # State is source of truth, not 100%

        # Failed job check
        r_fail = client.get(f"/api/jobs/{job_fail_id}")
        assert r_fail.status_code == 200
        assert r_fail.json()["state"] == "failed"
        assert r_fail.json()["error_code"] == "CLONE_FAILED"
        assert "Repository not found" in r_fail.json()["error_message"]
    finally:
        db.close()

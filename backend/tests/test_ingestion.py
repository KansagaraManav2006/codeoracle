import io
import os
import shutil
import subprocess
import tempfile
import time
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import settings
from app.database import Base, get_db
from app.main import app, get_static_dir
from app.models.db import Job, JobState, Project, ProjectFile
from app.ingestion.discovery import IngestionError, discover_source_files
from app.ingestion.github_ingest import clone_github_repository, extract_repo_display_name, validate_github_url
from app.ingestion.service import process_github_job, process_zip_job, recover_interrupted_jobs
from app.ingestion.zip_ingest import extract_zip_safely, validate_zip_stream

# Test Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_ingestion.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    # Patch background worker SessionLocal to use test DB session factory
    with patch("app.ingestion.service.SessionLocal", TestingSessionLocal), patch("app.database.SessionLocal", TestingSessionLocal):
        yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists("./test_ingestion.db"):
        try:
            os.remove("./test_ingestion.db")
        except Exception:
            pass


client = TestClient(app)


# --- 1. Valid ZIP Upload ---
def test_01_valid_zip_upload(tmp_path):
    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(zip_bytes, "w") as zf:
        zf.writestr("app.py", "print('hello world')\n")
    zip_bytes.seek(0)

    response = client.post("/api/jobs/upload", files={"file": ("test.zip", zip_bytes, "application/zip")})
    assert response.status_code == 202
    data = response.json()
    assert data["state"] in ["queued", "extracting", "completed"]
    assert "job_id" in data


# --- 2. Valid ZIP with Nested Safe Directories ---
def test_02_valid_zip_nested_dirs(tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "nested.zip"

    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("src/utils/helpers.py", "def add(a, b):\n    return a + b\n")
        zf.writestr("src/index.js", "console.log('hi');\n")

    extract_zip_safely(zip_path, target)
    res = discover_source_files(target)
    assert res.total_files == 2
    assert set(res.detected_languages) == {"python", "javascript"}


# --- 3. Non-ZIP Upload ---
def test_03_non_zip_upload():
    response = client.post(
        "/api/jobs/upload",
        files={"file": ("test.txt", b"plain text content", "text/plain")},
    )
    assert response.status_code == 400


# --- 4. Oversized Compressed Upload ---
def test_04_oversized_compressed_upload(tmp_path):
    large_stream = io.BytesIO(b"A" * (settings.MAX_ZIP_COMPRESSED_BYTES + 1024))
    temp_zip = tmp_path / "oversized.zip"
    with pytest.raises(IngestionError) as exc:
        validate_zip_stream(large_stream, temp_zip)
    assert exc.value.code == "OVERSIZED_ZIP"


# --- 5. Excessive Uncompressed Size ---
@patch("zipfile.ZipFile")
def test_05_excessive_uncompressed_size(mock_zipfile_cls, tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "bomb.zip"

    # Build mocked entries whose total exceeds the configured extracted-size limit.
    mock_entries = []
    entry_size = min(settings.MAX_FILE_BYTES, 20 * 1024 * 1024)
    entry_count = (settings.MAX_ZIP_UNCOMPRESSED_BYTES // entry_size) + 1
    for i in range(entry_count):
        zinfo = MagicMock()
        zinfo.flag_bits = 0
        zinfo.file_size = entry_size
        zinfo.compress_size = entry_size
        zinfo.external_attr = 0o100644 << 16
        zinfo.filename = f"file_{i}.txt"
        zinfo.is_dir.return_value = False
        mock_entries.append(zinfo)

    mock_zf = MagicMock()
    mock_zf.infolist.return_value = mock_entries
    mock_zf.open.return_value.__enter__.return_value.read.return_value = b""
    mock_zipfile_cls.return_value.__enter__.return_value = mock_zf

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "EXCESSIVE_UNCOMPRESSED_SIZE"



# --- 6. Excessive Archive Entry Count ---
def test_06_excessive_archive_entry_count(tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "many.zip"

    with zipfile.ZipFile(zip_path, "w") as zf:
        for i in range(settings.MAX_ZIP_ENTRIES + 5):
            zf.writestr(f"file_{i}.txt", "data\n")

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "EXCESSIVE_ENTRIES"


# --- 7. Excessive Compression Ratio ---
def test_07_excessive_compression_ratio(tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "high_ratio.zip"

    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("zeroes.txt", b"0" * (2 * 1024 * 1024))

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "EXCESSIVE_COMPRESSION_RATIO"


# --- 8. ../ Zip Slip Path Traversal ---
def test_08_zip_slip_dotdot_path(tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "zip_slip.zip"

    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("../escaped.py", "print('bad')\n")

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "PATH_TRAVERSAL"


# --- 9. Absolute Path Entry ---
def test_09_zip_absolute_path_entry(tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "abs.zip"

    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("/etc/passwd", "root:x:0:0\n")

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "PATH_TRAVERSAL"


# --- 10. Windows Drive-Letter Path Entry ---
def test_10_zip_drive_letter_path_entry(tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "drive.zip"

    with zipfile.ZipFile(zip_path, "w") as zf:
        zf.writestr("C:/Windows/System32/bad.dll", "bad")

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "PATH_TRAVERSAL"


# --- 11. Symlink Archive Entry ---
def test_11_symlink_archive_entry(tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "symlink.zip"

    with zipfile.ZipFile(zip_path, "w") as zf:
        zinfo = zipfile.ZipInfo("symlink_file")
        zinfo.external_attr = 0o120755 << 16  # S_IFLNK
        zf.writestr(zinfo, "target_file.txt")

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "SYMLINK_NOT_ALLOWED"


# --- 12. Encrypted Archive Handling ---
@patch("zipfile.ZipFile")
def test_12_encrypted_archive(mock_zipfile_cls, tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "encrypted.zip"

    mock_zinfo = MagicMock()
    mock_zinfo.flag_bits = 0x1
    mock_zinfo.filename = "secret.txt"

    mock_zf = MagicMock()
    mock_zf.infolist.return_value = [mock_zinfo]
    mock_zipfile_cls.return_value.__enter__.return_value = mock_zf

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "ENCRYPTED_ZIP"


# --- 13. Relevant File Discovery ---
def test_13_relevant_file_discovery(tmp_path):
    (tmp_path / "main.py").write_text("print('hello')", encoding="utf-8")
    (tmp_path / "app.jsx").write_text("export default () => <div/>;", encoding="utf-8")
    res = discover_source_files(tmp_path)
    assert res.total_files == 2
    assert set(res.detected_languages) == {"python", "javascript"}


# --- 14. Ignored Directory Filtering ---
def test_14_ignored_directory_filtering(tmp_path):
    (tmp_path / "main.py").write_text("print('ok')", encoding="utf-8")
    nm = tmp_path / "node_modules" / "express"
    nm.mkdir(parents=True)
    (nm / "index.js").write_text("module.exports = {};", encoding="utf-8")

    git_dir = tmp_path / ".git"
    git_dir.mkdir()
    (git_dir / "hook.js").write_text("console.log()", encoding="utf-8")

    res = discover_source_files(tmp_path)
    assert res.total_files == 1
    assert res.files[0].relative_path == "main.py"


# --- 15. Binary File Filtering ---
def test_15_binary_file_filtering(tmp_path):
    (tmp_path / "valid.py").write_text("print('hi')", encoding="utf-8")
    (tmp_path / "binary.py").write_bytes(b"\x00\x01\x02\x03\x04")

    res = discover_source_files(tmp_path)
    assert res.total_files == 1
    assert res.files[0].relative_path == "valid.py"


# --- 16. Minified JavaScript Filtering ---
def test_16_minified_javascript_filtering(tmp_path):
    (tmp_path / "app.js").write_text("console.log('hi');\n", encoding="utf-8")
    (tmp_path / "bundle.min.js").write_text("function a(){return 1}", encoding="utf-8")
    long_line = "var a=" + "1," * 1000 + "2;"
    (tmp_path / "vendor.js").write_text(long_line, encoding="utf-8")

    res = discover_source_files(tmp_path)
    assert res.total_files == 1
    assert res.files[0].relative_path == "app.js"


# --- 17. Exact configured-line acceptance boundary ---
def test_17_configured_line_acceptance_boundary(tmp_path):
    lines = ["print('line')\n"] * settings.MAX_RELEVANT_LINES
    (tmp_path / "exact_limit.py").write_text("".join(lines), encoding="utf-8")

    res = discover_source_files(tmp_path)
    assert res.total_lines == settings.MAX_RELEVANT_LINES


# --- 18. Over-configured-line rejection ---
def test_18_over_configured_line_rejection(tmp_path):
    lines = ["print('line')\n"] * (settings.MAX_RELEVANT_LINES + 1)
    (tmp_path / "huge.py").write_text("".join(lines), encoding="utf-8")

    with pytest.raises(IngestionError) as exc:
        discover_source_files(tmp_path)
    assert exc.value.code == "EXCEEDED_LINE_LIMIT"


# --- 19. Valid GitHub URL Normalization ---
def test_19_valid_github_url_normalization():
    url = "https://github.com/octocat/Hello-World"
    clean = validate_github_url(url)
    assert clean == "https://github.com/octocat/Hello-World.git"


# --- 20. Invalid Scheme ---
def test_20_invalid_github_scheme():
    with pytest.raises(IngestionError) as exc:
        validate_github_url("http://github.com/octocat/Hello-World")
    assert exc.value.code == "INVALID_GITHUB_URL"


# --- 21. Invalid Host ---
def test_21_invalid_github_host():
    with pytest.raises(IngestionError) as exc:
        validate_github_url("https://gitlab.com/octocat/Hello-World")
    assert exc.value.code == "INVALID_GITHUB_URL"


# --- 22. URL Credentials ---
def test_22_github_url_credentials():
    with pytest.raises(IngestionError) as exc:
        validate_github_url("https://user:pass@github.com/octocat/Hello-World")
    assert exc.value.code == "INVALID_GITHUB_URL"


# --- 23. URL Query / Fragment Rejection ---
def test_23_github_url_query_fragment():
    with pytest.raises(IngestionError) as exc:
        validate_github_url("https://github.com/octocat/Hello-World?tab=readme")
    assert exc.value.code == "INVALID_GITHUB_URL"


# --- 24. Clone Timeout Mocked Subprocess ---
@patch("subprocess.run")
def test_24_clone_timeout(mock_run, tmp_path):
    mock_run.side_effect = subprocess.TimeoutExpired(cmd=["git"], timeout=settings.CLONE_TIMEOUT_SECONDS)
    with pytest.raises(IngestionError) as exc:
        clone_github_repository("https://github.com/octocat/Hello-World.git", tmp_path)
    assert exc.value.code == "CLONE_TIMEOUT"


# --- 25. Clone Failure Sanitization ---
@patch("subprocess.run")
def test_25_clone_failure_sanitization(mock_run, tmp_path):
    mock_run.return_value = MagicMock(
        returncode=128,
        stderr=f"fatal: repository '{tmp_path}/secret_repo' not found with secret_token=12345",
    )
    with pytest.raises(IngestionError) as exc:
        clone_github_repository("https://github.com/octocat/Hello-World.git", tmp_path)
    assert exc.value.code == "GITHUB_CLONE_FAILED"
    assert str(tmp_path) not in exc.value.message
    assert "secret_token" not in exc.value.message


# --- 26. Job State Transitions & Mocked GitHub Clone ---
@patch("app.ingestion.service.clone_github_repository")
def test_26_job_state_transitions(mock_clone):
    response = client.post("/api/jobs/github", json={"repository_url": "https://github.com/octocat/Hello-World"})
    assert response.status_code == 202
    job_id = response.json()["job_id"]

    res_poll = client.get(f"/api/jobs/{job_id}")
    assert res_poll.status_code == 200
    assert res_poll.json()["state"] in ["queued", "extracting", "completed", "failed"]


# --- 27. Interrupted Job Recovery ---
def test_27_interrupted_job_recovery():
    db = TestingSessionLocal()
    stuck_job = Job(
        id="job_stuck",
        state=JobState.EXTRACTING,
        stage="Extracting...",
        progress_percentage=25,
        source_type="zip",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(stuck_job)
    db.commit()

    recovered_count = recover_interrupted_jobs(db)
    assert recovered_count >= 1

    job_refreshed = db.query(Job).filter(Job.id == "job_stuck").first()
    assert job_refreshed.state == JobState.FAILED
    assert job_refreshed.error_code == "INTERRUPTED"
    db.close()


# --- 28. Project Metadata Endpoint ---
def test_28_project_metadata_endpoint():
    db = TestingSessionLocal()
    proj = Project(
        id="proj_123",
        display_name="TestProj",
        source_type="zip",
        source_url=None,
        detected_languages=["python"],
        total_files=5,
        total_lines=120,
        content_hash="hash123",
        workspace_id="ws_123",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.commit()
    db.close()

    res = client.get("/api/projects/proj_123")
    assert res.status_code == 200
    data = res.json()
    assert data["display_name"] == "TestProj"
    assert data["total_lines"] == 120


# --- 29. File Inventory Endpoint ---
def test_29_file_inventory_endpoint():
    db = TestingSessionLocal()
    proj = Project(
        id="proj_456",
        display_name="TestProj2",
        source_type="github",
        detected_languages=["python"],
        total_files=1,
        total_lines=10,
        content_hash="hash456",
        workspace_id="ws_456",
        created_at=datetime.now(timezone.utc),
    )
    pfile = ProjectFile(
        id="file_1",
        project_id="proj_456",
        relative_path="main.py",
        language="python",
        size_bytes=100,
        line_count=10,
        sha256_hash="abc",
    )
    db.add(proj)
    db.add(pfile)
    db.commit()
    db.close()

    res = client.get("/api/projects/proj_456/files")
    assert res.status_code == 200
    data = res.json()
    assert data["total_files"] == 1
    assert data["files"][0]["relative_path"] == "main.py"


# --- 30. No Absolute Workspace Paths in API Responses ---
def test_30_no_absolute_paths_in_api():
    db = TestingSessionLocal()
    proj = Project(
        id="proj_789",
        display_name="SecretPathProj",
        source_type="zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=5,
        content_hash="hash789",
        workspace_id="ws_secret_123",
        created_at=datetime.now(timezone.utc),
    )
    db.add(proj)
    db.commit()

    res_meta = client.get("/api/projects/proj_789")
    meta_json = res_meta.text
    assert "workspace_id" not in meta_json
    assert "workspaces" not in meta_json
    assert "F:\\" not in meta_json
    assert "/home/" not in meta_json
    db.close()


# --- 31. API Fallback 404 Regression Test ---
def test_31_api_fallback_404():
    res = client.get("/api/definitely-missing")
    assert res.status_code == 404
    data = res.json()
    assert data["detail"] == "API route not found"


# --- 32. Oversized Individual File Entry Rejection ---
@patch("zipfile.ZipFile")
def test_32_oversized_individual_file_entry(mock_zipfile_cls, tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "big_entry.zip"

    mock_zinfo = MagicMock()
    mock_zinfo.flag_bits = 0
    mock_zinfo.file_size = settings.MAX_FILE_BYTES + 100
    mock_zinfo.compress_size = 100
    mock_zinfo.external_attr = 0o100644 << 16
    mock_zinfo.filename = "huge_file.py"
    mock_zinfo.is_dir.return_value = False

    mock_zf = MagicMock()
    mock_zf.infolist.return_value = [mock_zinfo]
    mock_zipfile_cls.return_value.__enter__.return_value = mock_zf

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "FILE_TOO_LARGE"


# --- 33. Unsupported Special Entry Rejection ---
@patch("zipfile.ZipFile")
def test_33_unsupported_special_entry(mock_zipfile_cls, tmp_path):
    target = tmp_path / "target"
    zip_path = tmp_path / "special.zip"

    mock_zinfo = MagicMock()
    mock_zinfo.flag_bits = 0
    mock_zinfo.file_size = 100
    mock_zinfo.compress_size = 50
    mock_zinfo.external_attr = 0o010644 << 16  # S_IFIFO FIFO pipe
    mock_zinfo.filename = "fifo_file"
    mock_zinfo.is_dir.return_value = False

    mock_zf = MagicMock()
    mock_zf.infolist.return_value = [mock_zinfo]
    mock_zipfile_cls.return_value.__enter__.return_value = mock_zf

    with pytest.raises(IngestionError) as exc:
        extract_zip_safely(zip_path, target)
    assert exc.value.code == "UNSUPPORTED_ENTRY_TYPE"


# --- 34. Repository Display Name Extraction (audit suffix test) ---
def test_34_repo_display_name_audit_suffix():
    assert extract_repo_display_name("https://github.com/owner/smart-contract-audit.git") == "smart-contract-audit"
    assert extract_repo_display_name("https://github.com/owner/audit.git") == "audit"
    assert extract_repo_display_name("https://github.com/owner/audit") == "audit"


# --- 35. Deterministic ProjectFile IDs & Content Hash ---
def test_35_deterministic_identities(tmp_path):
    (tmp_path / "main.py").write_text("print('test')", encoding="utf-8")
    (tmp_path / "sub" / "helper.js").parent.mkdir(parents=True)
    (tmp_path / "sub" / "helper.js").write_text("console.log('hi')", encoding="utf-8")

    res1 = discover_source_files(tmp_path)
    res2 = discover_source_files(tmp_path)

    assert res1.content_hash == res2.content_hash

    # Check distinct paths produce distinct project content hashes even if file contents are identical
    tmp_path2 = tmp_path.parent / "tmp2"
    tmp_path2.mkdir(exist_ok=True)
    (tmp_path2 / "different_name.py").write_text("print('test')", encoding="utf-8")
    res3 = discover_source_files(tmp_path2)

    assert res1.content_hash != res3.content_hash
    shutil.rmtree(tmp_path2, ignore_errors=True)


# --- 36. Poll Valid ZIP Job to Completion & Verify Metadata & Inventory ---
def test_36_poll_zip_job_to_completion(tmp_path):
    zip_bytes = io.BytesIO()
    with zipfile.ZipFile(zip_bytes, "w") as zf:
        zf.writestr("app/server.py", "def run(): pass\n")
        zf.writestr("static/app.js", "console.log('run');\n")
    zip_bytes.seek(0)

    res_up = client.post("/api/jobs/upload", files={"file": ("full_demo.zip", zip_bytes, "application/zip")})
    assert res_up.status_code == 202
    job_id = res_up.json()["job_id"]

    completed = False
    project_id = None
    for _ in range(20):
        time.sleep(0.1)
        res_poll = client.get(f"/api/jobs/{job_id}")
        assert res_poll.status_code == 200
        pdata = res_poll.json()
        if pdata["state"] == "completed":
            completed = True
            project_id = pdata["project_id"]
            break

    assert completed is True
    assert project_id is not None

    # Fetch Project Metadata
    res_meta = client.get(f"/api/projects/{project_id}")
    assert res_meta.status_code == 200
    mdata = res_meta.json()
    assert mdata["display_name"] in ("full_demo", "full_demo.zip")
    assert mdata["total_files"] == 2
    assert set(mdata["detected_languages"]) == {"javascript", "python"}

    # Fetch File Inventory
    res_files = client.get(f"/api/projects/{project_id}/files")
    assert res_files.status_code == 200
    fdata = res_files.json()
    assert fdata["total_files"] == 2
    paths = [f["relative_path"] for f in fdata["files"]]
    assert "app/server.py" in paths
    assert "static/app.js" in paths


# --- 37. Static Directory Resolution Test (Simulating Docker Layout) ---
def test_37_static_dir_resolution_simulation(tmp_path):
    mock_docker_static = tmp_path / "app" / "static"
    mock_docker_static.mkdir(parents=True)
    (mock_docker_static / "index.html").write_text("<html>Docker App</html>")

    with patch.object(settings, "STATIC_DIR", str(mock_docker_static)):
        resolved = get_static_dir()
        assert resolved == mock_docker_static.resolve()


# --- 38. Error Sanitization Verification ---
@patch("app.ingestion.service.discover_source_files")
def test_38_error_sanitization(mock_discover, tmp_path):
    # Simulate an unhandled internal exception containing sensitive local paths & tokens
    mock_discover.side_effect = RuntimeError("Internal crash at F:\\GDC\\secret\\config.py with token secret_token=999")

    ws_id = "ws_test_sanitization"
    raw_dir = tmp_path / ws_id / "raw"
    raw_dir.mkdir(parents=True)
    (raw_dir / "test.py").write_text("print('test')")

    db = TestingSessionLocal()
    job = Job(
        id="job_sanitize_test",
        state=JobState.QUEUED,
        stage="Queued",
        progress_percentage=0,
        source_type="zip",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(job)
    db.commit()
    db.close()

    temp_zip = tmp_path / "temp.zip"
    with zipfile.ZipFile(temp_zip, "w") as zf:
        zf.writestr("test.py", "print('test')")

    process_zip_job("job_sanitize_test", ws_id, temp_zip, "demo.zip")

    db2 = TestingSessionLocal()
    job_db = db2.query(Job).filter(Job.id == "job_sanitize_test").first()
    assert job_db.state == JobState.FAILED
    assert job_db.error_code == "INTERNAL_ERROR"
    assert "F:\\GDC\\secret" not in job_db.error_message
    assert "secret_token" not in job_db.error_message
    assert job_db.error_message == "An unexpected error occurred while processing the repository."
    db2.close()

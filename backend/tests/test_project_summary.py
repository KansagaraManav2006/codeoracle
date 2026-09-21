import pytest
from datetime import datetime, timezone
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db
from app.models.db import Project, ProjectAnalysisRecord, ProjectFile
from app.ingestion.github_ingest import normalize_github_url


from sqlalchemy.pool import StaticPool

# In-memory SQLite for testing
TEST_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DATABASE_URL,
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


app.dependency_overrides[get_db] = override_get_db
client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)


def test_normalize_github_url():
    # Accidental spaces
    assert normalize_github_url("   https://github.com/owner/repo   ") == "https://github.com/owner/repo"
    # Query parameters
    assert normalize_github_url("https://github.com/owner/repo?tab=readme&foo=bar") == "https://github.com/owner/repo"
    # Fragments
    assert normalize_github_url("https://github.com/owner/repo#section-1") == "https://github.com/owner/repo"
    # Duplicate .git suffixes
    assert normalize_github_url("https://github.com/owner/repo.git.git") == "https://github.com/owner/repo"
    # Valid normal repo
    assert normalize_github_url("https://github.com/owner/my-cool_repo") == "https://github.com/owner/my-cool_repo"
    # Empty or None
    assert normalize_github_url("") == ""
    assert normalize_github_url(None) == ""


def test_project_summary_endpoint():
    db = TestingSessionLocal()
    proj_id = "proj_summary_test"
    project = Project(
        id=proj_id,
        display_name="Inventory-Optimization-Platform",
        source_type="github",
        source_url="https://github.com/acme/Inventory-Optimization-Platform.git",
        detected_languages=["python", "typescript", "javascript"],
        total_files=3,
        total_lines=1500,
        content_hash="hash_123",
        workspace_id="ws_123",
        created_at=datetime.now(timezone.utc),
    )
    db.add(project)

    f1 = ProjectFile(
        id="f1",
        project_id=proj_id,
        relative_path="backend/main.py",
        language="python",
        size_bytes=1000,
        line_count=800,
        sha256_hash="h1",
    )
    f2 = ProjectFile(
        id="f2",
        project_id=proj_id,
        relative_path="frontend/App.tsx",
        language="typescript",
        size_bytes=800,
        line_count=650,
        sha256_hash="h2",
    )
    f3 = ProjectFile(
        id="f3",
        project_id=proj_id,
        relative_path="scripts/util.js",
        language="javascript",
        size_bytes=100,
        line_count=50,
        sha256_hash="h3",
    )
    db.add_all([f1, f2, f3])

    # Add analysis record with 1 partial, 2 complete
    analysis_record = ProjectAnalysisRecord(
        id="analysis_rec_1",
        project_id=proj_id,
        analyzer_version="1.1.0",
        content_hash="hash_123",
        analysis_data={
            "modules": [
                {"relative_path": "backend/main.py", "language": "python", "parse_status": "complete", "parse_errors": []},
                {"relative_path": "frontend/App.tsx", "language": "typescript", "parse_status": "partial", "parse_errors": ["syntax fallback"]},
                {"relative_path": "scripts/util.js", "language": "javascript", "parse_status": "complete", "parse_errors": []},
            ]
        },
        created_at=datetime.now(timezone.utc),
    )
    db.add(analysis_record)
    db.commit()
    db.close()

    response = client.get(f"/api/projects/{proj_id}/summary")
    assert response.status_code == 200
    data = response.json()

    assert data["project_id"] == proj_id
    assert data["display_name"] == "Inventory-Optimization-Platform"
    assert data["repository"]["owner"] == "acme"
    assert data["repository"]["name"] == "Inventory-Optimization-Platform"

    assert data["totals"]["source_files"] == 3
    assert data["totals"]["loc"] == 1500

    # Check canonical languages
    langs = {l["language"]: l["loc"] for l in data["languages"]}
    assert langs["Python"] == 800
    assert langs["Typescript"] == 650
    assert langs["Javascript"] == 50

    # Check parse coverage: 2 fully parsed out of 3 = 66.7%
    assert data["parse_coverage"]["fully_parsed"] == 2
    assert data["parse_coverage"]["partial"] == 1
    assert data["parse_coverage"]["unsupported"] == 0
    assert data["parse_coverage"]["failed"] == 0
    assert data["parse_coverage"]["full_ast_percentage"] == 66.7

    # Check warnings
    assert len(data["warnings"]) == 1
    assert "1 files were not fully parsed" in data["warnings"][0]

    # Check files list enriched with parse badges
    res_files = client.get(f"/api/projects/{proj_id}/files")
    assert res_files.status_code == 200
    files_data = res_files.json()["files"]
    f_map = {f["relative_path"]: f for f in files_data}

    assert f_map["backend/main.py"]["parse_badge"] == "FULL AST"
    assert f_map["backend/main.py"]["parser"] == "Python AST"
    assert f_map["backend/main.py"]["confidence"] == "High"

    assert f_map["frontend/App.tsx"]["parse_badge"] == "PARTIAL"
    assert f_map["frontend/App.tsx"]["parser"] == "Tree-sitter TypeScript"
    assert f_map["frontend/App.tsx"]["parse_reason"] == "syntax fallback"
    assert f_map["frontend/App.tsx"]["confidence"] == "Medium"

from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.analysis.models import (
    ComplexitySummary,
    DependencyEdge,
    ModuleAnalysis,
    ProjectAnalysis,
    WarningInfo,
    generate_module_id,
)
from app.database import Base, get_db
from app.main import app
from app.migration.service import build_migration_plan, migration_plan_markdown
from app.models.db import Project, ProjectAnalysisRecord


engine = create_engine(
    "sqlite://",
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
def setup_database():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    project_id = "proj_migration"
    module_a = generate_module_id(project_id, "app.py")
    module_b = generate_module_id(project_id, "core.py")
    module_c = generate_module_id(project_id, "helper.py")
    analysis = ProjectAnalysis(
        project_id=project_id,
        content_hash="migration_hash",
        languages=["python"],
        total_files=3,
        total_lines=120,
        modules=[
            ModuleAnalysis(module_id=module_a, relative_path="app.py", language="python", line_count=40, parse_status="complete", is_entry_point=True),
            ModuleAnalysis(
                module_id=module_b,
                relative_path="core.py",
                language="python",
                line_count=60,
                parse_status="complete",
                complexity=ComplexitySummary(cyclomatic_complexity=18, rating="high", hotspots_count=2),
                legacy_warnings=[WarningInfo(code="BARE_EXCEPT", message="Catch a specific exception.", line=12, severity="warning")],
            ),
            ModuleAnalysis(module_id=module_c, relative_path="helper.py", language="python", line_count=20, parse_status="complete"),
        ],
        dependency_edges=[
            DependencyEdge(edge_id="edge_a_b", source_module_id=module_a, target_module_id=module_b, type="import", resolved=True, source_line=1),
            DependencyEdge(edge_id="edge_c_b", source_module_id=module_c, target_module_id=module_b, type="import", resolved=True, source_line=1),
        ],
        entry_points=[module_a],
        parse_success_count=3,
    )
    db.add(Project(
        id=project_id,
        display_name="Migration Sample",
        source_type="zip",
        detected_languages=["python"],
        total_files=3,
        total_lines=120,
        content_hash="migration_hash",
        workspace_id="ws_migration",
        created_at=datetime.now(timezone.utc),
    ))
    db.add(ProjectAnalysisRecord(
        id="analysis_migration",
        project_id=project_id,
        analyzer_version=analysis.analyzer_version,
        content_hash="migration_hash",
        analysis_data=analysis.model_dump(mode="json"),
    ))
    db.commit()
    db.close()
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_plan_scores_and_blast_radius():
    db = TestingSessionLocal()
    plan = build_migration_plan(db, "proj_migration")
    db.close()
    assert 0 <= plan.readiness_score <= 100
    assert len(plan.categories) == 5
    core = next(item for item in plan.impacts if item.relative_path == "core.py")
    assert core.blast_radius == 2
    assert core.direct_dependents == ["app.py", "helper.py"]
    assert core.affected_entry_points == ["app.py"]
    assert plan.top_priorities[0].relative_path == "core.py"
    assert len(plan.phases) >= 3


def test_markdown_report_contains_decision_sections():
    db = TestingSessionLocal()
    plan = build_migration_plan(db, "proj_migration")
    report = migration_plan_markdown(plan, "Migration Sample")
    db.close()
    assert "# Migration Sample Modernization Plan" in report
    assert "## Readiness breakdown" in report
    assert "## Highest-impact files" in report
    assert "core.py" in report


def test_migration_plan_api_and_download():
    client = TestClient(app)
    response = client.get("/api/projects/proj_migration/migration-plan")
    assert response.status_code == 200
    assert response.json()["top_priorities"][0]["relative_path"] == "core.py"
    download = client.get("/api/projects/proj_migration/migration-plan/download")
    assert download.status_code == 200
    assert "text/markdown" in download.headers["content-type"]
    assert "attachment" in download.headers["content-disposition"]

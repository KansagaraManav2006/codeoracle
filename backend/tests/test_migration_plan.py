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
    assert "no-cache" in response.headers.get("cache-control", "")
    download = client.get("/api/projects/proj_migration/migration-plan/download")
    assert download.status_code == 200
    assert "text/markdown" in download.headers["content-type"]
    assert "attachment" in download.headers["content-disposition"]


def test_regression_no_project_test_record():
    db = TestingSessionLocal()
    plan = build_migration_plan(db, "proj_migration")
    db.close()
    testability = next(c for c in plan.categories if c.key == "testability")
    assert testability.score == 35
    assert "Generate a safety test suite" in testability.reason


def test_regression_all_syntax_valid_no_coverage():
    from app.models.db import ProjectTestRecord
    from app.testgen.models import GeneratedTestFile, ProjectTestResult, TEST_GENERATOR_VERSION

    db = TestingSessionLocal()
    res = ProjectTestResult(
        project_id="proj_migration",
        generation_version=TEST_GENERATOR_VERSION,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        test_files=[
            GeneratedTestFile(test_id="t1", target_relative_path="app.py", language="python", framework="pytest", safe_test_path="tests/test_app.py", code="def test_a(): pass", generation_strategy="deterministic", syntax_valid=True),
            GeneratedTestFile(test_id="t2", target_relative_path="core.py", language="python", framework="pytest", safe_test_path="tests/test_core.py", code="def test_b(): pass", generation_strategy="deterministic", syntax_valid=True),
        ],
        target_source_files=2,
        total_generated_tests=2,
        syntax_valid_count=2,
        overall_line_coverage=None,
    )
    db.add(ProjectTestRecord(
        id="rec_test_proj_migration",
        project_id="proj_migration",
        generator_version=TEST_GENERATOR_VERSION,
        content_hash="migration_hash",
        test_data=res.model_dump(mode="json"),
        created_at=datetime.now(timezone.utc),
    ))
    db.commit()

    plan = build_migration_plan(db, "proj_migration")
    db.close()

    testability = next(c for c in plan.categories if c.key == "testability")
    assert testability.score == 76  # 60 * 0.6 + (2/2) * 40 = 76
    assert "Syntax-based estimation" in testability.reason


def test_regression_partial_syntax_validity():
    from app.models.db import ProjectTestRecord
    from app.testgen.models import GeneratedTestFile, ProjectTestResult, TEST_GENERATOR_VERSION

    db = TestingSessionLocal()
    res = ProjectTestResult(
        project_id="proj_migration",
        generation_version=TEST_GENERATOR_VERSION,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        test_files=[
            GeneratedTestFile(test_id="t1", target_relative_path="app.py", language="python", framework="pytest", safe_test_path="tests/test_app.py", code="def test_a(): pass", generation_strategy="deterministic", syntax_valid=True),
            GeneratedTestFile(test_id="t2", target_relative_path="core.py", language="python", framework="pytest", safe_test_path="tests/test_core.py", code="def test_b(): syntax error", generation_strategy="deterministic", syntax_valid=False),
        ],
        target_source_files=2,
        total_generated_tests=2,
        syntax_valid_count=1,
        overall_line_coverage=None,
    )
    rec = db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == "proj_migration").first()
    if rec:
        rec.generator_version = TEST_GENERATOR_VERSION
        rec.test_data = res.model_dump(mode="json")
    else:
        db.add(ProjectTestRecord(
            id="rec_test_proj_migration",
            project_id="proj_migration",
            generator_version=TEST_GENERATOR_VERSION,
            content_hash="migration_hash",
            test_data=res.model_dump(mode="json"),
            created_at=datetime.now(timezone.utc),
        ))
    db.commit()

    plan = build_migration_plan(db, "proj_migration")
    db.close()

    testability = next(c for c in plan.categories if c.key == "testability")
    assert testability.score == 56  # 60 * 0.6 + 0.5 * 40 = 56


def test_regression_measured_coverage():
    from app.models.db import ProjectTestRecord
    from app.testgen.models import GeneratedTestFile, ProjectTestResult, TEST_GENERATOR_VERSION

    db = TestingSessionLocal()
    res = ProjectTestResult(
        project_id="proj_migration",
        generation_version=TEST_GENERATOR_VERSION,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        test_files=[
            GeneratedTestFile(test_id="t1", target_relative_path="app.py", language="python", framework="pytest", safe_test_path="tests/test_app.py", code="def test_a(): pass", generation_strategy="deterministic", syntax_valid=True),
        ],
        target_source_files=1,
        total_generated_tests=1,
        syntax_valid_count=1,
        overall_line_coverage=80.0,
    )
    rec = db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == "proj_migration").first()
    if rec:
        rec.generator_version = TEST_GENERATOR_VERSION
        rec.test_data = res.model_dump(mode="json")
    else:
        db.add(ProjectTestRecord(
            id="rec_test_proj_migration",
            project_id="proj_migration",
            generator_version=TEST_GENERATOR_VERSION,
            content_hash="migration_hash",
            test_data=res.model_dump(mode="json"),
            created_at=datetime.now(timezone.utc),
        ))
    db.commit()

    plan = build_migration_plan(db, "proj_migration")
    db.close()

    testability = next(c for c in plan.categories if c.key == "testability")
    assert testability.score == 88  # 80 * 0.6 + 1.0 * 40 = 88
    assert "Generated tests cover 80.0% of measured source lines" in testability.reason


def test_regression_stale_generator_version_record():
    from app.models.db import ProjectTestRecord
    from app.testgen.models import GeneratedTestFile, ProjectTestResult

    db = TestingSessionLocal()
    res = ProjectTestResult(
        project_id="proj_migration",
        generation_version="0.9.0",  # Stale version
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        test_files=[
            GeneratedTestFile(test_id="t1", target_relative_path="app.py", language="python", framework="pytest", safe_test_path="tests/test_app.py", code="def test_a(): pass", generation_strategy="deterministic", syntax_valid=True),
        ],
        target_source_files=1,
        total_generated_tests=1,
        syntax_valid_count=1,
        overall_line_coverage=90.0,
    )
    rec = db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == "proj_migration").first()
    if rec:
        rec.generator_version = "0.9.0"
        rec.test_data = res.model_dump(mode="json")
    db.commit()

    plan = build_migration_plan(db, "proj_migration")
    db.close()

    testability = next(c for c in plan.categories if c.key == "testability")
    assert testability.score == 35  # Stale version is safely ignored, returning fallback score 35


def test_regression_e2e_backend_test_generation_and_migration_plan():
    from app.testgen.service import run_test_generation_for_project

    db = TestingSessionLocal()
    run_test_generation_for_project(db, "proj_migration", force=True)
    plan = build_migration_plan(db, "proj_migration")
    db.close()

    testability = next(c for c in plan.categories if c.key == "testability")
    assert testability.score > 35

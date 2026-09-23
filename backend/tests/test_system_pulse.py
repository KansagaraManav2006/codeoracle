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
from app.models.db import Project, ProjectAnalysisRecord, ProjectTestRecord, ProjectRefactorRecord
from app.pulse.service import build_system_pulse
from app.testgen.models import ProjectTestResult, GeneratedTestFile
from app.refactor.models import ProjectRefactorResult, ModernizationState


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
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    db = TestingSessionLocal()
    project_id = "proj_pulse_test"

    mod_frontend = generate_module_id(project_id, "frontend/src/App.tsx")
    mod_backend = generate_module_id(project_id, "backend/app/api.py")
    mod_db = generate_module_id(project_id, "backend/models/db.py")
    mod_ml = generate_module_id(project_id, "ml/pipeline/train.py")
    mod_infra = generate_module_id(project_id, "scripts/deploy.py")

    analysis = ProjectAnalysis(
        project_id=project_id,
        content_hash="pulse_test_hash",
        languages=["typescript", "python"],
        total_files=5,
        total_lines=500,
        modules=[
            ModuleAnalysis(
                module_id=mod_frontend,
                relative_path="frontend/src/App.tsx",
                language="typescript",
                line_count=120,
                parse_status="complete",
                is_entry_point=True,
            ),
            ModuleAnalysis(
                module_id=mod_backend,
                relative_path="backend/app/api.py",
                language="python",
                line_count=150,
                parse_status="complete",
                complexity=ComplexitySummary(cyclomatic_complexity=12, rating="medium", hotspots_count=1),
                is_entry_point=True,
            ),
            ModuleAnalysis(
                module_id=mod_db,
                relative_path="backend/models/db.py",
                language="python",
                line_count=90,
                parse_status="complete",
            ),
            ModuleAnalysis(
                module_id=mod_ml,
                relative_path="ml/pipeline/train.py",
                language="python",
                line_count=80,
                parse_status="partial",
                complexity=ComplexitySummary(cyclomatic_complexity=22, rating="high", hotspots_count=2),
                legacy_warnings=[WarningInfo(code="DEPRECATED_API", message="Use v2 api.", line=10, severity="warning")],
            ),
            ModuleAnalysis(
                module_id=mod_infra,
                relative_path="scripts/deploy.py",
                language="python",
                line_count=60,
                parse_status="complete",
            ),
        ],
        dependency_edges=[
            DependencyEdge(edge_id="e1", source_module_id=mod_frontend, target_module_id=mod_backend, type="import", resolved=True, source_line=1),
            DependencyEdge(edge_id="e2", source_module_id=mod_backend, target_module_id=mod_db, type="import", resolved=True, source_line=1),
            DependencyEdge(edge_id="e3", source_module_id=mod_backend, target_module_id=mod_ml, type="import", resolved=True, source_line=2),
            DependencyEdge(edge_id="e4", source_module_id=mod_backend, target_module_id="unresolved_pkg", type="import", resolved=False, source_line=3),
        ],
    )

    project = Project(
        id=project_id,
        display_name="Pulse Test Project",
        source_type="zip",
        content_hash="pulse_test_hash",
        workspace_id="ws_pulse",
        created_at=datetime.now(timezone.utc),
    )
    db.add(project)
    db.commit()

    record = ProjectAnalysisRecord(
        id="analysis_pulse",
        project_id=project_id,
        analyzer_version="1.0.0",
        content_hash="pulse_test_hash",
        analysis_data=analysis.model_dump(mode="json"),
        created_at=datetime.now(timezone.utc),
    )
    db.add(record)

    # Test Record
    test_result = ProjectTestResult(
        project_id=project_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        target_source_files=5,
        total_generated_tests=4,
        syntax_valid_count=4,
        executed_test_count=0,
        execution_enabled=False,
        overall_line_coverage=None,
        protected_files=["backend/app/api.py", "backend/models/db.py"],
        unprotected_files=["frontend/src/App.tsx", "ml/pipeline/train.py", "scripts/deploy.py"],
        test_files=[
            GeneratedTestFile(
                test_id="test_1",
                target_relative_path="backend/app/api.py",
                language="python",
                framework="pytest",
                safe_test_path="tests/test_api.py",
                code="# test code",
                generation_strategy="contract",
                syntax_valid=True,
            )
        ],
    )
    test_record = ProjectTestRecord(
        id="test_rec_pulse",
        project_id=project_id,
        generator_version="1.0.0",
        content_hash="pulse_test_hash",
        test_data=test_result.model_dump(mode="json"),
        created_at=datetime.now(timezone.utc),
    )
    db.add(test_record)

    # Refactor Record
    refactor_result = ProjectRefactorResult(
        project_id=project_id,
        generated_at=datetime.now(timezone.utc).isoformat(),
        status="completed",
        analyzed_files=5,
        changed_files=1,
        total_changes=2,
        breaking_warning_count=0,
        safe_to_apply_automatically=True,
        summary="Refactoring candidates found",
        modernization_state=ModernizationState(
            findings=3,
            candidates=2,
            autofix_eligible=1,
            generated_diffs=1,
            statically_validated=1,
            runtime_verified=0,
            human_approved=0,
        ),
    )
    refactor_rec = ProjectRefactorRecord(
        id="refactor_rec_pulse",
        project_id=project_id,
        engine_version="1.0.0",
        content_hash="pulse_test_hash",
        refactor_data=refactor_result.model_dump(mode="json"),
        created_at=datetime.now(timezone.utc),
    )
    db.add(refactor_rec)
    db.commit()
    db.close()

    yield
    Base.metadata.drop_all(bind=engine)


def test_system_pulse_endpoint_and_consistency():
    client = TestClient(app)
    response = client.get("/api/projects/proj_pulse_test/system-pulse")
    assert response.status_code == 200
    data = response.json()

    # Check top-level keys
    assert "health" in data
    assert "subsystems" in data
    assert "pressureZones" in data
    assert "signals" in data
    assert "nextActions" in data
    assert "confidence" in data

    # Check score match with migration plan readiness score
    plan_resp = client.get("/api/projects/proj_pulse_test/migration-plan")
    assert plan_resp.status_code == 200
    plan_data = plan_resp.json()
    assert data["health"]["score"] == plan_data["readiness_score"]

    # Check graph numbers match dependency graph summary
    arch_resp = client.get("/api/projects/proj_pulse_test/architecture")
    assert arch_resp.status_code == 200
    arch_data = arch_resp.json()
    dep_metrics = data["health"]["dimensions"]["dependencies"]["metrics"]
    assert dep_metrics["resolvedEdges"] == arch_data["graph"]["resolved_edges"]
    assert dep_metrics["unresolvedImports"] == arch_data["graph"]["unresolved_imports"]
    assert dep_metrics["detectedCycles"] == arch_data["graph"]["cycle_count"]

    # Check 5 canonical subsystems
    subsystems = data["subsystems"]
    subsystem_ids = {s["id"] for s in subsystems}
    assert subsystem_ids == {"frontend", "backend", "ml", "database", "infrastructure"}

    for sub in subsystems:
        assert sub["healthScore"] >= 0 and sub["healthScore"] <= 100
        assert sub["confidence"] in ("high", "medium", "low")

    # Check pressure zones
    pressure_zones = data["pressureZones"]
    assert len(pressure_zones) > 0
    for zone in pressure_zones:
        assert 0 <= zone["pressureScore"] <= 100
        assert zone["level"] in ("Critical", "High", "Moderate", "Low")
        assert len(zone["reasons"]) > 0

    # Check 5 health dimension cards
    dims = data["health"]["dimensions"]
    for key in ("parsing", "dependencies", "complexity", "protection", "modernization"):
        assert key in dims
        card = dims[key]
        assert 0 <= card["score"] <= 100
        assert card["confidence"] in ("high", "medium", "low")
        assert len(card["evidence"]) > 0

    # Protection card never implies syntax-valid tests passed runtime
    protection_card = dims["protection"]
    assert "Syntax-valid tests" in " ".join(protection_card["evidence"])
    assert "never implied" in " ".join(protection_card["evidence"]).lower()

    # Modernization card reuses candidates
    mod_card = dims["modernization"]
    assert mod_card["metrics"]["modernizationCandidates"] >= 0
    assert "suggestions" not in " ".join(mod_card["evidence"]).lower()

    # Check Signals
    signals = data["signals"]
    assert 3 <= len(signals) <= 5
    for sig in signals:
        assert sig["type"] in ("most_important", "dependency", "modernization", "positive", "protection")
        assert len(sig["evidence"]) > 0

    # Check Next Actions
    actions = data["nextActions"]
    assert len(actions) > 0
    valid_destinations = {"overview", "explanation", "hotspots", "graph", "neural-map", "tests", "refactor", "migration"}
    for act in actions:
        assert act["destinationPage"] in valid_destinations
        assert len(act["title"]) > 0
        assert len(act["expectedEffect"]) > 0


def test_system_pulse_404_and_409():
    client = TestClient(app)
    # Nonexistent project
    resp_404 = client.get("/api/projects/proj_nonexistent/system-pulse")
    assert resp_404.status_code == 404

    # Unanalyzed project
    db = TestingSessionLocal()
    un_proj = Project(
        id="proj_unanalyzed",
        display_name="Unanalyzed Project",
        source_type="zip",
        content_hash="un_hash",
        workspace_id="ws_unanalyzed",
        created_at=datetime.now(timezone.utc),
    )
    db.add(un_proj)
    db.commit()
    db.close()

    resp_409 = client.get("/api/projects/proj_unanalyzed/system-pulse")
    assert resp_409.status_code == 409

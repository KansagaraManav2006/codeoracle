import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.analysis.models import (
    ComplexitySummary,
    DependencyEdge,
    Finding,
    ModuleAnalysis,
    ProjectAnalysis,
    WarningInfo,
)
from app.database import Base, get_db
from app.hotspots.models import RiskAssessment, HotspotsResponse, HotspotItem
from app.hotspots.service import compute_project_hotspots, compute_static_hotspot_item
from app.main import app as fastapi_app
from app.models.db import Project, ProjectAnalysisRecord


@pytest.fixture
def test_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_compute_static_hotspot_item_formula_and_bounds():
    item = compute_static_hotspot_item(
        file_path="core/engine.py",
        complexity_raw=28,
        loc_raw=550,
        fan_in_raw=6,
        warnings_raw=4,
        blast_radius_raw=8,
        transitive_dependents=["app.py", "server.py"],
        direct_dependents=["server.py"],
        parse_status="full",
        unresolved_relations=0,
    )
    assert 0 <= item.hotspot_score <= 100
    assert item.overall_risk in {"critical", "high"}
    assert item.complexity.value == 28
    assert item.complexity.severity == "critical"
    assert item.graph.fan_in == 6
    assert item.graph.blast_radius == 8
    assert item.lines_of_code == 550
    assert item.warnings == 4
    assert item.parse.status == "full"
    assert item.parse.confidence == "high"

    # Factor breakdown
    assert item.score_factors.complexity <= 35
    assert item.score_factors.loc <= 10
    assert item.score_factors.fan_in <= 15
    assert item.score_factors.warnings <= 20
    assert item.score_factors.blast_radius <= 20

    # Human-readable explanation and actionable recommendation
    assert "critical" in item.reason.lower() or "28" in item.reason
    assert "ripple" in item.reason.lower() or "transitive" in item.reason.lower()
    assert item.recommended_action != ""


def test_deterministic_ranking_and_tie_breaking(test_db: Session):
    project = Project(
        id="proj_rank_test",
        display_name="Hotspot Ranking Test",
        source_type="zip",
        content_hash="dummyhash",
        workspace_id="dummyws",
    )
    test_db.add(project)
    test_db.commit()

    # 3 modules with distinct profiles
    mod_high = ModuleAnalysis(
        module_id="mod_high",
        relative_path="src/heavy_service.py",
        language="python",
        line_count=400,
        parse_status="complete",
        complexity=ComplexitySummary(cyclomatic_complexity=30, rating="critical", hotspots_count=3),
        legacy_warnings=[WarningInfo(code="W01", message="W", severity="warning", line=1)] * 5,
        classes=[],
        functions=[],
        dependencies=[],
    )
    mod_leaf = ModuleAnalysis(
        module_id="mod_leaf",
        relative_path="src/utils.py",
        language="python",
        line_count=30,
        parse_status="complete",
        complexity=ComplexitySummary(cyclomatic_complexity=2, rating="low", hotspots_count=0),
        legacy_warnings=[],
        classes=[],
        functions=[],
        dependencies=[],
    )
    mod_entry = ModuleAnalysis(
        module_id="mod_entry",
        relative_path="src/main.py",
        language="python",
        line_count=100,
        parse_status="complete",
        complexity=ComplexitySummary(cyclomatic_complexity=8, rating="medium", hotspots_count=0),
        legacy_warnings=[WarningInfo(code="W02", message="W", severity="warning", line=1)],
        is_entry_point=True,
        classes=[],
        functions=[],
        dependencies=[],
    )

    # heavy_service is imported by main
    edge = DependencyEdge(
        edge_id="e1",
        source_module_id="mod_entry",
        target_module_id="mod_high",
        type="import",
        resolved=True,
        is_type_only=False,
    )

    analysis = ProjectAnalysis(
        project_id=project.id,
        content_hash="dummyhash",
        total_files=3,
        total_lines=530,
        languages=["python"],
        modules=[mod_leaf, mod_high, mod_entry],
        dependency_edges=[edge],
        entry_points=["src/main.py"],
        findings=[],
        project_warnings=[],
    )

    record = ProjectAnalysisRecord(
        id=f"rec_{project.id}",
        project_id=project.id,
        analyzer_version="1.0",
        content_hash="dummyhash",
        analysis_data=analysis.model_dump(mode="json"),
    )
    test_db.add(record)
    test_db.commit()

    resp = compute_project_hotspots(test_db, project.id)

    assert resp.score_mode == "static"
    assert resp.total_files == 3
    assert len(resp.hotspots) == 3
    # heavy_service should be #1 hotspot
    assert resp.hotspots[0].file_path == "src/heavy_service.py"
    assert resp.hotspots[0].hotspot_score > resp.hotspots[1].hotspot_score
    assert resp.hotspots[0].graph.fan_in == 1
    assert resp.recommended_start_file == "src/heavy_service.py"
    assert "src/heavy_service.py" in resp.recommended_start_reason


def test_score_explainability_and_partially_parsed(test_db: Session):
    project = Project(
        id="proj_partial_test",
        display_name="Partial Parse Test",
        source_type="zip",
        content_hash="dummyhash",
        workspace_id="dummyws",
    )
    test_db.add(project)
    test_db.commit()

    mod_partial = ModuleAnalysis(
        module_id="mod_partial",
        relative_path="legacy/broken.py",
        language="python",
        line_count=150,
        complexity=ComplexitySummary(cyclomatic_complexity=12, rating="high", hotspots_count=1),
        legacy_warnings=[WarningInfo(code="W03", message="W", severity="warning", line=1)] * 2,
        parse_status="partial",
        parse_errors=["Syntax error at line 42"],
        classes=[],
        functions=[],
        dependencies=[],
    )

    analysis = ProjectAnalysis(
        project_id=project.id,
        content_hash="dummyhash",
        total_files=1,
        total_lines=150,
        languages=["python"],
        modules=[mod_partial],
        dependency_edges=[],
        entry_points=[],
        findings=[],
        project_warnings=[],
    )

    record = ProjectAnalysisRecord(
        id=f"rec_{project.id}",
        project_id=project.id,
        analyzer_version="1.0",
        content_hash="dummyhash",
        analysis_data=analysis.model_dump(mode="json"),
    )
    test_db.add(record)
    test_db.commit()

    resp = compute_project_hotspots(test_db, project.id)
    assert len(resp.hotspots) == 1
    item = resp.hotspots[0]
    assert item.file_path == "legacy/broken.py"
    assert item.parse.status == "partial"
    assert item.parse.confidence in {"medium", "low"}
    assert "partial" in item.reason.lower()
    assert "syntax" in item.recommended_action.lower()


def test_empty_project_handling(test_db: Session):
    project = Project(
        id="proj_empty_test",
        display_name="Empty Project Test",
        source_type="zip",
        content_hash="dummyhash",
        workspace_id="dummyws",
    )
    test_db.add(project)
    test_db.commit()

    analysis = ProjectAnalysis(
        project_id=project.id,
        content_hash="dummyhash",
        total_files=0,
        total_lines=0,
        languages=[],
        modules=[],
        dependency_edges=[],
        entry_points=[],
        findings=[],
        project_warnings=[],
    )

    record = ProjectAnalysisRecord(
        id=f"rec_{project.id}",
        project_id=project.id,
        analyzer_version="1.0",
        content_hash="dummyhash",
        analysis_data=analysis.model_dump(mode="json"),
    )
    test_db.add(record)
    test_db.commit()

    resp = compute_project_hotspots(test_db, project.id)
    assert resp.total_files == 0
    assert resp.hotspots == []
    assert resp.recommended_start_file is None
    assert "No source files" in resp.recommended_start_reason


def test_hotspots_api_endpoint(test_db: Session):
    project = Project(
        id="proj_api_test",
        display_name="API Hotspot Test",
        source_type="zip",
        content_hash="dummyhash",
        workspace_id="dummyws",
    )
    test_db.add(project)
    test_db.commit()

    mod = ModuleAnalysis(
        module_id="mod1",
        relative_path="src/calc.py",
        language="python",
        line_count=80,
        parse_status="complete",
        complexity=ComplexitySummary(cyclomatic_complexity=5, rating="low", hotspots_count=0),
        legacy_warnings=[],
        classes=[],
        functions=[],
        dependencies=[],
    )
    analysis = ProjectAnalysis(
        project_id=project.id,
        content_hash="dummyhash",
        total_files=1,
        total_lines=80,
        languages=["python"],
        modules=[mod],
        dependency_edges=[],
        entry_points=[],
        findings=[],
        project_warnings=[],
    )
    record = ProjectAnalysisRecord(
        id=f"rec_{project.id}",
        project_id=project.id,
        analyzer_version="1.0",
        content_hash="dummyhash",
        analysis_data=analysis.model_dump(mode="json"),
    )
    test_db.add(record)
    test_db.commit()

    fastapi_app.dependency_overrides[get_db] = lambda: test_db
    client = TestClient(fastapi_app)
    try:
        response = client.get(f"/api/projects/{project.id}/hotspots")
        assert response.status_code == 200
        data = response.json()
        assert data.get("projectId") == project.id or data.get("project_id") == project.id
        assert data.get("scoreMode") == "static" or data.get("score_mode") == "static"
        assert len(data["hotspots"]) == 1
        hotspot_item = data["hotspots"][0]
        # Verify camelCase or snake_case availability
        assert hotspot_item.get("filePath") == "src/calc.py" or hotspot_item.get("file_path") == "src/calc.py"
        assert "overallRisk" in hotspot_item or "overall_risk" in hotspot_item
        assert "complexity" in hotspot_item
        assert "graph" in hotspot_item
        assert "parse" in hotspot_item
    finally:
        fastapi_app.dependency_overrides.clear()

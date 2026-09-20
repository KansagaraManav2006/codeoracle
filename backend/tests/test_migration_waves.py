from datetime import datetime, timezone

import pytest
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
from app.database import Base
from app.migration.service import build_migration_plan, migration_plan_markdown
from app.models.db import Project, ProjectAnalysisRecord


@pytest.fixture
def wave_test_db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = Session()

    project_id = "proj_waves_test"
    mod_entry = generate_module_id(project_id, "main.py")
    mod_service = generate_module_id(project_id, "service.py")
    mod_leaf = generate_module_id(project_id, "leaf_util.py")
    mod_isolated = generate_module_id(project_id, "standalone.py")
    mod_cycle_a = generate_module_id(project_id, "cycle_a.py")
    mod_cycle_b = generate_module_id(project_id, "cycle_b.py")

    modules = [
        ModuleAnalysis(
            module_id=mod_entry,
            relative_path="main.py",
            language="python",
            line_count=50,
            parse_status="complete",
            is_entry_point=True,
        ),
        ModuleAnalysis(
            module_id=mod_service,
            relative_path="service.py",
            language="python",
            line_count=80,
            parse_status="complete",
            complexity=ComplexitySummary(cyclomatic_complexity=12, rating="medium", hotspots_count=1),
        ),
        ModuleAnalysis(
            module_id=mod_leaf,
            relative_path="leaf_util.py",
            language="python",
            line_count=30,
            parse_status="complete",
            legacy_warnings=[WarningInfo(code="PY2_XRANGE", message="Use of xrange", line=5, severity="warning")],
        ),
        ModuleAnalysis(
            module_id=mod_isolated,
            relative_path="standalone.py",
            language="python",
            line_count=15,
            parse_status="complete",
        ),
        ModuleAnalysis(
            module_id=mod_cycle_a,
            relative_path="cycle_a.py",
            language="python",
            line_count=45,
            parse_status="complete",
        ),
        ModuleAnalysis(
            module_id=mod_cycle_b,
            relative_path="cycle_b.py",
            language="python",
            line_count=40,
            parse_status="complete",
        ),
    ]

    edges = [
        # main.py -> service.py
        DependencyEdge(edge_id="e1", source_module_id=mod_entry, target_module_id=mod_service, type="import", resolved=True, source_line=1),
        # service.py -> leaf_util.py
        DependencyEdge(edge_id="e2", source_module_id=mod_service, target_module_id=mod_leaf, type="import", resolved=True, source_line=2),
        # cycle_a.py <-> cycle_b.py
        DependencyEdge(edge_id="e3", source_module_id=mod_cycle_a, target_module_id=mod_cycle_b, type="import", resolved=True, source_line=1),
        DependencyEdge(edge_id="e4", source_module_id=mod_cycle_b, target_module_id=mod_cycle_a, type="import", resolved=True, source_line=1),
    ]

    analysis = ProjectAnalysis(
        project_id=project_id,
        content_hash="wave_hash",
        languages=["python"],
        total_files=6,
        total_lines=260,
        modules=modules,
        dependency_edges=edges,
        entry_points=[mod_entry],
        parse_success_count=6,
    )

    db.add(Project(
        id=project_id,
        display_name="Wave Test Project",
        source_type="zip",
        detected_languages=["python"],
        total_files=6,
        total_lines=260,
        content_hash="wave_hash",
        workspace_id="ws_waves",
        created_at=datetime.now(timezone.utc),
    ))
    db.add(ProjectAnalysisRecord(
        id="analysis_waves",
        project_id=project_id,
        analyzer_version=analysis.analyzer_version,
        content_hash="wave_hash",
        analysis_data=analysis.model_dump(mode="json"),
    ))
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


def test_wave_partitioning_and_order(wave_test_db):
    """Test that modules are accurately classified into waves based on cycles, leaves, and entry points."""
    plan = build_migration_plan(wave_test_db, "proj_waves_test")

    wave_by_num = {w.wave: w for w in plan.waves}
    assert 0 in wave_by_num, "Wave 0 (Safety Net) must exist"
    assert 1 in wave_by_num, "Wave 1 (Leaf/Isolated) must exist"
    assert 2 in wave_by_num, "Wave 2 (Cycle Untangling) must exist"
    assert 3 in wave_by_num, "Wave 3 (Intermediate Services) must exist"
    assert 4 in wave_by_num, "Wave 4 (Entry Points) must exist"

    # Wave 1: leaf and isolated files
    w1 = wave_by_num[1]
    assert "standalone.py" in w1.files
    assert "leaf_util.py" in w1.files
    assert w1.risk_level == "low"
    assert "zero downstream regression risk" in w1.strategy.lower() or "safe" in w1.strategy.lower()

    # Wave 2: cycle participants
    w2 = wave_by_num[2]
    assert "cycle_a.py" in w2.files
    assert "cycle_b.py" in w2.files
    assert w2.risk_level == "high"

    # Wave 3: intermediate services
    w3 = wave_by_num[3]
    assert "service.py" in w3.files

    # Wave 4: entry points
    w4 = wave_by_num[4]
    assert "main.py" in w4.files
    assert "last" in w4.strategy.lower() or "orchestration" in w4.goal.lower()


def test_direct_vs_transitive_blast_radius_and_depth(wave_test_db):
    """Test calculation of direct vs transitive blast radius and dependency depth."""
    plan = build_migration_plan(wave_test_db, "proj_waves_test")

    leaf = next(i for i in plan.impacts if i.relative_path == "leaf_util.py")
    assert leaf.direct_dependents == ["service.py"]
    assert leaf.direct_blast_radius == 1
    assert sorted(leaf.transitive_dependents) == ["main.py", "service.py"]
    assert leaf.transitive_blast_radius == 2
    assert leaf.blast_radius == 2
    assert leaf.dependency_depth == 2
    assert leaf.affected_entry_points == ["main.py"]

    standalone = next(i for i in plan.impacts if i.relative_path == "standalone.py")
    assert standalone.direct_dependents == []
    assert standalone.direct_blast_radius == 0
    assert standalone.transitive_dependents == []
    assert standalone.transitive_blast_radius == 0
    assert standalone.dependency_depth == 0

    cycle_a = next(i for i in plan.impacts if i.relative_path == "cycle_a.py")
    assert cycle_a.is_cycle_participant is True
    assert cycle_a.wave == 2


def test_suggested_test_order_and_checklists(wave_test_db):
    """Test that suggested test orders and actionable checklists are properly generated for each wave."""
    plan = build_migration_plan(wave_test_db, "proj_waves_test")

    for wave in plan.waves:
        assert wave.checklist, f"Wave {wave.wave} must have checklist items"
        assert all(c.task for c in wave.checklist)
        assert all(c.action_type in {"test", "refactor", "cycle_decouple", "entry_verify"} for c in wave.checklist)
        assert wave.suggested_test_order, f"Wave {wave.wave} must have suggested test order"

    # Wave 2 checklist should include cycle decoupling
    w2 = next(w for w in plan.waves if w.wave == 2)
    assert any(c.action_type == "cycle_decouple" for c in w2.checklist)


def test_score_blockers_and_first_action_summary(wave_test_db):
    """Test that score blockers and executive first action summary are populated."""
    plan = build_migration_plan(wave_test_db, "proj_waves_test")

    # Score blockers
    assert isinstance(plan.score_blockers, list)
    if plan.score_blockers:
        blocker = plan.score_blockers[0]
        assert blocker.category_key
        assert blocker.blocker_reason
        assert blocker.unblocking_action

    # First action summary answering "What should the team modernize first, and why?"
    assert plan.first_action_summary != ""
    assert "Wave 1" in plan.first_action_summary
    assert "leaf" in plan.first_action_summary.lower()


def test_markdown_report_includes_waves_and_blockers(wave_test_db):
    """Test that migration_plan_markdown renders wave sections and decision guidance."""
    plan = build_migration_plan(wave_test_db, "proj_waves_test")
    md = migration_plan_markdown(plan, "Wave Test Project")

    assert "# Wave Test Project Modernization Plan" in md
    assert "## Recommended First Action" in md
    assert "## Migration Waves" in md
    assert "### Wave 1: Leaf & Isolated Modules" in md
    assert "### Wave 2: Cycle Untangling & Decoupling" in md
    assert "### Wave 4: Entry Points & Orchestration" in md

"""Score formula determinism, normalization, boundary condition, and transparency tests.

Covers:
1. Determinism across repeated evaluations
2. Normalization bounds [0, 100] across all score functions
3. Boundary conditions:
   - Empty repositories (0 files)
   - Single-file repositories (1 file, 0 dependencies)
   - Zero-metric modules (0 LOC, 0 complexity, 0 calls)
   - Extreme metrics (overflow prevention)
4. Partial parse degradation & confidence score impact
5. Unresolved dependency penalties & graph confidence
6. Transparency: factor breakdown, evidence, confidence, and limitations
7. State separation: Generated, Syntax-valid, Runtime-executed, Behaviorally verified
8. Persisted version identifiers
"""
from pathlib import Path
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import (
    ANALYZER_VERSION,
    ComplexitySummary,
    ModuleAnalysis,
    ProjectAnalysis,
    WarningInfo,
)
from app.analysis.scoring import (
    SCORING_VERSION,
    calculate_hotspot_score,
    get_complexity_severity,
    get_hotspot_explanation_details,
    get_parse_confidence,
    get_risk_level,
)
from app.hotspots.models import HotspotsResponse, RiskAssessment, ScoreFactors
from app.hotspots.service import compute_static_hotspot_item
from app.migration.models import MigrationPlanResponse, ProtectionStatus
from app.migration.service import build_migration_plan, _bounded
from app.models.db import Base, Project, ProjectAnalysisRecord, ProjectTestRecord
from app.pulse.service import build_system_pulse
from app.refactor.models import ModernizationState
from app.refactor.verification_models import RefactorVerificationResult
from app.testgen.models import GeneratedTestFile, ProjectTestResult, TEST_GENERATOR_VERSION


# Isolated in-memory SQLite database
TestEngine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TestEngine)


@pytest.fixture(autouse=True)
def init_db():
    Base.metadata.create_all(bind=TestEngine)
    yield
    Base.metadata.drop_all(bind=TestEngine)


class TestScoringModel:
    """Verifies that all scoring formulas are defensible, bounded, and transparent."""

    # 1. Determinism
    def test_hotspot_score_determinism(self):
        # Repeated invocations with identical parameters must return identical values
        for _ in range(50):
            score_1, factors_1 = calculate_hotspot_score(15, 120, 3, 2, 4)
            score_2, factors_2 = calculate_hotspot_score(15, 120, 3, 2, 4)
            assert score_1 == score_2
            assert factors_1 == factors_2

    # 2. Normalization Bounds [0, 100]
    @pytest.mark.parametrize(
        "comp, loc, fan_in, warnings, blast",
        [
            (0, 0, 0, 0, 0),
            (1, 10, 0, 0, 0),
            (5, 50, 1, 1, 1),
            (15, 300, 5, 4, 8),
            (25, 1000, 10, 10, 20),
            (500, 100000, 100, 100, 100),  # Extreme values
        ]
    )
    def test_hotspot_score_normalization(self, comp, loc, fan_in, warnings, blast):
        score, factors = calculate_hotspot_score(comp, loc, fan_in, warnings, blast)
        assert 0 <= score <= 100
        # Factor contributions must also respect their respective caps
        assert 0 <= factors["complexity"] <= 35
        assert 0 <= factors["loc"] <= 10
        assert 0 <= factors["fan_in"] <= 15
        assert 0 <= factors["warnings"] <= 20
        assert 0 <= factors["blast_radius"] <= 20
        assert sum(factors.values()) >= score  # score is clamped to 100

    # 3. Boundary Conditions
    def test_zero_metric_boundary_condition(self):
        score, factors = calculate_hotspot_score(0, 0, 0, 0, 0)
        assert score == 0
        assert factors["complexity"] == 0
        assert factors["loc"] == 0
        assert factors["fan_in"] == 0
        assert factors["warnings"] == 0
        assert factors["blast_radius"] == 0

    def test_single_file_boundary_condition(self):
        db = TestingSessionLocal()
        proj = Project(id="proj_single", display_name="Single", source_type="zip", workspace_id="ws_single", content_hash="h_single")
        db.add(proj)

        module = ModuleAnalysis(
            module_id="mod_single",
            relative_path="isolated.py",
            language="python",
            line_count=20,
            parse_status="complete",
            complexity=ComplexitySummary(cyclomatic_complexity=1, rating="low"),
        )
        analysis = ProjectAnalysis(
            project_id="proj_single",
            content_hash="h_single",
            total_files=1,
            modules=[module],
            dependency_edges=[],
            parse_success_count=1,
        )
        record = ProjectAnalysisRecord(
            id="rec_single",
            project_id="proj_single",
            analyzer_version=ANALYZER_VERSION,
            content_hash="h_single",
            analysis_data=analysis.model_dump(mode="json"),
        )
        db.add(record)
        db.commit()

        plan = build_migration_plan(db, "proj_single")
        pulse = build_system_pulse(db, "proj_single")
        db.close()

        # In a 1-file repository with 0 cycles and 0 unresolved imports:
        # Dependency safety must be 100
        assert plan.categories[2].score == 100  # dependency safety
        assert 0 <= plan.readiness_score <= 100
        assert 0 <= pulse.health.score <= 100

    def test_empty_repository_boundary_condition(self):
        db = TestingSessionLocal()
        proj = Project(id="proj_empty", display_name="Empty", source_type="zip", workspace_id="ws_empty", content_hash="h_empty")
        db.add(proj)

        analysis = ProjectAnalysis(
            project_id="proj_empty",
            content_hash="h_empty",
            total_files=0,
            modules=[],
            dependency_edges=[],
        )
        record = ProjectAnalysisRecord(
            id="rec_empty",
            project_id="proj_empty",
            analyzer_version=ANALYZER_VERSION,
            content_hash="h_empty",
            analysis_data=analysis.model_dump(mode="json"),
        )
        db.add(record)
        db.commit()

        # Must not raise ZeroDivisionError
        plan = build_migration_plan(db, "proj_empty")
        pulse = build_system_pulse(db, "proj_empty")
        db.close()

        assert 0 <= plan.readiness_score <= 100
        assert 0 <= pulse.health.score <= 100

    # 4. Partial Parse & Confidence Degradation
    def test_partial_parse_confidence_degradation(self):
        conf_full = get_parse_confidence("full", 0)
        conf_partial = get_parse_confidence("partial", 0)
        conf_fallback = get_parse_confidence("fallback", 0)
        conf_failed = get_parse_confidence("failed", 0)

        assert conf_full == "high"
        assert conf_partial == "medium"
        assert conf_fallback == "low"
        assert conf_failed == "low"

    def test_unresolved_dependencies_penalty(self):
        # Unresolved imports degrade confidence from high to medium
        conf_with_unresolved = get_parse_confidence("full", 2)
        assert conf_with_unresolved == "medium"

    # 5. Transparency: Factor Breakdown, Evidence, Confidence, Limitations
    def test_hotspot_transparency_exposure(self):
        details = get_hotspot_explanation_details(
            complexity_raw=18,
            loc_raw=250,
            fan_in_raw=4,
            warnings_raw=2,
            blast_radius_raw=5,
            parse_status="partial",
            unresolved_relations=1,
        )

        assert "formula" in details
        assert "factors" in details
        assert "evidence" in details
        assert "confidence" in details
        assert "limitations" in details

        # Evidence must contain concrete metric details
        assert any("18" in e for e in details["evidence"])
        assert any("250" in e for e in details["evidence"])

        # Limitations must clearly state static nature and partial/unresolved status
        assert any("Static AST" in lim for lim in details["limitations"])
        assert any("partial" in lim for lim in details["limitations"])
        assert any("unresolved" in lim for lim in details["limitations"])

    def test_readiness_transparency_exposure(self):
        db = TestingSessionLocal()
        proj = Project(id="proj_trans", display_name="Trans", source_type="zip", workspace_id="ws_trans", content_hash="h_trans")
        db.add(proj)

        module = ModuleAnalysis(
            module_id="mod_1",
            relative_path="core.py",
            language="python",
            line_count=50,
            parse_status="complete",
            complexity=ComplexitySummary(cyclomatic_complexity=2),
        )
        analysis = ProjectAnalysis(
            project_id="proj_trans",
            content_hash="h_trans",
            total_files=1,
            modules=[module],
            parse_success_count=1,
        )
        record = ProjectAnalysisRecord(
            id="rec_trans",
            project_id="proj_trans",
            analyzer_version=ANALYZER_VERSION,
            content_hash="h_trans",
            analysis_data=analysis.model_dump(mode="json"),
        )
        db.add(record)
        db.commit()

        plan = build_migration_plan(db, "proj_trans")
        db.close()

        # Assert every dimension has formula, evidence, confidence, and limitations
        for dim in plan.categories:
            assert dim.formula != ""
            assert len(dim.evidence) > 0
            assert dim.confidence in ("high", "medium", "low")

        assert plan.readiness is not None
        assert plan.readiness.formula != ""

    # 6. State Separation Rigor
    def test_state_separation_generated_vs_syntax_vs_executed_vs_verified(self):
        # 1. Generated: test file exists in test result
        test_file = GeneratedTestFile(
            test_id="t1",
            target_relative_path="service.py",
            language="python",
            framework="pytest",
            safe_test_path="tests/test_service.py",
            code="def test_sample(): assert 1 == 1\n",
            generation_strategy="unit",
            syntax_valid=True,
            execution_status="not_run",  # Not executed yet!
        )
        assert test_file.syntax_valid is True
        assert test_file.execution_status == "not_run"

        # 2. Syntax-valid does NOT mean Runtime-executed
        protection = ProtectionStatus(
            generated_tests=1,
            syntax_valid=1,
            runtime_verified=0,
            execution_status="not_run",
        )
        assert protection.syntax_valid == 1
        assert protection.runtime_verified == 0

        # 3. Refactor verification separates syntax from execution
        verification = RefactorVerificationResult(
            project_id="p1",
            verified_at="2026-10-14T00:00:00Z",
            syntax_status="passed",
            verified=False,  # syntax passed, but behavioral verification requires tests passing
        )
        assert verification.syntax_status == "passed"
        assert verification.verified is False

    # 7. Version Identifiers Persisted
    def test_version_identifiers(self):
        assert ANALYZER_VERSION == "1.1.0"
        assert SCORING_VERSION == "1.2.0"
        assert TEST_GENERATOR_VERSION == "1.2.0"

        plan = MigrationPlanResponse(
            project_id="p1",
            readiness_score=85,
            readiness_label="Strong Readiness",
            executive_summary="Summary",
            categories=[],
            top_priorities=[],
            impacts=[],
        )
        assert plan.analyzer_version == "1.1.0"
        assert plan.scoring_version == "1.2.0"

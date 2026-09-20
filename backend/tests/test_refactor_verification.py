import copy
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.analysis.service import run_analysis_for_project
from app.database import Base, get_db
from app.ingestion.service import get_workspace_dir
from app.main import app as fastapi_app
from app.models.db import Project, ProjectAnalysisRecord, ProjectFile, ProjectRefactorRecord, ProjectTestRecord
from app.refactor.service import run_refactor_for_project
from app.refactor.verification_service import run_refactor_verification
from app.testgen.models import GeneratedTestFile
from app.testgen.runner import execute_generated_tests_safely


@pytest.fixture
def test_db(tmp_path):
    db_path = tmp_path / "test_verif.db"
    engine = create_engine(f"sqlite:///{db_path}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def test_untrusted_project_verification_is_safety_locked(test_db, tmp_path, monkeypatch):
    """Untrusted project uploads must NEVER execute subprocesses; status must be safety_locked."""
    workspace_dir = tmp_path / "workspaces" / "ws_untrusted"
    raw_dir = workspace_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / "app.py").write_text("def run():\n    return 42\n", encoding="utf-8")

    monkeypatch.setattr("app.refactor.verification_service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.refactor.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.analysis.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.ingestion.service.get_workspace_dir", lambda _: workspace_dir)

    proj = Project(
        id="proj_untrusted_123",
        display_name="Untrusted Upload",
        source_type="zip",
        source_url="upload.zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=2,
        content_hash="hash123",
        workspace_id="ws_untrusted",
        is_trusted=0,  # Untrusted
    )
    test_db.add(proj)
    test_db.add(
        ProjectFile(
            id="pf_1",
            project_id=proj.id,
            relative_path="app.py",
            language="python",
            size_bytes=24,
            line_count=2,
            sha256_hash="filehash",
        )
    )
    test_db.commit()

    run_analysis_for_project(test_db, proj.id)

    result = run_refactor_verification(test_db, proj.id, force=True)

    assert result.status == "safety_locked"
    assert result.verified is False
    assert result.can_execute is False
    assert result.execution_warning is not None
    assert "Execution is restricted to trusted demo environments" in result.execution_warning
    assert result.baseline_tests.execution_status == "unavailable"
    assert result.after_tests.execution_status == "unavailable"


def test_trusted_demo_verification_success_and_immutability(test_db, tmp_path, monkeypatch):
    """Trusted demo runs the complete modernization loop:
    18 baseline tests pass -> refactor applied in disposable copy -> 18 after tests pass -> verified.
    Crucially, the original source in raw_dir is NOT modified.
    """
    bench_dir = Path(__file__).resolve().parents[2] / "demo" / "benchmarks" / "python_legacy"
    assert bench_dir.exists(), f"Benchmark directory not found at {bench_dir}"

    workspace_dir = tmp_path / "workspaces" / "ws_trusted_demo"
    raw_dir = workspace_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    # Copy benchmark files into workspace
    for item in bench_dir.glob("*.py"):
        (raw_dir / item.name).write_text(item.read_text(encoding="utf-8"), encoding="utf-8")

    calc_original_code = (raw_dir / "calculator.py").read_text(encoding="utf-8")
    assert "xrange(n)" in calc_original_code, "Expected legacy Python 2 pattern in calculator.py"

    monkeypatch.setattr("app.refactor.verification_service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.refactor.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.analysis.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.ingestion.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.testgen.service.get_workspace_dir", lambda _: workspace_dir)

    proj = Project(
        id="proj_trusted_demo",
        display_name="Demo Benchmark: Python Legacy",
        source_type="demo_benchmark",
        source_url="demo/benchmarks/python_legacy",
        detected_languages=["python"],
        total_files=2,
        total_lines=120,
        content_hash="trustedhash",
        workspace_id="ws_trusted_demo",
        is_trusted=1,  # Trusted
    )
    test_db.add(proj)
    test_db.add(
        ProjectFile(
            id="pf_calc",
            project_id=proj.id,
            relative_path="calculator.py",
            language="python",
            size_bytes=len(calc_original_code),
            line_count=calc_original_code.count("\n"),
            sha256_hash="calchash",
        )
    )
    utils_code = (raw_dir / "utils.py").read_text(encoding="utf-8")
    test_db.add(
        ProjectFile(
            id="pf_utils",
            project_id=proj.id,
            relative_path="utils.py",
            language="python",
            size_bytes=len(utils_code),
            line_count=utils_code.count("\n"),
            sha256_hash="utilshash",
        )
    )
    test_db.commit()

    run_analysis_for_project(test_db, proj.id)

    # Run modernization verification loop
    result = run_refactor_verification(test_db, proj.id, force=True)

    # Assertions for completion criteria
    assert result.status == "verified"
    assert result.verified is True
    assert result.can_execute is True
    assert result.syntax_status == "passed"
    assert result.metrics.new_cycles == 0

    # Baseline characterization tests -> regression tests passed
    assert result.baseline_tests.passed_tests >= 18
    assert result.after_tests.passed_tests == result.baseline_tests.passed_tests
    assert result.after_tests.failed_tests == 0

    # Changed files should include calculator.py (Python 2 xrange modernization)
    assert "calculator.py" in result.changed_files

    # Readiness score should be populated and non-negative delta
    assert result.metrics.readiness_before > 0
    assert result.metrics.readiness_after >= result.metrics.readiness_before

    # CRITICAL: Original repository source must remain strictly UNTOUCHED
    calc_code_after = (raw_dir / "calculator.py").read_text(encoding="utf-8")
    assert calc_code_after == calc_original_code, "Original file was mutated! It must remain untouched."
    assert "xrange(n)" in calc_code_after, "Original code must retain xrange(n) untouched."


def test_refactor_verification_fails_on_regression(test_db, tmp_path, monkeypatch):
    """If tests fail in the modified copy, verification must report failure and verified=False."""
    bench_dir = Path(__file__).resolve().parents[2] / "demo" / "benchmarks" / "python_legacy"
    workspace_dir = tmp_path / "workspaces" / "ws_regress_demo"
    raw_dir = workspace_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    for item in bench_dir.glob("*.py"):
        (raw_dir / item.name).write_text(item.read_text(encoding="utf-8"), encoding="utf-8")

    monkeypatch.setattr("app.refactor.verification_service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.refactor.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.analysis.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.ingestion.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.testgen.service.get_workspace_dir", lambda _: workspace_dir)

    proj = Project(
        id="proj_regress_demo",
        display_name="Regress Demo",
        source_type="demo_benchmark",
        source_url="demo/benchmarks/python_legacy",
        detected_languages=["python"],
        total_files=2,
        total_lines=120,
        content_hash="trustedhash2",
        workspace_id="ws_regress_demo",
        is_trusted=1,
    )
    test_db.add(proj)
    calc_code = (raw_dir / "calculator.py").read_text(encoding="utf-8")
    test_db.add(
        ProjectFile(
            id="pf_reg_calc",
            project_id=proj.id,
            relative_path="calculator.py",
            language="python",
            size_bytes=len(calc_code),
            line_count=calc_code.count("\n"),
            sha256_hash="reghash1",
        )
    )
    utils_code = (raw_dir / "utils.py").read_text(encoding="utf-8")
    test_db.add(
        ProjectFile(
            id="pf_reg_utils",
            project_id=proj.id,
            relative_path="utils.py",
            language="python",
            size_bytes=len(utils_code),
            line_count=utils_code.count("\n"),
            sha256_hash="reghash2",
        )
    )
    test_db.commit()
    run_analysis_for_project(test_db, proj.id)

    orig_exec = execute_generated_tests_safely

    def mock_exec_tests(raw_dir, test_files, is_trusted=False):
        files, cov, per_file, warn = orig_exec(raw_dir, test_files, is_trusted=is_trusted)
        failing_files = []
        for f in files:
            f_copy = f.model_copy()
            f_copy.execution_status = "failed"
            failing_files.append(f_copy)
        return failing_files, 0.0, {}, "Simulated regression"

    monkeypatch.setattr("app.refactor.verification_service.execute_generated_tests_safely", mock_exec_tests)

    result = run_refactor_verification(test_db, proj.id, force=True)
    assert result.status == "failed"
    assert result.verified is False
    assert result.after_tests.failed_tests > 0


def test_verification_api_endpoints(test_db, tmp_path, monkeypatch):
    """Test POST and GET /api/projects/{id}/refactor/verify endpoints."""
    workspace_dir = tmp_path / "workspaces" / "ws_api_test"
    raw_dir = workspace_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)
    (raw_dir / "calc.py").write_text("def add(a, b):\n    return a + b\n", encoding="utf-8")

    monkeypatch.setattr("app.refactor.verification_service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.refactor.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.analysis.service.get_workspace_dir", lambda _: workspace_dir)
    monkeypatch.setattr("app.ingestion.service.get_workspace_dir", lambda _: workspace_dir)

    proj = Project(
        id="proj_api_test",
        display_name="API Test",
        source_type="zip",
        source_url="upload.zip",
        detected_languages=["python"],
        total_files=1,
        total_lines=2,
        content_hash="apihash",
        workspace_id="ws_api_test",
        is_trusted=0,
    )
    test_db.add(proj)
    test_db.add(
        ProjectFile(
            id="pf_calc",
            project_id=proj.id,
            relative_path="calc.py",
            language="python",
            size_bytes=30,
            line_count=2,
            sha256_hash="calchash",
        )
    )
    test_db.commit()

    run_analysis_for_project(test_db, proj.id)

    fastapi_app.dependency_overrides[get_db] = lambda: test_db
    client = TestClient(fastapi_app)

    try:
        # 1. POST /verify
        res = client.post(f"/api/projects/{proj.id}/refactor/verify", json={"force": True})
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "safety_locked"
        assert data["verified"] is False
        assert data["can_execute"] is False

        # 2. GET /verify
        res_get = client.get(f"/api/projects/{proj.id}/refactor/verify")
        assert res_get.status_code == 200
        data_get = res_get.json()
        assert data_get["status"] == "safety_locked"
        assert data_get["verified"] is False
    finally:
        fastapi_app.dependency_overrides.clear()

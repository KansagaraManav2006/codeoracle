import logging
import os
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from app.analysis.dependency_resolver import resolve_project_dependencies
from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.javascript_analyzer import analyze_javascript_source
from app.analysis.models import ModuleAnalysis, ProjectAnalysis
from app.analysis.python_analyzer import analyze_python_source
from app.analysis.service import build_analysis_findings
from app.ingestion.service import get_workspace_dir
from app.migration.service import build_migration_plan
from app.models.db import Project, ProjectAnalysisRecord, ProjectFile, ProjectRefactorRecord
from app.refactor.models import ProjectRefactorResult
from app.refactor.service import run_refactor_for_project
from app.refactor.verification_models import (
    RefactorVerificationResult,
    TestExecutionComparison,
    VerificationMetricsComparison,
    VERIFICATION_ENGINE_VERSION,
)
from app.testgen.models import GeneratedTestFile
from app.testgen.runner import execute_generated_tests_safely
from app.testgen.service import run_test_generation_for_project

logger = logging.getLogger(__name__)


def compute_readiness_score(
    analysis: ProjectAnalysis,
    graph,
    test_files: List[GeneratedTestFile],
    overall_coverage: Optional[float],
) -> int:
    """Calculates project modernization readiness score based on reanalyzed metrics."""
    total = max(len(analysis.modules), 1)
    analysis_score = max(
        0,
        min(
            100,
            int(100 * (analysis.parse_success_count + analysis.parse_partial_count * 0.5) / total),
        ),
    )
    high_complexity = sum(
        module.complexity.rating in {"high", "critical"} for module in analysis.modules
    )
    complexity_score = max(0, min(100, int(100 - (high_complexity / total * 100))))
    warning_weight = sum(
        sum({"risk": 3, "warning": 2, "info": 1}.get(item.severity, 1) for item in module.legacy_warnings)
        for module in analysis.modules
    )
    maintainability_score = max(0, min(100, int(100 - min(85, warning_weight * 3 / total))))
    edge_density = graph.summary.internal_edges / total
    coupling_score = max(
        0, min(100, int(100 - min(85, edge_density * 18 + graph.summary.cycle_count * 12)))
    )

    if test_files:
        gen_count = len(test_files)
        valid_cnt = sum(1 for tf in test_files if tf.syntax_valid)
        syntax_ratio = valid_cnt / gen_count if gen_count > 0 else 0.0
        if overall_coverage is not None:
            # Actual measured coverage: full scoring (max ~100).
            testability_score = max(0, min(100, int(overall_coverage * 0.6 + syntax_ratio * 40)))
        else:
            # Syntax-valid but not executed: capped at 40 to distinguish from measured suites.
            # "No tests" baseline is 35; this signals generation exists but is unverified.
            testability_score = max(0, min(40, int(syntax_ratio * 40)))
    else:
        testability_score = 35

    scores = [analysis_score, complexity_score, coupling_score, maintainability_score, testability_score]
    return max(0, min(100, int(sum(s * 0.20 for s in scores))))


def run_refactor_verification(
    db: Session,
    project_id: str,
    force: bool = False,
) -> RefactorVerificationResult:
    """Executes the verified modernization loop in an ephemeral disposable workspace.

    Safety:
    - Restricts subprocess execution exclusively to trusted demo environments.
    - Untrusted uploads remain safety-locked.
    - Never mutates the original uploaded repository.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project '{project_id}' not found.")

    is_trusted = bool(project.is_trusted)

    # 1. Check cached verification in ProjectRefactorRecord
    refactor_rec = (
        db.query(ProjectRefactorRecord)
        .filter(ProjectRefactorRecord.project_id == project_id)
        .first()
    )
    if refactor_rec and not force:
        cached_verif = refactor_rec.refactor_data.get("verification")
        if cached_verif:
            try:
                return RefactorVerificationResult.model_validate(cached_verif)
            except Exception:
                logger.warning("Failed to deserialize cached verification for %s", project_id)

    # 2. If project is not trusted, enforce safety lock with zero subprocess execution
    if not is_trusted:
        refactor_res = run_refactor_for_project(db, project_id, force=force)
        plan = build_migration_plan(db, project_id)
        changed_paths = [f.relative_path for f in refactor_res.files if f.changed]
        all_syntax_valid = all(f.syntax_valid for f in refactor_res.files if f.changed)

        result = RefactorVerificationResult(
            project_id=project_id,
            verified_at=datetime.now(timezone.utc).isoformat(),
            status="safety_locked",
            verified=False,
            can_execute=False,
            execution_warning="Execution is restricted to trusted demo environments. Untrusted uploaded repositories remain safety-locked to protect host security.",
            syntax_status="passed" if all_syntax_valid else "failed",
            syntax_errors=[f.syntax_error for f in refactor_res.files if f.syntax_error],
            changed_files=changed_paths,
            baseline_tests=TestExecutionComparison(execution_status="unavailable"),
            after_tests=TestExecutionComparison(execution_status="unavailable"),
            metrics=VerificationMetricsComparison(
                readiness_before=plan.readiness_score,
                readiness_after=plan.readiness_score,
                readiness_delta=0,
                cycles_before=0,
                cycles_after=0,
                new_cycles=0,
                warnings_before=len(refactor_res.findings),
                warnings_after=len(refactor_res.findings),
                resolved_warnings_count=0,
                resolved_warnings=[],
            ),
            verification_summary="Execution safety-locked: Untrusted uploaded repository was not executed in the sandbox.",
        )

        # Cache in refactor record
        if refactor_rec:
            data = dict(refactor_rec.refactor_data)
            data["verification"] = result.model_dump(mode="json")
            refactor_rec.refactor_data = data
            db.commit()

        return result

    # 3. For trusted demo: establish baseline test results
    baseline_test_result = run_test_generation_for_project(db, project_id, execute=True, force=force)
    baseline_total = sum(tf.test_count for tf in baseline_test_result.test_files)
    baseline_passed = sum(
        tf.test_count for tf in baseline_test_result.test_files if tf.execution_status == "passed"
    )
    baseline_failed = sum(
        tf.test_count for tf in baseline_test_result.test_files if tf.execution_status == "failed"
    )
    baseline_cov = baseline_test_result.overall_line_coverage
    baseline_status = (
        "passed" if baseline_failed == 0 and baseline_passed > 0 else ("failed" if baseline_failed > 0 else "not_run")
    )

    # 4. Generate refactor proposals
    refactor_res = run_refactor_for_project(db, project_id, force=force)
    changed_files = [f for f in refactor_res.files if f.changed]
    changed_paths = [f.relative_path for f in changed_files]

    # Baseline migration plan for readiness and cycles
    baseline_plan = build_migration_plan(db, project_id)
    baseline_readiness = baseline_plan.readiness_score
    baseline_warnings = baseline_plan.findings
    baseline_cycles = 0
    anal_rec = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    if anal_rec:
        try:
            base_anal = ProjectAnalysis.model_validate(anal_rec.analysis_data)
            base_graph = build_project_dependency_graph(base_anal, include_external=False)
            baseline_cycles = base_graph.summary.cycle_count
        except Exception:
            pass

    if not changed_files:
        result = RefactorVerificationResult(
            project_id=project_id,
            verified_at=datetime.now(timezone.utc).isoformat(),
            status="no_changes",
            verified=True,
            can_execute=True,
            execution_warning=None,
            syntax_status="passed",
            syntax_errors=[],
            changed_files=[],
            baseline_tests=TestExecutionComparison(
                total_tests=baseline_total,
                passed_tests=baseline_passed,
                failed_tests=baseline_failed,
                line_coverage=baseline_cov,
                execution_status=baseline_status,
            ),
            after_tests=TestExecutionComparison(
                total_tests=baseline_total,
                passed_tests=baseline_passed,
                failed_tests=baseline_failed,
                line_coverage=baseline_cov,
                execution_status=baseline_status,
            ),
            metrics=VerificationMetricsComparison(
                readiness_before=baseline_readiness,
                readiness_after=baseline_readiness,
                readiness_delta=0,
                cycles_before=baseline_cycles,
                cycles_after=baseline_cycles,
                new_cycles=0,
                warnings_before=len(baseline_warnings),
                warnings_after=len(baseline_warnings),
                resolved_warnings_count=0,
                resolved_warnings=[],
            ),
            verification_summary="No refactor proposals required changes. Baseline code is verified.",
        )
        return result

    # 5. Create ephemeral disposable copy
    ws_dir = get_workspace_dir(project.workspace_id)
    raw_ws_dir = ws_dir / "raw"

    with tempfile.TemporaryDirectory(prefix="codeoracle_verify_") as tmp_dir_str:
        disposable_dir = Path(tmp_dir_str)
        disposable_raw = disposable_dir / "raw"
        shutil.copytree(raw_ws_dir, disposable_raw)

        # 6. Apply refactor to disposable copy
        syntax_errors = []
        syntax_ok = True
        for f in changed_files:
            target_path = disposable_raw / f.relative_path
            target_path.parent.mkdir(parents=True, exist_ok=True)
            target_path.write_text(f.refactored_code, encoding="utf-8")
            if not f.syntax_valid:
                syntax_ok = False
                if f.syntax_error:
                    syntax_errors.append(f"{f.relative_path}: {f.syntax_error}")

        # 7. Run regression test suite on modified disposable copy
        after_test_files, after_cov, after_per_file_cov, warning_msg = execute_generated_tests_safely(
            disposable_raw,
            baseline_test_result.test_files,
            is_trusted=True,
        )

        after_total = sum(tf.test_count for tf in after_test_files)
        after_passed = sum(
            tf.test_count for tf in after_test_files if tf.execution_status == "passed"
        )
        after_failed = sum(
            tf.test_count for tf in after_test_files if tf.execution_status == "failed"
        )
        after_status = (
            "passed" if after_failed == 0 and after_passed > 0 else ("failed" if after_failed > 0 else "not_run")
        )

        # 8. Re-analyze modified disposable copy
        reanalyzed_modules: List[ModuleAnalysis] = []
        all_disposable_files = list(disposable_raw.glob("**/*"))
        languages_found = set()

        for file_path in all_disposable_files:
            if not file_path.is_file():
                continue
            rel_path = file_path.relative_to(disposable_raw).as_posix()
            if rel_path.startswith("tests/") or rel_path.startswith("."):
                continue

            ext = file_path.suffix.lower()
            if ext == ".py":
                mod = analyze_python_source(project_id, rel_path, file_path)
                reanalyzed_modules.append(mod)
                languages_found.add("python")
            elif ext in (".js", ".jsx", ".ts", ".tsx", ".cjs"):
                mod = analyze_javascript_source(project_id, rel_path, file_path)
                reanalyzed_modules.append(mod)
                languages_found.add("javascript")

        success_count = sum(1 for m in reanalyzed_modules if m.parse_status == "complete")
        partial_count = sum(1 for m in reanalyzed_modules if m.parse_status == "partial")
        failure_count = sum(1 for m in reanalyzed_modules if m.parse_status == "failed")

        # Build post-refactor ProjectAnalysis & DependencyGraph
        disposable_analysis = ProjectAnalysis(
            project_id=project_id,
            content_hash=project.content_hash,
            languages=sorted(list(languages_found)),
            total_files=len(reanalyzed_modules),
            total_lines=sum(m.line_count for m in reanalyzed_modules),
            modules=reanalyzed_modules,
            parse_success_count=success_count,
            parse_partial_count=partial_count,
            parse_failure_count=failure_count,
        )

        disposable_edges = resolve_project_dependencies(reanalyzed_modules)
        # Assign resolved edges into the analysis object so the graph builder reads them.
        # Previously disposable_edges was incorrectly passed as the positional `level` arg,
        # which meant the analysis kept its default empty edge list and the graph always
        # reported zero cycles and zero internal edges.
        disposable_analysis.dependency_edges = disposable_edges
        disposable_graph = build_project_dependency_graph(disposable_analysis)
        after_cycles = disposable_graph.summary.cycle_count
        new_cycles = max(0, after_cycles - baseline_cycles)

        # Re-compute findings and resolved warnings
        after_findings = build_analysis_findings(project_id, reanalyzed_modules, disposable_edges)
        after_finding_keys = {(f.file, f.rule_id, f.line) for f in after_findings}

        resolved_warnings = [
            f.message
            for f in baseline_warnings
            if (f.file, f.rule_id, f.line) not in after_finding_keys
        ]
        resolved_count = len(resolved_warnings)

        # Compute new readiness score
        after_readiness = compute_readiness_score(
            disposable_analysis,
            disposable_graph,
            after_test_files,
            after_cov,
        )
        readiness_delta = after_readiness - baseline_readiness

        # Verification gate:
        # Verified requires: syntax passed, 0 new cycles, no test regressions (passed >= baseline and failed == 0)
        is_verified = bool(
            syntax_ok
            and new_cycles == 0
            and after_failed == 0
            and after_passed >= baseline_passed
            and after_passed > 0
        )
        verif_status = "verified" if is_verified else "failed"

        summary = (
            f"Verified: {after_passed} tests passed, syntax AST valid, 0 new cycles, "
            f"readiness {baseline_readiness} → {after_readiness} (+{readiness_delta})."
            if is_verified
            else f"Verification failed: {after_failed} test(s) failed or syntax issues detected."
        )

        result = RefactorVerificationResult(
            project_id=project_id,
            verified_at=datetime.now(timezone.utc).isoformat(),
            status=verif_status,
            verified=is_verified,
            can_execute=True,
            execution_warning=warning_msg,
            syntax_status="passed" if syntax_ok else "failed",
            syntax_errors=syntax_errors,
            changed_files=changed_paths,
            baseline_tests=TestExecutionComparison(
                total_tests=baseline_total,
                passed_tests=baseline_passed,
                failed_tests=baseline_failed,
                line_coverage=baseline_cov,
                execution_status=baseline_status,
            ),
            after_tests=TestExecutionComparison(
                total_tests=after_total,
                passed_tests=after_passed,
                failed_tests=after_failed,
                line_coverage=after_cov,
                execution_status=after_status,
            ),
            metrics=VerificationMetricsComparison(
                readiness_before=baseline_readiness,
                readiness_after=after_readiness,
                readiness_delta=readiness_delta,
                cycles_before=baseline_cycles,
                cycles_after=after_cycles,
                new_cycles=new_cycles,
                warnings_before=len(baseline_warnings),
                warnings_after=len(after_findings),
                resolved_warnings_count=resolved_count,
                resolved_warnings=resolved_warnings[:10],
            ),
            verification_summary=summary,
        )

    # 9. Cache in ProjectRefactorRecord
    if refactor_rec:
        data = dict(refactor_rec.refactor_data)
        data["verification"] = result.model_dump(mode="json")
        refactor_rec.refactor_data = data
        db.commit()

    return result

import logging
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from app.analysis.graph_service import (
    _classify_module_role,
    _classify_semantic_entry_point as classify_entry_point,
    build_project_dependency_graph,
)
from app.analysis.models import (
    ModuleAnalysis,
    ProjectAnalysis,
    decorate_findings,
    summarize_findings,
)
from app.analysis.scoring import (
    calculate_hotspot_score,
    get_complexity_severity,
    get_risk_level,
)
from app.analysis.service import build_analysis_findings
from app.migration.models import (
    ChangeImpact,
    ChecklistItem,
    DimensionBreakdownItem,
    MigrationPhase,
    MigrationPlanResponse,
    MigrationWave,
    ModernizationSummary,
    NextBestAction,
    ProtectionStatus,
    ReadinessAssessment,
    ReadinessCategory,
    ReadinessDimension,
    ScoreBlocker,
    WhyScore,
)
from app.migration.wave_planner import (
    build_first_action_summary,
    build_migration_phases,
    build_migration_waves,
    build_next_best_action,
)
from app.models.db import (
    Job,
    JobState,
    Project,
    ProjectAnalysisRecord,
    ProjectRefactorRecord,
    ProjectTestRecord,
)
from app.refactor.models import ProjectRefactorResult
from app.testgen.models import ProjectTestResult, TEST_GENERATOR_VERSION

logger = logging.getLogger(__name__)


def _bounded(value: float) -> int:
    return max(0, min(100, round(value)))


def _status(score: int) -> str:
    if score >= 90:
        return "High Readiness"
    if score >= 80:
        return "Strong Readiness"
    if score >= 60:
        return "Ready With Care"
    if score >= 40:
        return "High Preparation Needed"
    return "Not Ready"


def _threshold_label(score: int) -> str:
    if score >= 90:
        return "90–100: High Readiness"
    if score >= 80:
        return "80–89: Strong Readiness"
    if score >= 60:
        return "60–79: Ready With Care"
    if score >= 40:
        return "40–59: High Preparation Needed"
    return "0–39: Not Ready"


def _risk_rank(level: str) -> int:
    return {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(level.lower(), 0)


def _read_test_result(db: Session, project_id: str) -> Optional[ProjectTestResult]:
    try:
        record = (
            db.query(ProjectTestRecord)
            .filter(ProjectTestRecord.project_id == project_id)
            .first()
        )
        if not record:
            return None
        if record.generator_version != TEST_GENERATOR_VERSION:
            return None
        res = ProjectTestResult.model_validate(record.test_data)
        if res.generation_version != TEST_GENERATOR_VERSION:
            return None
        return res
    except Exception as exc:
        logger.warning(
            "Database read failure querying ProjectTestRecord for %s: %s",
            project_id,
            exc,
        )
        return None


def _read_refactor_result(db: Session, project_id: str) -> Optional[ProjectRefactorResult]:
    record = (
        db.query(ProjectRefactorRecord)
        .filter(ProjectRefactorRecord.project_id == project_id)
        .first()
    )
    if not record:
        return None
    try:
        return ProjectRefactorResult.model_validate(record.refactor_data)
    except Exception:
        logger.warning("Unable to read refactor results for project %s", project_id)
        return None


def _transitive_depth_and_nodes(
    start: str, reverse_edges: Dict[str, Set[str]]
) -> Tuple[int, Set[str]]:
    distances: Dict[str, int] = {}
    queue = deque(
        [(node, 1) for node in reverse_edges.get(start, set()) if node != start]
    )
    for node, d in queue:
        distances[node] = d

    max_depth = 0
    while queue:
        curr, depth = queue.popleft()
        if depth > max_depth:
            max_depth = depth
        for nxt in reverse_edges.get(curr, set()):
            if nxt == start:
                continue
            if nxt not in distances or depth + 1 > distances[nxt]:
                if depth + 1 <= 50:
                    distances[nxt] = depth + 1
                    queue.append((nxt, depth + 1))
    return max_depth, set(distances.keys())




def _is_trivial_file(relative_path: str, line_count: int) -> bool:
    lower = relative_path.replace("\\", "/").lower()
    fname = Path(lower).name
    if fname in ("__init__.py", "__main__.py", "vite.config.ts", "tsconfig.json", "index.ts", "setup.py") and line_count <= 10:
        return True
    if line_count <= 2:
        return True
    return False


def build_migration_plan(
    db: Session,
    project_id: str,
    analysis: Optional[ProjectAnalysis] = None,
) -> MigrationPlanResponse:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")
    if analysis is None:
        record = (
            db.query(ProjectAnalysisRecord)
            .filter(ProjectAnalysisRecord.project_id == project_id)
            .first()
        )
        if not record:
            raise RuntimeError("Analysis is required before creating a migration plan.")
        analysis = ProjectAnalysis.model_validate(record.analysis_data)
    modules: List[ModuleAnalysis] = analysis.modules
    module_by_id = {module.module_id: module for module in modules}
    path_by_id = {module.module_id: module.relative_path for module in modules}
    total_files = max(len(modules), 1)

    analysis_findings = analysis.findings or build_analysis_findings(
        project_id, modules, analysis.dependency_edges
    )
    findings_count_by_file: Dict[str, int] = defaultdict(int)
    for f in analysis_findings:
        findings_count_by_file[f.file] += 1

    refactor_result = _read_refactor_result(db, project_id)
    diff_paths: Set[str] = (
        {item.relative_path for item in refactor_result.files if item.changed}
        if refactor_result
        else set()
    )

    dependencies: Dict[str, Set[str]] = defaultdict(set)
    dependents: Dict[str, Set[str]] = defaultdict(set)
    unresolved_by_module: Dict[str, int] = defaultdict(int)

    for edge in analysis.dependency_edges:
        if not edge.resolved:
            unresolved_by_module[edge.source_module_id] += 1
            continue
        if edge.source_module_id not in module_by_id or edge.target_module_id not in module_by_id:
            continue
        dependencies[edge.source_module_id].add(edge.target_module_id)
        dependents[edge.target_module_id].add(edge.source_module_id)

    # Safety tests result
    test_result = _read_test_result(db, project_id)
    tests_by_target: Dict[str, List[str]] = defaultdict(list)
    if test_result:
        for test_file in test_result.test_files:
            tests_by_target[test_file.target_relative_path].append(test_file.safe_test_path)

    # Dependency Graph Summary (exact canonical data contract)
    graph = build_project_dependency_graph(analysis, include_external=False)
    graph_confidence = getattr(graph.summary, "graph_confidence", "medium") or "medium"
    if graph_confidence == "partial":
        graph_confidence = "medium"

    # 1. READINESS DIMENSIONS & SCORING

    # Dimension A: Parsing Readiness vs Full AST Coverage
    full_ast_count = getattr(analysis, "parse_success_count", 0)
    partial_count = getattr(analysis, "parse_partial_count", 0)
    fallback_count = getattr(analysis, "parse_fallback_count", 0)
    failed_count = getattr(analysis, "parse_failed_count", 0)

    full_ast_coverage_pct = round(100.0 * full_ast_count / total_files, 1)
    parser_readiness_score = _bounded(
        100.0 * (full_ast_count + partial_count * 0.5 + fallback_count * 0.25) / total_files
    )
    parser_confidence = "high" if full_ast_coverage_pct >= 80 else "medium" if full_ast_coverage_pct >= 50 else "low"

    parsing_dimension = ReadinessDimension(
        key="analysis",
        label="Parser readiness",
        score=parser_readiness_score,
        status=_status(parser_readiness_score),
        reason=f"Parser readiness considers full AST coverage ({full_ast_coverage_pct}%), partial fallback usability, and unsupported syntax.",
        formula="(Full AST * 100% + Partial * 50% + Fallback * 25%) / Total Files",
        evidence=[
            f"Full AST Coverage: {full_ast_count} of {total_files} files ({full_ast_coverage_pct}%)",
            f"Partial usable coverage: {partial_count} files",
            f"Fallback / resilient analysis: {fallback_count} files",
            f"Failed AST analysis: {failed_count} files",
        ],
        confidence=parser_confidence,
        breakdown=[
            DimensionBreakdownItem(label="Full AST coverage", value=f"{full_ast_coverage_pct}%"),
            DimensionBreakdownItem(label="Partial usable coverage", value=f"+{round(partial_count * 50.0 / total_files, 1)}"),
            DimensionBreakdownItem(label="Fallback analysis", value=f"+{round(fallback_count * 25.0 / total_files, 1)}"),
            DimensionBreakdownItem(label="Failed analysis", value="0"),
            DimensionBreakdownItem(label="Parser readiness score", value=f"{parser_readiness_score} / 100"),
        ],
    )

    # Dimension B: Complexity
    high_complexity = sum(
        module.complexity.rating in {"high", "critical"} for module in modules
    )
    critical_complexity = sum(
        module.complexity.rating == "critical" for module in modules
    )
    avg_complexity = round(
        sum(m.complexity.cyclomatic_complexity for m in modules) / total_files, 1
    )
    complexity_score = _bounded(100 - (high_complexity / total_files * 100))
    complexity_confidence = "high" if parser_confidence in ("high", "medium") else "low"

    complexity_dimension = ReadinessDimension(
        key="complexity",
        label="Complexity",
        score=complexity_score,
        status=_status(complexity_score),
        reason=f"{high_complexity} file(s) contain high or critical cyclomatic complexity logic.",
        formula="100 - (High/Critical Complexity Files / Total Files * 100)",
        evidence=[
            f"High / critical complexity modules: {high_complexity} of {total_files}",
            f"Critical complexity bottlenecks: {critical_complexity}",
            f"Average cyclomatic complexity: {avg_complexity} per module",
        ],
        confidence=complexity_confidence,
        breakdown=[
            DimensionBreakdownItem(label="Base clean score", value="100"),
            DimensionBreakdownItem(label="High complexity penalty", value=f"-{round(high_complexity / total_files * 100, 1)}"),
            DimensionBreakdownItem(label="Complexity score", value=f"{complexity_score} / 100"),
        ],
    )

    # Dimension C: Dependency Safety (Exact canonical graph metrics)
    resolved_edges = graph.summary.resolved_edges or graph.summary.internal_edges
    unresolved_imports = graph.summary.unresolved_imports
    cycle_count = graph.summary.cycle_count
    edge_density = resolved_edges / total_files
    coupling_penalty = min(85, edge_density * 18 + cycle_count * 15 + min(15, unresolved_imports * 1.5))
    coupling_score = _bounded(100 - coupling_penalty)
    dependency_confidence = graph_confidence

    dependency_dimension = ReadinessDimension(
        key="coupling",
        label="Dependency safety",
        score=coupling_score,
        status=_status(coupling_score),
        reason=f"{resolved_edges} resolved connection(s), {unresolved_imports} unresolved import(s), and {cycle_count} dependency loop(s).",
        formula="100 - min(85, (Density * 18) + (Cycles * 15) + (Unresolved * 1.5))",
        evidence=[
            f"Resolved internal edges: {resolved_edges}",
            f"Unresolved local imports: {unresolved_imports}",
            f"Detected dependency cycles: {cycle_count}",
            f"Graph confidence: {graph_confidence.title()}",
        ],
        confidence=dependency_confidence,
        breakdown=[
            DimensionBreakdownItem(label="Base connectivity score", value="100"),
            DimensionBreakdownItem(label="Internal coupling factor", value=f"-{round(edge_density * 18, 1)}"),
            DimensionBreakdownItem(label="Circular cycles penalty", value=f"-{min(85, cycle_count * 15)}"),
            DimensionBreakdownItem(label="Unresolved imports penalty", value=f"-{min(15, round(unresolved_imports * 1.5, 1))}"),
            DimensionBreakdownItem(label="Dependency safety score", value=f"{coupling_score} / 100"),
        ],
    )

    # Dimension D: Maintainability
    warning_weight = sum(
        sum({"risk": 3, "warning": 2, "info": 1}.get(item.severity, 1) for item in module.legacy_warnings)
        for module in modules
    )
    maintainability_score = _bounded(100 - min(85, warning_weight * 3 / total_files))
    modernization_candidates_count = sum(f.category == "modernization" for f in analysis_findings)
    maintainability_confidence = "high" if full_ast_coverage_pct >= 70 else "medium"

    maintainability_dimension = ReadinessDimension(
        key="maintainability",
        label="Maintainability",
        score=maintainability_score,
        status=_status(maintainability_score),
        reason=f"{modernization_candidates_count} modernization candidate(s) detected; {len(diff_paths)} deterministic change(s) generated.",
        formula="100 - min(85, (Legacy Finding Weights * 3) / Total Files)",
        evidence=[
            f"Modernization candidates detected: {modernization_candidates_count}",
            f"Deterministic changes generated: {len(diff_paths)}",
            f"Total legacy pattern flags: {warning_weight}",
        ],
        confidence=maintainability_confidence,
        breakdown=[
            DimensionBreakdownItem(label="Base maintainability score", value="100"),
            DimensionBreakdownItem(label="Legacy pattern penalty", value=f"-{min(85, round(warning_weight * 3 / total_files, 1))}"),
            DimensionBreakdownItem(label="Maintainability score", value=f"{maintainability_score} / 100"),
        ],
    )

    # Dimension E: Test Protection (Exact canonical test status)
    test_job = (
        db.query(Job)
        .filter(Job.project_id == project_id, Job.source_type == "test_generation")
        .order_by(Job.created_at.desc())
        .first()
    )

    if test_job and test_job.state in (JobState.QUEUED, JobState.GENERATING):
        testability_score = 35
        testability_status = "Calculating"
        test_reason = "Safety test suite generation is currently in progress."
        test_confidence = "low"
    elif test_job and test_job.state == JobState.FAILED:
        testability_score = 35
        testability_status = "Generation failed"
        test_reason = f"Test generation failed: {test_job.error_message or 'Generation error'}. Please retry."
        test_confidence = "low"
    elif test_result and test_result.test_files:
        gen_count = len(test_result.test_files)
        syntax_ratio = (test_result.syntax_valid_count / gen_count) if gen_count > 0 else 0.0
        coverage = test_result.overall_line_coverage
        if coverage is not None:
            testability_score = _bounded(coverage * 0.6 + syntax_ratio * 40)
            testability_status = _status(testability_score)
            test_reason = f"Generated tests cover {coverage:.1f}% of measured source lines in disposable sandbox."
            test_confidence = "high"
        else:
            testability_score = _bounded(min(40, syntax_ratio * 40))
            testability_status = "Estimated (not executed)"
            test_reason = (
                f"Syntax-based estimation only ({test_result.syntax_valid_count} of {gen_count} "
                "generated test file(s) pass syntax validation; execution not measured). "
                "Run the test suite to obtain a measured coverage score."
            )
            test_confidence = "medium"
    else:
        testability_score = 35
        testability_status = "Not calculated"
        test_reason = "Generate a safety test suite before changing production behavior."
        test_confidence = "low"

    testability_dimension = ReadinessDimension(
        key="testability",
        label="Test protection",
        score=testability_score,
        status=testability_status,
        reason=test_reason,
        formula="Line Coverage * 0.6 + Syntax Valid Ratio * 40 (capped at 40 if unexecuted)",
        evidence=[
            f"Generated test files: {len(test_result.test_files) if test_result else 0}",
            f"Syntax valid tests: {test_result.syntax_valid_count if test_result else 0}",
            f"Runtime verified tests: {test_result.executed_test_count if test_result and test_result.execution_enabled else 0}",
            f"Execution status: {'Measured' if (test_result and test_result.overall_line_coverage is not None) else 'Unmeasured in sandbox'}",
        ],
        confidence=test_confidence,
        breakdown=[
            DimensionBreakdownItem(
                label="Runtime measured coverage (60%)",
                value=f"+{round((test_result.overall_line_coverage or 0) * 0.6, 1)}" if (test_result and test_result.overall_line_coverage is not None) else "0 (Unmeasured)"
            ),
            DimensionBreakdownItem(
                label="Syntax validation harness (40%)",
                value=f"+{round((test_result.syntax_valid_count / max(len(test_result.test_files), 1)) * 40, 1)}" if test_result and test_result.test_files else "0"
            ),
            DimensionBreakdownItem(label="Baseline floor", value="35" if not test_result or not test_result.test_files else "N/A"),
            DimensionBreakdownItem(label="Test protection score", value=f"{testability_score} / 100"),
        ],
    )

    # 2. OVERALL READINESS SCORE & WHY THIS SCORE
    categories = [
        parsing_dimension,
        complexity_dimension,
        dependency_dimension,
        maintainability_dimension,
        testability_dimension,
    ]
    weights = {
        "analysis": 0.20,
        "complexity": 0.20,
        "coupling": 0.20,
        "maintainability": 0.20,
        "testability": 0.20,
    }
    readiness_score = _bounded(sum(item.score * weights[item.key] for item in categories))
    readiness_label = _status(readiness_score)
    threshold_label = _threshold_label(readiness_score)

    overall_confidence = (
        "high"
        if (parser_confidence == "high" and dependency_confidence == "high" and test_confidence == "high")
        else "medium"
        if (parser_confidence != "low" and dependency_confidence != "low")
        else "low"
    )
    confidence_reasons = []
    if parser_confidence != "high":
        confidence_reasons.append(f"AST parse coverage is {full_ast_coverage_pct}%")
    if unresolved_imports > 0:
        confidence_reasons.append(f"{unresolved_imports} unresolved local imports in graph")
    if test_confidence != "high":
        confidence_reasons.append("Runtime dynamic test execution has not been measured")

    why_strengths: List[str] = []
    why_needs_attention: List[str] = []

    if coupling_score >= 70:
        why_strengths.append("Dependency structure appears mostly manageable with controlled coupling")
    if cycle_count == 0:
        why_strengths.append("Zero dependency cycles detected in the resolved graph")
    if maintainability_score >= 70:
        why_strengths.append("Maintainability signals and module sizes are generally healthy")
    if complexity_score >= 75:
        why_strengths.append("Cyclomatic complexity is well-partitioned across majority of files")
    if parser_readiness_score >= 75:
        why_strengths.append("Parser readiness is robust with usable AST or resilient fallbacks")
    if testability_score >= 70:
        why_strengths.append("Characterization test harness provides measured behavioral verification")

    if testability_score <= 40:
        why_needs_attention.append("Runtime tests not executed; safety protection is syntax-estimated")
    if full_ast_coverage_pct < 80:
        why_needs_attention.append(f"Partial AST coverage ({full_ast_coverage_pct}%) leaves parsing gaps")
    if unresolved_imports > 0:
        why_needs_attention.append(f"{unresolved_imports} unresolved local import(s) limit graph completeness")
    if cycle_count > 0:
        why_needs_attention.append(f"{cycle_count} circular dependency loop(s) create coupling deadlock")
    if high_complexity > 0:
        why_needs_attention.append(f"{high_complexity} file(s) contain high cyclomatic complexity branches")

    why_score = WhyScore(strengths=why_strengths, needs_attention=why_needs_attention)

    # 3. CANONICAL CHANGE IMPACTS FOR EVERY MODULE
    impacts: List[ChangeImpact] = []
    for module in modules:
        depth, transitive = _transitive_depth_and_nodes(module.module_id, dependents)
        direct_in = dependents.get(module.module_id, set())
        direct_out = dependencies.get(module.module_id, set())
        direct_dependents = sorted(path_by_id[item] for item in direct_in if item in path_by_id)
        transitive_dependents = sorted(path_by_id[item] for item in transitive if item in path_by_id)
        direct_dependencies = sorted(path_by_id[item] for item in direct_out if item in path_by_id)

        # Cycles involving this module
        mod_cycles = [
            [path_by_id.get(nid, nid) for nid in cycle]
            for cycle in graph.cycles
            if module.module_id in cycle
        ]
        is_cycle_participant = bool(mod_cycles)

        # Canonical Risk Hotspot calculation from app.hotspots.service / app.analysis.scoring
        warnings_raw = max(len(module.legacy_warnings), findings_count_by_file.get(module.relative_path, 0))
        hotspot_score, factors_dict = calculate_hotspot_score(
            complexity_raw=module.complexity.cyclomatic_complexity,
            loc_raw=module.line_count,
            fan_in_raw=len(direct_dependents),
            warnings_raw=warnings_raw,
            blast_radius_raw=len(transitive_dependents),
        )
        canonical_overall_risk = get_risk_level(hotspot_score)
        canonical_complexity_sev = get_complexity_severity(module.complexity.cyclomatic_complexity)
        arch_role = _classify_module_role(module.relative_path, module)

        # True runtime entry root check
        is_entry, entry_kind, entry_conf, entry_ev = classify_entry_point(module.relative_path, module)
        is_true_runtime_root = is_entry and entry_kind in (
            "frontend_bootstrap",
            "app_runtime",
            "worker",
            "cli",
            "ml_training",
        )

        # Strict Wave Assignment Rules:
        # Wave 2: Cycles only
        # Wave 4: True runtime/bootstrap roots only
        # Wave 1: Low-risk leaves (fan-in 0, blast radius 0, no unresolved, risk <= medium)
        # Wave 3: Core services, business logic, or files with callers
        if is_cycle_participant:
            item_wave = 2
            item_wave_title = "Wave 2: Cycle Untangling & Decoupling"
            wave_reason = f"• Circular dependency participant ({len(mod_cycles)} loop(s)); untangle interfaces to eliminate recursive feedback."
        elif is_true_runtime_root:
            item_wave = 4
            item_wave_title = "Wave 4: Entry Points & Orchestration"
            wave_reason = f"★ Confirmed application runtime bootstrap root ({entry_kind}); modernize last after all dependencies stabilize."
        elif (
            len(direct_dependents) == 0
            and len(transitive_dependents) == 0
            and unresolved_by_module.get(module.module_id, 0) == 0
            and hotspot_score <= 50
        ):
            item_wave = 1
            item_wave_title = "Wave 1: Leaf & Isolated Modules"
            wave_reason = "✓ Isolated leaf utility: 0 incoming callers, blast radius 0, low estimated downstream impact."
        else:
            item_wave = 3
            item_wave_title = "Wave 3: Intermediate Services & Business Logic"
            wave_reason = f"• Shared component: called by {len(direct_dependents)} direct module(s) with {len(transitive_dependents)} downstream blast radius; architectural role: {arch_role}."

        affected_entries = sorted(
            path_by_id[item]
            for item in (transitive | {module.module_id})
            if item in path_by_id and module_by_id[item].is_entry_point
        )

        reasons: List[str] = []
        if transitive_dependents:
            reasons.append(f"Changes can propagate to {len(transitive_dependents)} downstream file(s).")
        if module.legacy_warnings:
            reasons.append(f"Contains {len(module.legacy_warnings)} modernization finding(s).")
        if module.complexity.rating in {"high", "critical"}:
            reasons.append(f"Cyclomatic complexity is rated {canonical_complexity_sev.upper()} ({module.complexity.cyclomatic_complexity}).")
        if is_true_runtime_root:
            reasons.append(f"Confirmed application execution root ({entry_kind}).")
        if mod_cycles:
            reasons.append(f"Participates in {len(mod_cycles)} circular dependency loop(s).")
        if not reasons:
            reasons.append("Isolated module with minimal static risk indicators.")

        risk_evidence: List[str] = [
            f"Risk: {canonical_overall_risk.upper()} (score {hotspot_score}/100)",
            f"Complexity: {canonical_complexity_sev.upper()} ({module.complexity.cyclomatic_complexity})",
            f"Callers: {len(direct_dependents)} direct, {len(transitive_dependents)} transitive blast radius (depth: {depth})",
            f"Blast radius: {len(direct_dependents)} direct, {len(transitive_dependents)} transitive",
            f"Role: {arch_role}",
        ]
        if affected_entries:
            risk_evidence.append(f"Entry points affected: {', '.join(affected_entries[:2])}")
        if mod_cycles:
            risk_evidence.append(f"Cycle participant: {len(mod_cycles)} loop(s)")

        # Protection status for module
        module_tests = tests_by_target.get(module.relative_path, [])
        file_protection = ProtectionStatus(
            generated_tests=len(module_tests),
            relevant_tests=len(module_tests),
            syntax_valid=len(module_tests),
            runtime_verified=len(module_tests) if test_result and test_result.execution_enabled else 0,
            execution_status="passed" if (test_result and test_result.execution_enabled and module_tests) else "not_run",
            summary_label=f"{len(module_tests)} characterization test file(s)" if module_tests else "Missing test protection",
        )

        # Contextual recommendation
        if mod_cycles:
            recommended_action = "Untangle circular dependencies by extracting interfaces before refactoring."
        elif hotspot_score >= 60 and not module_tests:
            recommended_action = "Generate safety characterization tests in the Safety Tests tab before modifying code."
        elif module.relative_path in diff_paths:
            recommended_action = "Preview and validate automated modernization diff in the Refactored Code tab."
        elif len(transitive_dependents) == 0:
            recommended_action = "Safe for targeted refactoring: low estimated downstream impact."
        else:
            recommended_action = f"Run existing characterization tests and verify downstream callers ({len(direct_dependents)} direct)."

        suggested_test_paths = list(module_tests)
        for dep in direct_dependents:
            for t in tests_by_target.get(dep, []):
                if t not in suggested_test_paths:
                    suggested_test_paths.append(t)
        if not suggested_test_paths:
            suggested_test_paths = [f"Generate safety tests for {module.relative_path}"]

        impacts.append(
            ChangeImpact(
                module_id=module.module_id,
                relative_path=module.relative_path,
                risk_level=canonical_overall_risk,
                hotspot_score=hotspot_score,
                complexity_severity=canonical_complexity_sev,
                architecture_role=arch_role,
                blast_radius=len(transitive_dependents),
                direct_blast_radius=len(direct_dependents),
                transitive_blast_radius=len(transitive_dependents),
                dependency_depth=depth,
                wave=item_wave,
                wave_title=item_wave_title,
                wave_eligibility_reason=wave_reason,
                is_cycle_participant=is_cycle_participant,
                is_score_blocker=False,
                graph_confidence=graph_confidence,
                change_confidence="high" if (graph_confidence == "high" and module.parse_status == "complete") else "medium",
                direct_dependents=direct_dependents,
                transitive_dependents=transitive_dependents,
                direct_dependencies=direct_dependencies,
                affected_entry_points=affected_entries,
                cycles=mod_cycles,
                suggested_tests=suggested_test_paths,
                protection_status=file_protection,
                reasons=reasons,
                risk_evidence=risk_evidence,
                recommended_action=recommended_action,
            )
        )

    # Sort priority files: highest hotspot score and blast radius first
    impacts.sort(key=lambda item: (-item.hotspot_score, -item.blast_radius, item.relative_path))
    impact_by_path = {item.relative_path: item for item in impacts}

    # 4. BLOCKERS (GLOBAL VS TOP FILE BLOCKERS)
    global_blockers: List[ScoreBlocker] = []
    file_blockers: List[ScoreBlocker] = []

    # Global Blocker 1: Unmeasured runtime test execution
    if test_result and test_result.test_files and test_result.overall_line_coverage is None:
        global_blockers.append(
            ScoreBlocker(
                category_key="testability",
                label="Runtime Verification Unavailable",
                current_score=testability_score,
                target_file=None,
                blocker_type="global",
                blocker_reason=f"{len(test_result.test_files)} test file(s) generated and syntax-validated, but sandbox execution has not been measured.",
                unblocking_action="Execute test runner in disposable sandbox to measure runtime line coverage.",
                priority_score=75,
            )
        )
    elif not test_result or not test_result.test_files:
        global_blockers.append(
            ScoreBlocker(
                category_key="testability",
                label="Baseline Safety Net Missing",
                current_score=testability_score,
                target_file=None,
                blocker_type="global",
                blocker_reason="No characterization test suites exist to safeguard legacy behavior during modernization.",
                unblocking_action="Generate characterization tests in the Safety Tests tab before modifying code.",
                priority_score=85,
            )
        )

    # Global Blocker 2: Unresolved imports
    if unresolved_imports > 0:
        global_blockers.append(
            ScoreBlocker(
                category_key="coupling",
                label="Unresolved Graph Dependencies",
                current_score=coupling_score,
                target_file=None,
                blocker_type="global",
                blocker_reason=f"{unresolved_imports} unresolved import(s) detected, introducing uncertainty in downstream blast-radius calculations.",
                unblocking_action="Review and resolve local import mappings to establish complete graph confidence.",
                priority_score=70 if unresolved_imports >= 10 else 55,
            )
        )

    # Global Blocker 3: Partial parse coverage
    if full_ast_coverage_pct < 85:
        global_blockers.append(
            ScoreBlocker(
                category_key="analysis",
                label="Partial AST Parse Coverage",
                current_score=parser_readiness_score,
                target_file=None,
                blocker_type="global",
                blocker_reason=f"{total_files - full_ast_count} file(s) parsed via partial or fallback analyzers due to syntax or token anomalies.",
                unblocking_action="Resolve syntax flags on partial files so AST analyzers can parse full symbol trees.",
                priority_score=60,
            )
        )

    # Top File Blockers: Rank by architectural priority (Risk + Blast + Missing Protection + Modernization)
    # Exclude trivial files (__init__.py, etc.)
    eligible_file_candidates = [
        item for item in impacts
        if not _is_trivial_file(item.relative_path, module_by_id[item.module_id].line_count)
    ]

    for item in eligible_file_candidates:
        has_tests = bool(tests_by_target.get(item.relative_path))
        is_mod_candidate = item.relative_path in diff_paths or findings_count_by_file.get(item.relative_path, 0) > 0
        file_priority = (
            item.hotspot_score
            + min(25, item.blast_radius * 3)
            + (20 if not has_tests and item.hotspot_score >= 50 else 0)
            + (15 if is_mod_candidate else 0)
            + (20 if item.is_cycle_participant else 0)
        )

        if item.is_cycle_participant:
            file_blockers.append(
                ScoreBlocker(
                    category_key="coupling",
                    label="Dependency Cycle Deadlock",
                    current_score=coupling_score,
                    target_file=item.relative_path,
                    blocker_type="file",
                    blocker_reason=f"Participates in circular import loops with cascading feedback across {item.blast_radius} files.",
                    unblocking_action=f"Extract shared interfaces or invert dependency in {item.relative_path}.",
                    priority_score=file_priority,
                    risk_level=item.risk_level,
                )
            )
        elif item.hotspot_score >= 50 and not has_tests:
            file_blockers.append(
                ScoreBlocker(
                    category_key="testability",
                    label="Unprotected High-Risk Service",
                    current_score=item.hotspot_score,
                    target_file=item.relative_path,
                    blocker_type="file",
                    blocker_reason=f"High risk ({item.risk_level.upper()} · {item.hotspot_score}) with {item.blast_radius} downstream callers lacks safety test harness.",
                    unblocking_action=f"Generate characterization tests for {item.relative_path} in Safety Tests.",
                    priority_score=file_priority,
                    risk_level=item.risk_level,
                )
            )
        elif item.complexity_severity in ("critical", "high"):
            file_blockers.append(
                ScoreBlocker(
                    category_key="complexity",
                    label="High Cyclomatic Complexity Hotspot",
                    current_score=item.hotspot_score,
                    target_file=item.relative_path,
                    blocker_type="file",
                    blocker_reason=f"Cyclomatic complexity {module_by_id[item.module_id].complexity.cyclomatic_complexity} creates high cognitive and testing overhead.",
                    unblocking_action=f"Refactor complex control branches in {item.relative_path} into focused subroutines.",
                    priority_score=file_priority,
                    risk_level=item.risk_level,
                )
            )

    file_blockers.sort(key=lambda b: -b.priority_score)
    # Deduplicate file blockers by target_file
    seen_targets: Set[str] = set()
    deduped_file_blockers: List[ScoreBlocker] = []
    for b in file_blockers:
        if b.target_file and b.target_file not in seen_targets:
            seen_targets.add(b.target_file)
            deduped_file_blockers.append(b)
            if len(deduped_file_blockers) >= 4:
                break
    file_blockers = deduped_file_blockers

    all_score_blockers = global_blockers + file_blockers
    for blocker in file_blockers:
        if blocker.target_file and blocker.target_file in impact_by_path:
            impact_by_path[blocker.target_file].is_score_blocker = True

    # 5. NEXT BEST ACTION (Actionable recommendation derived from primary blocker)
    next_best_action = build_next_best_action(
        file_blockers=file_blockers,
        unresolved_imports=unresolved_imports,
        cycle_count=cycle_count,
        impacts=impacts,
    )

    # 6. MIGRATION WAVES (Strict Rules)
    waves = build_migration_waves(
        impacts=impacts,
        file_blockers=file_blockers,
        diff_paths=diff_paths,
        findings_count_by_file=findings_count_by_file,
        tests_by_target=tests_by_target,
        impact_by_path=impact_by_path,
        test_confidence=test_confidence,
        dependency_confidence=dependency_confidence,
        cycle_count=cycle_count,
    )

    # 7. SUMMARY OBJECTS
    canonical_protection = ProtectionStatus(
        generated_tests=len(test_result.test_files) if test_result else 0,
        relevant_tests=sum(len(t) for t in tests_by_target.values()),
        syntax_valid=test_result.syntax_valid_count if test_result else 0,
        runtime_verified=test_result.executed_test_count if (test_result and test_result.execution_enabled) else 0,
        execution_status="passed" if (test_result and test_result.passed_test_count > 0) else "unmeasured" if (test_result and test_result.test_files) else "not_run",
        coverage_percentage=test_result.overall_line_coverage if test_result else None,
        summary_label=(
            f"Measured runtime coverage: {test_result.overall_line_coverage:.1f}%"
            if test_result and test_result.overall_line_coverage is not None
            else "Estimated (syntax-validated, unexecuted)"
            if test_result and test_result.test_files
            else "No test suites generated"
        ),
    )

    canonical_modernization = ModernizationSummary(
        findings=len(analysis_findings),
        candidates=refactor_result.modernization_state.candidates if (refactor_result and refactor_result.modernization_state) else modernization_candidates_count,
        autofix_eligible=refactor_result.modernization_state.autofix_eligible if (refactor_result and refactor_result.modernization_state) else sum(f.autofixable for f in analysis_findings),
        generated_diffs=len(diff_paths),
        verified_changes=refactor_result.modernization_state.runtime_verified if (refactor_result and refactor_result.modernization_state) else 0,
        deterministic_changes_generated=len(diff_paths),
    )

    # First action summary string
    first_action_summary = build_first_action_summary(
        file_blockers=file_blockers,
        global_blockers=global_blockers,
        waves=waves,
    )

    top_priorities = impacts[: min(6, len(impacts))]
    phases = build_migration_phases(impacts, module_by_id)

    executive_summary = (
        f"This project is {readiness_label.lower()} for modernization with a readiness score of {readiness_score}/100. "
        f"Start by establishing Wave 0 protection on the {len(top_priorities)} highest-impact file(s), "
        f"then modernize isolated leaf files before intermediate shared services and application entry points."
    )

    readiness_assessment = ReadinessAssessment(
        overall_score=readiness_score,
        overall_label=readiness_label,
        threshold_label=threshold_label,
        confidence=overall_confidence,
        confidence_reasons=confidence_reasons,
        full_ast_coverage_pct=full_ast_coverage_pct,
        parser_readiness_score=parser_readiness_score,
        why_score=why_score,
        next_best_action=next_best_action,
        dimensions={cat.key: cat for cat in categories},
        global_blockers=global_blockers,
        file_blockers=file_blockers,
    )

    plan_confidence_warning = None
    if overall_confidence != "high":
        reasons_text = "; ".join(confidence_reasons) if confidence_reasons else "Incomplete dependency graph"
        plan_confidence_warning = (
            f"Migration wave assignments rely on an incomplete dependency graph ({reasons_text}). "
            "Review unresolved imports before executing large refactors."
        )

    findings = decorate_findings(analysis_findings, diff_paths)

    return MigrationPlanResponse(
        project_id=project_id,
        readiness_score=readiness_score,
        readiness_label=readiness_label,
        readiness_confidence=overall_confidence,
        full_ast_coverage_pct=full_ast_coverage_pct,
        parser_readiness_score=parser_readiness_score,
        plan_confidence=overall_confidence,
        plan_confidence_warning=plan_confidence_warning,
        executive_summary=executive_summary,
        first_action_summary=first_action_summary,
        next_best_action=next_best_action,
        why_score=why_score,
        readiness=readiness_assessment,
        categories=categories,
        score_blockers=all_score_blockers,
        global_blockers=global_blockers,
        file_blockers=file_blockers,
        protection_status=canonical_protection,
        modernization_summary=canonical_modernization,
        top_priorities=top_priorities,
        impacts=sorted(impacts, key=lambda item: item.relative_path),
        phases=phases,
        waves=waves,
        findings=findings,
        finding_funnel=summarize_findings(findings),
    )


from app.migration.markdown_report import migration_plan_markdown


def get_module_change_impact(db: Session, project_id: str, target: str) -> ChangeImpact:
    """Retrieve detailed change-impact assessment for a specific module or file path."""
    plan = build_migration_plan(db, project_id)
    norm_target = target.replace("\\", "/").strip().lower()

    for item in plan.impacts:
        if (
            item.module_id == target
            or item.relative_path.replace("\\", "/").lower() == norm_target
            or item.relative_path.replace("\\", "/").lower().endswith(norm_target)
        ):
            return item

    raise ValueError(f"Module '{target}' not found in project '{project_id}'.")

from collections import defaultdict, deque
from typing import Dict, Iterable, List, Optional, Set

from sqlalchemy.orm import Session

from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import ProjectAnalysis
from app.migration.models import (
    ChangeImpact,
    MigrationPhase,
    MigrationPlanResponse,
    ReadinessCategory,
)
from app.models.db import Project, ProjectAnalysisRecord, ProjectTestRecord
from app.testgen.models import ProjectTestResult


def _bounded(value: float) -> int:
    return max(0, min(100, round(value)))


def _status(score: int) -> str:
    if score >= 80:
        return "Strong"
    if score >= 60:
        return "Ready with care"
    if score >= 40:
        return "Needs preparation"
    return "High risk"


def _risk_rank(level: str) -> int:
    return {"critical": 4, "high": 3, "medium": 2, "low": 1}.get(level, 0)


def _read_test_result(db: Session, project_id: str) -> Optional[ProjectTestResult]:
    record = db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == project_id).first()
    if not record:
        return None
    try:
        return ProjectTestResult.model_validate(record.test_data)
    except Exception:
        return None


def _transitive_dependents(start: str, reverse_edges: Dict[str, Set[str]]) -> Set[str]:
    seen: Set[str] = set()
    queue = deque(reverse_edges.get(start, set()))
    while queue:
        current = queue.popleft()
        if current in seen or current == start:
            continue
        seen.add(current)
        queue.extend(reverse_edges.get(current, set()))
    return seen


def _phase_files(items: Iterable[ChangeImpact], limit: int = 8) -> List[str]:
    result: List[str] = []
    for item in items:
        if item.relative_path not in result:
            result.append(item.relative_path)
        if len(result) >= limit:
            break
    return result


def build_migration_plan(db: Session, project_id: str) -> MigrationPlanResponse:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")
    record = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    if not record:
        raise RuntimeError("Analysis is required before creating a migration plan.")

    analysis = ProjectAnalysis.model_validate(record.analysis_data)
    modules = analysis.modules
    module_by_id = {module.module_id: module for module in modules}
    path_by_id = {module.module_id: module.relative_path for module in modules}
    entry_ids = {module.module_id for module in modules if module.is_entry_point}

    dependencies: Dict[str, Set[str]] = defaultdict(set)
    dependents: Dict[str, Set[str]] = defaultdict(set)
    for edge in analysis.dependency_edges:
        if not edge.resolved or edge.source_module_id not in module_by_id or edge.target_module_id not in module_by_id:
            continue
        dependencies[edge.source_module_id].add(edge.target_module_id)
        dependents[edge.target_module_id].add(edge.source_module_id)

    test_result = _read_test_result(db, project_id)
    tests_by_target: Dict[str, List[str]] = defaultdict(list)
    if test_result:
        for test_file in test_result.test_files:
            tests_by_target[test_file.target_relative_path].append(test_file.safe_test_path)

    impacts: List[ChangeImpact] = []
    for module in modules:
        transitive = _transitive_dependents(module.module_id, dependents)
        direct_in = dependents.get(module.module_id, set())
        direct_out = dependencies.get(module.module_id, set())
        warning_weight = sum({"risk": 3, "warning": 2, "info": 1}.get(item.severity, 1) for item in module.legacy_warnings)
        complexity_weight = {"critical": 8, "high": 5, "medium": 2, "low": 0}.get(module.complexity.rating, 1)
        raw_risk = warning_weight + complexity_weight + min(len(transitive), 10) + (5 if module.is_entry_point else 0)
        risk_level = "critical" if raw_risk >= 18 else "high" if raw_risk >= 10 else "medium" if raw_risk >= 4 else "low"
        affected_entries = sorted(path_by_id[item] for item in transitive | {module.module_id} if item in entry_ids)
        reasons: List[str] = []
        if transitive:
            reasons.append(f"Changes can affect {len(transitive)} downstream file(s).")
        if module.legacy_warnings:
            reasons.append(f"Contains {len(module.legacy_warnings)} modernization suggestion(s).")
        if module.complexity.rating in {"high", "critical"}:
            reasons.append(f"Complexity is rated {module.complexity.rating}.")
        if module.is_entry_point:
            reasons.append("This is an application entry point.")
        if not reasons:
            reasons.append("No major static-analysis risk indicators were found.")
        suggested_tests = sorted(tests_by_target.get(module.relative_path, []))
        if not suggested_tests:
            suggested_tests = [f"Generate tests for {module.relative_path}"]
        impacts.append(ChangeImpact(
            module_id=module.module_id,
            relative_path=module.relative_path,
            risk_level=risk_level,
            blast_radius=len(transitive),
            direct_dependents=sorted(path_by_id[item] for item in direct_in),
            direct_dependencies=sorted(path_by_id[item] for item in direct_out),
            affected_entry_points=affected_entries,
            suggested_tests=suggested_tests,
            reasons=reasons,
        ))

    impacts.sort(key=lambda item: (-_risk_rank(item.risk_level), -item.blast_radius, item.relative_path))

    total = max(len(modules), 1)
    analysis_score = _bounded(100 * (analysis.parse_success_count + analysis.parse_partial_count * 0.5) / total)
    high_complexity = sum(module.complexity.rating in {"high", "critical"} for module in modules)
    complexity_score = _bounded(100 - (high_complexity / total * 100))
    warning_weight = sum(sum({"risk": 3, "warning": 2, "info": 1}.get(item.severity, 1) for item in module.legacy_warnings) for module in modules)
    maintainability_score = _bounded(100 - min(85, warning_weight * 3 / total))
    graph = build_project_dependency_graph(analysis, include_external=False)
    edge_density = graph.summary.internal_edges / total
    coupling_score = _bounded(100 - min(85, edge_density * 18 + graph.summary.cycle_count * 12))
    if test_result and test_result.test_files:
        syntax_ratio = test_result.syntax_valid_count / len(test_result.test_files)
        coverage = test_result.overall_line_coverage
        testability_score = _bounded((coverage if coverage is not None else 60) * 0.6 + syntax_ratio * 40)
        test_reason = (f"Generated tests cover {coverage:.1f}% of source lines." if coverage is not None else
                       f"{test_result.syntax_valid_count} of {len(test_result.test_files)} generated test files pass syntax validation.")
    else:
        testability_score = 35
        test_reason = "Generate a safety test suite before changing production behavior."

    categories = [
        ReadinessCategory(key="analysis", label="Code understanding", score=analysis_score, status=_status(analysis_score), reason=f"{analysis.parse_success_count} of {analysis.total_files} files were fully understood."),
        ReadinessCategory(key="complexity", label="Complexity", score=complexity_score, status=_status(complexity_score), reason=f"{high_complexity} file(s) contain high-complexity logic."),
        ReadinessCategory(key="coupling", label="Dependency safety", score=coupling_score, status=_status(coupling_score), reason=f"{graph.summary.internal_edges} internal connection(s) and {graph.summary.cycle_count} dependency loop(s) were detected."),
        ReadinessCategory(key="maintainability", label="Maintainability", score=maintainability_score, status=_status(maintainability_score), reason=f"The analysis found {sum(len(module.legacy_warnings) for module in modules)} modernization suggestion(s)."),
        ReadinessCategory(key="testability", label="Test protection", score=testability_score, status=_status(testability_score), reason=test_reason),
    ]
    weights = {"analysis": .20, "complexity": .20, "coupling": .20, "maintainability": .20, "testability": .20}
    readiness_score = _bounded(sum(item.score * weights[item.key] for item in categories))

    low_risk_wins = [item for item in impacts if item.risk_level in {"low", "medium"} and "suggestion" in " ".join(item.reasons).lower()]
    core_items = [item for item in impacts if item.blast_radius > 0 or item.risk_level in {"high", "critical"}]
    entry_items = [item for item in impacts if item.affected_entry_points or module_by_id[item.module_id].is_entry_point]
    phases = [
        MigrationPhase(phase=1, title="Build the safety net", goal="Protect current behavior before changing code.", risk_level="low", files=_phase_files(impacts, 5), actions=["Generate and review tests for priority files.", "Record current behavior and expected outputs.", "Require all syntax checks to pass."]),
        MigrationPhase(phase=2, title="Apply low-risk improvements", goal="Remove isolated legacy patterns with limited blast radius.", risk_level="low", files=_phase_files(low_risk_wins), actions=["Modernize one file at a time.", "Run the affected tests after every change.", "Keep each change easy to review and roll back."]),
        MigrationPhase(phase=3, title="Untangle shared modules", goal="Reduce coupling and simplify high-impact code.", risk_level="medium", files=_phase_files(core_items), actions=["Break dependency loops before large rewrites.", "Create stable interfaces around shared modules.", "Add integration tests for connected files."]),
        MigrationPhase(phase=4, title="Modernize entry points", goal="Update startup and orchestration code after dependencies are stable.", risk_level="high", files=_phase_files(entry_items), actions=["Change entry points last.", "Run the full regression suite.", "Prepare a rollback plan before release."]),
    ]
    phases = [phase for phase in phases if phase.files or phase.phase == 1]
    top_priorities = impacts[: min(6, len(impacts))]
    executive_summary = (
        f"This project is {_status(readiness_score).lower()} for modernization with a readiness score of {readiness_score}/100. "
        f"Start by protecting the {len(top_priorities)} highest-impact file(s), then modernize isolated files before shared modules and entry points."
    )
    return MigrationPlanResponse(
        project_id=project_id,
        readiness_score=readiness_score,
        readiness_label=_status(readiness_score),
        executive_summary=executive_summary,
        categories=categories,
        top_priorities=top_priorities,
        impacts=sorted(impacts, key=lambda item: item.relative_path),
        phases=phases,
    )


def migration_plan_markdown(plan: MigrationPlanResponse, project_name: str) -> str:
    lines = [
        f"# {project_name} Modernization Plan",
        "",
        f"**Readiness:** {plan.readiness_score}/100 — {plan.readiness_label}",
        "",
        plan.executive_summary,
        "",
        "## Readiness breakdown",
        "",
    ]
    lines.extend(f"- **{item.label}: {item.score}/100** — {item.reason}" for item in plan.categories)
    lines.extend(["", "## Highest-impact files", ""])
    lines.extend(f"- **{item.relative_path}** — {item.risk_level.title()} risk, {item.blast_radius} downstream file(s)" for item in plan.top_priorities)
    for phase in plan.phases:
        lines.extend(["", f"## Phase {phase.phase}: {phase.title}", "", phase.goal, ""])
        if phase.files:
            lines.append("Files:")
            lines.extend(f"- `{path}`" for path in phase.files)
            lines.append("")
        lines.append("Actions:")
        lines.extend(f"- {action}" for action in phase.actions)
    lines.extend(["", "---", "Generated by CodeOracle. Review this plan with the engineering team before applying changes.", ""])
    return "\n".join(lines)

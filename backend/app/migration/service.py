import logging
from collections import defaultdict, deque
from typing import Dict, Iterable, List, Optional, Set

from sqlalchemy.orm import Session

from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import ProjectAnalysis, decorate_findings, summarize_findings
from app.analysis.service import build_analysis_findings
from app.migration.models import (
    ChangeImpact,
    ChecklistItem,
    MigrationPhase,
    MigrationWave,
    MigrationPlanResponse,
    ReadinessCategory,
    ScoreBlocker,
)
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectRefactorRecord, ProjectTestRecord
from app.refactor.models import ProjectRefactorResult
from app.testgen.models import ProjectTestResult, TEST_GENERATOR_VERSION

logger = logging.getLogger(__name__)


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
    try:
        record = db.query(ProjectTestRecord).filter(ProjectTestRecord.project_id == project_id).first()
        if not record:
            logger.info("ProjectTestRecord missing for project_id=%s", project_id)
            return None
        if record.generator_version != TEST_GENERATOR_VERSION:
            logger.warning(
                "ProjectTestRecord generator_version mismatch for project_id=%s: stored=%s expected=%s",
                project_id,
                record.generator_version,
                TEST_GENERATOR_VERSION,
            )
            return None
        try:
            res = ProjectTestResult.model_validate(record.test_data)
            if res.generation_version != TEST_GENERATOR_VERSION:
                logger.warning(
                    "ProjectTestResult generation_version mismatch for project_id=%s: stored=%s expected=%s",
                    project_id,
                    res.generation_version,
                    TEST_GENERATOR_VERSION,
                )
                return None
            return res
        except Exception as ve:
            logger.error("ProjectTestRecord test_data invalid for project_id=%s: %s", project_id, ve)
            return None
    except Exception as dbe:
        logger.exception("Database read failure when querying ProjectTestRecord for project_id=%s: %s", project_id, dbe)
        return None


def _read_refactor_result(db: Session, project_id: str) -> Optional[ProjectRefactorResult]:
    record = db.query(ProjectRefactorRecord).filter(ProjectRefactorRecord.project_id == project_id).first()
    if not record:
        return None
    try:
        return ProjectRefactorResult.model_validate(record.refactor_data)
    except Exception:
        logger.warning("Unable to read refactor results for project %s", project_id)
        return None


def _transitive_depth_and_nodes(start: str, reverse_edges: Dict[str, Set[str]]) -> tuple[int, Set[str]]:
    distances: Dict[str, int] = {}
    queue = deque([(node, 1) for node in reverse_edges.get(start, set()) if node != start])
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


def _transitive_dependents(start: str, reverse_edges: Dict[str, Set[str]]) -> Set[str]:
    _, nodes = _transitive_depth_and_nodes(start, reverse_edges)
    return nodes


def _phase_files(items: Iterable[ChangeImpact], limit: int = 8) -> List[str]:
    result: List[str] = []
    for item in items:
        if item.relative_path not in result:
            result.append(item.relative_path)
        if len(result) >= limit:
            break
    return result


def _compute_score_blockers(
    categories: List[ReadinessCategory],
    modules: List,
    graph,
    impacts: List[ChangeImpact],
    tests_by_target: Dict[str, List[str]],
) -> List[ScoreBlocker]:
    blockers: List[ScoreBlocker] = []

    for cat in categories:
        if cat.score >= 60:
            continue
        if cat.key == "maintainability":
            # Identify modules with highest legacy warning weights
            for mod in sorted(
                modules,
                key=lambda m: sum({"risk": 3, "warning": 2, "info": 1}.get(w.severity, 1) for w in m.legacy_warnings),
                reverse=True,
            ):
                if mod.legacy_warnings:
                    blockers.append(ScoreBlocker(
                        category_key=cat.key,
                        label=cat.label,
                        current_score=cat.score,
                        target_file=mod.relative_path,
                        blocker_reason=f"{len(mod.legacy_warnings)} legacy code issue(s) in {mod.relative_path} (e.g. {mod.legacy_warnings[0].code}).",
                        unblocking_action=f"Modernize legacy patterns in {mod.relative_path} to unblock maintainability score.",
                    ))
                    break
        elif cat.key == "coupling":
            if graph.summary.cycle_count > 0:
                cycle_files: Set[str] = set()
                for c in graph.cycles:
                    for f in c:
                        cycle_files.add(f)
                first_f = sorted(list(cycle_files))[0] if cycle_files else None
                blockers.append(ScoreBlocker(
                    category_key=cat.key,
                    label=cat.label,
                    current_score=cat.score,
                    target_file=first_f,
                    blocker_reason=f"{graph.summary.cycle_count} circular dependency loop(s) detected, creating coupling deadlock.",
                    unblocking_action="Untangle circular imports by extracting shared interfaces or inversion.",
                ))
        elif cat.key == "complexity":
            for mod in sorted(modules, key=lambda m: m.complexity.cyclomatic_complexity, reverse=True):
                if mod.complexity.rating in {"high", "critical"}:
                    blockers.append(ScoreBlocker(
                        category_key=cat.key,
                        label=cat.label,
                        current_score=cat.score,
                        target_file=mod.relative_path,
                        blocker_reason=f"High complexity score ({mod.complexity.cyclomatic_complexity}) in {mod.relative_path}.",
                        unblocking_action=f"Refactor complex branches in {mod.relative_path} into focused utility functions.",
                    ))
                    break
        elif cat.key == "testability":
            untested = [m.relative_path for m in modules if not tests_by_target.get(m.relative_path)]
            target_f = untested[0] if untested else (modules[0].relative_path if modules else None)
            blockers.append(ScoreBlocker(
                category_key=cat.key,
                label=cat.label,
                current_score=cat.score,
                target_file=target_f,
                blocker_reason=cat.reason,
                unblocking_action="Generate characterization tests in the Generated Tests tab before modifying code.",
            ))
        elif cat.key == "analysis":
            imperfect = [m.relative_path for m in modules if m.parse_status != "complete"]
            target_f = imperfect[0] if imperfect else None
            blockers.append(ScoreBlocker(
                category_key=cat.key,
                label=cat.label,
                current_score=cat.score,
                target_file=target_f,
                blocker_reason=cat.reason,
                unblocking_action="Fix syntax or tokenizer errors so all source files can be fully analyzed.",
            ))

    return blockers


def _build_migration_waves(
    impacts: List[ChangeImpact],
    categories: List[ReadinessCategory],
    score_blockers: List[ScoreBlocker],
    tests_by_target: Dict[str, List[str]],
    diff_paths: Set[str],
) -> List[MigrationWave]:
    impact_by_path = {item.relative_path: item for item in impacts}
    waves: List[MigrationWave] = []

    # Wave 0: Safety Net & Baseline Tests
    wave0_files: List[str] = []
    seen0: Set[str] = set()
    for blocker in score_blockers:
        if blocker.target_file and blocker.target_file in impact_by_path and blocker.target_file not in seen0:
            wave0_files.append(blocker.target_file)
            seen0.add(blocker.target_file)
    for item in impacts:
        if item.risk_level in {"critical", "high"} and item.relative_path not in seen0:
            wave0_files.append(item.relative_path)
            seen0.add(item.relative_path)
    if not wave0_files and impacts:
        wave0_files.append(impacts[0].relative_path)

    wave0_tests: List[str] = []
    for f in wave0_files:
        for t in tests_by_target.get(f, []):
            if t not in wave0_tests:
                wave0_tests.append(t)
    if not wave0_tests:
        wave0_tests = [f"Generate characterization tests for {f}" for f in wave0_files[:3]]

    wave0_checklist = [
        ChecklistItem(
            id=f"w0_test_{f}",
            task=f"Generate and lock characterization tests for {f}",
            target_file=f,
            action_type="test",
        )
        for f in wave0_files[:4]
    ]
    wave0_checklist.append(
        ChecklistItem(
            id="w0_syntax_check",
            task="Verify baseline test suite passes with 100% syntax validation",
            action_type="test",
        )
    )

    waves.append(
        MigrationWave(
            wave=0,
            name="Wave 0",
            title="Wave 0: Safety Net & Baseline Tests",
            goal="Establish characterization test coverage and resolve score blockers before editing code.",
            strategy="Locking in current behavior prevents regressions. High-risk modules and readiness score blockers must be protected first.",
            risk_level="low",
            files=wave0_files,
            total_direct_dependents=sum(len(impact_by_path[f].direct_dependents) for f in wave0_files if f in impact_by_path),
            total_transitive_blast_radius=sum(impact_by_path[f].blast_radius for f in wave0_files if f in impact_by_path),
            affected_entry_points=sorted(list(set(ep for f in wave0_files if f in impact_by_path for ep in impact_by_path[f].affected_entry_points))),
            suggested_test_order=wave0_tests[:8],
            checklist=wave0_checklist,
        )
    )

    # Wave 1: Leaf & Isolated Modules
    wave1_impacts = [item for item in impacts if item.wave == 1]
    wave1_files = [item.relative_path for item in wave1_impacts]
    wave1_tests: List[str] = []
    for f in wave1_files:
        for t in tests_by_target.get(f, []):
            if t not in wave1_tests:
                wave1_tests.append(t)
    if not wave1_tests and wave1_files:
        wave1_tests = [f"Unit test suite for {f}" for f in wave1_files[:3]]

    wave1_checklist = []
    for item in wave1_impacts[:5]:
        if item.relative_path in diff_paths:
            wave1_checklist.append(
                ChecklistItem(
                    id=f"w1_apply_{item.relative_path}",
                    task=f"Apply and verify automated modernization diff for {item.relative_path}",
                    target_file=item.relative_path,
                    action_type="refactor",
                )
            )
        else:
            wave1_checklist.append(
                ChecklistItem(
                    id=f"w1_review_{item.relative_path}",
                    task=f"Review and modernize leaf utility logic in {item.relative_path}",
                    target_file=item.relative_path,
                    action_type="refactor",
                )
            )

    waves.append(
        MigrationWave(
            wave=1,
            name="Wave 1",
            title="Wave 1: Leaf & Isolated Modules",
            goal="Modernize standalone and leaf utilities with zero or minimal downstream blast radius.",
            strategy="Safe quick wins: because no other internal modules depend on these files, changes carry zero downstream regression risk.",
            risk_level="low",
            files=wave1_files,
            total_direct_dependents=sum(len(item.direct_dependents) for item in wave1_impacts),
            total_transitive_blast_radius=sum(item.blast_radius for item in wave1_impacts),
            affected_entry_points=sorted(list(set(ep for item in wave1_impacts for ep in item.affected_entry_points))),
            suggested_test_order=wave1_tests[:8],
            checklist=wave1_checklist,
        )
    )

    # Wave 2: Dependency Cycle Decoupling
    wave2_impacts = [item for item in impacts if item.wave == 2]
    wave2_files = [item.relative_path for item in wave2_impacts]
    if wave2_files:
        wave2_tests: List[str] = []
        for f in wave2_files:
            for t in tests_by_target.get(f, []):
                if t not in wave2_tests:
                    wave2_tests.append(t)
        if not wave2_tests:
            wave2_tests = [f"Cycle contract test for {f}" for f in wave2_files[:3]]

        wave2_checklist = []
        for item in wave2_impacts[:4]:
            wave2_checklist.append(
                ChecklistItem(
                    id=f"w2_cycle_{item.relative_path}",
                    task=f"Untangle cyclic dependency in {item.relative_path} (extract interfaces/types)",
                    target_file=item.relative_path,
                    action_type="cycle_decouple",
                )
            )
        wave2_checklist.append(
            ChecklistItem(
                id="w2_verify_cycles",
                task="Re-run dependency analysis to confirm cycle count drops to 0",
                action_type="test",
            )
        )

        waves.append(
            MigrationWave(
                wave=2,
                name="Wave 2",
                title="Wave 2: Cycle Untangling & Decoupling",
                goal="Break circular dependency loops and extract clean shared boundaries.",
                strategy="Circular dependencies cause recursive regressions. Breaking cycles early isolates downstream changes.",
                risk_level="high",
                files=wave2_files,
                total_direct_dependents=sum(len(item.direct_dependents) for item in wave2_impacts),
                total_transitive_blast_radius=sum(item.blast_radius for item in wave2_impacts),
                affected_entry_points=sorted(list(set(ep for item in wave2_impacts for ep in item.affected_entry_points))),
                suggested_test_order=wave2_tests[:8],
                checklist=wave2_checklist,
            )
        )

    # Wave 3: Intermediate Business Logic & Shared Services
    wave3_impacts = [item for item in impacts if item.wave == 3]
    wave3_files = [item.relative_path for item in wave3_impacts]
    if wave3_files:
        wave3_tests: List[str] = []
        for f in wave3_files:
            for t in tests_by_target.get(f, []):
                if t not in wave3_tests:
                    wave3_tests.append(t)
        if not wave3_tests:
            wave3_tests = [f"Integration test for {f}" for f in wave3_files[:3]]

        wave3_checklist = [
            ChecklistItem(
                id=f"w3_service_{item.relative_path}",
                task=f"Modernize service functions in {item.relative_path}",
                target_file=item.relative_path,
                action_type="refactor",
            )
            for item in wave3_impacts[:5]
        ]
        wave3_checklist.append(
            ChecklistItem(
                id="w3_regression",
                task="Run regression test suite for downstream callers",
                action_type="test",
            )
        )

        waves.append(
            MigrationWave(
                wave=3,
                name="Wave 3",
                title="Wave 3: Intermediate Services & Business Logic",
                goal="Modernize core domain logic once underlying leaves and cycle boundaries are verified.",
                strategy="Intermediate services carry moderate blast radius. Modernizing after leaf modules guarantees dependable dependencies.",
                risk_level="medium",
                files=wave3_files,
                total_direct_dependents=sum(len(item.direct_dependents) for item in wave3_impacts),
                total_transitive_blast_radius=sum(item.blast_radius for item in wave3_impacts),
                affected_entry_points=sorted(list(set(ep for item in wave3_impacts for ep in item.affected_entry_points))),
                suggested_test_order=wave3_tests[:8],
                checklist=wave3_checklist,
            )
        )

    # Wave 4: Entry Points & Orchestration
    wave4_impacts = [item for item in impacts if item.wave == 4]
    wave4_files = [item.relative_path for item in wave4_impacts]
    if wave4_files:
        wave4_tests: List[str] = []
        for f in wave4_files:
            for t in tests_by_target.get(f, []):
                if t not in wave4_tests:
                    wave4_tests.append(t)
        if not wave4_tests:
            wave4_tests = [f"E2E / CLI smoke test for {f}" for f in wave4_files[:3]]

        wave4_checklist = [
            ChecklistItem(
                id=f"w4_entry_{item.relative_path}",
                task=f"Modernize startup/bootstrap code in entry point {item.relative_path}",
                target_file=item.relative_path,
                action_type="entry_verify",
            )
            for item in wave4_impacts[:4]
        ]
        wave4_checklist.append(
            ChecklistItem(
                id="w4_full_regression",
                task="Execute end-to-end verification and prepare release rollback plan",
                action_type="entry_verify",
            )
        )

        waves.append(
            MigrationWave(
                wave=4,
                name="Wave 4",
                title="Wave 4: Entry Points & Orchestration",
                goal="Modernize application entry points and orchestration after all dependencies are stable.",
                strategy="Entry points tie the entire system together. Changing them last prevents breaking the runtime during active refactoring.",
                risk_level="high",
                files=wave4_files,
                total_direct_dependents=sum(len(item.direct_dependents) for item in wave4_impacts),
                total_transitive_blast_radius=sum(item.blast_radius for item in wave4_impacts),
                affected_entry_points=sorted(list(set(ep for item in wave4_impacts for ep in item.affected_entry_points))),
                suggested_test_order=wave4_tests[:8],
                checklist=wave4_checklist,
            )
        )

    return waves


def _synthesize_first_action(
    waves: List[MigrationWave],
    score_blockers: List[ScoreBlocker],
    impacts: List[ChangeImpact],
) -> str:
    parts: List[str] = []

    if score_blockers:
        b = score_blockers[0]
        if b.target_file:
            parts.append(f"Establish Wave 0 safety test protection on {b.target_file} to resolve the primary score blocker ({b.blocker_reason}).")
        else:
            parts.append(f"Resolve the primary readiness blocker: {b.unblocking_action}.")

    w1 = next((w for w in waves if w.wave == 1), None)
    if w1 and w1.files:
        sample_files = ", ".join(w1.files[:2])
        parts.append(f"Modernize Wave 1 leaf modules first ({sample_files}) because they have 0 downstream dependents and zero regression blast radius.")

    w2 = next((w for w in waves if w.wave == 2), None)
    if w2 and w2.files:
        parts.append(f"Untangle Wave 2 circular dependency in {w2.files[0]} before refactoring intermediate services to eliminate cascading feedback loops.")

    w4 = next((w for w in waves if w.wave == 4), None)
    if w4 and w4.files:
        parts.append(f"Modernize Wave 4 entry points ({w4.files[0]}) last once all underlying dependencies have verified characterization test suites.")

    return " ".join(parts) if parts else "Modernize leaf utility files first, followed by shared services and entry points."


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
    analysis_findings = analysis.findings or build_analysis_findings(
        project_id, modules, analysis.dependency_edges,
    )
    refactor_result = _read_refactor_result(db, project_id)
    diff_paths = {
        item.relative_path for item in refactor_result.files if item.changed
    } if refactor_result else set()

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

    graph = build_project_dependency_graph(analysis, include_external=False)

    impacts: List[ChangeImpact] = []
    for module in modules:
        depth, transitive = _transitive_depth_and_nodes(module.module_id, dependents)
        direct_in = dependents.get(module.module_id, set())
        direct_out = dependencies.get(module.module_id, set())
        warning_weight = sum({"risk": 3, "warning": 2, "info": 1}.get(item.severity, 1) for item in module.legacy_warnings)
        complexity_weight = {"critical": 8, "high": 5, "medium": 2, "low": 0}.get(module.complexity.rating, 1)
        raw_risk = warning_weight + complexity_weight + min(len(transitive), 10) + (5 if module.is_entry_point else 0)
        risk_level = "critical" if raw_risk >= 18 else "high" if raw_risk >= 10 else "medium" if raw_risk >= 4 else "low"
        affected_entries = sorted(path_by_id[item] for item in transitive | {module.module_id} if item in entry_ids)

        direct_dependents = sorted(path_by_id[item] for item in direct_in)
        transitive_dependents = sorted(path_by_id[item] for item in transitive)
        direct_dependencies = sorted(path_by_id[item] for item in direct_out)

        # Cycles involving this module
        mod_cycles = [
            [path_by_id.get(nid, nid) for nid in cycle]
            for cycle in graph.cycles
            if module.module_id in cycle
        ]

        reasons: List[str] = []
        if transitive:
            reasons.append(f"Changes can affect {len(transitive)} downstream file(s).")
        if module.legacy_warnings:
            reasons.append(f"Contains {len(module.legacy_warnings)} modernization suggestion(s).")
        if module.complexity.rating in {"high", "critical"}:
            reasons.append(f"Complexity is rated {module.complexity.rating}.")
        if module.is_entry_point:
            reasons.append("This is an application entry point.")
        if mod_cycles:
            reasons.append(f"Participates in {len(mod_cycles)} dependency loop(s).")
        if not reasons:
            reasons.append("No major static-analysis risk indicators were found.")

        # Structured risk evidence
        risk_evidence: List[str] = [
            f"Complexity: score {module.complexity.cyclomatic_complexity} ({module.complexity.rating} rating)",
            f"Callers: {len(direct_dependents)} direct, {len(transitive_dependents)} transitive blast radius (depth: {depth})",
            f"Dependencies: {len(direct_dependencies)} direct imports",
        ]
        if affected_entries:
            risk_evidence.append(f"Affects entry points: {', '.join(affected_entries[:3])}")
        if mod_cycles:
            risk_evidence.append(f"In dependency cycle with: {', '.join([c[0] for c in mod_cycles if c and c[0] != module.relative_path][:2]) or 'circular import'}")
        if module.legacy_warnings:
            risk_evidence.append(f"Legacy code flags: {len(module.legacy_warnings)} detected")

        # Contextual recommended action
        if mod_cycles:
            recommended_action = "Untangle cyclic dependency before refactoring to prevent regressions."
        elif risk_level in {"critical", "high"}:
            if tests_by_target.get(module.relative_path):
                recommended_action = f"Run {len(tests_by_target[module.relative_path])} existing characterization test(s) before modifying."
            else:
                recommended_action = "Generate safety characterization tests to lock in current behavior before editing."
        elif module.relative_path in diff_paths:
            recommended_action = "Preview and validate automated modernization diff in the Refactored Code tab."
        else:
            recommended_action = "Safe for targeted refactoring: minimal downstream blast radius."

        ordered_suggested_tests: List[str] = []
        if tests_by_target.get(module.relative_path):
            ordered_suggested_tests.extend(tests_by_target[module.relative_path])
        for dep_path in direct_dependents:
            if tests_by_target.get(dep_path):
                for t in tests_by_target[dep_path]:
                    if t not in ordered_suggested_tests:
                        ordered_suggested_tests.append(t)
        for ep_path in affected_entries:
            if tests_by_target.get(ep_path):
                for t in tests_by_target[ep_path]:
                    if t not in ordered_suggested_tests:
                        ordered_suggested_tests.append(t)
        if not ordered_suggested_tests:
            ordered_suggested_tests = [f"Generate characterization tests for {module.relative_path}"]

        if mod_cycles:
            item_wave = 2
            item_wave_title = "Wave 2: Cycle Untangling & Decoupling"
        elif module.is_entry_point:
            item_wave = 4
            item_wave_title = "Wave 4: Entry Points & Orchestration"
        elif len(direct_dependencies) == 0 or len(direct_dependents) == 0:
            item_wave = 1
            item_wave_title = "Wave 1: Leaf & Isolated Modules"
        else:
            item_wave = 3
            item_wave_title = "Wave 3: Intermediate Services & Business Logic"

        impacts.append(ChangeImpact(
            module_id=module.module_id,
            relative_path=module.relative_path,
            risk_level=risk_level,
            blast_radius=len(transitive),
            direct_blast_radius=len(direct_dependents),
            transitive_blast_radius=len(transitive),
            dependency_depth=depth,
            wave=item_wave,
            wave_title=item_wave_title,
            is_cycle_participant=bool(mod_cycles),
            is_score_blocker=False,
            direct_dependents=direct_dependents,
            transitive_dependents=transitive_dependents,
            direct_dependencies=direct_dependencies,
            affected_entry_points=affected_entries,
            cycles=mod_cycles,
            suggested_tests=ordered_suggested_tests,
            reasons=reasons,
            risk_evidence=risk_evidence,
            recommended_action=recommended_action,
        ))

    impacts.sort(key=lambda item: (-_risk_rank(item.risk_level), -item.blast_radius, item.relative_path))

    total = max(len(modules), 1)
    analysis_score = _bounded(100 * (analysis.parse_success_count + analysis.parse_partial_count * 0.5) / total)
    high_complexity = sum(module.complexity.rating in {"high", "critical"} for module in modules)
    complexity_score = _bounded(100 - (high_complexity / total * 100))
    warning_weight = sum(sum({"risk": 3, "warning": 2, "info": 1}.get(item.severity, 1) for item in module.legacy_warnings) for module in modules)
    maintainability_score = _bounded(100 - min(85, warning_weight * 3 / total))
    edge_density = graph.summary.internal_edges / total
    coupling_score = _bounded(100 - min(85, edge_density * 18 + graph.summary.cycle_count * 12))
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
    elif test_job and test_job.state == JobState.FAILED:
        testability_score = 35
        testability_status = "Generation failed"
        test_reason = f"Test generation failed: {test_job.error_message or 'Generation error'}. Please retry."
    elif test_result and test_result.test_files:
        gen_count = len(test_result.test_files)
        syntax_ratio = (test_result.syntax_valid_count / gen_count) if gen_count > 0 else 0.0
        coverage = test_result.overall_line_coverage
        if coverage is not None:
            # Actual measured coverage: full scoring path.
            testability_score = _bounded(coverage * 0.6 + syntax_ratio * 40)
            testability_status = _status(testability_score)
            test_reason = f"Generated tests cover {coverage:.1f}% of measured source lines."
        else:
            # Test files generated and syntax-validated but never executed.
            # Cap at 40 to distinguish from measured results; 35 is the "no tests" floor.
            testability_score = _bounded(min(40, syntax_ratio * 40))
            testability_status = "Estimated (not executed)"
            test_reason = (
                f"Syntax-based estimation only ({test_result.syntax_valid_count} of {gen_count} "
                "generated test file(s) pass syntax validation; execution not measured). "
                "Run the test suite to obtain a measured coverage score."
            )
    else:
        testability_score = 35
        testability_status = "Not calculated"
        test_reason = "Generate a safety test suite before changing production behavior."

    categories = [
        ReadinessCategory(key="analysis", label="Parsing completeness", score=analysis_score, status=_status(analysis_score), reason=f"{analysis.parse_success_count} of {analysis.total_files} files were fully parsed."),
        ReadinessCategory(key="complexity", label="Complexity", score=complexity_score, status=_status(complexity_score), reason=f"{high_complexity} file(s) contain high-complexity logic."),
        ReadinessCategory(key="coupling", label="Dependency safety", score=coupling_score, status=_status(coupling_score), reason=f"{graph.summary.internal_edges} internal connection(s) and {graph.summary.cycle_count} dependency loop(s) were detected."),
        ReadinessCategory(key="maintainability", label="Maintainability", score=maintainability_score, status=_status(maintainability_score), reason=f"The analysis found {sum(f.category == 'modernization' for f in analysis_findings)} modernization suggestion(s)."),
        ReadinessCategory(key="testability", label="Test protection", score=testability_score, status=testability_status, reason=test_reason),
    ]
    weights = {"analysis": .20, "complexity": .20, "coupling": .20, "maintainability": .20, "testability": .20}
    readiness_score = _bounded(sum(item.score * weights[item.key] for item in categories))

    score_blockers = _compute_score_blockers(categories, modules, graph, impacts, tests_by_target)
    blocker_files = {b.target_file for b in score_blockers if b.target_file}
    for imp in impacts:
        if imp.relative_path in blocker_files:
            imp.is_score_blocker = True

    waves = _build_migration_waves(impacts, categories, score_blockers, tests_by_target, diff_paths)
    first_action_summary = _synthesize_first_action(waves, score_blockers, impacts)

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
    findings = decorate_findings(analysis_findings, diff_paths)
    executive_summary = (
        f"This project is {_status(readiness_score).lower()} for modernization with a readiness score of {readiness_score}/100. "
        f"Start by protecting the {len(top_priorities)} highest-impact file(s), then modernize isolated files before shared modules and entry points."
    )
    return MigrationPlanResponse(
        project_id=project_id,
        readiness_score=readiness_score,
        readiness_label=_status(readiness_score),
        executive_summary=executive_summary,
        first_action_summary=first_action_summary,
        categories=categories,
        score_blockers=score_blockers,
        top_priorities=top_priorities,
        impacts=sorted(impacts, key=lambda item: item.relative_path),
        phases=phases,
        waves=waves,
        findings=findings,
        finding_funnel=summarize_findings(findings),
    )


def migration_plan_markdown(plan: MigrationPlanResponse, project_name: str) -> str:
    lines = [
        f"# {project_name} Modernization Plan",
        "",
        f"**Readiness:** {plan.readiness_score}/100 — {plan.readiness_label}",
        "",
        plan.executive_summary,
        "",
    ]
    if plan.first_action_summary:
        lines.extend(["## Recommended First Action", "", plan.first_action_summary, ""])
    if plan.score_blockers:
        lines.extend(["## Readiness Score Blockers", ""])
        for b in plan.score_blockers:
            target = f" (`{b.target_file}`)" if b.target_file else ""
            lines.append(f"- **{b.label} Blocked**{target}: {b.blocker_reason} ➔ *Action:* {b.unblocking_action}")
        lines.append("")
    if plan.waves:
        lines.extend(["## Migration Waves", ""])
        for wave in plan.waves:
            lines.extend([
                f"### {wave.title} ({wave.risk_level.title()} Risk)",
                "",
                f"**Goal:** {wave.goal}",
                "",
                f"**Strategy:** {wave.strategy}",
                "",
                f"**Direct Callers:** {wave.total_direct_dependents} | **Transitive Blast Radius:** {wave.total_transitive_blast_radius}",
                "",
            ])
            if wave.files:
                lines.append("Files in wave:")
                lines.extend(f"- `{f}`" for f in wave.files)
                lines.append("")
            if wave.suggested_test_order:
                lines.append("Suggested test order:")
                lines.extend(f"- `{t}`" for t in wave.suggested_test_order)
                lines.append("")
            if wave.checklist:
                lines.append("Checklist:")
                lines.extend(f"- [ ] {item.task}" for item in wave.checklist)
                lines.append("")
    lines.extend([
        "## Finding funnel",
        "",
        f"- **{plan.finding_funnel.total_findings} total findings**",
        f"- **{plan.finding_funnel.modernization_candidates} modernization candidates**",
        f"- **{plan.finding_funnel.generated_diffs} generated diffs**",
        f"- **{plan.finding_funnel.verified_changes} verified changes**",
        "",
        plan.finding_funnel.verification_label,
        "",
        "## Readiness breakdown",
        "",
    ])
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


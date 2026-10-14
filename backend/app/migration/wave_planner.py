"""Migration wave and phase planning calculations for CodeOracle.

Implements deterministic topological wave partitioning:
- Wave 0: Safety Net & Characterization Baseline
- Wave 1: Leaf & Isolated Modules (low downstream blast radius)
- Wave 2: Dependency Cycle Decoupling (untangling circular imports)
- Wave 3: Intermediate Services & Domain Logic
- Wave 4: Entry Points & Application Bootstrappers
"""

from typing import Dict, Iterable, List, Optional, Set

from app.analysis.models import ModuleAnalysis
from app.migration.models import (
    ChangeImpact,
    ChecklistItem,
    MigrationPhase,
    MigrationWave,
    NextBestAction,
    ScoreBlocker,
)


def _phase_files(items: Iterable[ChangeImpact], limit: int = 8) -> List[str]:
    seen: Set[str] = set()
    files: List[str] = []
    for item in items:
        if item.relative_path not in seen:
            seen.add(item.relative_path)
            files.append(item.relative_path)
        if len(files) >= limit:
            break
    return files


def build_next_best_action(
    file_blockers: List[ScoreBlocker],
    unresolved_imports: int,
    cycle_count: int,
    impacts: List[ChangeImpact],
) -> NextBestAction:
    """Computes actionable next step derived from primary blocker."""
    if file_blockers:
        primary_fb = file_blockers[0]
        return NextBestAction(
            action=f"Protect {primary_fb.target_file}",
            target_file=primary_fb.target_file,
            reason=primary_fb.blocker_reason,
            action_type="protect",
        )
    if unresolved_imports > 10:
        return NextBestAction(
            action=f"Resolve {unresolved_imports} unresolved local imports",
            target_file=None,
            reason="Dependency confidence is limiting migration planning accuracy.",
            action_type="resolve_deps",
        )
    if cycle_count > 0:
        return NextBestAction(
            action=f"Untangle {cycle_count} circular dependency loop(s)",
            target_file=None,
            reason="Circular dependencies deadlock wave ordering.",
            action_type="cycle_decouple",
        )
    sample_w1 = next((i.relative_path for i in impacts if i.wave == 1), None)
    return NextBestAction(
        action="Modernize Wave 1 leaf modules",
        target_file=sample_w1,
        reason="Isolated leaf utilities carry low estimated downstream impact and provide safe quick wins.",
        action_type="modernize",
    )


def build_migration_waves(
    impacts: List[ChangeImpact],
    file_blockers: List[ScoreBlocker],
    diff_paths: Set[str],
    findings_count_by_file: Dict[str, int],
    tests_by_target: Dict[str, List[str]],
    impact_by_path: Dict[str, ChangeImpact],
    test_confidence: str,
    dependency_confidence: str,
    cycle_count: int,
) -> List[MigrationWave]:
    """Partitions repository modules into strictly ordered, risk-bounded migration waves."""
    waves: List[MigrationWave] = []

    # Wave 0: Safety Net & Baseline Tests
    wave0_files: List[str] = []
    seen0: Set[str] = set()
    for item in impacts:
        if (item.relative_path in diff_paths or findings_count_by_file.get(item.relative_path, 0) > 0) and not tests_by_target.get(item.relative_path):
            if item.relative_path not in seen0:
                wave0_files.append(item.relative_path)
                seen0.add(item.relative_path)
    for b in file_blockers:
        if b.target_file and b.target_file not in seen0 and not tests_by_target.get(b.target_file):
            wave0_files.append(b.target_file)
            seen0.add(b.target_file)
    if not wave0_files and impacts:
        wave0_files.append(impacts[0].relative_path)

    wave0_tests: List[str] = []
    for f in wave0_files:
        for t in tests_by_target.get(f, []):
            if t not in wave0_tests:
                wave0_tests.append(t)
    if not wave0_tests:
        wave0_tests = [f"Generate characterization tests for {f}" for f in wave0_files[:4]]

    wave0_checklist = [
        ChecklistItem(
            id=f"w0_test_{f}",
            task=f"Generate and lock characterization test contract for {f}",
            target_file=f,
            action_type="test",
        )
        for f in wave0_files[:4]
    ]
    wave0_checklist.append(
        ChecklistItem(
            id="w0_syntax_check",
            task="Verify baseline safety test suites pass with 100% syntax validation",
            action_type="test",
        )
    )

    waves.append(
        MigrationWave(
            wave=0,
            name="Wave 0",
            title="Wave 0: Safety Net & Baseline Tests",
            goal="Establish characterization test coverage on planned modernization files before editing code.",
            strategy="Locking in current behavioral contracts prevents regressions. Candidate files lacking protection must be covered first.",
            status="required",
            confidence=test_confidence,
            dependencies=[],
            risk_level="low",
            files=wave0_files,
            total_direct_dependents=sum(len(impact_by_path[f].direct_dependents) for f in wave0_files if f in impact_by_path),
            total_transitive_blast_radius=sum(impact_by_path[f].blast_radius for f in wave0_files if f in impact_by_path),
            protection_readiness_pct=round(100.0 * sum(bool(tests_by_target.get(f)) for f in wave0_files) / max(len(wave0_files), 1)),
            affected_entry_points=sorted(list(set(ep for f in wave0_files if f in impact_by_path for ep in impact_by_path[f].affected_entry_points))),
            suggested_test_order=wave0_tests[:8],
            checklist=wave0_checklist,
        )
    )

    # Wave 1: Low-Risk Leaves
    wave1_impacts = [item for item in impacts if item.wave == 1]
    wave1_files = [item.relative_path for item in wave1_impacts]
    wave1_tests: List[str] = []
    for f in wave1_files:
        for t in tests_by_target.get(f, []):
            if t not in wave1_tests:
                wave1_tests.append(t)
    if not wave1_tests and wave1_files:
        wave1_tests = [f"Unit test suite for {f}" for f in wave1_files[:3]]

    wave1_checklist = [
        ChecklistItem(
            id=f"w1_mod_{item.relative_path}",
            task=f"Modernize isolated utility logic in {item.relative_path}",
            target_file=item.relative_path,
            action_type="refactor",
        )
        for item in wave1_impacts[:5]
    ]

    waves.append(
        MigrationWave(
            wave=1,
            name="Wave 1",
            title="Wave 1: Leaf & Isolated Modules",
            goal="Modernize standalone and leaf utilities with zero incoming dependents and low estimated downstream impact.",
            strategy="Safe quick wins: because no other internal modules depend on these files, changes carry low estimated downstream impact.",
            status="required" if wave1_files else "not_required",
            confidence=dependency_confidence,
            dependencies=[0],
            risk_level="low",
            files=wave1_files,
            total_direct_dependents=0,
            total_transitive_blast_radius=0,
            protection_readiness_pct=round(100.0 * sum(bool(tests_by_target.get(f)) for f in wave1_files) / max(len(wave1_files), 1)) if wave1_files else 100,
            affected_entry_points=[],
            suggested_test_order=wave1_tests[:8],
            checklist=wave1_checklist,
        )
    )

    # Wave 2: Dependency Cycle Decoupling
    wave2_impacts = [item for item in impacts if item.wave == 2]
    wave2_files = [item.relative_path for item in wave2_impacts]

    if cycle_count == 0 or not wave2_files:
        waves.append(
            MigrationWave(
                wave=2,
                name="Wave 2",
                title="Wave 2: Cycle Untangling & Decoupling",
                goal="Break circular dependency loops and decouple bidirectional imports.",
                strategy="No dependency cycles were detected in the resolved graph. Wave 2 is not required for this project.",
                status="not_required",
                confidence="high",
                dependencies=[0],
                risk_level="low",
                files=[],
                total_direct_dependents=0,
                total_transitive_blast_radius=0,
                protection_readiness_pct=100,
                affected_entry_points=[],
                suggested_test_order=[],
                checklist=[],
            )
        )
    else:
        wave2_tests: List[str] = []
        for f in wave2_files:
            for t in tests_by_target.get(f, []):
                if t not in wave2_tests:
                    wave2_tests.append(t)
        if not wave2_tests:
            wave2_tests = [f"Cycle contract test for {f}" for f in wave2_files[:3]]

        wave2_checklist = [
            ChecklistItem(
                id=f"w2_cycle_{item.relative_path}",
                task=f"Untangle circular dependency loop in {item.relative_path} (extract interface or invert dependency)",
                target_file=item.relative_path,
                action_type="cycle_decouple",
            )
            for item in wave2_impacts[:4]
        ]
        wave2_checklist.append(
            ChecklistItem(
                id="w2_verify_cycles",
                task="Re-run dependency analysis to verify cycle count drops to 0",
                action_type="test",
            )
        )

        waves.append(
            MigrationWave(
                wave=2,
                name="Wave 2",
                title="Wave 2: Cycle Untangling & Decoupling",
                goal="Break circular dependency loops and extract clean shared boundaries.",
                strategy="Circular dependencies cause recursive regressions. Breaking cycles early isolates downstream changes before intermediate services are refactored.",
                status="required",
                confidence=dependency_confidence,
                dependencies=[0],
                risk_level="high",
                files=wave2_files,
                total_direct_dependents=sum(len(item.direct_dependents) for item in wave2_impacts),
                total_transitive_blast_radius=sum(item.blast_radius for item in wave2_impacts),
                protection_readiness_pct=round(100.0 * sum(bool(tests_by_target.get(f)) for f in wave2_files) / max(len(wave2_files), 1)),
                affected_entry_points=sorted(list(set(ep for item in wave2_impacts for ep in item.affected_entry_points))),
                suggested_test_order=wave2_tests[:8],
                checklist=wave2_checklist,
            )
        )

    # Wave 3: Intermediate Services & Business Logic
    wave3_impacts = [item for item in impacts if item.wave == 3]
    wave3_files = [item.relative_path for item in wave3_impacts]
    wave3_tests: List[str] = []
    for f in wave3_files:
        for t in tests_by_target.get(f, []):
            if t not in wave3_tests:
                wave3_tests.append(t)
    if not wave3_tests and wave3_files:
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
            task="Run regression test harness for downstream callers",
            action_type="test",
        )
    )

    waves.append(
        MigrationWave(
            wave=3,
            name="Wave 3",
            title="Wave 3: Intermediate Services & Business Logic",
            goal="Modernize core domain services and shared repositories once underlying leaves and cycle boundaries are verified.",
            strategy="Intermediate services carry significant blast radius. Modernizing after leaf modules guarantees dependable dependencies.",
            status="required" if wave3_files else "not_required",
            confidence=dependency_confidence,
            dependencies=[0, 1, 2],
            risk_level="medium",
            files=wave3_files,
            total_direct_dependents=sum(len(item.direct_dependents) for item in wave3_impacts),
            total_transitive_blast_radius=sum(item.blast_radius for item in wave3_impacts),
            protection_readiness_pct=round(100.0 * sum(bool(tests_by_target.get(f)) for f in wave3_files) / max(len(wave3_files), 1)) if wave3_files else 100,
            affected_entry_points=sorted(list(set(ep for item in wave3_impacts for ep in item.affected_entry_points))),
            suggested_test_order=wave3_tests[:8],
            checklist=wave3_checklist,
        )
    )

    # Wave 4: Entry Points & Orchestration
    wave4_impacts = [item for item in impacts if item.wave == 4]
    wave4_files = [item.relative_path for item in wave4_impacts]
    wave4_tests: List[str] = []
    for f in wave4_files:
        for t in tests_by_target.get(f, []):
            if t not in wave4_tests:
                wave4_tests.append(t)
    if not wave4_tests and wave4_files:
        wave4_tests = [f"E2E / CLI smoke test for {f}" for f in wave4_files[:3]]

    wave4_checklist = [
        ChecklistItem(
            id=f"w4_entry_{item.relative_path}",
            task=f"Modernize startup/bootstrap code in runtime root {item.relative_path}",
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
            goal="Modernize true application bootstrap entry points after all dependencies are stable.",
            strategy="Entry points tie the entire system together. Changing them last prevents breaking application startup during active refactoring.",
            status="required" if wave4_files else "not_required",
            confidence="high" if wave4_files else "medium",
            dependencies=[3],
            risk_level="high",
            files=wave4_files,
            total_direct_dependents=sum(len(item.direct_dependents) for item in wave4_impacts),
            total_transitive_blast_radius=sum(item.blast_radius for item in wave4_impacts),
            protection_readiness_pct=round(100.0 * sum(bool(tests_by_target.get(f)) for f in wave4_files) / max(len(wave4_files), 1)) if wave4_files else 100,
            affected_entry_points=sorted(list(set(ep for item in wave4_impacts for ep in item.affected_entry_points))),
            suggested_test_order=wave4_tests[:8],
            checklist=wave4_checklist,
        )
    )

    return waves


def build_first_action_summary(
    file_blockers: List[ScoreBlocker],
    global_blockers: List[ScoreBlocker],
    waves: List[MigrationWave],
) -> str:
    """Creates a concise, actionable summary of the immediate next migration steps."""
    action_parts: List[str] = []
    if file_blockers:
        b = file_blockers[0]
        action_parts.append(f"Establish Wave 0 safety test protection on {b.target_file} to resolve the primary score blocker ({b.blocker_reason}).")
    elif global_blockers:
        action_parts.append(f"Resolve the primary repository readiness blocker: {global_blockers[0].unblocking_action}.")

    w1 = next((w for w in waves if w.wave == 1), None)
    if w1 and w1.files:
        sample_files = ", ".join(w1.files[:2])
        action_parts.append(f"Modernize Wave 1 leaf modules first ({sample_files}) because they have 0 incoming callers and low estimated downstream impact.")

    w2 = next((w for w in waves if w.wave == 2), None)
    if w2 and w2.status == "required" and w2.files:
        action_parts.append(f"Untangle Wave 2 circular dependency in {w2.files[0]} before refactoring intermediate services.")

    w4 = next((w for w in waves if w.wave == 4), None)
    if w4 and w4.files:
        action_parts.append(f"Modernize Wave 4 entry points ({w4.files[0]}) last once underlying dependencies have verified characterization test suites.")

    return " ".join(action_parts) if action_parts else "Modernize leaf utility files first, followed by shared services and entry points."


def build_migration_phases(
    impacts: List[ChangeImpact],
    module_by_id: Dict[str, ModuleAnalysis],
) -> List[MigrationPhase]:
    """Generates the high-level roadmap phases (Safety net, Low-risk wins, Core domain, Orchestration)."""
    low_risk_wins = [
        item for item in impacts
        if item.risk_level in {"low", "medium"} and "modernization" in " ".join(item.reasons).lower()
    ]
    core_items = [
        item for item in impacts
        if item.blast_radius > 0 or item.risk_level in {"high", "critical"}
    ]
    entry_items = [
        item for item in impacts
        if item.affected_entry_points or module_by_id[item.module_id].is_entry_point
    ]
    phases = [
        MigrationPhase(
            phase=1,
            title="Build the safety net",
            goal="Protect current behavior before changing code.",
            risk_level="low",
            files=_phase_files(impacts, 5),
            actions=[
                "Generate and review characterization tests for priority files.",
                "Record current behavior and expected outputs.",
                "Require all syntax checks to pass.",
            ],
        ),
        MigrationPhase(
            phase=2,
            title="Apply low-risk improvements",
            goal="Remove isolated legacy patterns with low estimated downstream impact.",
            risk_level="low",
            files=_phase_files(low_risk_wins),
            actions=[
                "Modernize one file at a time.",
                "Run affected tests after every change.",
                "Keep each change easy to review and roll back.",
            ],
        ),
        MigrationPhase(
            phase=3,
            title="Untangle shared modules",
            goal="Reduce coupling and simplify high-impact domain logic.",
            risk_level="medium",
            files=_phase_files(core_items),
            actions=[
                "Break dependency loops before large rewrites.",
                "Create stable interfaces around shared modules.",
                "Add integration tests for connected files.",
            ],
        ),
        MigrationPhase(
            phase=4,
            title="Modernize entry points",
            goal="Update startup and orchestration code after dependencies are stable.",
            risk_level="high",
            files=_phase_files(entry_items),
            actions=[
                "Change entry points last.",
                "Run the full regression suite in sandbox.",
                "Prepare a rollback plan before release.",
            ],
        ),
    ]
    return [phase for phase in phases if phase.files or phase.phase == 1]


from collections import defaultdict
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from sqlalchemy.orm import Session

from app.analysis.architecture_models import ArchitectureOverview, DependencyGraphSummary
from app.analysis.architecture_service import build_architecture_overview
from app.analysis.models import ProjectAnalysis
from app.hotspots.models import HotspotsResponse, RiskAssessment
from app.hotspots.service import compute_project_hotspots
from app.migration.models import MigrationPlanResponse
from app.migration.service import build_migration_plan
from app.models.db import Job, JobState, Project, ProjectAnalysisRecord, ProjectRefactorRecord, ProjectTestRecord
from app.pulse.models import (
    AnalysisConfidenceSummary,
    HealthDimensionCard,
    HealthSignal,
    NextAction,
    PressureZone,
    RepositoryHealth,
    SubsystemHealth,
    SystemPulseResponse,
    WhyScoreEvidence,
)
from app.refactor.models import ModernizationState, ProjectRefactorResult
from app.testgen.models import ProjectTestResult


def _classify_subsystem(path: str) -> Tuple[str, str]:
    """
    Partitions files into the 5 canonical subsystems:
    Frontend, Backend, ML, Database, Infrastructure.
    """
    norm = path.replace("\\", "/").lower()
    fname = Path(norm).name

    # 1. Frontend
    if (
        norm.startswith("frontend/")
        or "/frontend/" in norm
        or "/components/" in norm
        or "/pages/" in norm
        or "/views/" in norm
        or "/layouts/" in norm
        or "/widgets/" in norm
        or norm.endswith((".tsx", ".jsx", ".vue", ".svelte", ".html", ".css", ".scss"))
    ):
        return "frontend", "Frontend"

    # 2. ML / Data Science
    if (
        "ml/" in norm
        or "/ml/" in norm
        or "pipeline" in norm
        or "forecast" in norm
        or "preprocessing" in norm
        or "training" in norm
        or "feature_engineering" in norm
        or "model_eval" in norm
        or any(tok in norm for tok in ("dataset", "sklearn", "torch", "tensor"))
    ):
        return "ml", "ML"

    # 3. Database / Persistence
    if (
        "database" in norm
        or "alembic" in norm
        or "migrations" in norm
        or "db/" in norm
        or "/db/" in norm
        or "models/db" in norm
        or "repository" in norm
        or "dao" in norm
        or norm.endswith((".sql",))
        or "schema" in fname
        or "entity" in fname
    ):
        return "database", "Database"

    # 4. Infrastructure / DevOps / Tooling
    if (
        norm.startswith("scripts/")
        or "/scripts/" in norm
        or "docker" in fname
        or "k8s" in norm
        or "helm" in norm
        or "terraform" in norm
        or "deploy" in norm
        or ".github" in norm
        or any(tok in fname for tok in ("setup.py", "tsconfig", "vite", "webpack", "tailwind", "render.yaml"))
    ):
        return "infrastructure", "Infrastructure"

    # 5. Backend (Default for server code, APIs, services, domain logic)
    return "backend", "Backend"


def _determine_health_label(score: int, confidence: str, is_partial: bool) -> str:
    """
    Supported labels:
    - Stable
    - Stable with pressure points
    - Needs attention
    - High risk
    - Analysis incomplete
    Considers both score and confidence.
    """
    if is_partial and (confidence == "low" or score < 50):
        return "Analysis incomplete"

    if score >= 80:
        if confidence == "high":
            return "Stable"
        return "Stable with pressure points"
    elif score >= 70:
        return "Stable with pressure points"
    elif score >= 50:
        return "Needs attention"
    else:
        return "High risk"


def build_system_pulse(db: Session, project_id: str) -> SystemPulseResponse:
    """
    Builds the System Pulse (Repository Health Observatory) response
    reusing canonical existing models and calculations without duplication.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project '{project_id}' not found.")

    analysis_record = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )
    if not analysis_record:
        raise RuntimeError(f"Project '{project_id}' has not been analyzed yet.")

    analysis = ProjectAnalysis.model_validate(analysis_record.analysis_data)
    modules = analysis.modules or []

    # 1. Reuse canonical models
    # A. Migration Plan (Readiness score, dimensions, why_score, blockers)
    plan: MigrationPlanResponse = build_migration_plan(db, project_id)

    # B. Hotspots (Risks, complexity, highest hotspot)
    hotspots_resp: HotspotsResponse = compute_project_hotspots(db, project_id)

    # C. Architecture Overview (Dependency graph summary, layers)
    arch_overview: ArchitectureOverview = build_architecture_overview(db, project_id, analysis)

    # D. Safety Tests Record
    test_record = (
        db.query(ProjectTestRecord)
        .filter(ProjectTestRecord.project_id == project_id)
        .first()
    )
    test_result: Optional[ProjectTestResult] = (
        ProjectTestResult.model_validate(test_record.test_data)
        if test_record and test_record.test_data
        else None
    )

    # E. Refactor Record
    refactor_record = (
        db.query(ProjectRefactorRecord)
        .filter(ProjectRefactorRecord.project_id == project_id)
        .first()
    )
    refactor_result: Optional[ProjectRefactorResult] = (
        ProjectRefactorResult.model_validate(refactor_record.refactor_data)
        if refactor_record and refactor_record.refactor_data
        else None
    )

    # Map files and modules
    module_by_path = {m.relative_path: m for m in modules}
    risk_by_path: Dict[str, RiskAssessment] = {
        h.filePath: h for h in hotspots_resp.hotspots
    }

    # Protected and unprotected file sets from canonical test result
    protected_files_set: Set[str] = set()
    unprotected_files_set: Set[str] = set(module_by_path.keys())
    if test_result:
        protected_files_set = set(test_result.protected_files)
        unprotected_files_set = set(test_result.unprotected_files)
        # fallback if lists empty but test files exist
        if not protected_files_set and test_result.test_files:
            for tf in test_result.test_files:
                if tf.target_file:
                    protected_files_set.add(tf.target_file)
            unprotected_files_set = set(module_by_path.keys()) - protected_files_set

    # Unresolved imports by module
    unresolved_by_module: Dict[str, int] = defaultdict(int)
    for edge in analysis.dependency_edges:
        if not edge.resolved:
            mod = next((m for m in modules if m.module_id == edge.source_module_id), None)
            if mod:
                unresolved_by_module[mod.relative_path] += 1

    # Modernization candidates by module
    candidates_by_module: Dict[str, int] = defaultdict(int)
    if refactor_result and refactor_result.findings:
        for f in refactor_result.findings:
            if f.category == "modernization" and f.file:
                candidates_by_module[f.file] += 1
    elif plan.findings:
        for f in plan.findings:
            if f.category == "modernization" and f.file:
                candidates_by_module[f.file] += 1

    # 2. Check partial analysis state
    total_files = len(modules)
    full_parsed_count = sum(1 for m in modules if m.parse_status == "complete")
    partial_count = sum(1 for m in modules if m.parse_status == "partial")
    fallback_or_unsupported = total_files - full_parsed_count - partial_count
    full_ast_pct = plan.full_ast_coverage_pct or (
        round((full_parsed_count / max(total_files, 1)) * 100, 1)
    )
    is_partial = (
        (full_ast_pct < 85.0 and partial_count > 0)
        or (arch_overview.graph.unresolved_imports > 0 and arch_overview.graph.node_count > 0)
        or (plan.readiness_confidence != "high")
    )

    # 3. Overall Health Score & Label
    overall_score = plan.readiness_score
    overall_conf = plan.readiness_confidence or "medium"
    health_label = _determine_health_label(overall_score, overall_conf, is_partial)

    # 4. Five Canonical Subsystems
    subsystem_buckets: Dict[str, List[str]] = {
        "frontend": [],
        "backend": [],
        "ml": [],
        "database": [],
        "infrastructure": [],
    }
    subsystem_labels = {
        "frontend": "Frontend",
        "backend": "Backend",
        "ml": "ML",
        "database": "Database",
        "infrastructure": "Infrastructure",
    }

    for path in module_by_path.keys():
        sub_id, _ = _classify_subsystem(path)
        subsystem_buckets[sub_id].append(path)

    subsystems: List[SubsystemHealth] = []
    for sub_id, paths in subsystem_buckets.items():
        count = len(paths)
        if count == 0:
            subsystems.append(
                SubsystemHealth(
                    id=sub_id,
                    label=subsystem_labels[sub_id],
                    fileCount=0,
                    healthScore=100,
                    confidence="high",
                    highRiskFiles=0,
                    unresolvedDependencies=0,
                    unprotectedFiles=0,
                    modernizationCandidates=0,
                    fullParseCoverage=100.0,
                )
            )
            continue

        high_risk = sum(
            1 for p in paths if risk_by_path.get(p) and risk_by_path[p].overallRisk in ("high", "critical")
        )
        unresolved = sum(unresolved_by_module.get(p, 0) for p in paths)
        unprotected = sum(1 for p in paths if p in unprotected_files_set)
        mod_candidates = sum(candidates_by_module.get(p, 0) for p in paths)
        sub_full_parsed = sum(1 for p in paths if module_by_path[p].parse_status == "complete")
        sub_parse_cov = round((sub_full_parsed / count) * 100, 1)

        # Subsystem health score (bounded 0-100)
        risk_penalty = min(40, (high_risk / count) * 60)
        unresolved_penalty = min(25, (unresolved / count) * 30)
        unprotected_penalty = min(25, (unprotected / count) * 25)
        parse_penalty = max(0, (100 - sub_parse_cov) * 0.2)
        sub_health = max(10, min(100, int(100 - (risk_penalty + unresolved_penalty + unprotected_penalty + parse_penalty))))

        # Subsystem confidence
        sub_conf = "high"
        if sub_parse_cov < 75 or unresolved > 3:
            sub_conf = "medium"
        if sub_parse_cov < 50 or unresolved > count:
            sub_conf = "low"

        subsystems.append(
            SubsystemHealth(
                id=sub_id,
                label=subsystem_labels[sub_id],
                fileCount=count,
                healthScore=sub_health,
                confidence=sub_conf,
                highRiskFiles=high_risk,
                unresolvedDependencies=unresolved,
                unprotectedFiles=unprotected,
                modernizationCandidates=mod_candidates,
                fullParseCoverage=sub_parse_cov,
            )
        )

    # 5. Pressure Zones (Concentrations of risk, dependencies, missing tests, modernization)
    # Group by top directories
    dir_files: Dict[str, List[str]] = defaultdict(list)
    for p in module_by_path.keys():
        parts = p.replace("\\", "/").split("/")
        if len(parts) > 1:
            dir_key = "/".join(parts[:-1])
        else:
            dir_key = "root"
        dir_files[dir_key].append(p)

    pressure_zones: List[PressureZone] = []
    zone_index = 1
    for dir_path, paths in dir_files.items():
        if not paths:
            continue
        count = len(paths)
        high_risk_count = sum(
            1 for p in paths if risk_by_path.get(p) and risk_by_path[p].overallRisk in ("high", "critical")
        )
        unresolved_count = sum(unresolved_by_module.get(p, 0) for p in paths)
        unprotected_count = sum(1 for p in paths if p in unprotected_files_set)
        mod_candidates_count = sum(candidates_by_module.get(p, 0) for p in paths)

        # Multi-factor normalized pressure score (0-100)
        risk_factor = min(40, (high_risk_count / count) * 45)
        unresolved_factor = min(25, (unresolved_count / max(count, 1)) * 25)
        protection_factor = min(25, (unprotected_count / count) * 20)
        mod_factor = min(15, (mod_candidates_count / max(count, 1)) * 15)

        pressure_score = max(5, min(100, int(risk_factor + unresolved_factor + protection_factor + mod_factor)))

        if pressure_score >= 70:
            level = "Critical"
        elif pressure_score >= 45:
            level = "High"
        elif pressure_score >= 25:
            level = "Moderate"
        else:
            level = "Low"

        reasons: List[str] = []
        if high_risk_count > 0:
            reasons.append(f"{high_risk_count} of {count} files have elevated or critical risk")
        if unresolved_count > 0:
            reasons.append(f"{unresolved_count} unresolved dependency imports in directory")
        if unprotected_count > 0:
            reasons.append(f"{unprotected_count} files lack characterization tests")
        if mod_candidates_count > 0:
            reasons.append(f"{mod_candidates_count} modernization candidates detected")

        if not reasons:
            reasons.append("Stable directory structure with no critical alerts")

        main_reason = reasons[0]
        sub_id, _ = _classify_subsystem(paths[0])

        zone_conf = "high"
        if unresolved_count > 2 or any(module_by_path[p].parse_status != "complete" for p in paths):
            zone_conf = "medium"

        pressure_zones.append(
            PressureZone(
                id=f"zone-{zone_index}",
                path=dir_path,
                subsystem=subsystem_labels.get(sub_id, "Backend"),
                pressureScore=pressure_score,
                level=level,
                confidence=zone_conf,
                reasons=reasons,
                riskScore=int(risk_factor * 2.5),
                unprotectedCount=unprotected_count,
                graphConfidence=zone_conf,
                mainReason=main_reason,
            )
        )
        zone_index += 1

    # Sort pressure zones by highest pressure score first, top 5
    pressure_zones.sort(key=lambda z: z.pressureScore, reverse=True)
    pressure_zones = pressure_zones[:5]

    # 6. Five Health Dimension Cards (Strict canonical alignment)
    # A. Parsing Card
    parsing_score = plan.parser_readiness_score or 100
    parsing_conf = plan.readiness.dimensions.get("analysis", None)
    parsing_conf_val = parsing_conf.confidence if parsing_conf else "high"
    parsing_main_pressure = (
        f"{partial_count} partially parsed and {fallback_or_unsupported} fallback/unsupported files"
        if (partial_count + fallback_or_unsupported) > 0
        else "No parsing anomalies detected across AST analyzers"
    )
    parsing_card = HealthDimensionCard(
        key="parsing",
        label="Parsing",
        score=parsing_score,
        confidence=parsing_conf_val,
        status="Healthy" if parsing_score >= 80 else ("Needs Attention" if parsing_score >= 50 else "High Risk"),
        mainPressure=parsing_main_pressure,
        evidence=[
            f"Fully parsed: {full_parsed_count} files",
            f"Partially parsed: {partial_count} files",
            f"Fallback or unsupported: {fallback_or_unsupported} files",
            f"Full AST coverage: {full_ast_pct}%",
            f"Parser readiness score: {parsing_score}/100",
        ],
        metrics={
            "fullyParsed": full_parsed_count,
            "partial": partial_count,
            "fallbackOrUnsupported": fallback_or_unsupported,
            "fullAstPercentage": full_ast_pct,
            "parserReadinessScore": parsing_score,
        },
    )

    # B. Dependency Card (Exact match with DependencyGraphSummary)
    dep_summary: DependencyGraphSummary = arch_overview.graph
    dep_dim = plan.readiness.dimensions.get("coupling", None)
    dep_score = dep_dim.score if dep_dim else 85
    dep_conf = dep_dim.confidence if dep_dim else "high"
    dep_main_pressure = (
        f"{dep_summary.cycle_count} circular cycle(s) and {dep_summary.unresolved_imports} unresolved import(s)"
        if (dep_summary.cycle_count > 0 or dep_summary.unresolved_imports > 0)
        else "Clean resolved topology with no detected cycles"
    )
    dependency_card = HealthDimensionCard(
        key="dependencies",
        label="Dependencies",
        score=dep_score,
        confidence=dep_conf,
        status="Healthy" if dep_score >= 80 else ("Needs Attention" if dep_score >= 50 else "High Risk"),
        mainPressure=dep_main_pressure,
        evidence=[
            f"Resolved internal edges: {dep_summary.resolved_edges}",
            f"Unresolved imports: {dep_summary.unresolved_imports}",
            f"Detected cycles: {dep_summary.cycle_count}",
            f"Isolated or orphan modules: {dep_summary.isolated_modules_count + dep_summary.orphan_count}",
            f"Graph resolution confidence: {dep_conf.title()}",
        ],
        metrics={
            "resolvedEdges": dep_summary.resolved_edges,
            "unresolvedImports": dep_summary.unresolved_imports,
            "detectedCycles": dep_summary.cycle_count,
            "graphConfidence": dep_conf.title(),
        },
    )

    # C. Complexity Card
    comp_dim = plan.readiness.dimensions.get("complexity", None)
    comp_score = comp_dim.score if comp_dim else 80
    comp_conf = comp_dim.confidence if comp_dim else "high"
    critical_risk_files = hotspots_resp.summary.get("critical_count", 0) or 0
    high_risk_files = hotspots_resp.summary.get("high_count", 0) or 0
    highest_cyclomatic = max((h.complexity.value for h in hotspots_resp.hotspots if h.complexity), default=1)
    complexity_health = (
        "Manageable" if highest_cyclomatic <= 15 else ("Elevated" if highest_cyclomatic <= 30 else "Critical")
    )
    complexity_main_pressure = (
        f"{critical_risk_files} critical-risk and {high_risk_files} high-risk files requiring partitioning"
        if (critical_risk_files + high_risk_files) > 0
        else "Cyclomatic complexity remains within maintainable thresholds"
    )
    complexity_card = HealthDimensionCard(
        key="complexity",
        label="Complexity",
        score=comp_score,
        confidence=comp_conf,
        status="Healthy" if comp_score >= 80 else ("Needs Attention" if comp_score >= 50 else "High Risk"),
        mainPressure=complexity_main_pressure,
        evidence=[
            f"Overall complexity health: {complexity_health}",
            f"High-risk files: {high_risk_files}",
            f"Critical overall-risk files: {critical_risk_files}",
            f"Highest cyclomatic complexity: {highest_cyclomatic}",
            f"Scoring engine: {hotspots_resp.summary.get('scoring_engine', 'static_v2')}",
        ],
        metrics={
            "overallComplexityHealth": complexity_health,
            "highRiskFiles": high_risk_files,
            "criticalOverallRiskFiles": critical_risk_files,
            "highestCyclomaticComplexity": highest_cyclomatic,
        },
    )

    # D. Protection Card (Reusing Safety Tests canonical status)
    prot_dim = plan.readiness.dimensions.get("testability", None)
    prot_score = prot_dim.score if prot_dim else 35
    prot_conf = prot_dim.confidence if prot_dim else "low"
    prot_status = plan.protection_status
    gen_tests = prot_status.generated_tests if prot_status else (test_result.total_generated_tests if test_result else 0)
    syn_valid = prot_status.syntax_valid if prot_status else (test_result.syntax_valid_count if test_result else 0)
    runtime_ver = prot_status.runtime_verified if prot_status else (test_result.executed_test_count if test_result else 0)
    
    runtime_ver_status = (
        f"Passed in Sandbox ({runtime_ver} tests)"
        if (prot_status and prot_status.execution_status == "passed")
        else (
            f"Measured ({prot_status.coverage_percentage:.1f}% line coverage)"
            if (prot_status and prot_status.coverage_percentage is not None)
            else "Syntax Valid Only (Runtime Unmeasured)"
        )
    )
    protection_main_pressure = (
        f"{len(unprotected_files_set)} module(s) unprotected; runtime sandbox verification unmeasured"
        if len(unprotected_files_set) > 0
        else "All modules protected by validated characterization tests"
    )
    protection_card = HealthDimensionCard(
        key="protection",
        label="Protection",
        score=prot_score,
        confidence=prot_conf,
        status="Healthy" if prot_score >= 70 else ("Needs Attention" if prot_score >= 40 else "High Risk"),
        mainPressure=protection_main_pressure,
        evidence=[
            f"Protected source modules: {len(protected_files_set)}",
            f"Unprotected modules: {len(unprotected_files_set)}",
            f"Generated test files: {gen_tests}",
            f"Syntax-valid tests: {syn_valid} (never implied as runtime passing)",
            f"Runtime verification status: {runtime_ver_status}",
        ],
        metrics={
            "protectedSourceModules": len(protected_files_set),
            "unprotectedModules": len(unprotected_files_set),
            "generatedTests": gen_tests,
            "syntaxValidTests": syn_valid,
            "runtimeVerificationStatus": runtime_ver_status,
        },
    )

    # E. Modernization Card (Reusing ModernizationState)
    mod_dim = plan.readiness.dimensions.get("maintainability", None)
    mod_score = mod_dim.score if mod_dim else 80
    mod_conf = mod_dim.confidence if mod_dim else "high"
    mod_state: ModernizationState = (
        refactor_result.modernization_state
        if (refactor_result and refactor_result.modernization_state)
        else ModernizationState(
            findings=len(plan.findings) if plan.findings else 0,
            candidates=sum(1 for f in (plan.findings or []) if f.category == "modernization"),
            autofix_eligible=sum(1 for f in (plan.findings or []) if f.autofixable),
            generated_diffs=refactor_result.changed_files if refactor_result else 0,
            runtime_verified=0,
        )
    )
    modernization_main_pressure = (
        f"{mod_state.candidates} modernization candidate(s) awaiting deterministic transformation"
        if mod_state.candidates > 0
        else "No legacy modernization debt flagged"
    )
    modernization_card = HealthDimensionCard(
        key="modernization",
        label="Modernization",
        score=mod_score,
        confidence=mod_conf,
        status="Healthy" if mod_score >= 80 else ("Needs Attention" if mod_score >= 50 else "High Risk"),
        mainPressure=modernization_main_pressure,
        evidence=[
            f"Static findings: {mod_state.findings}",
            f"Modernization candidates: {mod_state.candidates}",
            f"Autofix eligible: {mod_state.autofix_eligible}",
            f"Generated diffs: {mod_state.generated_diffs}",
            f"Runtime verified changes: {mod_state.runtime_verified}",
        ],
        metrics={
            "staticFindings": mod_state.findings,
            "modernizationCandidates": mod_state.candidates,
            "autofixEligible": mod_state.autofix_eligible,
            "generatedDiffs": mod_state.generated_diffs,
            "runtimeVerified": mod_state.runtime_verified,
        },
    )

    dimensions_map = {
        "parsing": parsing_card,
        "dependencies": dependency_card,
        "complexity": complexity_card,
        "protection": protection_card,
        "modernization": modernization_card,
    }

    # 7. Why This Score Evidence (expandable)
    strengths: List[str] = list(plan.why_score.strengths) if plan.why_score else []
    pressure_points: List[str] = list(plan.why_score.needs_attention) if plan.why_score else []

    # Extra evidence items directly derived from analysis data
    why_evidence: List[str] = [
        f"AST parse coverage verified at {full_ast_pct}% across {total_files} repository files",
        f"Dependency graph resolved {dep_summary.resolved_edges} internal edges with {dep_summary.cycle_count} circular loops",
        f"Safety harness status: {len(protected_files_set)} protected files, runtime verification: {runtime_ver_status}",
        f"Modernization inventory identifies {mod_state.candidates} candidate pattern(s)",
    ]

    # 8. Intelligent Signals (3 - 5 narrative cards)
    signals: List[HealthSignal] = []

    # A. Most Important Signal
    lowest_dim_name = min(dimensions_map.keys(), key=lambda k: dimensions_map[k].score)
    lowest_card = dimensions_map[lowest_dim_name]
    signals.append(
        HealthSignal(
            id="sig-1",
            type="most_important",
            title=f"Primary Observatory Bottleneck: {lowest_card.label}",
            narrative=(
                f"The codebase health is most constrained by {lowest_card.label.lower()} (score {lowest_card.score}/100). "
                f"Main pressure: {lowest_card.mainPressure}."
            ),
            evidence=lowest_card.evidence[:3],
            severity="risk" if lowest_card.score < 50 else ("warning" if lowest_card.score < 75 else "info"),
        )
    )

    # B. Dependency Signal
    if dep_summary.cycle_count == 0:
        signals.append(
            HealthSignal(
                id="sig-2",
                type="dependency",
                title="Acyclic Dependency Architecture",
                narrative=(
                    f"No circular dependency loops were detected across {dep_summary.node_count} analyzed modules. "
                    f"{dep_summary.resolved_edges} internal relations form a deterministic DAG."
                ),
                evidence=[
                    f"Zero circular cycles detected in resolved graph",
                    f"Resolved internal edges: {dep_summary.resolved_edges}",
                    f"Unresolved local imports: {dep_summary.unresolved_imports}",
                ],
                severity="positive",
            )
        )
    else:
        signals.append(
            HealthSignal(
                id="sig-2",
                type="dependency",
                title="Circular Coupling Detected",
                narrative=(
                    f"{dep_summary.cycle_count} circular dependency loop(s) detected in the resolved graph. "
                    "Cycles impede isolated testing and phase-based migration."
                ),
                evidence=[
                    f"Circular loops: {dep_summary.cycle_count}",
                    f"Unresolved imports: {dep_summary.unresolved_imports}",
                    f"Graph resolution confidence: {dep_conf.title()}",
                ],
                severity="risk",
            )
        )

    # C. Modernization Signal
    if mod_state.candidates > 0:
        signals.append(
            HealthSignal(
                id="sig-3",
                type="modernization",
                title="Deterministic Modernization Opportunities",
                narrative=(
                    f"{mod_state.candidates} modernization candidate(s) identified. "
                    f"{mod_state.autofix_eligible} can be automatically upgraded with AST deterministic transformations."
                ),
                evidence=[
                    f"Modernization candidates: {mod_state.candidates}",
                    f"Autofix eligible: {mod_state.autofix_eligible}",
                    f"Deterministic diffs generated: {mod_state.generated_diffs}",
                ],
                severity="info",
            )
        )

    # D. Protection Signal
    signals.append(
        HealthSignal(
            id="sig-4",
            type="protection",
            title="Safety Harness Status",
            narrative=(
                f"{len(protected_files_set)} of {total_files} source modules have characterization tests. "
                f"Runtime verification remains: {runtime_ver_status}."
            ),
            evidence=[
                f"Protected modules: {len(protected_files_set)}",
                f"Unprotected modules: {len(unprotected_files_set)}",
                f"Syntax-valid generated tests: {syn_valid}",
            ],
            severity="warning" if len(unprotected_files_set) > 0 else "positive",
        )
    )

    # E. Positive Signal (When supported)
    if full_ast_pct >= 90.0:
        signals.append(
            HealthSignal(
                id="sig-5",
                type="positive",
                title="High-Fidelity AST Parse Coverage",
                narrative=(
                    f"Codebase achieves {full_ast_pct}% full AST coverage. "
                    "Static analyzers have high semantic visibility into type annotations, symbol callgraphs, and imports."
                ),
                evidence=[
                    f"Fully parsed files: {full_parsed_count}",
                    f"Partial files: {partial_count}",
                    f"AST coverage: {full_ast_pct}%",
                ],
                severity="positive",
            )
        )
    elif dep_summary.unresolved_imports == 0:
        signals.append(
            HealthSignal(
                id="sig-5",
                type="positive",
                title="Complete Module Resolution",
                narrative="All local import statements resolve unambiguously to target workspace files.",
                evidence=[
                    "0 unresolved imports in dependency graph",
                    f"Total resolved edges: {dep_summary.resolved_edges}",
                ],
                severity="positive",
            )
        )

    # Limit to top 5 signals
    signals = signals[:5]

    # 9. Next Best Actions (Ranked by repository evidence)
    next_actions: List[NextAction] = []
    action_idx = 1

    # Action 1: Unresolved imports if any
    if dep_summary.unresolved_imports > 0:
        next_actions.append(
            NextAction(
                id=f"act-{action_idx}",
                title="Resolve Unresolved Imports",
                reason=f"{dep_summary.unresolved_imports} local imports cannot be statically resolved in the graph.",
                expectedEffect="Eliminates ambiguous coupling and unlocks full graph resolution confidence.",
                destinationPage="graph",
            )
        )
        action_idx += 1

    # Action 2: Protect top high-risk file
    top_hotspot = hotspots_resp.hotspots[0] if hotspots_resp.hotspots else None
    if top_hotspot and top_hotspot.filePath in unprotected_files_set:
        next_actions.append(
            NextAction(
                id=f"act-{action_idx}",
                title=f"Protect High-Risk Service ({Path(top_hotspot.filePath).name})",
                reason=f"Module '{top_hotspot.filePath}' has {top_hotspot.overallRisk.upper()} risk score ({top_hotspot.hotspotScore}) but lacks safety tests.",
                expectedEffect="Establishes characterization guardrails before architectural refactoring.",
                destinationPage="tests",
                targetFile=top_hotspot.filePath,
            )
        )
        action_idx += 1

    # Action 3: Review highest hotspot
    if top_hotspot:
        next_actions.append(
            NextAction(
                id=f"act-{action_idx}",
                title=f"Review Hotspot: {Path(top_hotspot.filePath).name}",
                reason=top_hotspot.reason or "Highest combined cyclomatic complexity and blast radius in the project.",
                expectedEffect="Clarifies refactoring candidates and decouples central bottleneck.",
                destinationPage="hotspots",
                targetFile=top_hotspot.filePath,
            )
        )
        action_idx += 1

    # Action 4: Modernization diffs
    if mod_state.candidates > 0:
        next_actions.append(
            NextAction(
                id=f"act-{action_idx}",
                title="Review Modernization Diffs",
                reason=f"{mod_state.candidates} candidates detected; {mod_state.generated_diffs} deterministic transformations available.",
                expectedEffect="Safely applies syntactic modernization with zero behavioral divergence.",
                destinationPage="refactor",
            )
        )
        action_idx += 1

    # Action 5: Migration Plan Wave 1
    next_actions.append(
        NextAction(
            id=f"act-{action_idx}",
            title="Inspect Wave 1 Migration Impact",
            reason="Review the dependency wave ordering to safely coordinate updates.",
            expectedEffect="Ensures leaf dependencies are verified prior to upstream orchestrator changes.",
            destinationPage="migration",
        )
    )

    # 10. Analysis Confidence Summary
    conf_summary = AnalysisConfidenceSummary(
        overallConfidence=overall_conf,
        parseReliability="High" if full_ast_pct >= 85 else ("Medium" if full_ast_pct >= 60 else "Low"),
        graphResolutionConfidence=dep_conf.title(),
        riskConfidence=comp_conf.title(),
        protectionEvidenceConfidence=prot_conf.title(),
        modernizationEvidenceConfidence=mod_conf.title(),
        reasons=plan.readiness.confidence_reasons if plan.readiness else [],
    )

    repository_health = RepositoryHealth(
        score=overall_score,
        label=health_label,
        confidence=overall_conf,
        isPartial=is_partial,
        whyScore=WhyScoreEvidence(
            strengths=strengths,
            pressurePoints=pressure_points,
            evidence=why_evidence,
        ),
        dimensions=dimensions_map,
        snapshotComparison=None,  # Future-ready
    )

    return SystemPulseResponse(
        health=repository_health,
        subsystems=subsystems,
        pressureZones=pressure_zones,
        signals=signals,
        nextActions=next_actions,
        confidence=conf_summary,
    )

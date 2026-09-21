from collections import defaultdict, deque
import logging
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from app.analysis.models import ProjectAnalysis
from app.analysis.scoring import (
    calculate_hotspot_score,
    get_complexity_severity,
    get_parse_confidence,
    get_risk_level,
)
from app.hotspots.models import (
    ComplexityValue,
    GraphMetrics,
    HotspotsResponse,
    ParseMetrics,
    RiskAssessment,
    ScoreFactors,
)
from app.models.db import Project, ProjectAnalysisRecord

logger = logging.getLogger(__name__)


def compute_static_hotspot_item(
    file_path: str,
    complexity_raw: int,
    loc_raw: int,
    fan_in_raw: int,
    warnings_raw: int,
    blast_radius_raw: int,
    transitive_dependents: List[str],
    direct_dependents: List[str],
    parse_status: str = "full",
    unresolved_relations: int = 0,
) -> RiskAssessment:
    """Computes a canonical RiskAssessment item with score breakdown, explicit labels, and explanation."""
    hotspot_score, factors_dict = calculate_hotspot_score(
        complexity_raw=complexity_raw,
        loc_raw=loc_raw,
        fan_in_raw=fan_in_raw,
        warnings_raw=warnings_raw,
        blast_radius_raw=blast_radius_raw,
    )

    overall_risk = get_risk_level(hotspot_score)
    complexity_severity = get_complexity_severity(complexity_raw)
    parse_confidence = get_parse_confidence(parse_status, unresolved_relations)

    complexity = ComplexityValue(
        value=complexity_raw,
        severity=complexity_severity,
    )

    graph = GraphMetrics(
        fan_in=fan_in_raw,
        blast_radius=blast_radius_raw,
        unresolved_relations=unresolved_relations,
    )

    parse = ParseMetrics(
        status=parse_status,
        confidence=parse_confidence,
    )

    score_factors = ScoreFactors(**factors_dict)

    # Human-readable explanation synthesizing factors
    reasons: List[str] = []
    if complexity_raw >= 15:
        reasons.append(f"High cyclomatic complexity ({complexity_raw}, {complexity_severity.upper()} complexity)")
    elif complexity_raw > 1:
        reasons.append(f"Cyclomatic complexity of {complexity_raw} ({complexity_severity.upper()} complexity)")

    if blast_radius_raw > 0 and fan_in_raw > 0:
        reasons.append(f"called by {fan_in_raw} module(s) with cascading ripple to {blast_radius_raw} transitive file(s)")
    elif fan_in_raw > 0:
        reasons.append(f"called by {fan_in_raw} incoming module(s)")
    elif blast_radius_raw > 0:
        reasons.append(f"cascading ripple to {blast_radius_raw} transitive file(s)")

    if warnings_raw > 0:
        reasons.append(f"{warnings_raw} modernization issue(s)")

    if loc_raw >= 200:
        reasons.append(f"large module footprint ({loc_raw} LOC)")

    if parse_status != "full":
        reasons.append(f"{parse_status} parse status with {parse_confidence} confidence")

    if unresolved_relations > 0:
        reasons.append(f"{unresolved_relations} unresolved dependency relation(s)")

    reason = "; ".join(reasons) + "." if reasons else f"Static score based on {loc_raw} LOC and module structure."

    # Contextual actionable guidance
    if parse_status != "full":
        recommended_action = f"Fix syntax or parser anomalies in {file_path} so AST analyzers can achieve full parse confidence."
    elif blast_radius_raw >= 5 or fan_in_raw >= 3:
        recommended_action = f"Generate characterization tests before refactoring {file_path} to protect {fan_in_raw} upstream callers."
    elif complexity_raw >= 15:
        recommended_action = f"Break down complex branches and cyclomatic paths in {file_path} into focused subroutines."
    elif warnings_raw > 0:
        recommended_action = f"Preview automated refactors in the Refactored Code tab to modernize legacy patterns in {file_path}."
    else:
        recommended_action = f"Inspect module dependencies in the Dependency Graph to review architectural coupling."

    return RiskAssessment(
        file_path=file_path,
        hotspot_score=hotspot_score,
        overall_risk=overall_risk,
        complexity=complexity,
        warnings=warnings_raw,
        graph=graph,
        parse=parse,
        score_factors=score_factors,
        lines_of_code=loc_raw,
        transitive_dependents=transitive_dependents,
        direct_dependents=direct_dependents,
        reason=reason,
        recommended_action=recommended_action,
    )


def compute_project_hotspots(db: Session, project_id: str) -> HotspotsResponse:
    """Computes ranked static hotspots for a project using analysis and dependency graph data."""
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError("Project not found.")

    record = db.query(ProjectAnalysisRecord).filter(ProjectAnalysisRecord.project_id == project_id).first()
    if not record:
        raise RuntimeError("Analysis is required before calculating hotspots.")

    analysis = ProjectAnalysis.model_validate(record.analysis_data)
    modules = analysis.modules

    # Handle empty project
    if not modules:
        return HotspotsResponse(
            project_id=project_id,
            project_name=project.display_name,
            score_mode="static",
            total_files=0,
            hotspots=[],
            recommended_start_file=None,
            recommended_start_reason="No source files detected in project.",
            summary={
                "highest_score": 0,
                "critical_count": 0,
                "high_count": 0,
                "medium_count": 0,
                "low_count": 0,
                "total_evaluated": 0,
                "full_parse_count": 0,
                "partial_parse_count": 0,
                "fallback_parse_count": 0,
                "high_confidence_count": 0,
                "scoring_engine": "static_v2",
            },
        )

    module_by_id = {m.module_id: m for m in modules}
    path_by_id = {m.module_id: m.relative_path for m in modules}

    # Build reverse dependency graph for fan-in and blast radius
    dependents: Dict[str, Set[str]] = defaultdict(set)
    unresolved_by_module: Dict[str, int] = defaultdict(int)

    for edge in analysis.dependency_edges:
        if not edge.resolved:
            unresolved_by_module[edge.source_module_id] += 1
            continue
        if edge.source_module_id not in module_by_id or edge.target_module_id not in module_by_id:
            continue
        dependents[edge.target_module_id].add(edge.source_module_id)

    findings_count_by_file = defaultdict(int)
    for f in (analysis.findings or []):
        findings_count_by_file[f.file] += 1

    hotspots: List[RiskAssessment] = []
    for module in modules:
        # Transitive callers BFS
        visited: Set[str] = set()
        queue = deque([module.module_id])
        while queue:
            curr = queue.popleft()
            for caller in dependents.get(curr, set()):
                if caller not in visited and caller != module.module_id:
                    visited.add(caller)
                    queue.append(caller)

        direct_in = dependents.get(module.module_id, set())
        direct_dependents = sorted(path_by_id[c] for c in direct_in if c in path_by_id)
        transitive_dependents = sorted(path_by_id[c] for c in visited if c in path_by_id)

        # Parse status determination
        raw_status = getattr(module, "parse_status", "complete")
        has_errors = bool(getattr(module, "parse_errors", []))
        if raw_status == "complete" and not has_errors:
            parse_status = "full"
        elif raw_status == "partial" or has_errors:
            parse_status = "partial"
        elif raw_status in ("failed", "fallback"):
            parse_status = "fallback"
        else:
            parse_status = "full"

        unresolved_relations = unresolved_by_module.get(module.module_id, 0)
        warnings_raw = max(len(module.legacy_warnings), findings_count_by_file.get(module.relative_path, 0))

        item = compute_static_hotspot_item(
            file_path=module.relative_path,
            complexity_raw=module.complexity.cyclomatic_complexity,
            loc_raw=module.line_count,
            fan_in_raw=len(direct_dependents),
            warnings_raw=warnings_raw,
            blast_radius_raw=len(transitive_dependents),
            transitive_dependents=transitive_dependents,
            direct_dependents=direct_dependents,
            parse_status=parse_status,
            unresolved_relations=unresolved_relations,
        )
        hotspots.append(item)

    # Deterministic ranking:
    # 1. hotspot_score DESC
    # 2. complexity.value DESC
    # 3. graph.blast_radius DESC
    # 4. graph.fan_in DESC
    # 5. warnings DESC
    # 6. lines_of_code DESC
    # 7. file_path ASC (tie-breaker)
    hotspots.sort(
        key=lambda item: (
            -item.hotspot_score,
            -item.complexity.value,
            -item.graph.blast_radius,
            -item.graph.fan_in,
            -item.warnings,
            -item.lines_of_code,
            item.file_path,
        )
    )

    recommended_file = hotspots[0].file_path if hotspots else None
    recommended_reason = (
        f"Start refactoring with {hotspots[0].file_path} (Hotspot Score: {hotspots[0].hotspot_score}/100, RISK: {hotspots[0].overall_risk.upper()}) "
        f"because it carries the highest concentration of complexity ({hotspots[0].complexity.value}, {hotspots[0].complexity.severity.upper()}), "
        f"incoming callers ({hotspots[0].graph.fan_in}), and downstream ripple risk ({hotspots[0].graph.blast_radius} files)."
        if hotspots
        else None
    )

    return HotspotsResponse(
        project_id=project_id,
        project_name=project.display_name,
        score_mode="static",
        total_files=len(modules),
        hotspots=hotspots,
        recommended_start_file=recommended_file,
        recommended_start_reason=recommended_reason,
        summary={
            "highest_score": hotspots[0].hotspot_score if hotspots else 0,
            "critical_count": sum(1 for h in hotspots if h.overall_risk == "critical"),
            "high_count": sum(1 for h in hotspots if h.overall_risk == "high"),
            "medium_count": sum(1 for h in hotspots if h.overall_risk == "medium"),
            "low_count": sum(1 for h in hotspots if h.overall_risk == "low"),
            "total_evaluated": len(hotspots),
            "full_parse_count": sum(1 for h in hotspots if h.parse.status == "full"),
            "partial_parse_count": sum(1 for h in hotspots if h.parse.status == "partial"),
            "fallback_parse_count": sum(1 for h in hotspots if h.parse.status in ("fallback", "failed")),
            "high_confidence_count": sum(1 for h in hotspots if h.parse.confidence == "high"),
            "scoring_engine": "static_v2",
        },
    )

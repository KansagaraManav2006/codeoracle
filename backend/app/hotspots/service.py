from collections import defaultdict, deque
import logging
from typing import Dict, List, Optional, Set

from sqlalchemy.orm import Session

from app.analysis.models import ProjectAnalysis
from app.hotspots.models import HotspotFactors, HotspotItem, HotspotsResponse
from app.models.db import Project, ProjectAnalysisRecord

logger = logging.getLogger(__name__)


def compute_static_hotspot_item(
    file_path: str,
    complexity_raw: int,
    complexity_rating: str,
    loc_raw: int,
    fan_in_raw: int,
    warnings_raw: int,
    blast_radius_raw: int,
    transitive_dependents: List[str],
    direct_dependents: List[str],
    is_partially_parsed: bool = False,
) -> HotspotItem:
    """Computes a deterministic static hotspot item with score breakdown and explanation."""
    # 1. Complexity factor (0-25 max)
    rating_floors = {"critical": 22, "high": 15, "medium": 8, "low": 2}
    rating_floor = rating_floors.get(complexity_rating.lower(), 2)
    complexity_score = min(25, max(rating_floor, round(complexity_raw * 1.0)))

    # 2. LOC factor (0-15 max)
    loc_score = min(15, round(loc_raw / 30))

    # 3. Dependency fan-in factor (0-20 max)
    fan_in_score = min(20, fan_in_raw * 4)

    # 4. Warnings factor (0-20 max)
    warnings_score = min(20, warnings_raw * 4)

    # 5. Blast radius factor (0-20 max)
    blast_radius_score = min(20, blast_radius_raw * 3)

    # Total composite score (0-100 max)
    total_score = complexity_score + loc_score + fan_in_score + warnings_score + blast_radius_score
    hotspot_score = max(0, min(100, total_score))

    risk_level = (
        "critical" if hotspot_score >= 70
        else "high" if hotspot_score >= 45
        else "medium" if hotspot_score >= 20
        else "low"
    )

    factors = HotspotFactors(
        complexity_raw=complexity_raw,
        complexity_score=complexity_score,
        loc_raw=loc_raw,
        loc_score=loc_score,
        fan_in_raw=fan_in_raw,
        fan_in_score=fan_in_score,
        warnings_raw=warnings_raw,
        warnings_score=warnings_score,
        blast_radius_raw=blast_radius_raw,
        blast_radius_score=blast_radius_score,
    )

    # Human-readable explanation synthesizing all 5 factors
    reasons: List[str] = []
    if complexity_raw >= 10:
        reasons.append(f"High cyclomatic complexity ({complexity_raw}, {complexity_rating} rating)")
    elif complexity_raw > 1:
        reasons.append(f"Cyclomatic complexity of {complexity_raw}")

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

    if is_partially_parsed:
        reasons.append("partially parsed due to syntax anomalies")

    reason = "; ".join(reasons) + "." if reasons else f"Static score based on {loc_raw} LOC and module structure."

    # Contextual actionable guidance
    if is_partially_parsed:
        recommended_action = f"Fix syntax or parser anomalies in {file_path} so AST analyzers can parse full code."
    elif blast_radius_raw >= 5 or fan_in_raw >= 3:
        recommended_action = f"Generate characterization tests before refactoring {file_path} to protect {fan_in_raw} upstream callers."
    elif complexity_raw >= 15:
        recommended_action = f"Break down complex branches and cyclomatic paths in {file_path} into focused subroutines."
    elif warnings_raw > 0:
        recommended_action = f"Preview automated refactors in the Refactored Code tab to modernize legacy patterns in {file_path}."
    else:
        recommended_action = f"Inspect module dependencies in the Dependency Graph to review architectural coupling."

    return HotspotItem(
        file=file_path,
        hotspot_score=hotspot_score,
        score_mode="static",
        complexity=complexity_raw,
        complexity_rating=complexity_rating,
        lines_of_code=loc_raw,
        dependency_fan_in=fan_in_raw,
        warnings_count=warnings_raw,
        blast_radius=blast_radius_raw,
        transitive_dependents=transitive_dependents,
        direct_dependents=direct_dependents,
        is_partially_parsed=is_partially_parsed,
        risk_level=risk_level,
        reason=reason,
        recommended_action=recommended_action,
        score_factors=factors,
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
                "total_evaluated": 0,
                "scoring_engine": "static_v1",
            },
        )

    module_by_id = {m.module_id: m for m in modules}
    path_by_id = {m.module_id: m.relative_path for m in modules}

    # Build reverse dependency graph for fan-in and blast radius
    dependents: Dict[str, Set[str]] = defaultdict(set)
    for edge in analysis.dependency_edges:
        if not edge.resolved or edge.source_module_id not in module_by_id or edge.target_module_id not in module_by_id:
            continue
        dependents[edge.target_module_id].add(edge.source_module_id)

    findings_count_by_file = defaultdict(int)
    for f in (analysis.findings or []):
        findings_count_by_file[f.file] += 1

    hotspots: List[HotspotItem] = []
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

        is_partially_parsed = bool(
            getattr(module, "is_partially_parsed", False)
            or getattr(module, "has_parse_errors", False)
            or getattr(module, "parse_status", "complete") != "complete"
        )

        warnings_raw = max(len(module.legacy_warnings), findings_count_by_file.get(module.relative_path, 0))

        item = compute_static_hotspot_item(
            file_path=module.relative_path,
            complexity_raw=module.complexity.cyclomatic_complexity,
            complexity_rating=module.complexity.rating,
            loc_raw=module.line_count,
            fan_in_raw=len(direct_dependents),
            warnings_raw=warnings_raw,
            blast_radius_raw=len(transitive_dependents),
            transitive_dependents=transitive_dependents,
            direct_dependents=direct_dependents,
            is_partially_parsed=is_partially_parsed,
        )
        hotspots.append(item)

    # Deterministic ranking:
    # 1. hotspot_score DESC
    # 2. complexity DESC
    # 3. blast_radius DESC
    # 4. dependency_fan_in DESC
    # 5. warnings_count DESC
    # 6. lines_of_code DESC
    # 7. file path ASC (tie-breaker)
    hotspots.sort(
        key=lambda item: (
            -item.hotspot_score,
            -item.complexity,
            -item.blast_radius,
            -item.dependency_fan_in,
            -item.warnings_count,
            -item.lines_of_code,
            item.file,
        )
    )

    recommended_file = hotspots[0].file if hotspots else None
    recommended_reason = (
        f"Start refactoring with {hotspots[0].file} (Hotspot Score: {hotspots[0].hotspot_score}/100) "
        f"because it carries the highest concentration of complexity ({hotspots[0].complexity}), "
        f"incoming callers ({hotspots[0].dependency_fan_in}), and downstream ripple risk ({hotspots[0].blast_radius} files)."
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
            "critical_count": sum(1 for h in hotspots if h.risk_level == "critical"),
            "high_count": sum(1 for h in hotspots if h.risk_level == "high"),
            "total_evaluated": len(hotspots),
            "scoring_engine": "static_v1",
        },
    )

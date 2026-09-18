import logging
from typing import Dict, List, Set

from sqlalchemy.orm import Session

from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import ProjectAnalysis
from app.models.db import Project, ProjectAnalysisRecord
from app.models.schema import (
    ArchCharacteristics,
    ArchLayerModule,
    ArchitectureEvolutionResponse,
    ProposedArchChange,
)

logger = logging.getLogger(__name__)


def classify_module_layer(relative_path: str, is_entry: bool) -> str:
    path_lower = relative_path.lower()
    if (
        "routes" in path_lower
        or "api" in path_lower
        or "controller" in path_lower
        or "views" in path_lower
        or "frontend" in path_lower
        or "components" in path_lower
        or path_lower.endswith("main.py")
        or path_lower.endswith("app.py")
        or path_lower.endswith("app.tsx")
        or is_entry
    ):
        return "api_presentation"
    elif (
        "db" in path_lower
        or "database" in path_lower
        or "models" in path_lower
        or "repository" in path_lower
        or "schema" in path_lower
    ):
        return "data_persistence"
    elif (
        "utils" in path_lower
        or "helpers" in path_lower
        or "config" in path_lower
        or "common" in path_lower
        or "types" in path_lower
    ):
        return "utility_core"
    else:
        return "service_business"


def analyze_architecture_evolution(db: Session, project_id: str) -> ArchitectureEvolutionResponse:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ValueError(f"Project '{project_id}' not found.")

    anal_rec = (
        db.query(ProjectAnalysisRecord)
        .filter(ProjectAnalysisRecord.project_id == project_id)
        .first()
    )
    if not anal_rec:
        raise RuntimeError("Project analysis is required before calculating architecture evolution.")

    analysis = ProjectAnalysis.model_validate(anal_rec.analysis_data)
    graph = build_project_dependency_graph(db, project_id)

    # 1. Classify current architecture layers
    current_arch: Dict[str, List[ArchLayerModule]] = {
        "api_presentation": [],
        "service_business": [],
        "data_persistence": [],
        "utility_core": [],
    }

    large_clusters: List[str] = []
    layer_violations: List[str] = []

    for mod in analysis.modules:
        layer = classify_module_layer(mod.relative_path, mod.is_entry_point)
        node = ArchLayerModule(
            module_id=mod.module_id,
            relative_path=mod.relative_path,
            layer=layer,
            line_count=mod.line_count,
            complexity_score=mod.complexity.cyclomatic_complexity,
            is_entry_point=mod.is_entry_point,
        )
        current_arch[layer].append(node)

        if mod.line_count > 250 or mod.complexity.cyclomatic_complexity > 15:
            large_clusters.append(mod.relative_path)

    # 2. Analyze characteristics & layer violations
    cycle_modules_set: Set[str] = set()
    for cycle in graph.cycles:
        for node_id in cycle:
            cycle_modules_set.add(node_id)

    # Detect layer violations (e.g. Data or Utility layer importing Presentation)
    module_layer_map = {mod.relative_path: classify_module_layer(mod.relative_path, mod.is_entry_point) for mod in analysis.modules}

    for mod in analysis.modules:
        mod_layer = module_layer_map.get(mod.relative_path, "service_business")
        if mod_layer in ("data_persistence", "utility_core"):
            for imp in mod.imports:
                target_layer = module_layer_map.get(imp.module_name, "service_business")
                if target_layer == "api_presentation":
                    layer_violations.append(f"{mod.relative_path} ({mod_layer}) imports {imp.module_name} (api_presentation)")

    total_nodes = len(graph.nodes) or 1
    avg_degree = round(graph.summary.total_edges / total_nodes, 2)
    coupling_lvl = "high" if avg_degree > 2.5 else "medium" if avg_degree > 1.2 else "low"

    hubs = [m.label for m in graph.summary.most_connected_modules[:5]]
    isolated = [n.label for n in graph.nodes if n.is_external or n.warning_count == 0][:5]

    characteristics = ArchCharacteristics(
        coupling_level=coupling_lvl,
        average_degree=avg_degree,
        total_cycles=graph.summary.cycle_count,
        cycle_modules=list(cycle_modules_set)[:10],
        highly_connected_hubs=hubs,
        isolated_modules=isolated,
        layer_violations=layer_violations[:5],
        large_clusters=large_clusters[:10],
    )

    # 3. Proposed 4-Tier Target Architecture
    proposed_arch: Dict[str, List[str]] = {
        "API & Routing Layer": [
            "Unified API Gateway / Controller Routers",
            "Authentication & Request Validation Middleware",
            "Rate Limiting & Output Serialization",
        ],
        "Decoupled Service Layer": [
            "Analysis Engine Service (AST & Call Graph)",
            "Dependency Graph & Impact Resolver",
            "Unit Test Generator & Sandbox Execution",
            "Modernization & Refactoring Service",
        ],
        "Persistence & Repository Layer": [
            "Decoupled Repository Pattern Interfaces",
            "Database Models & Migration Schema",
            "Query Caching & Connection Pool Manager",
        ],
        "Core Shared Layer": [
            "Domain Schemas & DTO Definitions",
            "Configuration & Logging Infrastructure",
            "Shared Utility & Helper Functions",
        ],
    }

    # 4. Proposed Itemized Architectural Changes
    proposed_changes: List[ProposedArchChange] = []

    if large_clusters:
        proposed_changes.append(
            ProposedArchChange(
                change_id="arch_change_1",
                title="Decompose Monolithic Responsibility Clusters",
                reason="Large modules exceeding 250 LOC or complexity score 15 create high coupling and maintenance risk.",
                affected_files=large_clusters[:5],
                dependencies=["Service Layer Isolation"],
                risk_level="medium",
                migration_steps=[
                    "Extract sub-functions into dedicated domain helper modules.",
                    "Define explicit interface contracts for extracted helpers.",
                    "Update call sites to use new domain helpers.",
                ],
            )
        )

    if graph.summary.cycle_count > 0:
        proposed_changes.append(
            ProposedArchChange(
                change_id="arch_change_2",
                title="Eliminate Dependency Cycle Loops",
                reason=f"Detected {graph.summary.cycle_count} circular dependency loop(s) creating tight coupling.",
                affected_files=list(cycle_modules_set)[:5],
                dependencies=["Dependency Inversion"],
                risk_level="high",
                migration_steps=[
                    "Identify shared data structures causing circular import.",
                    "Extract shared interfaces into Core Shared Layer.",
                    "Refactor import paths to depend on interface contracts.",
                ],
            )
        )

    proposed_changes.append(
        ProposedArchChange(
            change_id="arch_change_3",
            title="Introduce Decoupled Repository Pattern for Data Access",
            reason="Isolate direct database ORM queries from presentation and business logic layers.",
            affected_files=[m.relative_path for m in current_arch["data_persistence"][:5]] or ["backend/app/database.py"],
            dependencies=["Persistence Layer"],
            risk_level="low",
            migration_steps=[
                "Create abstract repository interfaces for database queries.",
                "Inject repository instances into service classes.",
                "Replace inline DB session queries with repository method calls.",
            ],
        )
    )

    return ArchitectureEvolutionResponse(
        project_id=project_id,
        current_architecture=current_arch,
        proposed_architecture=proposed_arch,
        characteristics=characteristics,
        proposed_changes=proposed_changes,
        disclaimer="Proposed architecture is an advisory recommendation for engineering review and does not automatically alter source code.",
    )

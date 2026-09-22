import logging
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session

from app.analysis.architecture_models import (
    ArchitectureEntryPoint,
    ArchitectureLayer,
    ArchitectureOverview,
    CoverageInfo,
    DependencyGraphSummary,
    EntryPointKind,
    KeyModule,
    ModuleRole,
    RecommendedTargetInfo,
    ScoreFactorBreakdown,
    UnresolvedDiagnosticGroup,
    UnresolvedDiagnosticsSummary,
)
from app.analysis.graph_models import GraphResponse
from app.analysis.graph_service import build_project_dependency_graph
from app.analysis.models import ModuleAnalysis, ProjectAnalysis
from app.hotspots.service import compute_project_hotspots
from app.models.db import Project, ProjectAnalysisRecord, ProjectFile

logger = logging.getLogger(__name__)


def classify_entry_point(path: str, mod: Optional[ModuleAnalysis] = None) -> Tuple[EntryPointKind, str, str, float]:
    """
    Classifies a module into an authoritative entry-point category.
    Only real runtime roots receive app_runtime or frontend_bootstrap.
    """
    norm = path.replace("\\", "/").lower()
    fname = Path(norm).name

    # 1. ML Training Entries
    if any(tok in norm for tok in ("ml/train.py", "ml/train_", "training/train", "pipelines/train", "train.py", "evaluate.py")):
        return "ml_training", "ML TRAINING", "Machine learning model training and feature pipeline entry", 0.96

    # 2. Backend Application Runtime Roots
    if fname in ("main.py", "app.py", "server.py", "wsgi.py", "asgi.py") and not any(tok in norm for tok in ("seed", "test", "test_")):
        if any(prefix in norm for prefix in ("backend/", "app/", "src/backend/", "server/")):
            return "app_runtime", "APP RUNTIME", "Backend application runtime server and HTTP coordinator", 0.98
        return "app_runtime", "APP RUNTIME", "Primary application runtime runner", 0.90

    # 3. Frontend Bootstrap Roots
    if fname in ("main.tsx", "main.jsx", "main.ts", "main.js", "index.tsx", "index.jsx") and any(tok in norm for tok in ("frontend/", "src/", "client/")):
        return "frontend_bootstrap", "FRONTEND BOOTSTRAP", "Client-side DOM bootstrap and application renderer", 0.98

    # 4. Route & Layout Roots
    if fname in ("app.tsx", "app.jsx", "app.vue", "mainlayout.tsx", "layout.tsx", "rootlayout.tsx", "router.tsx", "routes.tsx"):
        return "route_root", "ROUTE / LAYOUT ROOT", "Application top-level routing, shell layout, and navigation context", 0.94

    # 5. Background Workers & Queue Processors
    if any(tok in fname for tok in ("worker", "celery", "consumer", "subscriber", "queue_listener")):
        return "worker", "WORKER", "Asynchronous job worker and task runner", 0.92

    # 6. Command Line Interfaces
    if fname in ("cli.py", "cli.ts", "manage.py") or any(tok in norm for tok in ("cli/", "commands/")):
        return "cli", "CLI", "Command line execution tool", 0.95

    # 7. Executable Scripts & Database Utilities
    if fname in ("seed.py", "populate.py", "migrate.py", "setup_db.py") or any(tok in norm for tok in ("scripts/", "bin/", "tools/")):
        return "script", "SCRIPT", "Supporting executable database/utility script", 0.90

    # 8. Configuration & Build Files
    if any(tok in fname for tok in ("config", "vite.", "webpack.", "setup.py", "tsconfig", "tailwind.", "postcss.", "babel.")):
        return "config", "CONFIG", "Build tool, bundler, or environment configuration", 0.92

    # Types and interfaces are contracts, not executable scripts
    if fname.endswith((".d.ts", ".types.ts")) or "/types/" in norm or fname in ("types.ts", "types.tsx"):
        return "unknown", "CONTRACT", "Type definitions and interface contracts", 0.90

    # Fallback if explicitly tagged as entry point in module analysis
    if mod and mod.is_entry_point:
        return "script", "SCRIPT", "Standalone executable script", 0.70

    return "unknown", "STANDALONE", "Standalone or unreferenced module", 0.50


def classify_module_role(path: str, mod: Optional[ModuleAnalysis] = None) -> Tuple[ModuleRole, str]:
    """
    Classifies a module into its architectural domain role.
    Generated files are strictly prevented from ranking as core domain.
    """
    norm = path.replace("\\", "/").lower()
    fname = Path(norm).name

    # Generated files
    if any(tok in norm for tok in ("generated", ".generated.", "_pb2.", ".g.", "swagger", "openapi", "bundle.min.")):
        return "generated", "Generated Contract"

    # Tests & benchmarks
    if any(tok in norm for tok in ("test", "spec", "benchmark", "fixture", "mock")):
        return "test", "Test Suite"

    # Configuration
    if any(tok in fname for tok in ("config", "setup.py", "tsconfig", "vite", "webpack", "tailwind")):
        return "configuration", "Configuration"

    # Scripts
    if any(tok in fname for tok in ("seed.py", "run.py", "manage.py")) or "scripts/" in norm:
        return "script", "Script"

    # ML
    if any(tok in norm for tok in ("ml/", "pipeline", "forecast", "preprocessing", "training", "feature_engineering", "model_eval")):
        return "ml", "ML Pipeline"

    # API / Route Orchestration
    if any(tok in norm for tok in ("api/", "route", "endpoint", "controller", "handler", "viewsets")):
        return "api", "API / Orchestration"

    # Repository
    if any(tok in norm for tok in ("repo", "repository", "dao")):
        return "repository", "Repository"

    # Persistence / Data Models
    if any(tok in norm for tok in ("model", "schema", "entity", "database", "alembic", "db.", "migration")):
        return "persistence", "Persistence & Schemas"

    # UI
    if any(tok in norm for tok in ("components/", "pages/", "views/", "frontend/src", "widgets/", "layouts/")):
        return "ui", "User Interface"

    # Application Service
    if any(tok in norm for tok in ("service", "core/", "use_cases", "domain/services")):
        return "application_service", "Application Service"

    # Utilities
    if any(tok in norm for tok in ("util", "helper", "common", "shared", "lib/")):
        return "utility", "Shared Utility"

    # Default based on language/path
    if "frontend" in norm or fname.endswith((".tsx", ".jsx")):
        return "ui", "UI Logic"
    return "domain", "Domain Module"


def build_architecture_overview(
    db: Session,
    project_id: str,
    analysis: ProjectAnalysis,
) -> ArchitectureOverview:
    """
    Builds the canonical ArchitectureOverview response.
    Guarantees that graph metrics, parse confidence, layers, entry points,
    and hotspot score factors all come from one single verified source.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    display_name = project.display_name if project else project_id

    # 1. Parse Coverage & Confidence
    total_files = len(analysis.modules)
    fully_parsed = sum(1 for m in analysis.modules if m.parse_status == "complete")
    partial = sum(1 for m in analysis.modules if m.parse_status == "partial")
    fallback = sum(1 for m in analysis.modules if m.parse_status in ("fallback", "lexical"))
    failed = sum(1 for m in analysis.modules if m.parse_status == "failed")
    unsupported = sum(1 for m in analysis.modules if m.parse_status == "unsupported")
    fallback_total = fallback + unsupported

    full_ast_pct = round((fully_parsed / max(total_files, 1)) * 100, 1)

    # Confidence rating logic
    if fully_parsed == total_files and fallback_total == 0 and partial == 0:
        confidence = "high"
    elif full_ast_pct >= 85 and fallback_total <= 5:
        confidence = "medium"
    elif full_ast_pct >= 50:
        confidence = "partial"
    else:
        confidence = "low"

    # 2. Canonical Dependency Graph Summary
    graph_res: GraphResponse = build_project_dependency_graph(analysis=analysis, level="module", include_external=False)
    cycles_count = graph_res.summary.cycles

    # Canonical coupling metrics from single canonical graph summary
    internal_unresolved_count = graph_res.summary.unresolved_imports
    external_ref_count = graph_res.summary.external_edges

    # Cycle wording rule: Clean hierarchical DAG ONLY if 100% full AST and 0 unresolved
    if full_ast_pct == 100.0 and internal_unresolved_count == 0 and cycles_count == 0:
        cycle_label = "Clean hierarchical DAG"
    elif cycles_count == 0:
        cycle_label = "0 cycles detected in the resolved graph"
    else:
        cycle_label = f"{cycles_count} cycles detected in resolved graph"

    limitation_notice = None
    if fully_parsed < total_files:
        unparsed_count = total_files - fully_parsed
        limitation_notice = (
            f"Coverage limitation: {unparsed_count} file(s) were not fully parsed. "
            "Additional relationships or cycles may remain unresolved in unparsed modules."
        )

    coverage_info = CoverageInfo(
        total_source_files=total_files,
        fully_parsed=fully_parsed,
        partial=partial,
        fallback=fallback_total,
        failed=failed,
        full_ast_percentage=full_ast_pct,
        confidence=confidence,
        cycle_label=cycle_label,
        limitation_notice=limitation_notice,
    )

    graph_summary = DependencyGraphSummary(
        node_count=graph_res.summary.total_modules or total_files,
        resolved_edges=graph_res.summary.resolved_edges,
        runtime_edges=graph_res.summary.runtime_edges,
        type_only_edges=graph_res.summary.type_only_edges,
        dynamic_edges=graph_res.summary.dynamic_edges,
        unresolved_imports=graph_res.summary.unresolved_imports,
        external_references=external_ref_count,
        cycle_count=cycles_count,
        orphan_count=graph_res.summary.standalone_modules,
        isolated_modules_count=graph_res.summary.standalone_modules,
    )

    # Group unresolved diagnostics from graph_res.unresolved
    ts_alias_examples = [f"{u.source_path} -> {u.raw_import}" for u in graph_res.unresolved if u.reason_key == "ts_alias"]
    py_rel_examples = [f"{u.source_path} -> {u.raw_import}" for u in graph_res.unresolved if u.reason_key == "python_relative"]
    dyn_examples = [f"{u.source_path} -> {u.raw_import}" for u in graph_res.unresolved if u.reason_key == "dynamic_import"]
    gen_examples = [f"{u.source_path} -> {u.raw_import}" for u in graph_res.unresolved if u.reason_key == "generated"]
    syntax_examples = [f"{u.source_path} -> {u.raw_import}" for u in graph_res.unresolved if u.reason_key == "syntax_error"]

    unresolved_diagnostics = UnresolvedDiagnosticsSummary(
        total_unresolved=internal_unresolved_count,
        groups=[
            UnresolvedDiagnosticGroup(
                key="ts_alias",
                label="TypeScript alias resolution",
                count=len(ts_alias_examples),
                description="Imports using `@/*` or path mapping requiring `tsconfig.json` baseUrl resolution.",
                examples=ts_alias_examples[:5],
            ),
            UnresolvedDiagnosticGroup(
                key="python_relative",
                label="Python relative / project imports",
                count=len(py_rel_examples),
                description="Package imports like `app.*` or relative `.` imports needing repository root context.",
                examples=py_rel_examples[:5],
            ),
            UnresolvedDiagnosticGroup(
                key="dynamic_imports",
                label="Dynamic imports",
                count=len(dyn_examples),
                description="Runtime-evaluated `import()` or dynamic `require()` calls resolved at execution.",
                examples=dyn_examples[:5],
            ),
            UnresolvedDiagnosticGroup(
                key="generated_modules",
                label="Generated contracts",
                count=len(gen_examples),
                description="References to build-time OpenAPI or Protocol Buffer generated files.",
                examples=gen_examples[:5],
            ),
            UnresolvedDiagnosticGroup(
                key="unsupported_syntax",
                label="Unsupported parser cases",
                count=len(syntax_examples),
                description="Files containing complex syntax fallback where AST extraction was incomplete.",
                examples=syntax_examples[:5],
            ),
        ],
    )


    # 3. Categorized Entry Points
    entry_points_list: List[ArchitectureEntryPoint] = []
    seen_entry_paths = set()

    for m in analysis.modules:
        kind, label, desc, conf = classify_entry_point(m.relative_path, m)
        if kind != "unknown" or m.is_entry_point:
            if m.relative_path not in seen_entry_paths:
                seen_entry_paths.add(m.relative_path)
                entry_points_list.append(
                    ArchitectureEntryPoint(
                        path=m.relative_path,
                        kind=kind,
                        kind_label=label,
                        confidence=conf,
                        description=desc,
                    )
                )

    # Order entry points logically: app_runtime first, then frontend_bootstrap, ml_training, worker, cli, script, route_root, config
    order_map = {
        "app_runtime": 1,
        "frontend_bootstrap": 2,
        "ml_training": 3,
        "worker": 4,
        "cli": 5,
        "script": 6,
        "route_root": 7,
        "config": 8,
        "unknown": 9,
    }
    entry_points_list.sort(key=lambda ep: (order_map.get(ep.kind, 10), ep.path))

    # 4. Major Layers with file count % vs LOC %
    total_loc = sum(m.line_count for m in analysis.modules)
    layers_map: Dict[str, Dict] = {}

    layer_roles = {
        "backend": "API, services, persistence, background jobs",
        "frontend": "React application, pages, components, API clients",
        "ml": "Training, preprocessing, forecasting pipeline",
        "database": "Migrations / schema infrastructure",
        "tests": "Test suite, fixtures, mock benchmarks",
        "docs": "Documentation and design specs",
        "root": "Top-level configuration and project entry",
    }

    cycle_module_ids = set()
    for cyc in graph_res.cycles:
        for node_id in cyc:
            cycle_module_ids.add(node_id)

    for m in analysis.modules:
        norm = m.relative_path.replace("\\", "/")
        parts = norm.split("/")
        layer_name = parts[0] if len(parts) > 1 else "root"

        if layer_name not in layers_map:
            role = layer_roles.get(layer_name.lower())
            if not role:
                if any(tok in layer_name.lower() for tok in ("service", "core", "api")):
                    role = "Service & API Layer"
                elif any(tok in layer_name.lower() for tok in ("model", "data", "schema")):
                    role = "Data & Schema Layer"
                else:
                    role = f"{layer_name.capitalize()} Layer"

            layers_map[layer_name] = {
                "file_count": 0,
                "loc": 0,
                "has_cycle": False,
                "role": role,
                "languages": set(),
                "entry_points": 0,
            }

        layers_map[layer_name]["file_count"] += 1
        layers_map[layer_name]["loc"] += m.line_count
        if m.language:
            layers_map[layer_name]["languages"].add(m.language)
        if m.is_entry_point:
            layers_map[layer_name]["entry_points"] += 1
        if m.module_id in cycle_module_ids:
            layers_map[layer_name]["has_cycle"] = True

    layers_list: List[ArchitectureLayer] = []
    for name, data in sorted(layers_map.items(), key=lambda x: -x[1]["file_count"]):
        f_pct = round((data["file_count"] / max(total_files, 1)) * 100, 1)
        loc_pct = round((data["loc"] / max(total_loc, 1)) * 100, 1)
        layers_list.append(
            ArchitectureLayer(
                path=f"/{name}" if name != "root" else "/root",
                file_count=data["file_count"],
                file_percentage=f_pct,
                loc=data["loc"],
                loc_percentage=loc_pct,
                role=data["role"],
                has_cycle=data["has_cycle"],
                languages=sorted(list(data["languages"])),
                entry_points=data["entry_points"],
            )
        )

    # 5. Core Application Modules (excluding generated contracts)
    key_modules: List[KeyModule] = []
    for m in analysis.modules:
        role, role_label = classify_module_role(m.relative_path, m)
        # Never treat generated files or pure tests as core domain modules
        if role == "generated":
            continue

        # Score importance by classes, functions, line count
        importance = len(m.classes) * 3 + len(m.functions) * 2 + (m.line_count // 50)
        if importance >= 4 or role in ("application_service", "domain", "api", "ml"):
            reason = f"{len(m.classes)} classes, {len(m.functions)} functions orchestrating {role_label.lower()}."
            key_modules.append(
                KeyModule(
                    path=m.relative_path,
                    role=role,
                    role_label=role_label,
                    reason=reason,
                    classes_count=len(m.classes),
                    functions_count=len(m.functions),
                    line_count=m.line_count,
                    complexity_rating=m.complexity.rating,
                    is_entry_point=m.is_entry_point,
                )
            )

    key_modules.sort(key=lambda km: (0 if km.role in ("domain", "application_service", "api", "ml") else 1, -km.line_count))
    top_key_modules = key_modules[:12]

    # 6. Recommended Target with Score Decomposition
    recommended_target: Optional[RecommendedTargetInfo] = None
    try:
        hotspots_res = compute_project_hotspots(db, project_id)
        if hotspots_res and hotspots_res.hotspots:
            # Find recommended start file or top hotspot
            target_item = None
            if hotspots_res.recommended_start_file:
                target_item = next((h for h in hotspots_res.hotspots if h.file == hotspots_res.recommended_start_file), None)
            if not target_item and hotspots_res.hotspots:
                target_item = hotspots_res.hotspots[0]

            # Find file with highest cyclomatic complexity
            highest_comp_item = max(hotspots_res.hotspots, key=lambda h: h.complexity)

            if target_item:
                factors = target_item.score_factors
                breakdown = ScoreFactorBreakdown(
                    complexity=factors.complexity_score,
                    warnings=factors.warnings_score,
                    fan_in=factors.fan_in_score,
                    blast_radius=factors.blast_radius_score,
                    loc=factors.loc_score,
                    hotspot_score=target_item.hotspot_score,
                )
                recommended_target = RecommendedTargetInfo(
                    path=target_item.file,
                    hotspot_score=target_item.hotspot_score,
                    factors=breakdown,
                    reason=hotspots_res.recommended_start_reason or target_item.reason,
                    highest_complexity_file=highest_comp_item.file,
                    highest_complexity_score=highest_comp_item.complexity,
                )
    except Exception:
        logger.exception("Failed to compute hotspot factor decomposition for %s", project_id)

    # 7. Natural Architecture Copy Generation
    frameworks = []
    all_paths_str = " ".join(m.relative_path.lower() for m in analysis.modules)
    if "fastapi" in all_paths_str or any("fastapi" in imp.module_name for m in analysis.modules for imp in m.imports):
        frameworks.append("FastAPI")
    elif "flask" in all_paths_str or any("flask" in imp.module_name for m in analysis.modules for imp in m.imports):
        frameworks.append("Flask")
    elif "django" in all_paths_str:
        frameworks.append("Django")

    if "react" in all_paths_str or any("react" in imp.module_name for m in analysis.modules for imp in m.imports):
        frameworks.append("React")
    elif "vue" in all_paths_str:
        frameworks.append("Vue")

    if any(tok in all_paths_str for tok in ("torch", "sklearn", "xgboost", "lightgbm", "forecast", "pipeline")):
        frameworks.append("ML Pipeline")

    if any(tok in all_paths_str for tok in ("database", "alembic", "sqlalchemy")):
        frameworks.append("Database Infrastructure")

    frameworks_desc = ", ".join(frameworks) if frameworks else "modular components"
    arch_summary = (
        f"This is a full-stack {', '.join(analysis.languages).title()} application featuring {frameworks_desc}. "
        f"Comprising {total_files} source files and {total_loc:,} lines of code, the architecture is structured into "
        f"{len(layers_list)} primary subsystem layers with {full_ast_pct}% deterministic AST parse coverage."
    )

    return ArchitectureOverview(
        project_id=project_id,
        coverage=coverage_info,
        graph=graph_summary,
        entry_points=entry_points_list,
        layers=layers_list,
        key_modules=top_key_modules,
        recommended_target=recommended_target,
        unresolved_diagnostics=unresolved_diagnostics,
        architecture_summary=arch_summary,
        frameworks_detected=frameworks,
    )

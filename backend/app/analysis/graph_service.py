import logging
from collections import defaultdict, deque
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

from app.analysis.dependency_resolver import classify_unresolved_import
from app.analysis.graph_models import (
    GraphEdge,
    GraphNode,
    GraphResponse,
    GraphSummary,
    UnresolvedDependency,
)
from app.analysis.models import ModuleAnalysis, ProjectAnalysis

logger = logging.getLogger(__name__)

MAX_DRILLDOWN_CALL_EDGES = 50


def _classify_standalone_reason(rel_path: str) -> str:
    lower = rel_path.lower().replace("\\", "/")
    fname = Path(lower).name
    if any(tok in fname for tok in ("config", "setup.py", "webpack", "vite", "tsconfig", "tailwind", "settings")):
        return "Configuration / build file"
    if any(tok in lower for tok in ("test", "spec", "benchmark")):
        return "Test suite / benchmark"
    if fname in ("cli.py", "cli.ts", "cli.js", "run.py", "server.py", "main.py", "manage.py"):
        return "Standalone script / CLI"
    return "Isolated / unreferenced module"


def _classify_module_role(rel_path: str, mod: Optional[ModuleAnalysis] = None) -> str:
    """Infers architecture role for module."""
    lower = rel_path.lower().replace("\\", "/")
    fname = Path(lower).name

    if any(tok in lower for tok in ("/test/", "/tests/", "_test.", ".spec.", ".test.")):
        return "test"
    if any(tok in fname for tok in ("config", "vite", "webpack", "tsconfig", "tailwind", "settings")):
        return "config"
    if any(tok in lower for tok in ("/api/", "/routes/", "/endpoints/", "/controllers/", "routes.py")):
        return "api"
    if any(tok in lower for tok in ("/services/", "/service/", "/usecase/")):
        return "service"
    if any(tok in lower for tok in ("/repository/", "/repositories/", "/dao/", "/persistence/")):
        return "repository"
    if any(tok in lower for tok in ("/models/", "/domain/", "/entities/", "/schemas/")):
        return "domain"
    if any(tok in lower for tok in ("/ml/", "/models_ai/", "train.py", "predict.py")):
        return "ml"
    if any(tok in lower for tok in ("/scripts/", "seed.py", "migrate.py", "cli.py")):
        return "script"
    if any(tok in lower for tok in ("/components/", "/views/", "/pages/", "/ui/")) or lower.endswith((".tsx", ".jsx")):
        return "ui"
    if any(tok in lower for tok in ("/utils/", "/helpers/", "/common/", "/lib/")):
        return "utility"

    if mod and mod.classes:
        return "domain"
    return "utility"


def _classify_semantic_entry_point(
    rel_path: str, mod: ModuleAnalysis
) -> Tuple[bool, Optional[str], Optional[str], Optional[str]]:
    """
    Semantically classifies whether a module is a confirmed entry point.
    Returns: (is_entry_point, kind, confidence, evidence)
    Kinds: APP_RUNTIME, FRONTEND_BOOTSTRAP, WORKER, CLI, SCRIPT, ML_TRAINING, ROUTE_ROOT, CONFIG, UNKNOWN
    """
    lower = rel_path.lower().replace("\\", "/")
    fname = Path(lower).name

    # Check for frontend bootstrap
    if fname in ("main.tsx", "main.jsx", "index.tsx", "index.jsx") and any(
        dir_name in lower for dir_name in ("src", "frontend", "client", "app")
    ):
        has_createroot = any(call.target_name in ("createRoot", "render") for call in getattr(mod, "calls", []))
        evidence = "React createRoot() DOM bootstrap" if has_createroot else "Frontend client bootstrap entry point"
        return True, "frontend_bootstrap", "high", evidence

    # Check for backend web runtime
    if fname in ("main.py", "server.py", "app.py", "wsgi.py", "asgi.py"):
        has_framework = any(
            c.target_name in ("FastAPI", "Flask", "express", "listen", "run") for c in getattr(mod, "calls", [])
        )
        evidence = "Application framework server instance" if has_framework else "Backend runtime entry point"
        return True, "app_runtime", "high", evidence

    # Check for background worker
    if any(tok in fname for tok in ("worker", "tasks", "consumer", "celery")):
        return True, "worker", "high", "Background worker / task queue consumer"

    # Check for CLI
    if any(tok in fname for tok in ("cli.py", "cli.ts", "manage.py")):
        return True, "cli", "high", "Command-line interface execution root"

    # Check for ML training
    if any(tok in fname for tok in ("train.py", "eval.py", "evaluate.py")) or (
        "/ml/" in lower and fname in ("run.py", "pipeline.py")
    ):
        return True, "ml_training", "high", "Machine learning training / evaluation pipeline"

    # Check for Standalone scripts
    if any(tok in fname for tok in ("seed.py", "migrate.py", "setup.py")) or "/scripts/" in lower:
        return True, "script", "high" if "/scripts/" in lower else "medium", "Standalone database seed / migration script"

    # Check for Route / Layout Root
    if fname in ("app.tsx", "app.jsx", "mainlayout.tsx", "router.tsx", "routes.tsx"):
        return True, "route_root", "medium", "Top-level application router or primary layout root"

    # Check for Build / Config file
    if any(tok in fname for tok in ("vite.config", "webpack.config", "tsconfig", "tailwind.config", "settings.py")):
        return True, "config", "high", "Project build or runtime environment configuration"

    # Check for if __name__ == '__main__' AST flag
    if getattr(mod, "is_entry_point", False):
        return True, "script", "high", "Contains 'if __name__ == \"__main__\"' execution block"

    return False, None, None, None


def _is_reexport_pair(src_path: str, tgt_path: str) -> bool:
    src_p = Path(src_path.replace("\\", "/"))
    tgt_p = Path(tgt_path.replace("\\", "/"))
    src_parent = src_p.parent.as_posix()
    tgt_parent = tgt_p.parent.as_posix()
    src_name = src_p.name
    tgt_name = tgt_p.name
    if src_name in ("__init__.py", "index.ts", "index.js", "index.tsx") and tgt_parent == src_parent:
        return True
    if tgt_name in ("__init__.py", "index.ts", "index.js", "index.tsx") and src_parent == tgt_parent:
        return True
    return False


def find_directed_cycles(nodes_set: Set[str], edges_list: List[Tuple[str, str]]) -> List[List[str]]:
    """
    Finds elementary directed cycles in graph deterministically.
    Returns canonical, deduplicated lists of node IDs forming cycles (e.g. ['A', 'B', 'A']).
    Excludes self-loops unless self-import edge genuinely exists.
    """
    adj: Dict[str, List[str]] = {n: [] for n in nodes_set}
    for src, tgt in edges_list:
        if src in adj and tgt in adj:
            if src != tgt:
                adj[src].append(tgt)

    for n in adj:
        adj[n].sort()

    raw_cycles: List[List[str]] = []
    for start in sorted(nodes_set):
        path = [start]
        in_path = {start}

        def walk(current: str) -> None:
            for neighbor in adj.get(current, []):
                if neighbor == start and len(path) > 1:
                    raw_cycles.append(path + [start])
                elif neighbor not in in_path and neighbor >= start:
                    in_path.add(neighbor)
                    path.append(neighbor)
                    walk(neighbor)
                    path.pop()
                    in_path.remove(neighbor)

        walk(start)

    canonical_cycles: Set[Tuple[str, ...]] = set()
    for cycle in raw_cycles:
        node_body = cycle[:-1]
        if not node_body:
            continue
        min_idx = node_body.index(min(node_body))
        rotated = node_body[min_idx:] + node_body[:min_idx] + [node_body[min_idx]]
        canonical_cycles.add(tuple(rotated))

    sorted_cycles = sorted([list(c) for c in canonical_cycles], key=lambda c: (len(c), c))
    return sorted_cycles


def build_project_dependency_graph(
    analysis: ProjectAnalysis,
    level: str = "module",
    module_id: Optional[str] = None,
    edge_types_filter: Optional[List[str]] = None,
    include_external: bool = False,
) -> GraphResponse:
    """
    Builds a canonical, deterministic dependency graph response from cached ProjectAnalysis.
    Guarantees exact invariant:
      sum(node.fan_out) == resolved_edges == sum(node.fan_in) == len(edges) (for internal graph).
    """
    if level == "symbol" and module_id:
        return build_symbol_drilldown_graph(analysis, module_id, edge_types_filter)

    # 1. Map Modules & Build Internal Nodes
    modules_by_id: Dict[str, ModuleAnalysis] = {m.module_id: m for m in analysis.modules}
    internal_module_ids = set(modules_by_id.keys())
    nodes_map: Dict[str, GraphNode] = {}

    for mod in analysis.modules:
        sym_count = len(mod.classes) + len(mod.functions) + len(mod.variables)
        warn_count = len(mod.legacy_warnings) + len(mod.parse_errors)

        is_entry, entry_kind, entry_conf, entry_ev = _classify_semantic_entry_point(mod.relative_path, mod)
        role = _classify_module_role(mod.relative_path, mod)

        node = GraphNode(
            id=mod.module_id,
            label=mod.relative_path,
            language=mod.language,
            kind="module",
            parse_status=mod.parse_status,
            line_count=mod.line_count,
            complexity_score=mod.complexity.cyclomatic_complexity,
            complexity_rating=mod.complexity.rating,
            warning_count=warn_count,
            is_entry_point=is_entry,
            is_external=False,
            entry_point_kind=entry_kind,
            entry_point_confidence=entry_conf,
            entry_point_evidence=entry_ev,
            module_role=role,
            symbol_count=sym_count,
        )
        nodes_map[mod.module_id] = node

    # 2. Process Edges with Strict Internal/External & Resolved Checks
    allowed_types = set(edge_types_filter) if edge_types_filter else None
    edges: List[GraphEdge] = []
    unresolved_deps: List[UnresolvedDependency] = []
    unresolved_by_source: Dict[str, int] = defaultdict(int)
    resolved_by_source: Dict[str, int] = defaultdict(int)

    for edge in analysis.dependency_edges:
        if allowed_types and edge.type not in allowed_types:
            continue

        target_is_internal = edge.target_module_id in internal_module_ids
        is_resolved_internal = edge.resolved and target_is_internal

        if not is_resolved_internal:
            # Unresolved or external reference
            raw_target = getattr(edge, "raw_import", None) or edge.target_module_id
            src_mod = modules_by_id.get(edge.source_module_id)
            src_lang = src_mod.language if src_mod else "unknown"
            src_path = src_mod.relative_path if src_mod else ""
            src_parse = src_mod.parse_status if src_mod else "complete"

            reason_key, reason_label = classify_unresolved_import(
                raw_target=raw_target,
                source_path=src_path,
                source_lang=src_lang,
                parse_status=src_parse,
                is_dynamic=getattr(edge, "is_dynamic", False),
            )

            if reason_key != "external":
                unresolved_by_source[edge.source_module_id] += 1
                unresolved_deps.append(
                    UnresolvedDependency(
                        source=edge.source_module_id,
                        source_path=src_path,
                        raw_import=raw_target,
                        reason_key=reason_key,
                        reason_label=reason_label,
                        line=edge.source_line,
                    )
                )

            if not include_external:
                continue

            # In external view: create synthetic external package node
            ext_id = f"ext:{edge.target_module_id}"
            if ext_id not in nodes_map:
                lang = "python" if "py" in edge.source_module_id else "javascript"
                nodes_map[ext_id] = GraphNode(
                    id=ext_id,
                    label=edge.target_module_id,
                    language=lang,
                    kind="external",
                    is_external=True,
                    module_role="external",
                )
            target_node_id = ext_id
        else:
            target_node_id = edge.target_module_id
            resolved_by_source[edge.source_module_id] += 1

        raw_kind = getattr(edge, "kind", getattr(edge, "type", "runtime_import")) or "runtime_import"
        is_type_only = getattr(edge, "is_type_only", False)
        is_dynamic = getattr(edge, "is_dynamic", False)
        if is_type_only:
            edge_kind = "type_only_import"
        elif is_dynamic or raw_kind == "dynamic_import":
            edge_kind = "dynamic_import"
        elif raw_kind in ("require", "re_export"):
            edge_kind = raw_kind
        else:
            edge_kind = "runtime_import"

        edges.append(
            GraphEdge(
                id=edge.edge_id,
                source=edge.source_module_id,
                target=target_node_id,
                type=edge.type,
                kind=edge_kind,
                confidence=getattr(edge, "confidence", "high"),
                raw_import=getattr(edge, "raw_import", None),
                resolved=is_resolved_internal,
                source_line=edge.source_line,
                is_type_only=is_type_only,
                is_dynamic=is_dynamic,
                is_external=not target_is_internal,
            )
        )

    # Sort nodes and edges deterministically
    sorted_nodes = sorted(list(nodes_map.values()), key=lambda n: (n.is_external, n.label, n.id))
    sorted_edges = sorted(edges, key=lambda e: (e.source, e.target, e.kind, e.source_line))
    sorted_unresolved = sorted(unresolved_deps, key=lambda u: (u.source_path, u.line, u.raw_import))

    # 3. Calculate Degree & Invariant Enforcement
    in_degree: Dict[str, int] = {n.id: 0 for n in sorted_nodes}
    out_degree: Dict[str, int] = {n.id: 0 for n in sorted_nodes}

    # For internal directed graph: only internal edges contribute to internal fan-in/fan-out
    for e in sorted_edges:
        if not include_external or (e.source in internal_module_ids and e.target in internal_module_ids):
            out_degree[e.source] += 1
            in_degree[e.target] += 1

    # Invariant checks for internal graph
    internal_edges_count = sum(1 for e in sorted_edges if e.source in internal_module_ids and e.target in internal_module_ids)
    assert sum(out_degree[m_id] for m_id in internal_module_ids) == internal_edges_count, "out_degree sum mismatch"
    assert sum(in_degree[m_id] for m_id in internal_module_ids) == internal_edges_count, "in_degree sum mismatch"

    # 4. Transitive Blast Radius (Downstream Callers) via Reverse Graph BFS
    dependents: Dict[str, Set[str]] = defaultdict(set)
    for e in sorted_edges:
        if e.source in internal_module_ids and e.target in internal_module_ids:
            dependents[e.target].add(e.source)

    blast_radius_map: Dict[str, int] = {}
    for m_id in internal_module_ids:
        visited: Set[str] = set()
        queue = deque([m_id])
        while queue:
            curr = queue.popleft()
            for caller in dependents.get(curr, set()):
                if caller not in visited and caller != m_id:
                    visited.add(caller)
                    queue.append(caller)
        blast_radius_map[m_id] = len(visited)

    # 5. Cycle Detection (Runtime Only, Filtering Re-exports)
    paths_by_id = {n.id: n.label for n in sorted_nodes}
    runtime_pairs = [
        (e.source, e.target) for e in sorted_edges
        if not nodes_map[e.source].is_external and e.target in internal_module_ids and not e.is_type_only
    ]
    filtered_runtime_pairs = [
        (src, tgt) for src, tgt in runtime_pairs
        if not _is_reexport_pair(paths_by_id.get(src, ""), paths_by_id.get(tgt, ""))
    ]
    cycles = find_directed_cycles(internal_module_ids, filtered_runtime_pairs)

    all_pairs = [
        (e.source, e.target) for e in sorted_edges
        if not nodes_map[e.source].is_external and e.target in internal_module_ids
    ]
    all_cycles = find_directed_cycles(internal_module_ids, all_pairs)
    type_cycle_count = max(0, len(all_cycles) - len(cycles))
    cycle_nodes_set: Set[str] = {nid for c in cycles for nid in c}

    # 6. Apply Metrics & True Standalone Logic to Nodes
    true_standalone_ids: List[str] = []
    entry_point_ids: List[str] = []

    for n in sorted_nodes:
        if not n.is_external:
            n.fan_in = in_degree.get(n.id, 0)
            n.fan_out = out_degree.get(n.id, 0)
            n.resolved_imports = resolved_by_source.get(n.id, 0)
            n.unresolved_imports = unresolved_by_source.get(n.id, 0)
            n.blast_radius = blast_radius_map.get(n.id, 0)
            n.is_cycle = n.id in cycle_nodes_set

            # Standalone Rule: A module is TRUE STANDALONE only when:
            # fan_in == 0 and fan_out == 0 and unresolved_imports == 0 and parse_status == "complete"
            if n.fan_in == 0 and n.fan_out == 0:
                if n.unresolved_imports == 0 and n.parse_status == "complete":
                    n.standalone_status = "true_standalone"
                    n.standalone_reason = _classify_standalone_reason(n.label)
                    true_standalone_ids.append(n.id)
                else:
                    n.standalone_status = "isolation_uncertain"
                    n.standalone_reason = (
                        f"Isolation uncertain: {n.unresolved_imports} unresolved import(s) "
                        f"or {n.parse_status} AST parse"
                    )
            else:
                n.standalone_status = "connected"

            if n.is_entry_point:
                entry_point_ids.append(n.id)

    # 7. Unresolved Diagnostics Breakdown & Graph Confidence
    breakdown: Dict[str, int] = defaultdict(int)
    for u in sorted_unresolved:
        breakdown[u.reason_key] += 1

    total_files = len(analysis.modules)
    fully_parsed = sum(1 for m in analysis.modules if m.parse_status == "complete")
    full_ast_pct = round((fully_parsed / total_files * 100.0), 1) if total_files > 0 else 100.0

    total_unresolved = len(sorted_unresolved)
    if full_ast_pct >= 90.0 and total_unresolved == 0:
        graph_confidence = "high"
        graph_conf_reason = "100% full AST coverage and 0 unresolved relationships."
    elif full_ast_pct >= 70.0 and total_unresolved <= 5:
        graph_confidence = "medium"
        graph_conf_reason = f"{full_ast_pct}% AST coverage with {total_unresolved} unresolved relationship(s)."
    elif full_ast_pct >= 50.0 or total_unresolved > 5:
        graph_confidence = "partial"
        graph_conf_reason = f"Partial resolution: {total_unresolved} unresolved relationships and {full_ast_pct}% AST coverage."
    else:
        graph_confidence = "low"
        graph_conf_reason = "Low AST coverage and high rate of unresolved imports."

    cycle_confidence_warning = None
    if total_unresolved > 0 and len(cycles) == 0:
        cycle_confidence_warning = f"⚠ Cycle detection confidence reduced by {total_unresolved} unresolved relationships."

    # 8. Most Connected Modules
    connected = []
    for n in sorted_nodes:
        if not n.is_external:
            deg = n.fan_in + n.fan_out
            connected.append({
                "module_id": n.id,
                "label": n.label,
                "total_degree": deg,
                "in_degree": n.fan_in,
                "out_degree": n.fan_out,
            })
    connected.sort(key=lambda c: (-c["total_degree"], c["label"]))
    most_connected = connected[:5]

    # Summary
    internal_nodes_count = sum(1 for n in sorted_nodes if not n.is_external)
    external_nodes_count = sum(1 for n in sorted_nodes if n.is_external)
    external_edges_count = len(sorted_edges) - internal_edges_count
    high_comp_count = sum(1 for n in sorted_nodes if not n.is_external and n.complexity_rating in ("high", "critical"))

    runtime_count = sum(1 for e in sorted_edges if e.kind == "runtime_import")
    type_only_count = sum(1 for e in sorted_edges if e.kind == "type_only_import" or e.is_type_only)
    dynamic_count = sum(1 for e in sorted_edges if e.kind == "dynamic_import" or e.is_dynamic)

    summary = GraphSummary(
        total_nodes=len(sorted_nodes),
        total_modules=internal_nodes_count,
        internal_nodes=internal_nodes_count,
        external_nodes=external_nodes_count,
        total_edges=len(sorted_edges),
        internal_edges=internal_edges_count,
        external_edges=external_edges_count,
        resolved_edges=internal_edges_count,
        runtime_edges=runtime_count,
        type_only_edges=type_only_count,
        dynamic_edges=dynamic_count,
        unresolved_imports=total_unresolved,
        cycle_count=len(cycles),
        cycles=len(cycles),
        runtime_cycle_count=len(cycles),
        type_cycle_count=type_cycle_count,
        orphan_count=len(true_standalone_ids),
        standalone_modules=len(true_standalone_ids),
        entry_point_count=len(entry_point_ids),
        entry_points=len(entry_point_ids),
        high_complexity_module_count=high_comp_count,
        most_connected_modules=most_connected,
        truncated_edges_count=0,
        graph_confidence=graph_confidence,
        graph_confidence_reason=graph_conf_reason,
        cycle_confidence_warning=cycle_confidence_warning,
        unresolved_breakdown=dict(breakdown),
    )

    return GraphResponse(
        project_id=analysis.project_id,
        level="module",
        nodes=sorted_nodes,
        edges=sorted_edges,
        unresolved=sorted_unresolved,
        cycles=cycles,
        entry_point_ids=entry_point_ids,
        orphan_module_ids=true_standalone_ids,
        summary=summary,
    )



def build_symbol_drilldown_graph(
    analysis: ProjectAnalysis,
    module_id: str,
    edge_types_filter: Optional[List[str]] = None,
) -> GraphResponse:
    """
    Builds a detailed symbol drill-down graph for a single module.
    Renders module root node, classes, functions, methods, containment edges, and capped call edges.
    """
    target_mod: Optional[ModuleAnalysis] = None
    for m in analysis.modules:
        if m.module_id == module_id:
            target_mod = m
            break

    if not target_mod:
        raise ValueError(f"Module '{module_id}' not found in project analysis.")

    nodes_list: List[GraphNode] = []
    edges_list: List[GraphEdge] = []
    truncated_edges = 0

    # Module Root Node
    root_node = GraphNode(
        id=target_mod.module_id,
        label=target_mod.relative_path,
        language=target_mod.language,
        kind="module",
        parse_status=target_mod.parse_status,
        line_count=target_mod.line_count,
        complexity_score=target_mod.complexity.cyclomatic_complexity,
        complexity_rating=target_mod.complexity.rating,
        warning_count=len(target_mod.legacy_warnings),
        is_entry_point=target_mod.is_entry_point,
    )
    nodes_list.append(root_node)

    # Class & Method Symbol Nodes & Containment Edges
    symbol_names_map: Dict[str, str] = {}

    for cls_sym in target_mod.classes:
        c_node = GraphNode(
            id=cls_sym.symbol_id,
            label=cls_sym.name,
            language=target_mod.language,
            kind="class",
            line_count=cls_sym.end_line - cls_sym.start_line + 1,
            complexity_score=cls_sym.complexity,
            module_id=target_mod.module_id,
        )
        nodes_list.append(c_node)
        symbol_names_map[cls_sym.name] = cls_sym.symbol_id
        symbol_names_map[cls_sym.qualified_name] = cls_sym.symbol_id

        # Edge from module to class
        edges_list.append(
            GraphEdge(
                id=f"edge_contains_{target_mod.module_id}_{cls_sym.symbol_id}",
                source=target_mod.module_id,
                target=cls_sym.symbol_id,
                type="contains",
                resolved=True,
                source_line=cls_sym.start_line,
            )
        )

    for fn_sym in target_mod.functions:
        kind = "method" if "." in fn_sym.qualified_name else "function"
        f_node = GraphNode(
            id=fn_sym.symbol_id,
            label=fn_sym.name,
            language=target_mod.language,
            kind=kind,
            line_count=fn_sym.end_line - fn_sym.start_line + 1,
            complexity_score=fn_sym.complexity,
            module_id=target_mod.module_id,
        )
        nodes_list.append(f_node)
        symbol_names_map[fn_sym.name] = fn_sym.symbol_id
        symbol_names_map[fn_sym.qualified_name] = fn_sym.symbol_id

        # Containment edge: if method, parent class to method; else module to function
        if "." in fn_sym.qualified_name:
            parent_class_name = fn_sym.qualified_name.split(".")[0]
            parent_id = symbol_names_map.get(parent_class_name, target_mod.module_id)
        else:
            parent_id = target_mod.module_id

        edges_list.append(
            GraphEdge(
                id=f"edge_contains_{parent_id}_{fn_sym.symbol_id}",
                source=parent_id,
                target=fn_sym.symbol_id,
                type="contains",
                resolved=True,
                source_line=fn_sym.start_line,
            )
        )

    # Add Attributable Call Edges (Capped at MAX_DRILLDOWN_CALL_EDGES)
    call_edges_count = 0

    for fn_sym in target_mod.functions:
        for call_target in fn_sym.direct_calls:
            if call_target in symbol_names_map:
                target_sym_id = symbol_names_map[call_target]
                if target_sym_id != fn_sym.symbol_id:
                    if call_edges_count < MAX_DRILLDOWN_CALL_EDGES:
                        edges_list.append(
                            GraphEdge(
                                id=f"edge_call_{fn_sym.symbol_id}_{target_sym_id}_{call_edges_count}",
                                source=fn_sym.symbol_id,
                                target=target_sym_id,
                                type="call",
                                resolved=True,
                                source_line=fn_sym.start_line,
                            )
                        )
                        call_edges_count += 1
                    else:
                        truncated_edges += 1

    sorted_nodes = sorted(nodes_list, key=lambda n: (n.kind, n.label, n.id))
    sorted_edges = sorted(edges_list, key=lambda e: (e.source, e.target, e.type, e.source_line))

    summary = GraphSummary(
        total_nodes=len(sorted_nodes),
        internal_nodes=len(sorted_nodes),
        external_nodes=0,
        total_edges=len(sorted_edges),
        internal_edges=len(sorted_edges),
        external_edges=0,
        cycle_count=0,
        orphan_count=0,
        entry_point_count=1 if target_mod.is_entry_point else 0,
        high_complexity_module_count=1 if target_mod.complexity.rating in ("high", "critical") else 0,
        most_connected_modules=[],
        truncated_edges_count=truncated_edges,
    )

    return GraphResponse(
        project_id=analysis.project_id,
        level="symbol",
        nodes=sorted_nodes,
        edges=sorted_edges,
        cycles=[],
        entry_point_ids=[target_mod.module_id] if target_mod.is_entry_point else [],
        orphan_module_ids=[],
        summary=summary,
    )

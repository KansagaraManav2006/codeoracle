import logging
from typing import Dict, List, Optional, Set, Tuple
from app.analysis.graph_models import GraphEdge, GraphNode, GraphResponse, GraphSummary
from app.analysis.models import ModuleAnalysis, ProjectAnalysis

logger = logging.getLogger(__name__)

MAX_DRILLDOWN_CALL_EDGES = 50


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
    visited: Set[str] = set()
    stack: List[str] = []
    in_stack: Set[str] = set()

    def dfs(curr: str):
        visited.add(curr)
        stack.append(curr)
        in_stack.add(curr)

        for neighbor in adj.get(curr, []):
            if neighbor in in_stack:
                # Cycle detected from neighbor to curr
                cycle_start_idx = stack.index(neighbor)
                cycle_nodes = stack[cycle_start_idx:] + [neighbor]
                raw_cycles.append(cycle_nodes)
            elif neighbor not in visited:
                dfs(neighbor)

        stack.pop()
        in_stack.remove(curr)

    for node in sorted(list(nodes_set)):
        if node not in visited:
            dfs(node)

    # Canonicalize cycles: rotate each cycle so smallest node ID comes first
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
    Builds a deterministic dependency graph response from cached ProjectAnalysis.
    Supports module-level graph and single-module symbol drill-down.
    """
    if level == "symbol" and module_id:
        return build_symbol_drilldown_graph(analysis, module_id, edge_types_filter)

    # Module-level Graph
    nodes_map: Dict[str, GraphNode] = {}
    edges: List[GraphEdge] = []
    truncated_edges_count = 0

    # 1. Build Internal Module Nodes
    for mod in analysis.modules:
        sym_count = len(mod.classes) + len(mod.functions) + len(mod.variables)
        warn_count = len(mod.legacy_warnings) + len(mod.parse_errors)

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
            is_entry_point=mod.is_entry_point,
            is_external=False,
            symbol_count=sym_count,
        )
        nodes_map[mod.module_id] = node

    # 2. Process Dependency Edges & External Nodes
    allowed_types = set(edge_types_filter) if edge_types_filter else None
    internal_module_ids = set(nodes_map.keys())

    for edge in analysis.dependency_edges:
        if allowed_types and edge.type not in allowed_types:
            continue

        target_is_internal = edge.target_module_id in internal_module_ids

        if not target_is_internal:
            if not include_external:
                continue

            # Create external package node
            ext_id = f"ext:{edge.target_module_id}"
            if ext_id not in nodes_map:
                source_node = nodes_map.get(edge.source_module_id)
                lang = source_node.language if source_node else "unknown"
                nodes_map[ext_id] = GraphNode(
                    id=ext_id,
                    label=edge.target_module_id,
                    language=lang,
                    kind="external",
                    is_external=True,
                )
            target_node_id = ext_id
        else:
            target_node_id = edge.target_module_id

        edges.append(
            GraphEdge(
                id=edge.edge_id,
                source=edge.source_module_id,
                target=target_node_id,
                type=edge.type,
                resolved=edge.resolved,
                source_line=edge.source_line,
            )
        )

    # Sort nodes and edges deterministically
    sorted_nodes = sorted(list(nodes_map.values()), key=lambda n: (n.is_external, n.label, n.id))
    sorted_edges = sorted(edges, key=lambda e: (e.source, e.target, e.type, e.source_line))

    # 3. Calculate Degree & Orphans
    in_degree: Dict[str, int] = {n.id: 0 for n in sorted_nodes}
    out_degree: Dict[str, int] = {n.id: 0 for n in sorted_nodes}

    for e in sorted_edges:
        if e.source in out_degree:
            out_degree[e.source] += 1
        if e.target in in_degree:
            in_degree[e.target] += 1

    orphan_module_ids = [
        n.id for n in sorted_nodes
        if not n.is_external and in_degree.get(n.id, 0) == 0 and out_degree.get(n.id, 0) == 0
    ]

    entry_point_ids = [n.id for n in sorted_nodes if n.is_entry_point]

    # 4. Cycle Detection
    cycle_edge_pairs = [(e.source, e.target) for e in sorted_edges if not nodes_map[e.source].is_external and e.target in internal_module_ids]
    cycles = find_directed_cycles(internal_module_ids, cycle_edge_pairs)

    # 5. Most Connected Modules
    connected = []
    for n in sorted_nodes:
        if not n.is_external:
            deg = in_degree.get(n.id, 0) + out_degree.get(n.id, 0)
            connected.append({"module_id": n.id, "label": n.label, "total_degree": deg, "in_degree": in_degree.get(n.id, 0), "out_degree": out_degree.get(n.id, 0)})

    connected.sort(key=lambda c: (-c["total_degree"], c["label"]))
    most_connected = connected[:5]

    # Summary
    internal_nodes_count = sum(1 for n in sorted_nodes if not n.is_external)
    external_nodes_count = sum(1 for n in sorted_nodes if n.is_external)
    internal_edges_count = sum(1 for e in sorted_edges if e.target in internal_module_ids)
    external_edges_count = len(sorted_edges) - internal_edges_count
    high_comp_count = sum(1 for n in sorted_nodes if not n.is_external and n.complexity_rating in ("high", "critical"))

    summary = GraphSummary(
        total_nodes=len(sorted_nodes),
        internal_nodes=internal_nodes_count,
        external_nodes=external_nodes_count,
        total_edges=len(sorted_edges),
        internal_edges=internal_edges_count,
        external_edges=external_edges_count,
        cycle_count=len(cycles),
        orphan_count=len(orphan_module_ids),
        entry_point_count=len(entry_point_ids),
        high_complexity_module_count=high_comp_count,
        most_connected_modules=most_connected,
        truncated_edges_count=0,
    )

    return GraphResponse(
        project_id=analysis.project_id,
        level="module",
        nodes=sorted_nodes,
        edges=sorted_edges,
        cycles=cycles,
        entry_point_ids=entry_point_ids,
        orphan_module_ids=orphan_module_ids,
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

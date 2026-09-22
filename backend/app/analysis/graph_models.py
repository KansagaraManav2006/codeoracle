from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class UnresolvedDependency(BaseModel):
    source: str
    source_path: str
    raw_import: str
    reason_key: str = "unknown"  # ts_alias, python_relative, dynamic_import, generated, syntax_error, external, unknown
    reason_label: str = "Unresolved import"
    line: int = 1


class GraphNode(BaseModel):
    id: str
    label: str  # Safe relative path for modules or symbol name
    language: str = "unknown"  # python, javascript, typescript, external
    kind: str = "module"  # module, class, function, method, external
    parse_status: Optional[str] = None  # complete, partial, failed
    line_count: int = 0
    complexity_score: int = 1
    complexity_rating: str = "low"
    warning_count: int = 0
    is_entry_point: bool = False
    is_external: bool = False
    standalone_reason: Optional[str] = None  # Explanation if standalone (config, test, script, unreferenced)
    standalone_status: str = "connected"  # true_standalone, isolation_uncertain, unresolved, connected
    entry_point_kind: Optional[str] = None  # app_runtime, frontend_bootstrap, worker, cli, script, ml_training, route_root, config, unknown
    entry_point_confidence: Optional[str] = None  # high, medium, low
    entry_point_evidence: Optional[str] = None
    module_role: Optional[str] = None  # domain, service, api, repository, ui, config, script, ml, test, utility
    fan_in: int = 0
    fan_out: int = 0
    resolved_imports: int = 0
    unresolved_imports: int = 0
    blast_radius: int = 0
    is_cycle: bool = False
    symbol_count: int = 0
    module_id: Optional[str] = None  # Parent module ID when level=symbol


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str = "import"  # import, require, contains, call
    kind: str = "runtime_import"  # runtime_import, type_only_import, dynamic_import, require, re_export, unknown
    confidence: str = "high"  # high, medium, low
    raw_import: Optional[str] = None
    resolved: bool = True
    source_line: int = 1
    is_type_only: bool = False
    is_dynamic: bool = False
    is_external: bool = False


class GraphSummary(BaseModel):
    total_nodes: int = 0
    total_modules: int = 0
    internal_nodes: int = 0
    external_nodes: int = 0
    total_edges: int = 0
    internal_edges: int = 0
    external_edges: int = 0
    resolved_edges: int = 0
    runtime_edges: int = 0
    type_only_edges: int = 0
    dynamic_edges: int = 0
    unresolved_imports: int = 0
    cycle_count: int = 0
    cycles: int = 0
    runtime_cycle_count: int = 0
    type_cycle_count: int = 0
    orphan_count: int = 0
    standalone_modules: int = 0
    entry_point_count: int = 0
    entry_points: int = 0
    high_complexity_module_count: int = 0
    most_connected_modules: List[Dict[str, Any]] = Field(default_factory=list)
    truncated_edges_count: int = 0
    graph_confidence: str = "high"  # high, medium, partial, low
    graph_confidence_reason: Optional[str] = None
    cycle_confidence_warning: Optional[str] = None
    unresolved_breakdown: Dict[str, int] = Field(default_factory=dict)


class GraphResponse(BaseModel):
    project_id: str
    level: str = "module"  # module or symbol
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    unresolved: List[UnresolvedDependency] = Field(default_factory=list)
    cycles: List[List[str]] = Field(default_factory=list)
    entry_point_ids: List[str] = Field(default_factory=list)
    orphan_module_ids: List[str] = Field(default_factory=list)
    summary: GraphSummary = Field(default_factory=GraphSummary)


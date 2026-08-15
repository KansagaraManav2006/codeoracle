from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


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
    symbol_count: int = 0
    module_id: Optional[str] = None  # Parent module ID when level=symbol


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    type: str  # import, require, contains, call
    resolved: bool = True
    source_line: int = 1


class GraphSummary(BaseModel):
    total_nodes: int = 0
    internal_nodes: int = 0
    external_nodes: int = 0
    total_edges: int = 0
    internal_edges: int = 0
    external_edges: int = 0
    cycle_count: int = 0
    orphan_count: int = 0
    entry_point_count: int = 0
    high_complexity_module_count: int = 0
    most_connected_modules: List[Dict[str, Any]] = Field(default_factory=list)
    truncated_edges_count: int = 0


class GraphResponse(BaseModel):
    project_id: str
    level: str = "module"  # module or symbol
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
    cycles: List[List[str]] = Field(default_factory=list)
    entry_point_ids: List[str] = Field(default_factory=list)
    orphan_module_ids: List[str] = Field(default_factory=list)
    summary: GraphSummary = Field(default_factory=GraphSummary)

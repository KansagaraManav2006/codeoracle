from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

EntryPointKind = Literal[
    "app_runtime",
    "frontend_bootstrap",
    "worker",
    "cli",
    "script",
    "ml_training",
    "route_root",
    "config",
    "unknown",
]

ModuleRole = Literal[
    "domain",
    "application_service",
    "api",
    "repository",
    "persistence",
    "ui",
    "generated",
    "configuration",
    "test",
    "script",
    "ml",
    "utility",
]


class DependencyGraphSummary(BaseModel):
    node_count: int = 0
    resolved_edges: int = 0
    runtime_edges: int = 0
    type_only_edges: int = 0
    dynamic_edges: int = 0
    unresolved_imports: int = 0
    external_references: int = 0
    cycle_count: int = 0
    orphan_count: int = 0
    isolated_modules_count: int = 0


class UnresolvedDiagnosticGroup(BaseModel):
    key: str
    label: str
    count: int
    description: str
    examples: List[str] = Field(default_factory=list)


class UnresolvedDiagnosticsSummary(BaseModel):
    total_unresolved: int = 0
    groups: List[UnresolvedDiagnosticGroup] = Field(default_factory=list)


class ArchitectureLayer(BaseModel):
    path: str
    file_count: int = 0
    file_percentage: float = 0.0
    loc: int = 0
    loc_percentage: float = 0.0
    role: str = "Module Layer"
    has_cycle: bool = False
    languages: List[str] = Field(default_factory=list)
    entry_points: int = 0


class ArchitectureEntryPoint(BaseModel):
    path: str
    kind: EntryPointKind
    kind_label: str
    confidence: float = 1.0
    description: str


class KeyModule(BaseModel):
    path: str
    role: ModuleRole
    role_label: str
    reason: str
    classes_count: int = 0
    functions_count: int = 0
    line_count: int = 0
    complexity_rating: str = "low"
    is_entry_point: bool = False


class ScoreFactorBreakdown(BaseModel):
    complexity: int = 0
    warnings: int = 0
    fan_in: int = 0
    blast_radius: int = 0
    loc: int = 0
    hotspot_score: int = 0


class RecommendedTargetInfo(BaseModel):
    path: str
    hotspot_score: int
    factors: ScoreFactorBreakdown
    reason: str
    highest_complexity_file: str
    highest_complexity_score: int


class CoverageInfo(BaseModel):
    total_source_files: int = 0
    fully_parsed: int = 0
    partial: int = 0
    fallback: int = 0
    failed: int = 0
    full_ast_percentage: float = 0.0
    confidence: Literal["high", "medium", "partial", "low"] = "partial"
    cycle_label: str = "No cycles detected in resolved graph"
    limitation_notice: Optional[str] = None


class ArchitectureOverview(BaseModel):
    project_id: str
    coverage: CoverageInfo
    graph: DependencyGraphSummary
    entry_points: List[ArchitectureEntryPoint] = Field(default_factory=list)
    layers: List[ArchitectureLayer] = Field(default_factory=list)
    key_modules: List[KeyModule] = Field(default_factory=list)
    recommended_target: Optional[RecommendedTargetInfo] = None
    unresolved_diagnostics: UnresolvedDiagnosticsSummary = Field(default_factory=UnresolvedDiagnosticsSummary)
    architecture_summary: str = ""
    frameworks_detected: List[str] = Field(default_factory=list)

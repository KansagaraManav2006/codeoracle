import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field

ANALYZER_VERSION = "1.1.0"


def generate_module_id(project_id: str, relative_path: str) -> str:
    """Generates a stable, deterministic module ID."""
    norm_path = relative_path.replace("\\", "/").strip("/")
    return f"mod_{hashlib.sha256(f'{project_id}:{norm_path}'.encode('utf-8')).hexdigest()[:12]}"


def generate_symbol_id(module_id: str, kind: str, qualified_name: str, start_line: int) -> str:
    """Generates a stable, deterministic symbol ID."""
    return f"sym_{hashlib.sha256(f'{module_id}:{kind}:{qualified_name}:{start_line}'.encode('utf-8')).hexdigest()[:12]}"


def generate_edge_id(source_module_id: str, target: str, edge_type: str, source_line: int) -> str:
    """Generates a stable, deterministic dependency edge ID."""
    return f"edge_{hashlib.sha256(f'{source_module_id}:{target}:{edge_type}:{source_line}'.encode('utf-8')).hexdigest()[:12]}"


class ParameterInfo(BaseModel):
    name: str
    default: Optional[str] = None
    annotation: Optional[str] = None


class WarningInfo(BaseModel):
    code: str
    message: str
    line: Optional[int] = None
    severity: str = "warning"  # warning, risk, info


class ComplexitySummary(BaseModel):
    cyclomatic_complexity: int = 1
    rating: str = "low"  # low (1-5), medium (6-10), high (11-20), critical (>20)
    hotspots_count: int = 0


class SymbolExplanation(BaseModel):
    summary: str
    inputs_summary: str
    returns_summary: str
    side_effects: str
    uncertainty_label: Optional[str] = "heuristic inference"


class SymbolInfo(BaseModel):
    symbol_id: str
    kind: str  # class, function, method, constructor, variable
    name: str
    qualified_name: str
    parameters: List[ParameterInfo] = Field(default_factory=list)
    return_annotation: Optional[str] = None
    decorators: List[str] = Field(default_factory=list)
    is_async: bool = False
    docstring: Optional[str] = None
    start_line: int
    end_line: int
    direct_calls: List[str] = Field(default_factory=list)
    complexity: int = 1
    legacy_warnings: List[WarningInfo] = Field(default_factory=list)
    explanation: Optional[SymbolExplanation] = None


class ImportInfo(BaseModel):
    module_name: str
    imported_symbols: List[str] = Field(default_factory=list)
    is_relative: bool = False
    source_line: int = 1
    import_kind: str = "import"  # "import" or "require"


class ExportInfo(BaseModel):
    name: str
    kind: str = "variable"  # function, class, variable, default
    source_line: int = 1


class CallInfo(BaseModel):
    caller_qualified_name: str
    target_name: str
    source_line: int = 1


class ModuleExplanation(BaseModel):
    responsibility: str
    classes_functions_summary: str
    dependencies_summary: str
    entry_point_indicator: str
    warnings_summary: str


class ModuleAnalysis(BaseModel):
    module_id: str
    relative_path: str
    language: str  # python, javascript, typescript
    line_count: int
    parse_status: str  # complete, partial, failed
    parse_errors: List[str] = Field(default_factory=list)
    imports: List[ImportInfo] = Field(default_factory=list)
    exports: List[ExportInfo] = Field(default_factory=list)
    classes: List[SymbolInfo] = Field(default_factory=list)
    functions: List[SymbolInfo] = Field(default_factory=list)
    variables: List[SymbolInfo] = Field(default_factory=list)
    calls: List[CallInfo] = Field(default_factory=list)
    is_entry_point: bool = False
    complexity: ComplexitySummary = Field(default_factory=ComplexitySummary)
    legacy_warnings: List[WarningInfo] = Field(default_factory=list)
    explanation: Optional[ModuleExplanation] = None
    start_line: int = 1
    end_line: int = 1


class DependencyEdge(BaseModel):
    edge_id: str
    source_module_id: str
    target_module_id: str  # resolved module_id or external package name
    type: str  # import, require, inheritance, call
    resolved: bool = False
    source_line: int = 1


class ProjectExplanation(BaseModel):
    languages_summary: str
    entry_points_summary: str
    major_modules_summary: str
    dependencies_summary: str
    architectural_observations: List[str] = Field(default_factory=list)
    complexity_hotspots: List[str] = Field(default_factory=list)
    legacy_risks: List[str] = Field(default_factory=list)
    parse_limitations: List[str] = Field(default_factory=list)


class ProjectAnalysis(BaseModel):
    project_id: str
    analyzer_version: str = ANALYZER_VERSION
    content_hash: str
    analyzed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    languages: List[str] = Field(default_factory=list)
    total_files: int = 0
    total_lines: int = 0
    modules: List[ModuleAnalysis] = Field(default_factory=list)
    dependency_edges: List[DependencyEdge] = Field(default_factory=list)
    entry_points: List[str] = Field(default_factory=list)
    project_warnings: List[WarningInfo] = Field(default_factory=list)
    parse_success_count: int = 0
    parse_partial_count: int = 0
    parse_failure_count: int = 0
    analysis_duration_ms: float = 0.0
    cache_status: str = "miss"  # hit, miss, forced
    explanation: Optional[ProjectExplanation] = None

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.db import JobState


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status indicator")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    environment: Optional[str] = Field("development", description="Environment mode")
    database: Optional[Dict[str, Any]] = Field(None, description="Database diagnostic summary")


# --- Ingestion & Job API Schemas ---

class GitHubIngestRequest(BaseModel):
    repository_url: str = Field(..., description="Public GitHub repository URL (https://github.com/owner/repo)")

    @property
    def repo_url(self) -> str:
        return self.repository_url


class AnalyzeRequest(BaseModel):
    force: bool = Field(False, description="Set to true to force re-analysis bypassing cached results")


class JobResponse(BaseModel):
    job_id: str
    state: JobState
    stage: str
    progress_percentage: int
    source_type: str
    source_url: Optional[str] = None
    project_id: Optional[str] = None
    message: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    polling_url: str
    created_at: datetime
    updated_at: datetime


class ProjectFileResponse(BaseModel):
    file_id: str
    relative_path: str
    language: str
    size_bytes: int
    line_count: int
    sha256_hash: str


class ProjectMetadataResponse(BaseModel):
    project_id: str
    display_name: str
    source_type: str
    source_url: Optional[str] = None
    detected_languages: List[str] = Field(default_factory=list)
    total_files: int
    total_lines: int
    content_hash: str
    created_at: datetime


class RecentProjectsListResponse(BaseModel):
    total: int
    projects: List[ProjectMetadataResponse] = Field(default_factory=list)


class ProjectFilesListResponse(BaseModel):
    project_id: str
    total_files: int
    files: List[ProjectFileResponse] = Field(default_factory=list)


# --- Legacy / Placeholder Schemas ---

class FunctionNode(BaseModel):
    name: str
    args: List[str] = Field(default_factory=list)
    docstring: Optional[str] = None
    start_line: Optional[int] = None
    end_line: Optional[int] = None
    complexity: Optional[int] = 1


class ClassNode(BaseModel):
    name: str
    docstring: Optional[str] = None
    methods: List[FunctionNode] = Field(default_factory=list)
    base_classes: List[str] = Field(default_factory=list)


class FileNode(BaseModel):
    path: str
    language: str  # 'python' | 'javascript'
    loc: int
    classes: List[ClassNode] = Field(default_factory=list)
    functions: List[FunctionNode] = Field(default_factory=list)
    imports: List[str] = Field(default_factory=list)


class NormalizedCodebaseModel(BaseModel):
    project_name: str
    total_loc: int
    files: List[FileNode] = Field(default_factory=list)
    dependencies: List[Any] = Field(default_factory=list)


# --- Dependency Health Schemas ---

class DependencyHealthItem(BaseModel):
    name: str
    current_spec: str
    latest_version: str
    ecosystem: str  # 'python' | 'node'
    manifest_source: str  # 'package.json' | 'requirements.txt' | 'pyproject.toml' | 'package-lock.json'
    is_direct: bool = True
    is_outdated: bool = False
    is_deprecated: bool = False
    is_unused: bool = False
    is_risk: bool = False
    risk_reason: Optional[str] = None
    license: Optional[str] = None
    used_by_modules: List[str] = Field(default_factory=list)
    used_by_count: int = 0


class DependencyTreeNode(BaseModel):
    name: str
    version: str
    ecosystem: str
    is_direct: bool = True
    children: List["DependencyTreeNode"] = Field(default_factory=list)


class UpdateImpactPreview(BaseModel):
    package_name: str
    current_version: str
    target_version: str
    risk_level: str  # 'low' | 'medium' | 'high' | 'critical'
    affected_files_count: int
    affected_files: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)


class DependencyHealthResponse(BaseModel):
    project_id: str
    total_packages: int
    direct_packages_count: int
    transitive_packages_count: int
    outdated_count: int
    unused_count: int
    deprecated_count: int
    risk_count: int
    manifests_found: List[str] = Field(default_factory=list)
    packages: List[DependencyHealthItem] = Field(default_factory=list)
    dependency_tree: List[DependencyTreeNode] = Field(default_factory=list)
    update_impact_previews: Dict[str, UpdateImpactPreview] = Field(default_factory=dict)


# --- Architecture Evolution Schemas ---

class ArchLayerModule(BaseModel):
    module_id: str
    relative_path: str
    layer: str  # 'api_presentation' | 'service_business' | 'data_persistence' | 'utility_core'
    line_count: int
    complexity_score: int
    is_entry_point: bool = False


class ArchCharacteristics(BaseModel):
    coupling_level: str  # 'low' | 'medium' | 'high'
    average_degree: float
    total_cycles: int
    cycle_modules: List[str] = Field(default_factory=list)
    highly_connected_hubs: List[str] = Field(default_factory=list)
    isolated_modules: List[str] = Field(default_factory=list)
    layer_violations: List[str] = Field(default_factory=list)
    large_clusters: List[str] = Field(default_factory=list)


class ProposedArchChange(BaseModel):
    change_id: str
    title: str
    reason: str
    affected_files: List[str] = Field(default_factory=list)
    dependencies: List[str] = Field(default_factory=list)
    risk_level: str  # 'low' | 'medium' | 'high' | 'critical'
    migration_steps: List[str] = Field(default_factory=list)


class ArchitectureEvolutionResponse(BaseModel):
    project_id: str
    current_architecture: Dict[str, List[ArchLayerModule]] = Field(default_factory=dict)
    proposed_architecture: Dict[str, List[str]] = Field(default_factory=dict)
    characteristics: ArchCharacteristics
    proposed_changes: List[ProposedArchChange] = Field(default_factory=list)
    disclaimer: str = Field("Proposed architecture is an advisory recommendation for engineering review and does not automatically alter source code.")



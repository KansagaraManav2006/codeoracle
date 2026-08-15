from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from app.models.db import JobState


class HealthResponse(BaseModel):
    status: str = Field(..., description="Service status indicator")
    app_name: str = Field(..., description="Application name")
    version: str = Field(..., description="Application version")
    environment: Optional[str] = Field("development", description="Environment mode")


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

from typing import List, Optional

from pydantic import BaseModel, Field


REFACTOR_ENGINE_VERSION = "1.0.0"


class RefactorWarning(BaseModel):
    code: str
    severity: str = "warning"
    message: str
    line: Optional[int] = None
    breaking_change: bool = False


class RefactoredFile(BaseModel):
    relative_path: str
    language: str
    original_code: str
    refactored_code: str
    unified_diff: str
    changes: List[str] = Field(default_factory=list)
    warnings: List[RefactorWarning] = Field(default_factory=list)
    syntax_valid: bool = True
    syntax_error: Optional[str] = None
    changed: bool = False


class ProjectRefactorResult(BaseModel):
    project_id: str
    engine_version: str = REFACTOR_ENGINE_VERSION
    generated_at: str
    status: str = "completed"
    files: List[RefactoredFile] = Field(default_factory=list)
    analyzed_files: int = 0
    changed_files: int = 0
    total_changes: int = 0
    breaking_warning_count: int = 0
    safe_to_apply_automatically: bool = False
    summary: str


class GenerateRefactorRequest(BaseModel):
    force: bool = False

from typing import List, Optional

from pydantic import BaseModel, Field
from app.analysis.models import Finding, FindingFunnel
from app.refactor.verification_models import RefactorVerificationResult


REFACTOR_ENGINE_VERSION = "1.2.0"


class RefactorWarning(BaseModel):
    code: str
    severity: str = "warning"
    message: str
    line: Optional[int] = None
    breaking_change: bool = False


class ModernizationRule(BaseModel):
    id: str
    name: str
    language: str
    category: str
    deterministic: bool = True
    requires_full_ast: bool = True
    requires_protection: bool = True
    description: str = ""
    example_before: Optional[str] = None
    example_after: Optional[str] = None


class ModernizationState(BaseModel):
    findings: int = 0
    candidates: int = 0
    autofix_eligible: int = 0
    generated_diffs: int = 0
    statically_validated: int = 0
    runtime_verified: int = 0
    human_approved: int = 0


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
    applied_rule_ids: List[str] = Field(default_factory=list)
    candidate_disposition: Optional[str] = None
    candidate_type: Optional[str] = None


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
    findings: List[Finding] = Field(default_factory=list)
    finding_funnel: FindingFunnel = Field(default_factory=FindingFunnel)
    verification: Optional[RefactorVerificationResult] = None
    modernization_state: Optional[ModernizationState] = None
    modernization_rules: List[ModernizationRule] = Field(default_factory=list)


class GenerateRefactorRequest(BaseModel):
    force: bool = False

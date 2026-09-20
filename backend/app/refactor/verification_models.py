from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

VERIFICATION_ENGINE_VERSION = "1.0.0"


class TestExecutionComparison(BaseModel):
    total_tests: int = 0
    passed_tests: int = 0
    failed_tests: int = 0
    line_coverage: Optional[float] = None
    execution_status: str = "not_run"  # "passed", "failed", "unavailable", "not_run"


class VerificationMetricsComparison(BaseModel):
    readiness_before: int = 0
    readiness_after: int = 0
    readiness_delta: int = 0
    cycles_before: int = 0
    cycles_after: int = 0
    new_cycles: int = 0
    warnings_before: int = 0
    warnings_after: int = 0
    resolved_warnings_count: int = 0
    resolved_warnings: List[str] = Field(default_factory=list)


class RefactorVerificationResult(BaseModel):
    project_id: str
    verification_version: str = VERIFICATION_ENGINE_VERSION
    verified_at: str
    status: str = "verified"  # "verified", "failed", "safety_locked", "no_changes"
    verified: bool = False
    can_execute: bool = True
    execution_warning: Optional[str] = None
    syntax_status: str = "passed"  # "passed", "failed"
    syntax_errors: List[str] = Field(default_factory=list)
    changed_files: List[str] = Field(default_factory=list)
    baseline_tests: TestExecutionComparison = Field(default_factory=TestExecutionComparison)
    after_tests: TestExecutionComparison = Field(default_factory=TestExecutionComparison)
    metrics: VerificationMetricsComparison = Field(default_factory=VerificationMetricsComparison)
    verification_summary: str = ""


class VerifyRefactorRequest(BaseModel):
    force: bool = False

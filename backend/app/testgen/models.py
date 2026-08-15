from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

TEST_GENERATOR_VERSION = "1.1.0"


class GeneratedTestFile(BaseModel):
    test_id: str
    target_relative_path: str
    language: str  # "python" | "javascript"
    framework: str  # "pytest" | "vitest"
    safe_test_path: str
    code: str
    generation_strategy: str
    syntax_valid: bool = True
    syntax_error_message: Optional[str] = None
    execution_status: str = "not_run"  # "not_run", "passed", "failed", "timed_out", "unavailable"
    test_count: int = 0
    execution_output: Optional[str] = None
    line_coverage: Optional[float] = None
    covered_lines: List[int] = Field(default_factory=list)
    uncovered_lines: List[int] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    download_eligible: bool = True


class ProjectTestResult(BaseModel):
    project_id: str
    generation_version: str = TEST_GENERATOR_VERSION
    generated_at: str
    status: str = "completed"
    frameworks: List[str] = Field(default_factory=list)
    test_files: List[GeneratedTestFile] = Field(default_factory=list)
    target_source_files: int = 0
    total_generated_tests: int = 0
    syntax_valid_count: int = 0
    executed_test_count: int = 0
    passed_test_count: int = 0
    failed_test_count: int = 0
    overall_line_coverage: Optional[float] = None
    per_file_coverage: Dict[str, Optional[float]] = Field(default_factory=dict)
    execution_enabled: bool = False
    execution_warning: Optional[str] = None
    generation_duration_ms: int = 0
    execution_duration_ms: int = 0
    iteration_count: int = 1
    iteration_log: List[Dict[str, Any]] = Field(default_factory=list)


class GenerateTestsRequest(BaseModel):
    execute: bool = False
    force: bool = False

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

TEST_GENERATOR_VERSION = "1.2.0"



class GeneratedTestFile(BaseModel):
    test_id: str
    target_relative_path: str
    language: str  # "python" | "javascript"
    framework: str  # "pytest" | "vitest"
    safe_test_path: str
    display_name: str = ""
    code: str
    generation_strategy: str
    test_category: str = "function contract test"
    test_categories: List[str] = Field(default_factory=list)
    covered_symbols: List[str] = Field(default_factory=list)
    is_import_only: bool = False
    protection_type: str = "estimated"
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
    # Page 6 enhancements
    test_strength: str = "contract"  # "syntax" | "import" | "contract" | "behavior" | "integration"
    strength_level: str = "L3"  # "L1" | "L2" | "L3" | "L4" | "L5"
    confidence: str = "medium"  # "high" | "medium" | "low"
    confidence_reasons: List[str] = Field(default_factory=list)
    framework_archetype: str = "generic"  # "react" | "fastapi" | "service" | "ml" | "generic"
    why_generated: Dict[str, Any] = Field(default_factory=dict)
    test_cases_breakdown: List[Dict[str, Any]] = Field(default_factory=list)


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
    protected_files: List[str] = Field(default_factory=list)
    unprotected_files: List[str] = Field(default_factory=list)
    category_counts: Dict[str, int] = Field(default_factory=dict)
    is_measured: bool = False
    # Page 6 enhancements
    strength_counts: Dict[str, int] = Field(default_factory=dict)
    framework_coverage: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    unprotected_modules_detail: List[Dict[str, Any]] = Field(default_factory=list)
    manifest: Dict[str, Any] = Field(default_factory=dict)


class GenerateTestsRequest(BaseModel):
    execute: bool = False
    force: bool = False


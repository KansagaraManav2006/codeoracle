from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field
from app.analysis.models import Finding, FindingFunnel


class DimensionBreakdownItem(BaseModel):
    label: str
    value: str


class ReadinessDimension(BaseModel):
    key: str
    label: str
    score: int = Field(ge=0, le=100)
    status: str
    reason: str
    formula: str = ""
    evidence: List[str] = Field(default_factory=list)
    confidence: str = "medium"  # "high" | "medium" | "low"
    breakdown: List[DimensionBreakdownItem] = Field(default_factory=list)


# Alias ReadinessCategory to ReadinessDimension for backward compatibility
ReadinessCategory = ReadinessDimension


class ChecklistItem(BaseModel):
    id: str
    task: str
    target_file: Optional[str] = None
    action_type: str = "refactor"  # "test" | "refactor" | "cycle_decouple" | "entry_verify"
    completed: bool = False


class ScoreBlocker(BaseModel):
    category_key: str
    label: str
    current_score: int = Field(ge=0, le=100)
    target_file: Optional[str] = None
    blocker_type: str = "file"  # "global" | "file"
    blocker_reason: str
    unblocking_action: str
    priority_score: int = 0
    risk_level: Optional[str] = None


class ProtectionStatus(BaseModel):
    generated_tests: int = 0
    relevant_tests: int = 0
    syntax_valid: int = 0
    runtime_verified: int = 0
    execution_status: str = "not_run"  # "not_run" | "passed" | "failed" | "unmeasured"
    coverage_percentage: Optional[float] = None
    summary_label: str = "No tests executed"


class ModernizationSummary(BaseModel):
    findings: int = 0
    candidates: int = 0
    autofix_eligible: int = 0
    generated_diffs: int = 0
    verified_changes: int = 0
    deterministic_changes_generated: int = 0


class NextBestAction(BaseModel):
    action: str
    target_file: Optional[str] = None
    reason: str
    action_type: str = "protect"  # "protect" | "resolve_deps" | "modernize" | "review"


class WhyScore(BaseModel):
    strengths: List[str] = Field(default_factory=list)
    needs_attention: List[str] = Field(default_factory=list)


class ReadinessAssessment(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    overall_label: str  # "Not Ready", "High Preparation Needed", "Ready With Care", "Strong Readiness", "High Readiness"
    threshold_label: str  # "60–79: Ready With Care"
    confidence: str = "medium"  # "high" | "medium" | "low"
    confidence_reasons: List[str] = Field(default_factory=list)
    full_ast_coverage_pct: float = 0.0
    parser_readiness_score: int = 0
    why_score: WhyScore = Field(default_factory=WhyScore)
    next_best_action: NextBestAction = Field(default_factory=lambda: NextBestAction(action="Review readiness blockers", reason="Improve project readiness before refactoring"))
    dimensions: Dict[str, ReadinessDimension] = Field(default_factory=dict)
    global_blockers: List[ScoreBlocker] = Field(default_factory=list)
    file_blockers: List[ScoreBlocker] = Field(default_factory=list)


class ChangeImpact(BaseModel):
    module_id: str
    relative_path: str
    risk_level: str  # canonical overall_risk from RiskAssessment: "critical" | "high" | "medium" | "low"
    hotspot_score: int = 0
    complexity_severity: str = "low"  # "critical" | "high" | "medium" | "low"
    architecture_role: str = "utility"
    blast_radius: int
    direct_blast_radius: int = 0
    transitive_blast_radius: int = 0
    dependency_depth: int = 0
    wave: int = 1
    wave_title: str = ""
    wave_eligibility_reason: str = ""
    is_cycle_participant: bool = False
    is_score_blocker: bool = False
    graph_confidence: str = "medium"
    change_confidence: str = "medium"
    direct_dependents: List[str] = Field(default_factory=list)
    transitive_dependents: List[str] = Field(default_factory=list)
    direct_dependencies: List[str] = Field(default_factory=list)
    affected_entry_points: List[str] = Field(default_factory=list)
    cycles: List[List[str]] = Field(default_factory=list)
    suggested_tests: List[str] = Field(default_factory=list)
    protection_status: Optional[ProtectionStatus] = None
    reasons: List[str] = Field(default_factory=list)
    risk_evidence: List[str] = Field(default_factory=list)
    recommended_action: str = ""


class MigrationPhase(BaseModel):
    phase: int
    title: str
    goal: str
    risk_level: str
    files: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)


class MigrationWave(BaseModel):
    wave: int
    name: str
    title: str
    goal: str
    strategy: str  # Technical reason: why modernize this wave first/next
    status: str = "required"  # "required" | "not_required" | "blocked"
    confidence: str = "medium"  # "high" | "medium" | "low"
    dependencies: List[int] = Field(default_factory=list)
    risk_level: str
    files: List[str] = Field(default_factory=list)
    total_direct_dependents: int = 0
    total_transitive_blast_radius: int = 0
    protection_readiness_pct: int = 0
    affected_entry_points: List[str] = Field(default_factory=list)
    suggested_test_order: List[str] = Field(default_factory=list)
    checklist: List[ChecklistItem] = Field(default_factory=list)


class MigrationPlanResponse(BaseModel):
    project_id: str
    readiness_score: int = Field(ge=0, le=100)
    readiness_label: str
    readiness_confidence: str = "medium"  # "high" | "medium" | "low"
    full_ast_coverage_pct: float = 0.0
    parser_readiness_score: int = 0
    plan_confidence: str = "medium"  # "high" | "medium" | "low"
    plan_confidence_warning: Optional[str] = None
    executive_summary: str
    first_action_summary: str = ""  # Answers: "What should the team modernize first, and why?"
    next_best_action: Optional[NextBestAction] = None
    why_score: Optional[WhyScore] = None
    readiness: Optional[ReadinessAssessment] = None
    categories: List[ReadinessCategory]
    score_blockers: List[ScoreBlocker] = Field(default_factory=list)
    global_blockers: List[ScoreBlocker] = Field(default_factory=list)
    file_blockers: List[ScoreBlocker] = Field(default_factory=list)
    protection_status: Optional[ProtectionStatus] = None
    modernization_summary: Optional[ModernizationSummary] = None
    top_priorities: List[ChangeImpact]
    impacts: List[ChangeImpact]
    phases: List[MigrationPhase] = Field(default_factory=list)
    waves: List[MigrationWave] = Field(default_factory=list)
    findings: List[Finding] = Field(default_factory=list)
    finding_funnel: FindingFunnel = Field(default_factory=FindingFunnel)

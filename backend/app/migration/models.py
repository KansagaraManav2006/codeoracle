from typing import List, Optional

from pydantic import BaseModel, Field
from app.analysis.models import Finding, FindingFunnel


class ReadinessCategory(BaseModel):
    key: str
    label: str
    score: int = Field(ge=0, le=100)
    status: str
    reason: str


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
    blocker_reason: str
    unblocking_action: str


class ChangeImpact(BaseModel):
    module_id: str
    relative_path: str
    risk_level: str
    blast_radius: int
    direct_blast_radius: int = 0
    transitive_blast_radius: int = 0
    dependency_depth: int = 0
    wave: int = 1
    wave_title: str = ""
    is_cycle_participant: bool = False
    is_score_blocker: bool = False
    direct_dependents: List[str] = Field(default_factory=list)
    transitive_dependents: List[str] = Field(default_factory=list)
    direct_dependencies: List[str] = Field(default_factory=list)
    affected_entry_points: List[str] = Field(default_factory=list)
    cycles: List[List[str]] = Field(default_factory=list)
    suggested_tests: List[str] = Field(default_factory=list)
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
    risk_level: str
    files: List[str] = Field(default_factory=list)
    total_direct_dependents: int = 0
    total_transitive_blast_radius: int = 0
    affected_entry_points: List[str] = Field(default_factory=list)
    suggested_test_order: List[str] = Field(default_factory=list)
    checklist: List[ChecklistItem] = Field(default_factory=list)


class MigrationPlanResponse(BaseModel):
    project_id: str
    readiness_score: int = Field(ge=0, le=100)
    readiness_label: str
    executive_summary: str
    first_action_summary: str = ""  # Answers: "What should the team modernize first, and why?"
    categories: List[ReadinessCategory]
    score_blockers: List[ScoreBlocker] = Field(default_factory=list)
    top_priorities: List[ChangeImpact]
    impacts: List[ChangeImpact]
    phases: List[MigrationPhase] = Field(default_factory=list)
    waves: List[MigrationWave] = Field(default_factory=list)
    findings: List[Finding] = Field(default_factory=list)
    finding_funnel: FindingFunnel = Field(default_factory=FindingFunnel)

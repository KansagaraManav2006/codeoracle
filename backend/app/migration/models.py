from typing import List

from pydantic import BaseModel, Field


class ReadinessCategory(BaseModel):
    key: str
    label: str
    score: int = Field(ge=0, le=100)
    status: str
    reason: str


class ChangeImpact(BaseModel):
    module_id: str
    relative_path: str
    risk_level: str
    blast_radius: int
    direct_dependents: List[str] = Field(default_factory=list)
    direct_dependencies: List[str] = Field(default_factory=list)
    affected_entry_points: List[str] = Field(default_factory=list)
    suggested_tests: List[str] = Field(default_factory=list)
    reasons: List[str] = Field(default_factory=list)


class MigrationPhase(BaseModel):
    phase: int
    title: str
    goal: str
    risk_level: str
    files: List[str] = Field(default_factory=list)
    actions: List[str] = Field(default_factory=list)


class MigrationPlanResponse(BaseModel):
    project_id: str
    readiness_score: int = Field(ge=0, le=100)
    readiness_label: str
    projected_readiness_score: int = Field(ge=0, le=100)
    projected_readiness_label: str
    projected_assumptions: List[str] = Field(default_factory=list)
    executive_summary: str
    categories: List[ReadinessCategory]
    projected_categories: List[ReadinessCategory]
    top_priorities: List[ChangeImpact]
    impacts: List[ChangeImpact]
    phases: List[MigrationPhase]


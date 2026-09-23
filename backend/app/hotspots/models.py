from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict

def to_camel(string: str) -> str:
    parts = string.split('_')
    return parts[0] + ''.join(word.capitalize() for word in parts[1:])

class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

class ComplexityValue(CamelModel):
    value: int
    severity: str

class GraphMetrics(CamelModel):
    fan_in: int
    blast_radius: int
    unresolved_relations: int

class ParseMetrics(CamelModel):
    status: str
    confidence: str

class ScoreFactors(CamelModel):
    complexity: int
    warnings: int
    fan_in: int
    blast_radius: int
    loc: int

class RiskAssessment(CamelModel):
    file_path: str
    hotspot_score: int
    overall_risk: str
    complexity: ComplexityValue
    warnings: int
    graph: GraphMetrics
    parse: ParseMetrics
    score_factors: ScoreFactors
    lines_of_code: int
    transitive_dependents: List[str] = Field(default_factory=list)
    direct_dependents: List[str] = Field(default_factory=list)
    reason: str
    recommended_action: str

    @property
    def file(self) -> str:
        return self.file_path

    @property
    def filePath(self) -> str:
        return self.file_path

    @property
    def overallRisk(self) -> str:
        return self.overall_risk

    @property
    def hotspotScore(self) -> int:
        return self.hotspot_score

# Alias for backwards compatibility
HotspotItem = RiskAssessment

class HotspotsResponse(CamelModel):
    project_id: str
    project_name: str
    score_mode: str = "static"
    total_files: int
    hotspots: List[RiskAssessment] = Field(default_factory=list)
    recommended_start_file: Optional[str] = None
    recommended_start_reason: Optional[str] = None
    summary: Dict[str, Any] = Field(default_factory=dict)

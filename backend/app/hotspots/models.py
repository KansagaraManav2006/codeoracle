from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class HotspotFactors(BaseModel):
    """Component factor raw metrics and sub-scores (0-100 total sum)."""
    complexity_raw: int = 0
    complexity_score: int = 0
    loc_raw: int = 0
    loc_score: int = 0
    fan_in_raw: int = 0
    fan_in_score: int = 0
    warnings_raw: int = 0
    warnings_score: int = 0
    blast_radius_raw: int = 0
    blast_radius_score: int = 0


class HotspotItem(BaseModel):
    """Represents a single file ranked in the Hotspots analysis."""
    file: str
    hotspot_score: int = Field(..., ge=0, le=100)
    score_mode: str = "static"
    complexity: int
    complexity_rating: str
    lines_of_code: int
    dependency_fan_in: int
    warnings_count: int
    blast_radius: int
    transitive_dependents: List[str] = Field(default_factory=list)
    direct_dependents: List[str] = Field(default_factory=list)
    is_partially_parsed: bool = False
    risk_level: str = "medium"
    reason: str
    recommended_action: str
    score_factors: HotspotFactors


class HotspotsResponse(BaseModel):
    """Response payload for project hotspots ranking."""
    project_id: str
    project_name: str
    score_mode: str = "static"
    total_files: int
    hotspots: List[HotspotItem] = Field(default_factory=list)
    recommended_start_file: Optional[str] = None
    recommended_start_reason: Optional[str] = None
    summary: Dict[str, Any] = Field(default_factory=dict)

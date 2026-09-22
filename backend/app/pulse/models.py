from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SubsystemHealth(BaseModel):
    id: str  # 'frontend' | 'backend' | 'ml' | 'database' | 'infrastructure'
    label: str  # 'Frontend', 'Backend', 'ML', 'Database', 'Infrastructure'
    fileCount: int = 0
    healthScore: int = 100
    confidence: str = "high"  # 'high' | 'medium' | 'low'
    highRiskFiles: int = 0
    unresolvedDependencies: int = 0
    unprotectedFiles: int = 0
    modernizationCandidates: int = 0
    fullParseCoverage: float = 100.0


class PressureZone(BaseModel):
    id: str
    path: str
    subsystem: str
    pressureScore: int = 0  # 0 - 100 normalized
    level: str = "Low"  # 'Critical' | 'High' | 'Moderate' | 'Low'
    confidence: str = "medium"  # 'high' | 'medium' | 'low'
    reasons: List[str] = Field(default_factory=list)
    riskScore: int = 0
    unprotectedCount: int = 0
    graphConfidence: str = "medium"
    mainReason: str = ""


class HealthDimensionCard(BaseModel):
    key: str  # 'parsing' | 'dependencies' | 'complexity' | 'protection' | 'modernization'
    label: str
    score: int = 100
    confidence: str = "high"  # 'high' | 'medium' | 'low'
    status: str = "Healthy"
    mainPressure: str = "None"
    evidence: List[str] = Field(default_factory=list)
    metrics: Dict[str, Any] = Field(default_factory=dict)


class HealthSignal(BaseModel):
    id: str
    type: str  # 'most_important' | 'dependency' | 'modernization' | 'positive' | 'protection'
    title: str
    narrative: str
    evidence: List[str] = Field(default_factory=list)
    severity: str = "info"  # 'positive' | 'info' | 'warning' | 'risk'


class NextAction(BaseModel):
    id: str
    title: str
    reason: str
    expectedEffect: str
    destinationPage: str  # 'overview' | 'explanation' | 'hotspots' | 'graph' | 'neural-map' | 'tests' | 'refactor' | 'migration'
    targetFile: Optional[str] = None


class AnalysisConfidenceSummary(BaseModel):
    overallConfidence: str = "high"  # 'high' | 'medium' | 'low'
    parseReliability: str = "High"
    graphResolutionConfidence: str = "High"
    riskConfidence: str = "High"
    protectionEvidenceConfidence: str = "Medium"
    modernizationEvidenceConfidence: str = "High"
    reasons: List[str] = Field(default_factory=list)


class WhyScoreEvidence(BaseModel):
    strengths: List[str] = Field(default_factory=list)
    pressurePoints: List[str] = Field(default_factory=list)
    evidence: List[str] = Field(default_factory=list)


class SnapshotComparison(BaseModel):
    hasPrevious: bool = False
    previousScore: Optional[int] = None
    healthDelta: Optional[int] = None
    riskReduction: Optional[int] = None
    unresolvedDependencyReduction: Optional[int] = None
    protectionImprovement: Optional[int] = None


class RepositoryHealth(BaseModel):
    score: int = 100
    label: str = "Stable"  # 'Stable' | 'Stable with pressure points' | 'Needs attention' | 'High risk' | 'Analysis incomplete'
    confidence: str = "high"  # 'high' | 'medium' | 'low'
    isPartial: bool = False
    whyScore: WhyScoreEvidence = Field(default_factory=WhyScoreEvidence)
    dimensions: Dict[str, HealthDimensionCard] = Field(default_factory=dict)
    snapshotComparison: Optional[SnapshotComparison] = None


class SystemPulseResponse(BaseModel):
    health: RepositoryHealth
    subsystems: List[SubsystemHealth] = Field(default_factory=list)
    pressureZones: List[PressureZone] = Field(default_factory=list)
    signals: List[HealthSignal] = Field(default_factory=list)
    nextActions: List[NextAction] = Field(default_factory=list)
    confidence: AnalysisConfidenceSummary = Field(default_factory=AnalysisConfidenceSummary)

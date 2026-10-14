import { RiskAssessment, RiskSeverity } from '../types';

export type HotspotSortField =
  | 'score'
  | 'complexity'
  | 'blast_radius'
  | 'fan_in'
  | 'loc'
  | 'warnings'
  | 'confidence'
  | 'unresolved';

export type EvidenceFilter = 'all' | 'full' | 'partial' | 'low_confidence' | 'has_callers' | 'has_blast';

export const getFilePath = (item: RiskAssessment): string => item.filePath || item.file || '';
export const getHotspotScore = (item: RiskAssessment): number => item.hotspotScore ?? item.hotspot_score ?? 0;
export const getOverallRisk = (item: RiskAssessment): RiskSeverity => (item.overallRisk || item.risk_level || 'low') as RiskSeverity;
export const getComplexityVal = (item: RiskAssessment): number =>
  typeof item.complexity === 'object' ? item.complexity?.value ?? 0 : (item.complexity as any) ?? 0;
export const getComplexitySev = (item: RiskAssessment): RiskSeverity =>
  (typeof item.complexity === 'object' ? item.complexity?.severity ?? 'low' : 'low') as RiskSeverity;
export const getFanIn = (item: RiskAssessment): number => item.graph?.fanIn ?? item.dependency_fan_in ?? 0;
export const getBlastRadius = (item: RiskAssessment): number => item.graph?.blastRadius ?? item.blast_radius ?? 0;
export const getUnresolved = (item: RiskAssessment): number => item.graph?.unresolvedRelations ?? 0;
export const getWarnings = (item: RiskAssessment): number => item.warnings ?? item.warnings_count ?? 0;
export const getLoc = (item: RiskAssessment): number => item.linesOfCode ?? item.lines_of_code ?? 0;
export const getParseStatus = (item: RiskAssessment): string =>
  item.parse?.status || (item.is_partially_parsed ? 'partial' : 'full');
export const getParseConfidence = (item: RiskAssessment): string => item.parse?.confidence || 'high';

export interface FilterAndSortHotspotsOptions {
  searchTerm: string;
  riskFilter: 'all' | 'critical' | 'high' | 'medium' | 'low';
  evidenceFilter: EvidenceFilter;
  sortField: HotspotSortField;
  sortAsc: boolean;
}

export function filterAndSortHotspots(
  hotspots: RiskAssessment[],
  options: FilterAndSortHotspotsOptions
): RiskAssessment[] {
  const { searchTerm, riskFilter, evidenceFilter, sortField, sortAsc } = options;

  const filtered = hotspots.filter((item) => {
    const fPath = getFilePath(item).toLowerCase();
    const reason = (item.reason || '').toLowerCase();
    const rec = (item.recommendedAction || item.recommended_action || '').toLowerCase();
    const term = searchTerm.toLowerCase();

    const matchesSearch = fPath.includes(term) || reason.includes(term) || rec.includes(term);
    if (!matchesSearch) return false;

    // Risk filter
    const risk = getOverallRisk(item);
    if (riskFilter !== 'all' && risk !== riskFilter) return false;

    // Evidence & Parse filter
    const pStatus = getParseStatus(item);
    const pConf = getParseConfidence(item);
    const fanIn = getFanIn(item);
    const blast = getBlastRadius(item);

    if (evidenceFilter === 'full' && pStatus !== 'full') return false;
    if (evidenceFilter === 'partial' && pStatus !== 'partial') return false;
    if (evidenceFilter === 'low_confidence' && pConf !== 'low' && pStatus === 'full') return false;
    if (evidenceFilter === 'has_callers' && fanIn <= 0) return false;
    if (evidenceFilter === 'has_blast' && blast <= 0) return false;

    return true;
  });

  filtered.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'score') comparison = getHotspotScore(a) - getHotspotScore(b);
    else if (sortField === 'complexity') comparison = getComplexityVal(a) - getComplexityVal(b);
    else if (sortField === 'blast_radius') comparison = getBlastRadius(a) - getBlastRadius(b);
    else if (sortField === 'fan_in') comparison = getFanIn(a) - getFanIn(b);
    else if (sortField === 'loc') comparison = getLoc(a) - getLoc(b);
    else if (sortField === 'warnings') comparison = getWarnings(a) - getWarnings(b);
    else if (sortField === 'confidence') {
      const confWeight: Record<string, number> = { high: 3, medium: 2, low: 1 };
      comparison = (confWeight[getParseConfidence(a)] || 0) - (confWeight[getParseConfidence(b)] || 0);
    } else if (sortField === 'unresolved') {
      comparison = getUnresolved(a) - getUnresolved(b);
    }

    return sortAsc ? comparison : -comparison;
  });

  return filtered;
}

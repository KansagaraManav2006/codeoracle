import { useState, useEffect, useCallback, useMemo } from 'react';
import { HotspotsResponse, RiskAssessment } from '../types';
import { analysisService } from '../services';
import { useProjectQuery } from './useProjectQuery';
import {
  HotspotSortField,
  EvidenceFilter,
  filterAndSortHotspots,
  getFilePath,
  getHotspotScore,
  getParseStatus,
  getParseConfidence,
} from '../utils/hotspotUtils';

export interface UseHotspotsProps {
  projectId: string;
  targetFile?: string | null;
}

export function useHotspots({ projectId, targetFile }: UseHotspotsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>('all');
  const [sortField, setSortField] = useState<HotspotSortField>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(targetFile || null);
  const [visibleHotspots, setVisibleHotspots] = useState(50);

  // Sync expandedFile if targetFile prop changes
  useEffect(() => {
    if (targetFile) {
      setExpandedFile(targetFile);
    }
  }, [targetFile]);

  const queryFn = useCallback(
    (signal: AbortSignal) => analysisService.getHotspots(projectId, { signal }),
    [projectId]
  );

  const { data, loading, error, refetch: fetchHotspots } = useProjectQuery<HotspotsResponse>({
    projectId,
    queryFn,
    onSuccess: () => setVisibleHotspots(50),
  });

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleHotspots(50);
  }, [searchTerm, riskFilter, evidenceFilter, sortField, sortAsc]);

  const filtered = useMemo(() => {
    if (!data?.hotspots) return [];
    return filterAndSortHotspots(data.hotspots, {
      searchTerm,
      riskFilter,
      evidenceFilter,
      sortField,
      sortAsc,
    });
  }, [data, searchTerm, riskFilter, evidenceFilter, sortField, sortAsc]);

  // Identify highest-priority file from deterministic response
  const recStartFile = data?.recommendedStartFile || data?.recommended_start_file;
  const topHotspot: RiskAssessment | null = useMemo(() => {
    if (!data?.hotspots || data.hotspots.length === 0) return null;
    return data.hotspots.find((h) => getFilePath(h) === recStartFile) || data.hotspots[0];
  }, [data?.hotspots, recStartFile]);

  const totalFilesCount = data?.totalFiles ?? data?.total_files ?? (data?.hotspots ? data.hotspots.length : 0);
  const criticalCount = data?.summary?.criticalCount ?? data?.summary?.critical_count ?? 0;
  const highCount = data?.summary?.highCount ?? data?.summary?.high_count ?? 0;
  const topScore =
    data?.summary?.highestScore ??
    data?.summary?.highest_score ??
    (topHotspot ? getHotspotScore(topHotspot) : 0);
  const highConfCount = useMemo(() => {
    if (!data?.hotspots) return 0;
    return (
      data.summary?.highConfidenceCount ??
      data.summary?.fullParseCount ??
      data.hotspots.filter((h) => getParseStatus(h) === 'full' && getParseConfidence(h) === 'high').length
    );
  }, [data]);

  return {
    data,
    loading,
    error,
    fetchHotspots,
    searchTerm,
    setSearchTerm,
    riskFilter,
    setRiskFilter,
    evidenceFilter,
    setEvidenceFilter,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    expandedFile,
    setExpandedFile,
    visibleHotspots,
    setVisibleHotspots,
    filtered,
    topHotspot,
    totalFilesCount,
    criticalCount,
    highCount,
    topScore,
    highConfCount,
  };
}

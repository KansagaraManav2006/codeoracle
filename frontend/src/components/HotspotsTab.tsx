import React, { useEffect, useState, useMemo } from 'react';
import {
  Flame,
  Zap,
  Network,
  TestTube,
  Wand2,
  Map,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Info,
  RefreshCw,
  AlertTriangle,
  Target,
  ShieldAlert,
  FileCode,
  Layers,
  Activity,
} from 'lucide-react';
import { HotspotsResponse, TabType, RiskAssessment, RiskSeverity } from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import EmptyState from './common/EmptyState';
import PageHeroHeader from './common/PageHeroHeader';

interface HotspotsTabProps {
  projectId: string;
  targetFile?: string | null;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
}

type SortField =
  | 'score'
  | 'complexity'
  | 'blast_radius'
  | 'fan_in'
  | 'loc'
  | 'warnings'
  | 'confidence'
  | 'unresolved';

type EvidenceFilter = 'all' | 'full' | 'partial' | 'low_confidence' | 'has_callers' | 'has_blast';

// --- Explicit Label Badges to prevent confusing bare severity tags ---

export const RiskBadge: React.FC<{ risk: string; size?: 'sm' | 'md' }> = ({ risk, size = 'md' }) => {
  const norm = (risk || 'low').toLowerCase();
  const isSm = size === 'sm';
  const label = `RISK: ${norm.toUpperCase()}`;

  let bgClasses = 'bg-slate-surface text-slate-text border border-slate/30';
  if (norm === 'critical') {
    bgClasses = 'bg-red-strong text-white border border-red-strong shadow-xs font-bold';
  } else if (norm === 'high') {
    bgClasses = 'bg-red-surface text-red-text border border-red-line/60 font-bold';
  } else if (norm === 'medium') {
    bgClasses = 'bg-amber-surface text-amber-text border border-amber-line/60 font-bold';
  }

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase select-none rounded-pill tracking-wider ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${bgClasses}`}
    >
      {label}
    </span>
  );
};

export const ComplexityBadge: React.FC<{ severity: string; value?: number; size?: 'sm' | 'md' }> = ({
  severity,
  value,
  size = 'md',
}) => {
  const norm = (severity || 'low').toLowerCase();
  const isSm = size === 'sm';
  const label = value !== undefined ? `${value} CC · COMPLEXITY: ${norm.toUpperCase()}` : `COMPLEXITY: ${norm.toUpperCase()}`;

  let bgClasses = 'bg-slate-surface text-slate-text border border-slate/30';
  if (norm === 'critical') {
    bgClasses = 'bg-red-surface text-red-text border border-red-line/60 font-semibold';
  } else if (norm === 'high') {
    bgClasses = 'bg-amber-surface text-amber-text border border-amber-line/60 font-semibold';
  } else if (norm === 'medium') {
    bgClasses = 'bg-tile text-ink-2 border border-line font-medium';
  }

  return (
    <span
      className={`inline-flex items-center font-mono uppercase select-none rounded-md tracking-wider ${
        isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${bgClasses}`}
    >
      {label}
    </span>
  );
};

export const ParseBadge: React.FC<{ status: string; confidence?: string; size?: 'sm' | 'md' }> = ({
  status,
  confidence,
  size = 'md',
}) => {
  const normStatus = (status || 'full').toLowerCase();
  const normConf = (confidence || 'high').toLowerCase();
  const isSm = size === 'sm';

  let statusClass = 'bg-teal-surface text-teal-text border border-teal/30 font-bold';
  if (normStatus === 'partial') {
    statusClass = 'bg-amber-surface text-amber-text border border-amber-line/60 font-bold';
  } else if (normStatus === 'fallback' || normStatus === 'failed') {
    statusClass = 'bg-red-surface text-red-text border border-red-line/60 font-bold';
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center font-mono uppercase select-none rounded-pill tracking-wider ${
          isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[10px]'
        } ${statusClass}`}
      >
        PARSE: {normStatus.toUpperCase()}
      </span>
      {confidence && (
        <span
          className={`inline-flex items-center font-mono uppercase select-none rounded-md px-1.5 py-0.5 text-[10px] ${
            normConf === 'high'
              ? 'bg-tile text-ink-2 border border-line font-medium'
              : normConf === 'medium'
              ? 'bg-amber-surface/70 text-amber-text border border-amber-line/40 font-semibold'
              : 'bg-red-surface/70 text-red-text border border-red-line/40 font-bold'
          }`}
          title={`AST & Graph evidence confidence: ${normConf.toUpperCase()}`}
        >
          CONF: {normConf.toUpperCase()}
        </span>
      )}
    </div>
  );
};

export const HotspotsTab: React.FC<HotspotsTabProps> = ({
  projectId,
  targetFile = null,
  onNavigateTab,
  onSelectFile,
  onFocusInGraph,
  onInspectImpact,
}) => {
  const [data, setData] = useState<HotspotsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>('all');
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(targetFile);
  const [visibleHotspots, setVisibleHotspots] = useState(50);

  // Sync expandedFile if targetFile prop changes
  useEffect(() => {
    if (targetFile) {
      setExpandedFile(targetFile);
    }
  }, [targetFile]);

  const fetchHotspots = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/projects/${projectId}/hotspots`);
      if (!res.ok) {
        throw new Error(`Failed to load hotspots (${res.status} ${res.statusText})`);
      }
      const json: HotspotsResponse = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Error fetching hotspots');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchHotspots();
      setVisibleHotspots(50);
    }
  }, [projectId]);

  // Reset visible count when filters change
  useEffect(() => {
    setVisibleHotspots(50);
  }, [searchTerm, riskFilter, evidenceFilter, sortField, sortAsc]);

  // 5 Working Action Handlers
  const handleInspectInGraph = (file: string) => {
    if (onFocusInGraph) onFocusInGraph(file);
    else {
      onSelectFile?.(file);
      onNavigateTab?.('graph');
    }
  };

  const handleWhatBreaks = (file: string) => {
    if (onInspectImpact) onInspectImpact(file);
    else {
      onSelectFile?.(file);
      onNavigateTab?.('migration');
    }
  };

  const handleGenerateTests = (file: string) => {
    onSelectFile?.(file);
    onNavigateTab?.('tests');
  };

  const handleReviewModernization = (file: string) => {
    onSelectFile?.(file);
    onNavigateTab?.('refactor');
  };

  const handleOpenImpactPlan = (file: string) => {
    onSelectFile?.(file);
    onNavigateTab?.('migration');
  };

  // Helper normalizers for items to seamlessly support canonical RiskAssessment
  const getFilePath = (item: RiskAssessment): string => item.filePath || item.file || '';
  const getHotspotScore = (item: RiskAssessment): number => item.hotspotScore ?? item.hotspot_score ?? 0;
  const getOverallRisk = (item: RiskAssessment): RiskSeverity => (item.overallRisk || item.risk_level || 'low') as RiskSeverity;
  const getComplexityVal = (item: RiskAssessment): number => (typeof item.complexity === 'object' ? item.complexity?.value ?? 0 : (item.complexity as any) ?? 0);
  const getComplexitySev = (item: RiskAssessment): RiskSeverity => (typeof item.complexity === 'object' ? item.complexity?.severity ?? 'low' : 'low') as RiskSeverity;
  const getFanIn = (item: RiskAssessment): number => item.graph?.fanIn ?? item.dependency_fan_in ?? 0;
  const getBlastRadius = (item: RiskAssessment): number => item.graph?.blastRadius ?? item.blast_radius ?? 0;
  const getUnresolved = (item: RiskAssessment): number => item.graph?.unresolvedRelations ?? 0;
  const getWarnings = (item: RiskAssessment): number => item.warnings ?? item.warnings_count ?? 0;
  const getLoc = (item: RiskAssessment): number => item.linesOfCode ?? item.lines_of_code ?? 0;
  const getParseStatus = (item: RiskAssessment): string => item.parse?.status || (item.is_partially_parsed ? 'partial' : 'full');
  const getParseConfidence = (item: RiskAssessment): string => item.parse?.confidence || 'high';

  const filtered = useMemo(() => {
    if (!data?.hotspots) return [];
    const list = data.hotspots.filter((item) => {
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

    list.sort((a, b) => {
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

    return list;
  }, [data, searchTerm, riskFilter, evidenceFilter, sortField, sortAsc]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-32 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
        <div className="skeleton h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-red-surface rounded-xl border border-red-line text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-red mx-auto" />
        <h3 className="text-base font-bold text-red-text">Unable to calculate project hotspots</h3>
        <p className="text-xs text-ink-3 max-w-md mx-auto">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchHotspots} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Analysis
        </Button>
      </div>
    );
  }

  if (!data || !data.hotspots || data.hotspots.length === 0) {
    return (
      <div className="p-12 bg-surface rounded-xl border border-line text-center space-y-3">
        <Info className="w-8 h-8 text-ink-3 mx-auto" />
        <h3 className="text-base font-bold text-ink">No source files detected</h3>
        <p className="text-xs text-ink-3">
          This project does not currently have analyzed source files to evaluate for refactoring hotspots.
        </p>
      </div>
    );
  }

  // Identify highest-priority file from deterministic response
  const recStartFile = data.recommendedStartFile || data.recommended_start_file;
  const topHotspot: RiskAssessment =
    data.hotspots.find((h) => getFilePath(h) === recStartFile) || data.hotspots[0];

  const totalFilesCount = data.totalFiles ?? data.total_files ?? data.hotspots.length;
  const criticalCount = data.summary?.criticalCount ?? data.summary?.critical_count ?? 0;
  const highCount = data.summary?.highCount ?? data.summary?.high_count ?? 0;
  const topScore = data.summary?.highestScore ?? data.summary?.highest_score ?? (topHotspot ? getHotspotScore(topHotspot) : 0);
  const highConfCount =
    data.summary?.highConfidenceCount ??
    data.summary?.fullParseCount ??
    data.hotspots.filter((h) => getParseStatus(h) === 'full' && getParseConfidence(h) === 'high').length;

  return (
    <div
      className="space-y-3.5 sm:space-y-4 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-hotspots"
      aria-labelledby="tab-hotspots"
    >
      {/* 1. Page Header Card */}
      <PageHeroHeader
        icon={Flame}
        title="RISK HOTSPOTS"
        eyebrow="Static Prioritization"
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25">
            Canonical Risk Engine
          </span>
        }
        description="Prioritize refactoring targets using explainable complexity, findings, fan-in, and downstream blast radius."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleInspectInGraph(topHotspot ? getFilePath(topHotspot) : '')}
              icon={<Network className="w-3.5 h-3.5" />}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Dependency Map
            </Button>
            <Button
              variant="indigo"
              size="sm"
              onClick={() => handleWhatBreaks(topHotspot ? getFilePath(topHotspot) : '')}
              icon={<Target className="w-3.5 h-3.5" />}
            >
              Simulate Impact
            </Button>
          </div>
        }
      />

      {/* 5 KPI Cards */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <KpiCard
            label="FILES EVALUATED"
            value={formatNumber(totalFilesCount)}
            subtext="Parsed into AST models"
          />
          <KpiCard
            label="CRITICAL RISK (≥70)"
            value={formatNumber(criticalCount)}
            variant={criticalCount > 0 ? 'highlight' : 'default'}
            subtext="Immediate refactoring priority"
          />
          <KpiCard
            label="HIGH RISK (45-69)"
            value={formatNumber(highCount)}
            subtext="Elevated caller ripple"
          />
          <KpiCard
            label="TOP HOTSPOT SCORE"
            value={`${topScore} / 100`}
            variant="selected"
            subtext="Normalized max severity"
          />
          <KpiCard
            label="FULL ANALYSIS CONFIDENCE"
            value={`${highConfCount} / ${totalFilesCount}`}
            subtext="Full AST, no missing imports"
          />
        </div>
      </section>

      {/* 2. Highest-Priority File Showcase Card */}
      {topHotspot && (
        <section className="bg-gradient-to-br from-[#1C1A17] to-[#2B2823] rounded-xl p-5 sm:p-7 text-white border border-[#3E3A34] shadow-2 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-pill bg-amber-on-dark text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
                #1 Highest-Priority Target
              </span>
              <span className="text-xs text-white/70 font-mono">Highest Static Refactoring Priority</span>
            </div>

            {/* Explicit Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <RiskBadge risk={getOverallRisk(topHotspot)} size="sm" />
              <ComplexityBadge severity={getComplexitySev(topHotspot)} size="sm" />
              <ParseBadge
                status={getParseStatus(topHotspot)}
                confidence={getParseConfidence(topHotspot)}
                size="sm"
              />
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-mono font-bold text-white break-all">
                  {getFilePath(topHotspot)}
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-[#D8CFC2] leading-relaxed">
                <strong className="text-white font-semibold">Why this file ranks #1: </strong>
                {data.recommendedStartReason ||
                  data.recommended_start_reason ||
                  `Highest combined hotspot score (${getHotspotScore(
                    topHotspot
                  )}/100, ${getOverallRisk(topHotspot).toUpperCase()}) based on cyclomatic complexity (${getComplexityVal(
                    topHotspot
                  )} CC), incoming callers (${getFanIn(
                    topHotspot
                  )}), and downstream blast radius (${getBlastRadius(topHotspot)} files).`}
              </p>
            </div>

            {/* Score Callout Box */}
            <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-lg border border-white/15 shrink-0 self-start lg:self-auto">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-amber-on-dark tracking-wider">HOTSPOT SCORE</div>
                <div className="text-3xl font-bold font-mono text-amber-on-dark">
                  {getHotspotScore(topHotspot)} <span className="text-xs text-white/60">/ 100</span>
                </div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-left text-xs text-white/80 font-mono space-y-1">
                <div>
                  Complexity: <strong className="text-white">{getComplexityVal(topHotspot)} CC</strong>
                </div>
                <div>
                  Blast Radius: <strong className="text-white">{getBlastRadius(topHotspot)} file(s)</strong>
                </div>
                <div>
                  Confidence: <strong className="text-teal-strong">{getParseConfidence(topHotspot).toUpperCase()}</strong>
                </div>
              </div>
            </div>
          </div>

          {/* 6 Required Metrics Grid for Top File */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-white/15">
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10 flex flex-col justify-between h-[62px]">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider leading-none block">
                Hotspot Score
              </span>
              <span className="font-mono text-sm font-bold text-amber-on-dark leading-tight">
                {getHotspotScore(topHotspot)} / 100
              </span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10 flex flex-col justify-between h-[62px]">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider leading-none block">
                Complexity
              </span>
              <span className="font-mono text-xs font-bold text-white leading-tight">
                {getComplexityVal(topHotspot)} CC ({getComplexitySev(topHotspot).toUpperCase()})
              </span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10 flex flex-col justify-between h-[62px]">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider leading-none block">
                Lines of Code
              </span>
              <span className="font-mono text-sm font-bold text-white leading-tight">
                {formatNumber(getLoc(topHotspot))} LOC
              </span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10 flex flex-col justify-between h-[62px]">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider leading-none block">
                Dependency Fan-In
              </span>
              <span className="font-mono text-sm font-bold text-white leading-tight">
                {getFanIn(topHotspot)} caller(s)
              </span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10 flex flex-col justify-between h-[62px]">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider leading-none block">
                Warnings
              </span>
              <span className="font-mono text-sm font-bold text-white leading-tight">
                {getWarnings(topHotspot)} finding(s)
              </span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10 flex flex-col justify-between h-[62px]">
              <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider leading-none block">
                Blast Radius
              </span>
              <span className="font-mono text-sm font-bold text-white leading-tight">
                {getBlastRadius(topHotspot)} dependent(s)
              </span>
            </div>
          </div>

          {/* 4 Focused Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="!bg-white/10 hover:!bg-white/20 active:!bg-white/25 !text-white !border-white/25 shadow-none"
              onClick={() => handleInspectInGraph(getFilePath(topHotspot))}
              icon={<Network className="w-3.5 h-3.5 text-amber-on-dark" />}
              title="Inspect coupling in interactive Dependency Map"
            >
              Inspect in Map
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="!bg-white/15 hover:!bg-white/25 active:!bg-white/30 !text-white !border-white/30 shadow-none font-semibold"
              onClick={() => handleWhatBreaks(getFilePath(topHotspot))}
              icon={<Target className="w-3.5 h-3.5 text-amber-on-dark" />}
              title="Simulate downstream blast radius and affected entry points"
            >
              Analyze Impact
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="!bg-white/10 hover:!bg-white/20 active:!bg-white/25 !text-white !border-white/25 shadow-none"
              onClick={() => handleGenerateTests(getFilePath(topHotspot))}
              icon={<TestTube className="w-3.5 h-3.5 text-amber-on-dark" />}
              title="Generate characterization pinning tests for this file"
            >
              Generate Tests
            </Button>
            <Button
              variant="indigo"
              size="sm"
              onClick={() => handleReviewModernization(getFilePath(topHotspot))}
              icon={<Wand2 className="w-3.5 h-3.5" />}
              title="Preview automated modernization proposals"
            >
              Modernize Code
            </Button>
          </div>
        </section>
      )}

      {/* 3. Static-Score Disclaimer Banner */}
      <section className="bg-[#FEF9EE] border border-amber-line/70 rounded-xl p-4 sm:p-4.5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-strong shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-ink font-semibold">Static AST &amp; Dependency Coupling Analysis</strong>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-white border border-amber-line text-amber-strong uppercase shadow-xs">
                STATIC ANALYSIS
              </span>
            </div>
            <p className="text-ink-2 leading-relaxed max-w-3xl">
              Scores are deterministically calculated using static AST complexity, callgraph fan-in, and dependency blast radius without requiring Git repository churn history.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <span className="px-2.5 py-1 rounded-md bg-white border border-amber-line/50 text-[11px] font-mono text-ink-2 shadow-xs">
            Engine: {data.summary?.scoringEngine || data.summary?.scoring_engine || 'canonical_v2'}
          </span>
        </div>
      </section>

      {/* 4. Search, Risk Filter, Evidence Filter & Sort Controls */}
      <div className="bg-surface border border-line rounded-lg p-3 sm:px-4 shadow-1 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <SearchField
            id="hotspots-search"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search hotspot file path, reason, or remediation…"
            resultCount={{
              current: filtered.length,
              total: data.hotspots.length,
              unit: 'modules',
            }}
            className="w-full lg:w-80"
          />

          {/* Risk Level Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-sans text-xs font-bold text-ink-2 shrink-0 mr-1">Risk Filter:</span>
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((lvl) => (
              <FilterChip
                key={lvl}
                label={lvl === 'all' ? 'ALL' : lvl.toUpperCase()}
                active={riskFilter === lvl}
                onClick={() => setRiskFilter(lvl)}
              />
            ))}
          </div>
        </div>

        {/* Evidence & Parse Status Filter */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-line/60 overflow-x-auto text-xs">
          <span className="font-sans text-xs font-bold text-ink-2 shrink-0 mr-1 flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-teal" />
            Evidence Filter:
          </span>
          {[
            { id: 'all' as EvidenceFilter, label: 'ALL FILES' },
            { id: 'full' as EvidenceFilter, label: 'FULL PARSE ONLY' },
            { id: 'partial' as EvidenceFilter, label: 'PARTIAL / ANOMALIES' },
            { id: 'low_confidence' as EvidenceFilter, label: 'LOW CONFIDENCE' },
            { id: 'has_callers' as EvidenceFilter, label: 'HAS CALLERS' },
            { id: 'has_blast' as EvidenceFilter, label: 'HAS BLAST RADIUS' },
          ].map((f) => (
            <FilterChip
              key={f.id}
              label={f.label}
              active={evidenceFilter === f.id}
              onClick={() => setEvidenceFilter(f.id)}
            />
          ))}
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-line overflow-x-auto text-xs text-ink-3">
          <span className="font-bold shrink-0 flex items-center gap-1 text-ink-2">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Sort by:
          </span>
          {[
            { id: 'score' as SortField, label: 'Hotspot Score' },
            { id: 'complexity' as SortField, label: 'Complexity' },
            { id: 'blast_radius' as SortField, label: 'Blast Radius' },
            { id: 'fan_in' as SortField, label: 'Fan-in Callers' },
            { id: 'loc' as SortField, label: 'Lines of Code' },
            { id: 'warnings' as SortField, label: 'Warnings' },
            { id: 'confidence' as SortField, label: 'Parse Confidence' },
            { id: 'unresolved' as SortField, label: 'Unresolved Imports' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              aria-label={`Sort by ${s.label}`}
              onClick={() => {
                if (sortField === s.id) {
                  setSortAsc(!sortAsc);
                } else {
                  setSortField(s.id);
                  setSortAsc(false);
                }
              }}
              className={`h-7 px-3 rounded-pill font-sans text-[11px] font-bold uppercase tracking-[0.04em] shrink-0 flex items-center gap-1 transition-all select-none border focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                sortField === s.id
                  ? 'bg-ink text-white font-semibold border-transparent shadow-xs'
                  : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:bg-tile'
              }`}
            >
              <span>{s.label}</span>
              {sortField === s.id && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Ranked Hotspot Prioritization Table */}
      <div className="bg-surface rounded-xl border border-line shadow-1 overflow-hidden">
        <div className="px-5 py-4 border-b border-line flex items-center justify-between gap-3">
          <div>
            <h3 className="font-display font-bold text-base text-ink">
              Ranked Hotspot Prioritization Table
            </h3>
            <p className="text-xs text-ink-3 mt-0.5">
              Showing {filtered.length} evaluated module(s) ordered by {sortField} ({sortAsc ? 'ascending' : 'descending'}).
            </p>
          </div>
          <span className="text-xs font-mono text-ink-3">Click row to view full score decomposition</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={Flame}
              headline="No Hotspots Match Your Filter"
              description={
                searchTerm
                  ? `No risk hotspots match "${searchTerm}" with the current filter settings.`
                  : 'No files match the selected risk or evidence filter criteria.'
              }
              actionText="Reset Search & Filters"
              onAction={() => {
                setSearchTerm('');
                setRiskFilter('all');
                setEvidenceFilter('all');
              }}
              iconVariant="signal"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-tile border-b border-line text-ink-3 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">File Path &amp; Structured Evidence</th>
                  <th className="py-3 px-3">Risk Level</th>
                  <th className="py-3 px-3">Complexity</th>
                  <th className="py-3 px-3">Parse &amp; Confidence</th>
                  <th className="py-3 px-3 text-center">Score</th>
                  <th className="py-3 px-3 text-right">LOC</th>
                  <th className="py-3 px-3 text-right">Fan-in</th>
                  <th className="py-3 px-3 text-right">Blast</th>
                  <th className="py-3 px-4 text-center">Decomposition</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.slice(0, visibleHotspots).map((item, index) => {
                  const filePath = getFilePath(item);
                  const isExpanded = expandedFile === filePath;
                  const isTarget = Boolean(
                    targetFile &&
                      (filePath === targetFile || filePath.endsWith(targetFile) || targetFile.endsWith(filePath))
                  );

                  const score = getHotspotScore(item);
                  const risk = getOverallRisk(item);
                  const compVal = getComplexityVal(item);
                  const compSev = getComplexitySev(item);
                  const fanIn = getFanIn(item);
                  const blast = getBlastRadius(item);
                  const unresolved = getUnresolved(item);
                  const warnings = getWarnings(item);
                  const loc = getLoc(item);
                  const pStatus = getParseStatus(item);
                  const pConf = getParseConfidence(item);

                  const factors = item.scoreFactors || {
                    complexity: Math.min(35, Math.round(compVal)),
                    warnings: Math.min(20, warnings * 3),
                    fanIn: Math.min(15, fanIn * 3),
                    blastRadius: Math.min(20, blast * 2),
                    loc: Math.min(10, Math.round(loc / 50)),
                  };

                  return (
                    <React.Fragment key={filePath}>
                      <tr
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setExpandedFile(isExpanded ? null : filePath);
                          onSelectFile?.(filePath);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpandedFile(isExpanded ? null : filePath);
                            onSelectFile?.(filePath);
                          }
                        }}
                        className={`cursor-pointer transition-colors hover:bg-track/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                          isTarget
                            ? 'bg-indigo-surface/60 border-l-4 border-indigo font-medium'
                            : isExpanded
                            ? 'bg-tile'
                            : ''
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3.5 px-4 font-mono font-bold text-center text-ink-2">
                          #{index + 1}
                        </td>

                        {/* File & Structured Summary */}
                        <td className="py-3.5 px-4 min-w-[240px]">
                          <div className="font-mono font-semibold text-ink truncate" title={filePath}>
                            {truncateMiddle(filePath, 36)}
                          </div>
                          {/* Structured Row Summary */}
                          <div className="text-[11px] text-ink-3 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
                            <span>CC {compVal}</span>
                            <span>·</span>
                            <span>{warnings} finding{warnings === 1 ? '' : 's'}</span>
                            <span>·</span>
                            <span>{fanIn} caller{fanIn === 1 ? '' : 's'}</span>
                            <span>·</span>
                            <span>{blast} downstream</span>
                            {unresolved > 0 && (
                              <>
                                <span>·</span>
                                <span className="text-amber-strong">{unresolved} unresolved</span>
                              </>
                            )}
                          </div>
                        </td>

                        {/* Explicit Overall Risk Badge */}
                        <td className="py-3.5 px-3">
                          <RiskBadge risk={risk} size="sm" />
                        </td>

                        {/* Explicit Complexity Severity Badge */}
                        <td className="py-3.5 px-3">
                          <ComplexityBadge severity={compSev} value={compVal} size="sm" />
                        </td>

                        {/* Parse & Confidence Badge */}
                        <td className="py-3.5 px-3">
                          <ParseBadge status={pStatus} confidence={pConf} size="sm" />
                        </td>

                        {/* Hotspot Score */}
                        <td className="py-3.5 px-3 text-center">
                          <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-surface text-indigo-text border border-indigo/25 text-xs">
                            <Flame className="w-3 h-3 text-indigo fill-current" />
                            {score}
                          </span>
                        </td>

                        {/* LOC */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {formatNumber(loc)}
                        </td>

                        {/* Fan-in */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {fanIn}
                        </td>

                        {/* Blast Radius */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {blast}
                        </td>

                        {/* Toggle Factor Breakdown */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setExpandedFile(isExpanded ? null : filePath)}
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-line bg-tile hover:bg-track text-ink-2 inline-flex items-center gap-1 transition-colors"
                            title="Toggle score factor breakdown"
                          >
                            <span>Factors</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Factor Breakdown & Row Actions */}
                      {isExpanded && (
                        <tr className="bg-tile/70 border-b border-line">
                          <td colSpan={10} className="p-4 sm:p-5">
                            <div className="space-y-4 animate-[fade-up_150ms_ease-out_both]">
                              {/* Header & Formula Callout */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2 block">
                                    Evidence &amp; Score Decomposition:
                                  </span>
                                  <p className="text-xs text-ink mt-0.5 max-w-3xl">
                                    {item.reason}
                                  </p>
                                </div>
                                <span className="text-[11px] text-ink-3 font-mono shrink-0">
                                  Score: 35% CC + 20% Blast + 20% Warn + 15% FanIn + 10% LOC
                                </span>
                              </div>

                              {/* Categorized Factors Decomposition Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                {/* Group 1: Static Code Risk */}
                                <div className="p-3 bg-surface border border-line rounded-lg space-y-2.5">
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-1.5">
                                    <FileCode className="w-3.5 h-3.5 text-indigo" />
                                    <span>Static Code Risk</span>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Cyclomatic Complexity</span>
                                      <div className="text-right font-mono">
                                        <span className="font-bold text-ink">{compVal} CC</span>{' '}
                                        <span className="text-teal-strong font-semibold">+{factors.complexity} pts</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Modernization Findings</span>
                                      <div className="text-right font-mono">
                                        <span className="font-bold text-ink">{warnings} findings</span>{' '}
                                        <span className="text-teal-strong font-semibold">+{factors.warnings} pts</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Lines of Code</span>
                                      <div className="text-right font-mono">
                                        <span className="font-bold text-ink">{loc} LOC</span>{' '}
                                        <span className="text-teal-strong font-semibold">+{factors.loc} pts</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Group 2: Graph Coupling Risk */}
                                <div className="p-3 bg-surface border border-line rounded-lg space-y-2.5">
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-1.5">
                                    <Layers className="w-3.5 h-3.5 text-amber-strong" />
                                    <span>Graph Coupling Risk</span>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Fan-In (Direct Callers)</span>
                                      <div className="text-right font-mono">
                                        <span className="font-bold text-ink">{fanIn} callers</span>{' '}
                                        <span className="text-teal-strong font-semibold">+{factors.fanIn} pts</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Blast Radius (Transitive)</span>
                                      <div className="text-right font-mono">
                                        <span className="font-bold text-ink">{blast} files</span>{' '}
                                        <span className="text-teal-strong font-semibold">+{factors.blastRadius} pts</span>
                                      </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Unresolved Relations</span>
                                      <div className="text-right font-mono">
                                        <span className="font-bold text-ink">{unresolved} edge(s)</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Group 3: Parse Status & Confidence */}
                                <div className="p-3 bg-surface border border-line rounded-lg space-y-2.5">
                                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-1.5">
                                    <Activity className="w-3.5 h-3.5 text-teal" />
                                    <span>Parse &amp; Evidence Confidence</span>
                                  </div>
                                  <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">AST Parse Status</span>
                                      <span className="font-mono font-bold text-ink uppercase">{pStatus}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Confidence Level</span>
                                      <span className="font-mono font-bold text-teal-strong uppercase">{pConf}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                      <span className="text-ink-2">Overall Risk Category</span>
                                      <span className="font-mono font-bold text-ink uppercase">{risk}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Remediation Hint */}
                              <div className="p-3 bg-surface border border-line rounded-md text-xs">
                                <strong className="text-ink font-semibold">Recommended Action: </strong>
                                <span className="text-ink-2">{item.recommendedAction || item.recommended_action}</span>
                              </div>

                              {/* All 5 Actions on Row */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/60">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleInspectInGraph(filePath)}
                                  icon={<Network className="w-3.5 h-3.5" />}
                                  title="Inspect coupling in Dependency Map"
                                >
                                  Inspect in Dependency Map
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleWhatBreaks(filePath)}
                                  icon={<Target className="w-3.5 h-3.5 text-red-strong" />}
                                  title="Check downstream ripple and affected entry points"
                                >
                                  What breaks if I change this?
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateTests(filePath)}
                                  icon={<TestTube className="w-3.5 h-3.5" />}
                                  title="Generate pinning safety tests"
                                >
                                  Generate Safety Tests
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReviewModernization(filePath)}
                                  icon={<Wand2 className="w-3.5 h-3.5" />}
                                  title="Review automated modernization diffs"
                                >
                                  Review Modernization Proposals
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenImpactPlan(filePath)}
                                  icon={<Map className="w-3.5 h-3.5" />}
                                  title="Open Impact & Plan roadmap"
                                >
                                  Open Impact &amp; Plan
                                </Button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {filtered.length > visibleHotspots && (
              <div className="flex justify-center py-4 border-t border-line">
                <button
                  onClick={() => setVisibleHotspots((prev) => prev + 50)}
                  className="px-6 py-2 rounded-lg bg-surface-2 border border-line text-ink-2 text-sm font-medium hover:bg-track hover:text-ink transition-colors"
                >
                  Load More Hotspots ({filtered.length - visibleHotspots} remaining)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HotspotsTab;

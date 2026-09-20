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
} from 'lucide-react';
import { HotspotsResponse, TabType, HotspotItem } from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { StatusTag } from './common/Tags';

interface HotspotsTabProps {
  projectId: string;
  targetFile?: string | null;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
}

type SortField = 'score' | 'complexity' | 'blast_radius' | 'fan_in' | 'loc' | 'warnings';

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
  const [sortField, setSortField] = useState<SortField>('score');
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(targetFile);

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
    }
  }, [projectId]);

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

  const filtered = useMemo(() => {
    if (!data) return [];
    const list = data.hotspots.filter((item) => {
      const matchesSearch =
        item.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.recommended_action.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (riskFilter === 'all') return true;
      return item.risk_level === riskFilter;
    });

    list.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'score') comparison = a.hotspot_score - b.hotspot_score;
      else if (sortField === 'complexity') comparison = a.complexity - b.complexity;
      else if (sortField === 'blast_radius') comparison = a.blast_radius - b.blast_radius;
      else if (sortField === 'fan_in') comparison = a.dependency_fan_in - b.dependency_fan_in;
      else if (sortField === 'loc') comparison = a.lines_of_code - b.lines_of_code;
      else if (sortField === 'warnings') comparison = a.warnings_count - b.warnings_count;

      return sortAsc ? comparison : -comparison;
    });

    return list;
  }, [data, searchTerm, riskFilter, sortField, sortAsc]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-32 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

  if (!data || data.hotspots.length === 0) {
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
  const topHotspot: HotspotItem =
    data.hotspots.find((h) => h.file === data.recommended_start_file) || data.hotspots[0];

  const getScoreBadgeClass = (score: number) => {
    if (score >= 70) return 'text-red bg-red-surface border-red-line';
    if (score >= 45) return 'text-amber-strong bg-amber-surface border-amber/30';
    if (score >= 20) return 'text-indigo-text bg-indigo-surface border-indigo/20';
    return 'text-teal-strong bg-teal-surface border-teal/20';
  };

  return (
    <div className="space-y-6 animate-[fade-up_250ms_ease-out_both]" role="tabpanel" id="tabpanel-hotspots" aria-labelledby="tab-hotspots">
      {/* 1. Header Card & KPIs */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-md bg-amber-surface text-amber-strong flex items-center justify-center shrink-0 border border-amber/20"
              aria-hidden="true"
            >
              <Flame className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight">
                  Risk Hotspots &amp; Refactoring Prioritization
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-pill bg-ink text-white uppercase tracking-wider">
                  STATIC ENGINE V1
                </span>
              </div>
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                Deterministic static ranking of codebase refactoring priority using complexity, fan-in callers, warnings, and downstream blast radius.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-tile border border-line rounded-lg text-xs font-mono text-ink-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-teal-strong inline-block" />
            <span>Mode: Static AST &amp; Graph (No Git Churn)</span>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          <KpiCard
            label="TOTAL EVALUATED"
            value={formatNumber(data.total_files)}
            subtext="Parsed into AST models"
          />
          <KpiCard
            label="CRITICAL RISK (≥70)"
            value={formatNumber(data.summary.critical_count ?? 0)}
            variant={data.summary.critical_count ? 'highlight' : 'default'}
            subtext="Immediate refactoring priority"
          />
          <KpiCard
            label="HIGH RISK (≥45)"
            value={formatNumber(data.summary.high_count ?? 0)}
            subtext="Elevated caller ripple"
          />
          <KpiCard
            label="TOP HOTSPOT SCORE"
            value={`${data.summary.highest_score ?? 0} / 100`}
            variant="selected"
            subtext="Normalized max severity"
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
              <span className="text-xs text-white/60 font-mono">Maximum ROI &amp; Risk Mitigation</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-1 rounded bg-white/10 text-white/90 border border-white/15 font-mono">
                Risk Rating: {topHotspot.risk_level.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-mono font-bold text-white break-all">
                  {topHotspot.file}
                </h3>
              </div>
              <p className="text-xs sm:text-[13px] text-[#D8CFC2] leading-relaxed">
                <strong className="text-white font-semibold">Why this file ranks highly: </strong>
                {data.recommended_start_reason || topHotspot.reason}
              </p>
            </div>

            {/* Score Callout Box */}
            <div className="flex items-center gap-4 bg-white/10 px-5 py-3 rounded-lg border border-white/15 shrink-0 self-start lg:self-auto">
              <div className="text-right">
                <div className="text-[10px] uppercase font-bold text-amber-on-dark tracking-wider">HOTSPOT SCORE</div>
                <div className="text-3xl font-bold font-mono text-amber-on-dark">
                  {topHotspot.hotspot_score} <span className="text-xs text-white/60">/ 100</span>
                </div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-left text-xs text-white/80 font-mono space-y-1">
                <div>Complexity: <strong className="text-white">{topHotspot.complexity} CC</strong></div>
                <div>Blast Radius: <strong className="text-white">{topHotspot.blast_radius} file(s)</strong></div>
              </div>
            </div>
          </div>

          {/* 7 Required Metrics Grid for Top File */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-white/15">
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Hotspot Score</span>
              <span className="font-mono text-sm font-bold text-amber-on-dark">{topHotspot.hotspot_score} / 100</span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Complexity</span>
              <span className="font-mono text-sm font-bold text-white">{topHotspot.complexity} CC ({topHotspot.complexity_rating.toUpperCase()})</span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Lines of Code</span>
              <span className="font-mono text-sm font-bold text-white">{formatNumber(topHotspot.lines_of_code)} LOC</span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Dependency Fan-In</span>
              <span className="font-mono text-sm font-bold text-white">{topHotspot.dependency_fan_in} caller(s)</span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Warnings</span>
              <span className="font-mono text-sm font-bold text-white">{topHotspot.warnings_count} finding(s)</span>
            </div>
            <div className="bg-white/5 rounded-md p-2.5 border border-white/10">
              <span className="text-[10px] uppercase font-bold text-white/60 block">Blast Radius</span>
              <span className="font-mono text-sm font-bold text-white">{topHotspot.blast_radius} dependent(s)</span>
            </div>
          </div>

          {/* All 5 Working Action Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="!text-white !border-white/20 hover:!bg-white/10"
              onClick={() => handleInspectInGraph(topHotspot.file)}
              icon={<Network className="w-3.5 h-3.5 text-amber-on-dark" />}
              title="Inspect coupling in interactive Dependency Map"
            >
              Inspect in Dependency Map
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="!text-white !border-white/20 hover:!bg-white/10 font-bold"
              onClick={() => handleWhatBreaks(topHotspot.file)}
              icon={<Target className="w-3.5 h-3.5 text-amber-on-dark" />}
              title="Simulate downstream blast radius and affected entry points"
            >
              What breaks if I change this?
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="!text-white !border-white/20 hover:!bg-white/10"
              onClick={() => handleGenerateTests(topHotspot.file)}
              icon={<TestTube className="w-3.5 h-3.5 text-amber-on-dark" />}
              title="Generate characterization pinning tests for this file"
            >
              Generate Tests
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="!text-white !border-white/20 hover:!bg-white/10"
              onClick={() => handleReviewModernization(topHotspot.file)}
              icon={<Wand2 className="w-3.5 h-3.5 text-amber-on-dark" />}
              title="Preview automated modernization proposals in disposable sandbox"
            >
              Review Modernization
            </Button>
            <Button
              variant="indigo"
              size="sm"
              onClick={() => handleOpenImpactPlan(topHotspot.file)}
              icon={<Map className="w-3.5 h-3.5" />}
              title="Open the Migration Plan tab with this file selected"
            >
              Open Impact &amp; Plan →
            </Button>
          </div>
        </section>
      )}

      {/* 3. Static-Score Disclaimer Banner */}
      <section className="bg-amber-surface border border-amber/30 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-strong shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <strong className="text-ink font-semibold">Static Scoring Disclaimer (AST &amp; Callgraph Analysis)</strong>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-surface border border-amber/40 text-amber-strong uppercase">
                NO GIT CHURN CLAIMED
              </span>
            </div>
            <p className="text-ink-2 leading-relaxed max-w-3xl">
              Hotspot scores are deterministically computed using static Python and JavaScript AST metrics: cyclomatic complexity, incoming caller fan-in, detected legacy warning codes, and dependency graph blast radius. Git commit history, author revisions, and commit churn frequency are not analyzed for uploaded archives. All scores represent structural coupling and refactoring risk.
            </p>
          </div>
        </div>

        <div className="shrink-0 self-end sm:self-center">
          <span className="px-2.5 py-1 rounded-md bg-surface border border-line text-[11px] font-mono text-ink-3">
            Engine: {data.summary.scoring_engine || 'static_v1'}
          </span>
        </div>
      </section>

      {/* 4. Search, Risk Filter & Sort Controls */}
      <div className="bg-surface border border-line rounded-lg p-3 sm:px-4 shadow-1 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
            className="w-full sm:w-80"
          />

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
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                if (sortField === s.id) {
                  setSortAsc(!sortAsc);
                } else {
                  setSortField(s.id);
                  setSortAsc(false);
                }
              }}
              className={`px-2.5 py-1 rounded-md font-sans text-xs shrink-0 flex items-center gap-1 transition-colors ${
                sortField === s.id
                  ? 'bg-ink text-white font-semibold'
                  : 'bg-tile text-ink-2 hover:bg-track border border-line'
              }`}
            >
              <span>{s.label}</span>
              {sortField === s.id && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Ranked Hotspot Table */}
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
          <span className="text-xs font-mono text-ink-3">
            Click row to view score factors
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-xs text-ink-3">
            No files match the search query and risk filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-tile border-b border-line text-ink-3 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 w-12 text-center">Rank</th>
                  <th className="py-3 px-4">File Path</th>
                  <th className="py-3 px-4">Risk Level</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-3 text-right">Complexity</th>
                  <th className="py-3 px-3 text-right">LOC</th>
                  <th className="py-3 px-3 text-right">Fan-in</th>
                  <th className="py-3 px-3 text-right">Warnings</th>
                  <th className="py-3 px-3 text-right">Blast Radius</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((item, index) => {
                  const isExpanded = expandedFile === item.file;
                  const factors = item.score_factors;

                  const isTarget = Boolean(
                    targetFile &&
                    (item.file === targetFile || item.file.endsWith(targetFile) || targetFile.endsWith(item.file))
                  );

                  return (
                    <React.Fragment key={item.file}>
                      <tr
                        onClick={() => {
                          setExpandedFile(isExpanded ? null : item.file);
                          onSelectFile?.(item.file);
                        }}
                        className={`cursor-pointer transition-colors hover:bg-track/50 ${
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

                        {/* File */}
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <div className="font-mono font-semibold text-ink truncate" title={item.file}>
                            {truncateMiddle(item.file, 34)}
                          </div>
                          <div className="text-[11px] text-ink-3 truncate max-w-sm mt-0.5">
                            {item.reason}
                          </div>
                        </td>

                        {/* Risk Level */}
                        <td className="py-3.5 px-4">
                          <StatusTag
                            status={item.risk_level === 'critical' ? 'critical' : item.risk_level === 'high' ? 'complex' : 'analyzed'}
                            label={item.risk_level.toUpperCase()}
                          />
                        </td>

                        {/* Hotspot Score */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded border ${getScoreBadgeClass(item.hotspot_score)}`}>
                            <Flame className="w-3 h-3 fill-current" />
                            {item.hotspot_score}
                          </span>
                        </td>

                        {/* Complexity */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {item.complexity} CC
                        </td>

                        {/* LOC */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {formatNumber(item.lines_of_code)}
                        </td>

                        {/* Fan-in */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {item.dependency_fan_in}
                        </td>

                        {/* Warnings */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {item.warnings_count}
                        </td>

                        {/* Blast Radius */}
                        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
                          {item.blast_radius}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setExpandedFile(isExpanded ? null : item.file)}
                              className="px-2 py-1 text-[11px] font-semibold rounded border border-line bg-tile hover:bg-track text-ink-2 flex items-center gap-1 transition-colors"
                              title="Toggle score factor breakdown"
                            >
                              <span>Factors</span>
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Factor Breakdown & Row Actions */}
                      {isExpanded && (
                        <tr className="bg-tile/70 border-b border-line">
                          <td colSpan={10} className="p-4 sm:p-5">
                            <div className="space-y-4 animate-[fade-up_150ms_ease-out_both]">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2 block">
                                    Why This File Ranks Highly:
                                  </span>
                                  <p className="text-xs text-ink mt-0.5">
                                    {item.reason}
                                  </p>
                                </div>
                                <span className="text-[11px] text-ink-3 font-mono shrink-0">
                                  Formula: 25% CC + 20% FanIn + 20% Blast + 20% Warn + 15% LOC
                                </span>
                              </div>

                              {/* 5 Scoring Sub-factors */}
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                                <div className="p-2.5 bg-surface border border-line rounded-md">
                                  <div className="text-[10px] uppercase font-bold text-ink-3">Complexity Factor</div>
                                  <div className="text-xs font-bold font-mono text-ink mt-0.5">{item.complexity} CC</div>
                                  <div className="text-[10px] text-teal-strong font-semibold">+{factors.complexity_score} pts</div>
                                </div>
                                <div className="p-2.5 bg-surface border border-line rounded-md">
                                  <div className="text-[10px] uppercase font-bold text-ink-3">Fan-In Callers</div>
                                  <div className="text-xs font-bold font-mono text-ink mt-0.5">{item.dependency_fan_in} callers</div>
                                  <div className="text-[10px] text-teal-strong font-semibold">+{factors.fan_in_score} pts</div>
                                </div>
                                <div className="p-2.5 bg-surface border border-line rounded-md">
                                  <div className="text-[10px] uppercase font-bold text-ink-3">Blast Radius</div>
                                  <div className="text-xs font-bold font-mono text-ink mt-0.5">{item.blast_radius} files</div>
                                  <div className="text-[10px] text-teal-strong font-semibold">+{factors.blast_radius_score} pts</div>
                                </div>
                                <div className="p-2.5 bg-surface border border-line rounded-md">
                                  <div className="text-[10px] uppercase font-bold text-ink-3">Warnings Count</div>
                                  <div className="text-xs font-bold font-mono text-ink mt-0.5">{item.warnings_count} issues</div>
                                  <div className="text-[10px] text-teal-strong font-semibold">+{factors.warnings_score} pts</div>
                                </div>
                                <div className="p-2.5 bg-surface border border-line rounded-md">
                                  <div className="text-[10px] uppercase font-bold text-ink-3">Code Volume</div>
                                  <div className="text-xs font-bold font-mono text-ink mt-0.5">{item.lines_of_code} LOC</div>
                                  <div className="text-[10px] text-teal-strong font-semibold">+{factors.loc_score} pts</div>
                                </div>
                              </div>

                              {/* Remediation Hint */}
                              <div className="p-3 bg-surface border border-line rounded-md text-xs">
                                <strong className="text-ink font-semibold">Recommended Remediation: </strong>
                                <span className="text-ink-2">{item.recommended_action}</span>
                              </div>

                              {/* All 5 Actions on Row */}
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/60">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleInspectInGraph(item.file)}
                                  icon={<Network className="w-3.5 h-3.5" />}
                                  title="Inspect coupling in Dependency Map"
                                >
                                  Inspect in Dependency Map
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleWhatBreaks(item.file)}
                                  icon={<Target className="w-3.5 h-3.5 text-red-strong" />}
                                  title="Check downstream ripple and affected entry points"
                                >
                                  What breaks if I change this?
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleGenerateTests(item.file)}
                                  icon={<TestTube className="w-3.5 h-3.5" />}
                                  title="Generate pinning tests"
                                >
                                  Generate Tests
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleReviewModernization(item.file)}
                                  icon={<Wand2 className="w-3.5 h-3.5" />}
                                  title="Review automated modernization diffs"
                                >
                                  Review Modernization
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenImpactPlan(item.file)}
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
          </div>
        )}
      </div>
    </div>
  );
};

export default HotspotsTab;

import React from 'react';
import {
  Flame,
  Network,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Info,
  RefreshCw,
  AlertTriangle,
  Target,
  ShieldAlert,
  Activity,
} from 'lucide-react';
import { TabType } from '../types';
import Button from './common/Button';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import EmptyState from './common/EmptyState';
import PageHeroHeader from './common/PageHeroHeader';

import { useHotspots } from '../hooks/useHotspots';
import { HotspotSortField, EvidenceFilter, getFilePath } from '../utils/hotspotUtils';
import { RiskBadge, ComplexityBadge, ParseBadge } from './hotspots/HotspotBadges';
import HotspotsKpiGrid from './hotspots/HotspotsKpiGrid';
import TopHotspotShowcase from './hotspots/TopHotspotShowcase';
import HotspotRowCard from './hotspots/HotspotRowCard';

// Re-export badges for backward compatibility
export { RiskBadge, ComplexityBadge, ParseBadge };

interface HotspotsTabProps {
  projectId: string;
  targetFile?: string | null;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
}

export const HotspotsTab: React.FC<HotspotsTabProps> = ({
  projectId,
  targetFile = null,
  onNavigateTab,
  onSelectFile,
  onFocusInGraph,
  onInspectImpact,
}) => {
  const {
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
  } = useHotspots({ projectId, targetFile });

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
      <HotspotsKpiGrid
        totalFilesCount={totalFilesCount}
        criticalCount={criticalCount}
        highCount={highCount}
        topScore={topScore}
        highConfCount={highConfCount}
      />

      {/* 2. Highest-Priority File Showcase Card */}
      {topHotspot && (
        <TopHotspotShowcase
          topHotspot={topHotspot}
          onInspectInGraph={handleInspectInGraph}
          onWhatBreaks={handleWhatBreaks}
          onGenerateTests={handleGenerateTests}
          onReviewModernization={handleReviewModernization}
        />
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
            { id: 'score' as HotspotSortField, label: 'Hotspot Score' },
            { id: 'complexity' as HotspotSortField, label: 'Complexity' },
            { id: 'blast_radius' as HotspotSortField, label: 'Blast Radius' },
            { id: 'fan_in' as HotspotSortField, label: 'Fan-in Callers' },
            { id: 'loc' as HotspotSortField, label: 'Lines of Code' },
            { id: 'warnings' as HotspotSortField, label: 'Warnings' },
            { id: 'confidence' as HotspotSortField, label: 'Parse Confidence' },
            { id: 'unresolved' as HotspotSortField, label: 'Unresolved Imports' },
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

                  return (
                    <HotspotRowCard
                      key={filePath}
                      item={item}
                      index={index}
                      isExpanded={isExpanded}
                      isTarget={isTarget}
                      onToggleExpand={() => setExpandedFile(isExpanded ? null : filePath)}
                      onSelectFile={onSelectFile}
                      onInspectInGraph={handleInspectInGraph}
                      onWhatBreaks={handleWhatBreaks}
                      onGenerateTests={handleGenerateTests}
                      onReviewModernization={handleReviewModernization}
                      onOpenImpactPlan={handleOpenImpactPlan}
                    />
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

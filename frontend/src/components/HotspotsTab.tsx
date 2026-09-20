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
} from 'lucide-react';
import { HotspotsResponse, TabType } from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { StatusTag } from './common/Tags';

interface HotspotsTabProps {
  projectId: string;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
}

type SortField = 'score' | 'complexity' | 'blast_radius' | 'fan_in' | 'loc' | 'warnings';

export const HotspotsTab: React.FC<HotspotsTabProps> = ({
  projectId,
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
  const [expandedFile, setExpandedFile] = useState<string | null>(null);

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

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data.hotspots.filter((item) => {
      const matchesSearch =
        item.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase());
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

  const topHotspot = data.hotspots[0];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-red bg-red-surface border-red-line';
    if (score >= 45) return 'text-amber-strong bg-amber-surface border-amber/30';
    if (score >= 20) return 'text-indigo-text bg-indigo-surface border-indigo/20';
    return 'text-teal-strong bg-teal-surface border-teal/20';
  };

  return (
    <div className="space-y-6 animate-[fade-up_250ms_ease-out_both]" role="tabpanel" id="tabpanel-hotspots" aria-labelledby="tab-hotspots">
      {/* 1. Header Card */}
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
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight">
                  Risk Hotspots &amp; Prioritization
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-pill bg-ink text-white uppercase tracking-wider">
                  PRIORITY MATRIX
                </span>
              </div>
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                Deterministic static evaluation of complexity, lines of code, dependency fan-in, warnings, and blast radius.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-tile border border-line rounded-lg text-xs font-mono text-ink-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-teal-strong inline-block" />
            <span>Score Mode: Static (AST Based)</span>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          <KpiCard
            label="TOTAL MODULES"
            value={formatNumber(data.total_files)}
            subtext="Evaluated statically"
          />
          <KpiCard
            label="CRITICAL RISK (≥70)"
            value={formatNumber(data.summary.critical_count ?? 0)}
            variant={data.summary.critical_count ? 'highlight' : 'default'}
            subtext="Urgent refactoring targets"
          />
          <KpiCard
            label="HIGH RISK (≥45)"
            value={formatNumber(data.summary.high_count ?? 0)}
            subtext="Heavy callers or wide ripple"
          />
          <KpiCard
            label="TOP HOTSPOT SCORE"
            value={`${data.summary.highest_score ?? 0} / 100`}
            variant="selected"
            subtext="Normalized max severity"
          />
        </div>
      </section>

      {/* 2. Hero Recommendation Card: #1 Recommended Starting Point */}
      {topHotspot && (
        <section className="bg-gradient-to-br from-[#1C1A17] to-[#2B2823] rounded-xl p-5 sm:p-6 text-white border border-[#3E3A34] shadow-2">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[11px] font-bold rounded-pill bg-amber-on-dark text-ink uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
                #1 Recommended Starting Point
              </span>
              <span className="text-xs text-ink-3 font-mono">Maximum ROI &amp; Risk Mitigation</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg sm:text-xl font-mono font-bold text-white break-all">
                  {topHotspot.file}
                </h3>
                <p className="mt-1 text-xs sm:text-[13px] text-[#D8CFC2] max-w-2xl leading-relaxed">
                  {data.recommended_start_reason || topHotspot.reason}
                </p>
              </div>

              <div className="flex items-center gap-3 bg-white/10 px-4 py-2.5 rounded-lg border border-white/15 shrink-0 self-start md:self-auto">
                <div className="text-right">
                  <div className="text-[10px] uppercase font-bold text-amber-on-dark">HOTSPOT SCORE</div>
                  <div className="text-2xl font-bold font-mono text-amber-on-dark">
                    {topHotspot.hotspot_score} <span className="text-xs text-white/60">/ 100</span>
                  </div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-left text-xs text-white/80 font-mono space-y-0.5">
                  <div>CC: <span className="text-white font-bold">{topHotspot.complexity}</span></div>
                  <div>Fan-in: <span className="text-white font-bold">{topHotspot.dependency_fan_in} callers</span></div>
                </div>
              </div>
            </div>

            {/* Quick 1-Click Action Buttons */}
            <div className="pt-2 border-t border-white/15 flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="!text-white !border-white/20 hover:!bg-white/10"
                onClick={() => {
                  onFocusInGraph?.(topHotspot.file);
                  onNavigateTab?.('graph');
                }}
                icon={<Network className="w-3.5 h-3.5 text-amber-on-dark" />}
              >
                Inspect in Graph
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="!text-white !border-white/20 hover:!bg-white/10"
                onClick={() => {
                  onSelectFile?.(topHotspot.file);
                  onNavigateTab?.('tests');
                }}
                icon={<TestTube className="w-3.5 h-3.5 text-amber-on-dark" />}
              >
                Generate Tests
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="!text-white !border-white/20 hover:!bg-white/10"
                onClick={() => {
                  onSelectFile?.(topHotspot.file);
                  onNavigateTab?.('refactor');
                }}
                icon={<Wand2 className="w-3.5 h-3.5 text-amber-on-dark" />}
              >
                Modernize Code
              </Button>
              <Button
                variant="indigo"
                size="sm"
                onClick={() => {
                  onInspectImpact?.(topHotspot.file);
                  onNavigateTab?.('migration');
                }}
                icon={<Map className="w-3.5 h-3.5" />}
              >
                View Migration Impact →
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* 3. Search, Filter & Sort Controls */}
      <div className="bg-surface border border-line rounded-lg p-3 sm:px-4 shadow-1 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <SearchField
            id="hotspots-search"
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search hotspot path or reason…"
            resultCount={{
              current: filtered.length,
              total: data.hotspots.length,
              unit: 'modules',
            }}
            className="w-full sm:w-80"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-sans text-xs font-bold text-ink-2 shrink-0 mr-1">Risk:</span>
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

      {/* 4. Hotspots List with Factor Breakdown */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <div className="p-8 bg-surface rounded-lg border border-line text-center text-xs text-ink-3">
            No files match the selected search and risk criteria.
          </div>
        ) : (
          filtered.map((item, index) => {
            const isExpanded = expandedFile === item.file;
            const factors = item.score_factors;

            return (
              <div
                key={item.file}
                className="bg-surface rounded-lg border border-line shadow-1 overflow-hidden transition-all"
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-md bg-tile border border-line flex items-center justify-center font-mono font-bold text-xs text-ink-2 shrink-0">
                      #{index + 1}
                    </span>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[13px] text-ink truncate" title={item.file}>
                          {truncateMiddle(item.file, 36)}
                        </span>
                        <StatusTag status={item.risk_level === 'critical' ? 'critical' : item.risk_level === 'high' ? 'complex' : 'analyzed'} label={item.risk_level.toUpperCase()} />
                        {item.is_partially_parsed && (
                          <StatusTag status="warning" label="PARTIAL AST" />
                        )}
                      </div>
                      <p className="mt-1 text-xs text-ink-3 truncate max-w-xl">{item.reason}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <div className={`px-2.5 py-1 rounded-md border font-mono font-bold text-xs flex items-center gap-1.5 ${getScoreColor(item.hotspot_score)}`}>
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      <span>{item.hotspot_score}</span>
                      <span className="text-[10px] opacity-70">/ 100</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedFile(isExpanded ? null : item.file)}
                      aria-expanded={isExpanded}
                      className="px-2.5 py-1 text-xs font-semibold rounded-md border border-line bg-tile hover:bg-track text-ink-2 flex items-center gap-1 transition-colors"
                    >
                      <span>Factors</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Score Factors Breakdown */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-line/80 bg-tile/30 space-y-4 animate-[fade-up_150ms_ease-out_both]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2">
                        Transparent Scoring Factors (Sub-scores 0–100 weighted)
                      </span>
                      <span className="text-[11px] text-ink-3 font-mono">
                        Formula: 25% CC + 20% FanIn + 20% Blast + 20% Warn + 15% LOC
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      <div className="p-2.5 bg-surface border border-line rounded-md">
                        <div className="text-[10px] uppercase font-bold text-ink-3">Complexity</div>
                        <div className="text-sm font-bold font-mono text-ink mt-0.5">{item.complexity} CC</div>
                        <div className="text-[10px] text-ink-3">+{factors.complexity_score} pts</div>
                      </div>
                      <div className="p-2.5 bg-surface border border-line rounded-md">
                        <div className="text-[10px] uppercase font-bold text-ink-3">Fan-in Callers</div>
                        <div className="text-sm font-bold font-mono text-ink mt-0.5">{item.dependency_fan_in} callers</div>
                        <div className="text-[10px] text-ink-3">+{factors.fan_in_score} pts</div>
                      </div>
                      <div className="p-2.5 bg-surface border border-line rounded-md">
                        <div className="text-[10px] uppercase font-bold text-ink-3">Blast Radius</div>
                        <div className="text-sm font-bold font-mono text-ink mt-0.5">{item.blast_radius} files</div>
                        <div className="text-[10px] text-ink-3">+{factors.blast_radius_score} pts</div>
                      </div>
                      <div className="p-2.5 bg-surface border border-line rounded-md">
                        <div className="text-[10px] uppercase font-bold text-ink-3">Warnings</div>
                        <div className="text-sm font-bold font-mono text-ink mt-0.5">{item.warnings_count} notes</div>
                        <div className="text-[10px] text-ink-3">+{factors.warnings_score} pts</div>
                      </div>
                      <div className="p-2.5 bg-surface border border-line rounded-md">
                        <div className="text-[10px] uppercase font-bold text-ink-3">Code Volume</div>
                        <div className="text-sm font-bold font-mono text-ink mt-0.5">{item.lines_of_code} LOC</div>
                        <div className="text-[10px] text-ink-3">+{factors.loc_score} pts</div>
                      </div>
                    </div>

                    <div className="p-3 bg-surface border border-line rounded-md text-xs">
                      <strong className="text-ink font-semibold">Recommended Remediation: </strong>
                      <span className="text-ink-2">{item.recommended_action}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onFocusInGraph?.(item.file);
                          onNavigateTab?.('graph');
                        }}
                        icon={<Network className="w-3.5 h-3.5" />}
                      >
                        Inspect in Graph
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onInspectImpact?.(item.file);
                          onNavigateTab?.('migration');
                        }}
                        icon={<Map className="w-3.5 h-3.5" />}
                      >
                        Downstream Blast Radius
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(item.file);
                          onNavigateTab?.('tests');
                        }}
                        icon={<TestTube className="w-3.5 h-3.5" />}
                      >
                        Generate Tests
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(item.file);
                          onNavigateTab?.('refactor');
                        }}
                        icon={<Wand2 className="w-3.5 h-3.5" />}
                      >
                        Modernize Code
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HotspotsTab;

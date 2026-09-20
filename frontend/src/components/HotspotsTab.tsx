import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Flame,
  GitFork,
  HelpCircle,
  Info,
  Map,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TestTube,
  Wand2,
  Zap,
} from 'lucide-react';
import { HotspotsResponse, TabType } from '../types';

interface HotspotsTabProps {
  projectId: string;
  onNavigateTab?: (tab: TabType) => void;
  onFocusInGraph?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
}

type SortField = 'score' | 'complexity' | 'blast_radius' | 'fan_in' | 'loc' | 'warnings';

export const HotspotsTab: React.FC<HotspotsTabProps> = ({
  projectId,
  onNavigateTab,
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-[#D8CFC2] min-h-[400px]">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-[#C7953D]/20 border-t-[#C7953D] animate-spin" />
          <Flame className="w-6 h-6 text-[#C7953D] absolute inset-0 m-auto" />
        </div>
        <p className="mt-4 text-sm font-semibold text-[#5C554D]">
          Computing static hotspot scores and dependency ripple matrices...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-[#FDF8F7] border border-[#EAC4C1] rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-[#C45F58] mx-auto" />
        <h3 className="text-base font-bold text-[#8C3B35]">Unable to calculate project hotspots</h3>
        <p className="text-xs text-[#5C554D] max-w-md mx-auto">{error}</p>
        <button
          onClick={fetchHotspots}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#D8CFC2] rounded-xl text-xs font-semibold text-[#292622] hover:bg-[#F7F4EE]"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Analysis</span>
        </button>
      </div>
    );
  }

  if (!data || data.hotspots.length === 0) {
    return (
      <div className="p-12 bg-white rounded-2xl border border-[#D8CFC2] text-center space-y-3">
        <Info className="w-8 h-8 text-[#5C554D] mx-auto" />
        <h3 className="text-base font-bold text-[#292622]">No source files detected</h3>
        <p className="text-xs text-[#6B645A]">
          This project does not currently have analyzed source files to evaluate for refactoring hotspots.
        </p>
      </div>
    );
  }

  // Filter & sort
  let filtered = data.hotspots.filter((item) => {
    const matchesSearch =
      item.file.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reason.toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (riskFilter === 'all') return true;
    return item.risk_level === riskFilter;
  });

  filtered.sort((a, b) => {
    let comparison = 0;
    if (sortField === 'score') comparison = a.hotspot_score - b.hotspot_score;
    else if (sortField === 'complexity') comparison = a.complexity - b.complexity;
    else if (sortField === 'blast_radius') comparison = a.blast_radius - b.blast_radius;
    else if (sortField === 'fan_in') comparison = a.dependency_fan_in - b.dependency_fan_in;
    else if (sortField === 'loc') comparison = a.lines_of_code - b.lines_of_code;
    else if (sortField === 'warnings') comparison = a.warnings_count - b.warnings_count;

    return sortAsc ? comparison : -comparison;
  });

  const topHotspot = data.hotspots[0];

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-[#C45F58] bg-[#FDF2F2] border-[#F2B8B5]';
    if (score >= 45) return 'text-[#C7953D] bg-[#FEF9EE] border-[#F5DCB7]';
    if (score >= 20) return 'text-[#3E63DD] bg-[#F0F4FF] border-[#B8CCFA]';
    return 'text-[#2B7D5B] bg-[#EDF8F3] border-[#B7E5D0]';
  };

  const getBadgeColor = (risk: string) => {
    switch (risk) {
      case 'critical':
        return 'bg-[#C45F58] text-white';
      case 'high':
        return 'bg-[#C7953D] text-white';
      case 'medium':
        return 'bg-[#3E63DD] text-white';
      default:
        return 'bg-[#2B7D5B] text-white';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Score Mode Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-[#D8CFC2] shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-[#C7953D]" />
            <h2 className="text-lg font-black tracking-tight text-[#292622]">Refactoring Hotspots</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-[#181715] text-white uppercase tracking-wider">
              Priority Matrix
            </span>
          </div>
          <p className="mt-1 text-xs text-[#5C554D]">
            Where should the team start refactoring? Deterministic static evaluation of complexity, lines of code, dependency fan-in, warnings, and blast radius.
          </p>
        </div>

        {/* Static Score Mode Badge */}
        <div className="flex items-center gap-2 px-3 py-2 bg-[#F7F4EE] border border-[#D8CFC2] rounded-xl self-start sm:self-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-[#C7953D] animate-pulse" />
          <div className="text-[11px]">
            <span className="font-bold text-[#292622]">Score Mode: Static</span>
            <span className="text-[#6B645A] block sm:inline sm:ml-1.5">• Git Churn Not Required</span>
          </div>
        </div>
      </div>

      {/* Hero Recommendation Card: "Where Should I Start Refactoring?" */}
      {topHotspot && (
        <div className="relative overflow-hidden bg-gradient-to-br from-[#1F1E1C] to-[#2B2925] rounded-2xl p-5 sm:p-6 text-white shadow-md border border-[#3E3A34]">
          <div className="absolute -right-8 -bottom-8 opacity-10 pointer-events-none">
            <Flame className="w-64 h-64 text-[#C7953D]" />
          </div>

          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-[11px] font-black rounded-lg bg-[#C7953D] text-[#181715] uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 fill-current" />
                #1 Recommended Starting Point
              </span>
              <span className="text-xs text-[#C8BEB0]">Maximum ROI & Risk Mitigation</span>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-white font-mono">{topHotspot.file}</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-[#D8CFC2] max-w-3xl leading-relaxed">
                  {data.recommended_start_reason || topHotspot.reason}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start md:self-auto bg-white/10 px-4 py-3 rounded-xl border border-white/10 shrink-0">
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[#C8BEB0] font-bold">Hotspot Score</div>
                  <div className="text-2xl font-black text-[#C7953D]">{topHotspot.hotspot_score} <span className="text-xs text-[#C8BEB0]">/ 100</span></div>
                </div>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-left text-[11px] text-[#C8BEB0] space-y-0.5">
                  <div>CC: <span className="text-white font-bold">{topHotspot.complexity}</span></div>
                  <div>Fan-in: <span className="text-white font-bold">{topHotspot.dependency_fan_in} callers</span></div>
                </div>
              </div>
            </div>

            {/* Direct 1-Click Action Buttons connecting to the other 4 tabs */}
            <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  onFocusInGraph?.(topHotspot.file);
                  onNavigateTab?.('graph');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition-colors"
                title="Inspect in Dependency Graph"
              >
                <GitFork className="w-3.5 h-3.5 text-[#C7953D]" />
                <span>Inspect in Graph</span>
              </button>

              <button
                onClick={() => onNavigateTab?.('tests')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition-colors"
                title="Generate Characterization Tests"
              >
                <TestTube className="w-3.5 h-3.5 text-[#C7953D]" />
                <span>Generate Tests</span>
              </button>

              <button
                onClick={() => onNavigateTab?.('refactor')}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-semibold text-white transition-colors"
                title="Preview Refactored Code"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#C7953D]" />
                <span>Preview Refactor</span>
              </button>

              <button
                onClick={() => {
                  onInspectImpact?.(topHotspot.file);
                  onNavigateTab?.('migration');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C7953D] hover:bg-[#B38332] text-[#181715] rounded-xl text-xs font-bold transition-colors ml-auto"
                title="View Full Cascade Impact"
              >
                <Map className="w-3.5 h-3.5" />
                <span>View Migration Impact</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-[#D8CFC2] shadow-xs">
          <div className="text-[11px] font-bold text-[#5C554D] uppercase tracking-wider">Total Modules</div>
          <div className="mt-1 text-2xl font-black text-[#292622]">{data.total_files}</div>
          <div className="mt-0.5 text-[10px] text-[#6B645A]">Evaluated statically</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D8CFC2] shadow-xs">
          <div className="text-[11px] font-bold text-[#C45F58] uppercase tracking-wider">Critical Risk (≥70)</div>
          <div className="mt-1 text-2xl font-black text-[#C45F58]">{data.summary.critical_count ?? 0}</div>
          <div className="mt-0.5 text-[10px] text-[#6B645A]">Urgent modernization targets</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D8CFC2] shadow-xs">
          <div className="text-[11px] font-bold text-[#C7953D] uppercase tracking-wider">High Risk (≥45)</div>
          <div className="mt-1 text-2xl font-black text-[#C7953D]">{data.summary.high_count ?? 0}</div>
          <div className="mt-0.5 text-[10px] text-[#6B645A]">Heavy callers or wide ripple</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#D8CFC2] shadow-xs">
          <div className="text-[11px] font-bold text-[#292622] uppercase tracking-wider">Top Score</div>
          <div className="mt-1 text-2xl font-black text-[#292622]">
            {data.summary.highest_score ?? 0} <span className="text-xs text-[#6B645A]">/ 100</span>
          </div>
          <div className="mt-0.5 text-[10px] text-[#6B645A]">Normalized severity</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#D8CFC2] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-[#5C554D] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search file name or reason..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F7F4EE] border border-[#D8CFC2] rounded-xl focus:outline-hidden focus:border-[#C7953D] focus:ring-1 focus:ring-[#C7953D]"
            />
          </div>

          {/* Risk Level Filters */}
          <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-colors ${
                  riskFilter === level
                    ? 'bg-[#181715] text-white'
                    : 'bg-[#F7F4EE] text-[#5C554D] hover:bg-[#ECE5DA] border border-[#D8CFC2]'
                }`}
              >
                {level === 'all' ? 'All Files' : level}
              </button>
            ))}
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#ECE5DA] overflow-x-auto text-xs text-[#5C554D]">
          <span className="font-bold shrink-0 flex items-center gap-1">
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
              className={`px-2.5 py-1 rounded-md font-medium shrink-0 flex items-center gap-1 transition-colors ${
                sortField === s.id
                  ? 'bg-[#EAE4D9] text-[#181715] font-bold'
                  : 'hover:bg-[#F7F4EE] text-[#5C554D]'
              }`}
            >
              <span>{s.label}</span>
              {sortField === s.id && (sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {/* Hotspots List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-[#D8CFC2] text-center text-xs text-[#5C554D]">
            No files match the selected search and risk criteria.
          </div>
        ) : (
          filtered.map((item, index) => {
            const isExpanded = expandedFile === item.file;
            const factors = item.score_factors;

            return (
              <div
                key={item.file}
                className="bg-white rounded-xl border border-[#D8CFC2] p-4 shadow-xs hover:border-[#C8BEB0] transition-all space-y-3"
              >
                {/* File Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    {/* Rank Badge */}
                    <div className="w-7 h-7 rounded-lg bg-[#F7F4EE] border border-[#D8CFC2] flex items-center justify-center font-bold text-xs text-[#5C554D] shrink-0">
                      #{index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-[#181715]">{item.file}</span>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md uppercase tracking-wider ${getBadgeColor(item.risk_level)}`}>
                          {item.risk_level}
                        </span>
                        {item.is_partially_parsed && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-[#FFF4E5] text-[#B25E00] border border-[#F5DCB7]">
                            Partially Parsed
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#5C554D]">{item.reason}</p>
                    </div>
                  </div>

                  {/* Hotspot Score Pill */}
                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0">
                    <div className={`px-3 py-1.5 rounded-xl border font-mono font-black text-sm flex items-center gap-1.5 ${getScoreColor(item.hotspot_score)}`}>
                      <Flame className="w-4 h-4 fill-current" />
                      <span>{item.hotspot_score}</span>
                      <span className="text-[10px] opacity-75 font-normal">/ 100</span>
                    </div>

                    <button
                      onClick={() => setExpandedFile(isExpanded ? null : item.file)}
                      className="p-1.5 hover:bg-[#F7F4EE] rounded-lg text-[#5C554D] border border-transparent hover:border-[#D8CFC2]"
                      title="Toggle Score Breakdown"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 5-Factor Key Metrics Chips */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <div className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-[#D8CFC2] text-[#292622] flex items-center gap-1.5">
                    <span className="text-[#6B645A]">Complexity:</span>
                    <span className="font-bold">{item.complexity}</span>
                    <span className="text-[10px] text-[#6B645A]">({item.complexity_rating})</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-[#D8CFC2] text-[#292622] flex items-center gap-1.5">
                    <span className="text-[#6B645A]">Size:</span>
                    <span className="font-bold">{item.lines_of_code} LOC</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-[#D8CFC2] text-[#292622] flex items-center gap-1.5">
                    <span className="text-[#6B645A]">Fan-in:</span>
                    <span className="font-bold text-[#3E63DD]">{item.dependency_fan_in} callers</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-[#D8CFC2] text-[#292622] flex items-center gap-1.5">
                    <span className="text-[#6B645A]">Warnings:</span>
                    <span className="font-bold text-[#C7953D]">{item.warnings_count}</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-[#F7F4EE] border border-[#D8CFC2] text-[#292622] flex items-center gap-1.5">
                    <span className="text-[#6B645A]">Blast Radius:</span>
                    <span className="font-bold text-[#C45F58]">{item.blast_radius} ripple</span>
                  </div>
                </div>

                {/* Expanded Detailed 5-Factor Sub-Score Grid */}
                {isExpanded && factors && (
                  <div className="p-3.5 bg-[#FBF9F5] rounded-xl border border-[#D8CFC2] space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#292622]">
                      <HelpCircle className="w-3.5 h-3.5 text-[#C7953D]" />
                      <span>Static Scoring Breakdown (0–100 total):</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                      <div className="p-2 bg-white rounded-lg border border-[#D8CFC2]">
                        <div className="text-[10px] text-[#6B645A] font-semibold">Complexity (max 25)</div>
                        <div className="mt-1 font-mono font-bold text-[#292622]">+{factors.complexity_score} pts</div>
                        <div className="text-[10px] text-[#6B645A]">raw: {factors.complexity_raw}</div>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-[#D8CFC2]">
                        <div className="text-[10px] text-[#6B645A] font-semibold">Size / LOC (max 15)</div>
                        <div className="mt-1 font-mono font-bold text-[#292622]">+{factors.loc_score} pts</div>
                        <div className="text-[10px] text-[#6B645A]">raw: {factors.loc_raw} LOC</div>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-[#D8CFC2]">
                        <div className="text-[10px] text-[#6B645A] font-semibold">Fan-in (max 20)</div>
                        <div className="mt-1 font-mono font-bold text-[#3E63DD]">+{factors.fan_in_score} pts</div>
                        <div className="text-[10px] text-[#6B645A]">raw: {factors.fan_in_raw} callers</div>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-[#D8CFC2]">
                        <div className="text-[10px] text-[#6B645A] font-semibold">Warnings (max 20)</div>
                        <div className="mt-1 font-mono font-bold text-[#C7953D]">+{factors.warnings_score} pts</div>
                        <div className="text-[10px] text-[#6B645A]">raw: {factors.warnings_raw} issues</div>
                      </div>

                      <div className="p-2 bg-white rounded-lg border border-[#D8CFC2]">
                        <div className="text-[10px] text-[#6B645A] font-semibold">Blast Radius (max 20)</div>
                        <div className="mt-1 font-mono font-bold text-[#C45F58]">+{factors.blast_radius_score} pts</div>
                        <div className="text-[10px] text-[#6B645A]">raw: {factors.blast_radius_raw} files</div>
                      </div>
                    </div>

                    {/* Recommendation */}
                    <div className="text-xs text-[#5C554D] flex items-start gap-1.5 pt-1">
                      <span className="font-bold text-[#292622] shrink-0">Recommendation:</span>
                      <span>{item.recommended_action}</span>
                    </div>
                  </div>
                )}

                {/* 4 Action Buttons on every card */}
                <div className="pt-2 border-t border-[#ECE5DA] flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] text-[#6B645A]">
                    {item.recommended_action}
                  </div>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      onClick={() => {
                        onFocusInGraph?.(item.file);
                        onNavigateTab?.('graph');
                      }}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F7F4EE] hover:bg-[#ECE5DA] border border-[#D8CFC2] text-[#292622] flex items-center gap-1 transition-colors"
                      title="Focus module in Dependency Graph"
                    >
                      <GitFork className="w-3.5 h-3.5 text-[#5C554D]" />
                      <span>Graph</span>
                    </button>

                    <button
                      onClick={() => onNavigateTab?.('tests')}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F7F4EE] hover:bg-[#ECE5DA] border border-[#D8CFC2] text-[#292622] flex items-center gap-1 transition-colors"
                      title="Generate or inspect characterization tests"
                    >
                      <TestTube className="w-3.5 h-3.5 text-[#5C554D]" />
                      <span>Tests</span>
                    </button>

                    <button
                      onClick={() => onNavigateTab?.('refactor')}
                      className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#F7F4EE] hover:bg-[#ECE5DA] border border-[#D8CFC2] text-[#292622] flex items-center gap-1 transition-colors"
                      title="Preview refactor diff proposals"
                    >
                      <Wand2 className="w-3.5 h-3.5 text-[#5C554D]" />
                      <span>Refactor</span>
                    </button>

                    <button
                      onClick={() => {
                        onInspectImpact?.(item.file);
                        onNavigateTab?.('migration');
                      }}
                      className="px-2.5 py-1.5 text-xs font-bold rounded-lg bg-[#181715] hover:bg-black text-white flex items-center gap-1 transition-colors"
                      title="Inspect change impact in Migration Plan"
                    >
                      <Map className="w-3.5 h-3.5 text-[#C7953D]" />
                      <span>Impact</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HotspotsTab;

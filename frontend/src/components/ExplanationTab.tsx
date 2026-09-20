import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  Download,
  RefreshCw,
  Network,
  Target,
  Play,
  Wand2,
  FolderGit2,
  AlertTriangle,
  Flame,
} from 'lucide-react';
import { ProjectAnalysis, GraphResponse, TabType, WarningInfo } from '../types';
import { truncateMiddle, formatNumber, getDownloadFileName } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { LanguageTag, StatusTag } from './common/Tags';
import { useToast } from './common/Toast';

interface ExplanationTabProps {
  projectId?: string | null;
  projectName?: string;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

export const ExplanationTab: React.FC<ExplanationTabProps> = ({
  projectId,
  projectName = 'project',
  onNavigateTab,
  onSelectFile,
}) => {
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(60);

  const { showToast } = useToast();

  const fetchData = async (force: boolean = false) => {
    if (!projectId) return;
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      let analysisRes: Response;
      if (force) {
        analysisRes = await fetch(`/api/projects/${projectId}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        });
      } else {
        analysisRes = await fetch(`/api/projects/${projectId}/analysis`);
      }

      if (!analysisRes.ok) throw new Error(`Failed to load analysis (${analysisRes.status})`);
      const data: ProjectAnalysis = await analysisRes.json();
      setAnalysis(data);

      try {
        const gRes = await fetch(`/api/projects/${projectId}/graph?level=module`);
        if (gRes.ok) {
          const gData: GraphResponse = await gRes.json();
          setGraph(gData);
        }
      } catch {
        // graph is supplementary
      }

      if (force) showToast('Explanation refreshed successfully', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to load codebase explanation.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, [projectId]);

  const toggleModule = (id: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Cycle node IDs set
  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (graph?.cycles) {
      graph.cycles.forEach((c) => c.forEach((id) => set.add(id)));
    }
    return set;
  }, [graph]);

  // Compute Architecture Layers Breakdown
  const architectureLayers = useMemo(() => {
    if (!analysis || analysis.modules.length === 0) return [];
    const layersMap = new Map<
      string,
      { fileCount: number; lines: number; hasCycle: boolean; role: string }
    >();

    const getRole = (folder: string) => {
      const f = folder.toLowerCase();
      if (f.includes('api') || f.includes('route') || f.includes('endpoint')) return 'API & Routing';
      if (f.includes('model') || f.includes('schema') || f.includes('entity')) return 'Data & Schemas';
      if (f.includes('service') || f.includes('core') || f.includes('analysis')) return 'Core Business Logic';
      if (f.includes('test') || f.includes('spec')) return 'Test Suite';
      if (f.includes('util') || f.includes('helper') || f.includes('common')) return 'Shared Utilities';
      if (f.includes('component') || f.includes('view') || f.includes('ui')) return 'User Interface';
      if (f.includes('migration') || f.includes('refactor')) return 'Modernization Logic';
      if (f === 'root') return 'Entry & Configuration';
      return 'Module Layer';
    };

    analysis.modules.forEach((mod) => {
      const norm = mod.relative_path.replace(/\\/g, '/');
      const parts = norm.split('/');
      const layerName = parts.length > 1 ? parts[0] : 'root';
      const existing = layersMap.get(layerName) || {
        fileCount: 0,
        lines: 0,
        hasCycle: false,
        role: getRole(layerName),
      };

      existing.fileCount += 1;
      existing.lines += mod.line_count;
      if (cycleNodeIds.has(mod.module_id)) existing.hasCycle = true;
      layersMap.set(layerName, existing);
    });

    const total = analysis.modules.length;
    return Array.from(layersMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      percentage: Math.round((data.fileCount / total) * 100),
    }));
  }, [analysis, cycleNodeIds]);

  // Compute Top-Risk Modules Leaderboard
  const topRiskModules = useMemo(() => {
    if (!analysis) return [];
    return [...analysis.modules]
      .map((mod) => {
        const inCycle = cycleNodeIds.has(mod.module_id);
        const isHighComp = mod.complexity.rating === 'high' || mod.complexity.rating === 'critical';
        const score =
          mod.complexity.cyclomatic_complexity +
          mod.legacy_warnings.length * 3 +
          (inCycle ? 20 : 0) +
          (isHighComp ? 15 : 0) +
          (mod.parse_status !== 'complete' ? 10 : 0);

        let primaryRisk = 'Elevated Complexity';
        if (inCycle) primaryRisk = 'In Cyclic Import Loop';
        else if (mod.legacy_warnings.length > 5) primaryRisk = `${mod.legacy_warnings.length} Modernization Warnings`;
        else if (mod.complexity.cyclomatic_complexity > 15) primaryRisk = `Cyclomatic Complexity ${mod.complexity.cyclomatic_complexity}`;
        else if (mod.parse_status !== 'complete') primaryRisk = 'Partial Parse Limitation';

        return {
          mod,
          score,
          primaryRisk,
          inCycle,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [analysis, cycleNodeIds]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    if (!analysis) return [];
    return analysis.modules.filter((m) => {
      const normPath = m.relative_path.replace(/\\/g, '/');
      if (selectedLayer && selectedLayer !== 'root' && !normPath.startsWith(selectedLayer)) {
        return false;
      }
      if (selectedLayer === 'root' && normPath.includes('/')) {
        return false;
      }

      const matchesSearch =
        !searchQuery.trim() ||
        m.relative_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.classes.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        m.functions.some((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesLang =
        languageFilter === 'all' ||
        m.language.toLowerCase() === languageFilter.toLowerCase() ||
        (languageFilter === 'python' && m.relative_path.endsWith('.py')) ||
        (languageFilter === 'javascript' && (m.relative_path.endsWith('.js') || m.relative_path.endsWith('.jsx'))) ||
        (languageFilter === 'typescript' && (m.relative_path.endsWith('.ts') || m.relative_path.endsWith('.tsx')));

      return matchesSearch && matchesLang;
    });
  }, [analysis, searchQuery, languageFilter, selectedLayer]);

  const handleDownloadMarkdown = () => {
    if (!analysis) return;
    const filename = getDownloadFileName(projectName, 'explanation', 'md');
    const content = `# Codebase Explanation — ${projectName}

## Overview
- Total files: ${analysis.total_files}
- Total lines of code: ${analysis.total_lines}
- Modules parsed: ${analysis.modules.length}
- Analysis duration: ${analysis.analysis_duration_ms}ms

## Architecture Observations
${(analysis.explanation?.architectural_observations || []).map((obs) => `- ${obs}`).join('\n')}

## Modules Summary
${analysis.modules
  .map(
    (m) =>
      `### ${m.relative_path} (${m.language})
- Lines: ${m.line_count} | Classes: ${m.classes.length} | Functions: ${m.functions.length}
- Complexity: ${m.complexity.rating.toUpperCase()} (${m.complexity.cyclomatic_complexity})
${m.explanation?.responsibility ? `- Responsibility: ${m.explanation.responsibility}` : ''}
`
  )
  .join('\n')}
`;

    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  };

  if (!projectId) {
    return (
      <div className="p-8 text-center text-ink-3 font-sans text-sm">
        Select or analyze a repository to view its codebase explanation.
      </div>
    );
  }

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
        <div className="skeleton h-48 w-full" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-8 bg-red-surface rounded-xl border border-red-line text-center">
        <p className="font-bold text-red-text text-sm mb-3">{error || 'Unable to load analysis.'}</p>
        <Button variant="outline" size="sm" onClick={() => fetchData(false)}>
          Retry
        </Button>
      </div>
    );
  }

  const filesUnderstood = `${analysis.parse_success_count || analysis.modules.length} / ${analysis.total_files}`;
  const totalEdges = graph?.summary?.total_edges || analysis.dependency_edges?.length || 0;
  const suggestionsCount = analysis.findings?.length || 0;

  return (
    <div className="space-y-6 animate-[fade-up_250ms_ease-out_both]" role="tabpanel" id="tabpanel-explanation" aria-labelledby="tab-explanation">
      {/* 1. Section Header Card */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-md bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20"
              aria-hidden="true"
            >
              <BookOpen className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight">
                Codebase Explanation &amp; Architecture Command Center
              </h2>
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                Deterministic overview of project modules, structural layers, and priority risk targets.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMarkdown}
              icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
            >
              Download Markdown
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              loading={refreshing}
              loadingText="Refreshing…"
              icon={<RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />}
            >
              Refresh
            </Button>
          </div>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          <KpiCard
            label="FILES UNDERSTOOD"
            value={filesUnderstood}
            subtext="Parsed into AST models"
          />
          <KpiCard
            label="TOTAL LINES"
            value={formatNumber(analysis.total_lines)}
            subtext="Code lines analyzed"
          />
          <KpiCard
            label="SUGGESTIONS"
            value={suggestionsCount}
            variant="highlight"
            subtext="Actionable improvements"
          />
          <KpiCard
            label="CONNECTIONS"
            value={`${formatNumber(totalEdges)} edges`}
            subtext="Module dependencies"
          />
        </div>

        {/* "In simple words" panel */}
        <div className="bg-panel rounded-xl p-5 sm:p-6 mt-6">
          <h3 className="font-display font-bold text-base text-ink mb-1">In simple words</h3>
          <p className="font-sans text-[13px] text-ink-2 leading-[1.6] max-w-3xl mb-5">
            {analysis.explanation?.languages_summary ||
              `This project contains ${analysis.total_files} files across ${analysis.languages.join(', ')}. CodeOracle parsed its imports, exported symbols, and runtime contracts.`}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-surface border border-line rounded-md p-4 sm:p-5">
              <span className="font-sans text-[12px] font-bold text-indigo-text uppercase tracking-wider block mb-1.5">
                How it starts
              </span>
              <p className="font-sans text-[13px] text-ink-2 leading-[1.6]">
                {analysis.explanation?.entry_points_summary ||
                  (analysis.entry_points.length > 0
                    ? `Begins execution via entry modules: ${analysis.entry_points.slice(0, 2).join(', ')}.`
                    : 'Static modular library without a single top-level runner file.')}
              </p>
            </div>

            <div className="bg-surface border border-line rounded-md p-4 sm:p-5">
              <span className="font-sans text-[12px] font-bold text-indigo-text uppercase tracking-wider block mb-1.5">
                Important files
              </span>
              <p className="font-sans text-[13px] text-ink-2 leading-[1.6]">
                {analysis.explanation?.major_modules_summary ||
                  `${analysis.modules.filter((m) => m.classes.length > 0 || m.functions.length > 4).length} modules orchestrate core operations and business domain models.`}
              </p>
            </div>

            <div className="bg-surface border border-line rounded-md p-4 sm:p-5">
              <span className="font-sans text-[12px] font-bold text-indigo-text uppercase tracking-wider block mb-1.5">
                How files connect
              </span>
              <p className="font-sans text-[13px] text-ink-2 leading-[1.6]">
                {analysis.explanation?.dependencies_summary ||
                  `Internal imports link ${analysis.modules.length} modules together across ${totalEdges} dependency relationship paths.`}
              </p>
            </div>
          </div>

          {analysis.explanation?.architectural_observations &&
            analysis.explanation.architectural_observations.length > 0 && (
              <div className="mt-5 pt-4 border-t border-ink/10">
                <span className="font-sans text-[12px] font-bold uppercase tracking-wider text-ink-2 block mb-2">
                  What CodeOracle noticed
                </span>
                <ul className="space-y-1.5 font-sans text-xs text-ink-2">
                  {analysis.explanation.architectural_observations.slice(0, 4).map((obs, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-indigo font-bold">•</span>
                      <span>{obs}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </section>

      {/* 2. Architecture Layers Breakdown Card (Phase 4) */}
      {architectureLayers.length > 0 && (
        <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo" />
              <h3 className="font-display font-bold text-base text-ink">
                Architecture Structural Layers
              </h3>
            </div>
            {selectedLayer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedLayer(null)}
                className="text-xs"
              >
                Clear Layer Filter ({selectedLayer})
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {architectureLayers.map((layer) => {
              const isSelected = selectedLayer === layer.name;
              return (
                <div
                  key={layer.name}
                  onClick={() => setSelectedLayer(isSelected ? null : layer.name)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-indigo bg-indigo-surface ring-2 ring-indigo ring-offset-1'
                      : 'border-line bg-tile hover:bg-track'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-xs font-bold text-ink truncate" title={layer.name}>
                      /{layer.name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-surface border border-line text-ink-3">
                      {layer.role}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-ink-3 mb-2">
                    <span>{layer.fileCount} {layer.fileCount === 1 ? 'file' : 'files'}</span>
                    <span className="num font-mono">{formatNumber(layer.lines)} LOC</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-track rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo rounded-full"
                      style={{ width: `${Math.max(layer.percentage, 5)}%` }}
                    />
                  </div>

                  {layer.hasCycle && (
                    <div className="mt-2 text-[10px] font-bold text-red flex items-center gap-1">
                      <span>• Cyclic dependency participant</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 3. Top-Risk Modules Panel (Phase 4) */}
      {topRiskModules.length > 0 && (
        <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-line">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-red" />
              <h3 className="font-display font-bold text-base text-ink">
                Priority Modernization Targets
              </h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.('hotspots')}
              icon={<Flame className="w-3.5 h-3.5 text-amber-strong" />}
            >
              View All Hotspots →
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {topRiskModules.map(({ mod, primaryRisk, inCycle }, index) => (
              <div
                key={mod.module_id}
                className="bg-tile border border-line rounded-lg p-4 space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-ink truncate" title={mod.relative_path}>
                      #{index + 1} {truncateMiddle(mod.relative_path, 24)}
                    </span>
                    <StatusTag
                      status={inCycle ? 'critical' : 'complex'}
                      label={inCycle ? 'CYCLE' : mod.complexity.rating.toUpperCase()}
                    />
                  </div>
                  <div className="text-xs text-ink-3">
                    <span className="font-bold text-ink-2">{primaryRisk}</span> · {formatNumber(mod.line_count)} lines
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-line">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectFile?.(mod.relative_path);
                      onNavigateTab?.('migration');
                    }}
                    icon={<Target className="w-3 h-3" />}
                    className="text-xs !py-1"
                  >
                    What Breaks?
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectFile?.(mod.relative_path);
                      onNavigateTab?.('graph');
                    }}
                    icon={<Network className="w-3 h-3" />}
                    className="text-xs !py-1"
                  >
                    Graph
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectFile?.(mod.relative_path);
                      onNavigateTab?.('refactor');
                    }}
                    icon={<Wand2 className="w-3 h-3" />}
                    className="text-xs !py-1"
                  >
                    Modernize
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Filter Bar: Search + Language filter chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-line rounded-lg p-3 sm:px-4 shadow-1">
        <SearchField
          id="explanation-search"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search module path or symbol name…"
          resultCount={{
            current: filteredModules.length,
            total: analysis.modules.length,
            unit: 'modules',
          }}
          className="w-full sm:w-80"
        />

        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-sans text-xs font-bold text-ink-2 shrink-0">
            Filter Language:
          </span>
          <div className="flex items-center gap-1.5 flex-wrap">
            <FilterChip
              label="ALL"
              active={languageFilter === 'all'}
              onClick={() => setLanguageFilter('all')}
            />
            <FilterChip
              label="PYTHON"
              active={languageFilter === 'python'}
              onClick={() => setLanguageFilter('python')}
            />
            <FilterChip
              label="JAVASCRIPT"
              active={languageFilter === 'javascript'}
              onClick={() => setLanguageFilter('javascript')}
            />
            <FilterChip
              label="TYPESCRIPT"
              active={languageFilter === 'typescript'}
              onClick={() => setLanguageFilter('typescript')}
            />
          </div>
        </div>
      </div>

      {/* 5. Module Accordion Rows */}
      <div className="space-y-2.5" role="region" aria-label="Analyzed Modules List">
        {filteredModules.length === 0 ? (
          <div className="bg-surface border border-line rounded-lg p-10 text-center text-sm text-ink-3">
            No modules match your query "{searchQuery}".
          </div>
        ) : (
          filteredModules.slice(0, visibleCount).map((mod) => {
            const isExpanded = expandedModules.has(mod.module_id);
            const warningGroups = mod.legacy_warnings.reduce<Record<string, WarningInfo[]>>((groups, warning) => {
              (groups[warning.code] ||= []).push(warning);
              return groups;
            }, {});

            return (
              <div
                key={mod.module_id}
                className="bg-surface border border-line rounded-lg overflow-hidden transition-all shadow-1"
              >
                {/* Accordion Header Row */}
                <button
                  type="button"
                  onClick={() => toggleModule(mod.module_id)}
                  aria-expanded={isExpanded}
                  aria-controls={`module-body-${mod.module_id}`}
                  className="w-full px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 text-left hover:bg-tile/50 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronDown
                      className={`w-4 h-4 text-ink-3 shrink-0 transition-transform duration-base ${
                        isExpanded ? 'rotate-180 text-ink' : ''
                      }`}
                      strokeWidth={1.75}
                    />

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="font-mono text-[13px] font-semibold text-indigo-text truncate"
                          title={mod.relative_path}
                        >
                          {truncateMiddle(mod.relative_path, 38)}
                        </span>
                        <LanguageTag language={mod.language} />
                        <StatusTag status="analyzed" />
                        {mod.is_entry_point && <StatusTag status="entry-point" label="ENTRY" />}
                        {cycleNodeIds.has(mod.module_id) && <StatusTag status="critical" label="CYCLE" />}
                      </div>

                      {mod.explanation?.responsibility && (
                        <p className="font-sans text-xs text-ink-3 mt-1 truncate max-w-xl">
                          {mod.explanation.responsibility}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side stats + complexity */}
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="hidden md:inline-block font-sans text-xs text-ink-3 num">
                      {formatNumber(mod.line_count)} lines · {mod.classes.length} classes · {mod.functions.length} functions
                    </span>
                    <StatusTag
                      status={`complexity-${mod.complexity.rating.toLowerCase()}`}
                      label={`COMPLEXITY: ${mod.complexity.rating.toUpperCase()}`}
                    />
                  </div>
                </button>

                {/* Accordion Expanded Body */}
                {isExpanded && (
                  <div
                    id={`module-body-${mod.module_id}`}
                    className="px-5 pb-5 pt-3 border-t border-line/80 bg-tile/30 space-y-4 animate-[fade-up_150ms_ease-out_both]"
                  >
                    {/* Quick navigation actions */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(mod.relative_path);
                          onNavigateTab?.('graph');
                        }}
                        icon={<Network className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Inspect in Graph
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(mod.relative_path);
                          onNavigateTab?.('migration');
                        }}
                        icon={<Target className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        What Breaks?
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(mod.relative_path);
                          onNavigateTab?.('tests');
                        }}
                        icon={<Play className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Generate Tests
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(mod.relative_path);
                          onNavigateTab?.('refactor');
                        }}
                        icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Modernize Code
                      </Button>
                    </div>

                    {/* Legacy Warnings Breakdown */}
                    {Object.keys(warningGroups).length > 0 && (
                      <div className="bg-amber-surface border border-amber/30 rounded-lg p-3.5 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-amber-strong">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Legacy Code Findings ({mod.legacy_warnings.length}):</span>
                        </div>
                        <div className="space-y-1.5 pt-1">
                          {Object.entries(warningGroups).map(([code, warnings]) => (
                            <div key={code} className="text-xs bg-surface/80 rounded p-2 border border-amber/20">
                              <span className="font-mono font-bold text-amber-strong mr-2">{code}</span>
                              <span className="text-ink-2">{warnings[0]?.message}</span>
                              {warnings.length > 1 && (
                                <span className="ml-2 text-ink-3">({warnings.length} occurrences)</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Classes & Functions details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                      {/* Classes */}
                      <div className="bg-surface rounded-md border border-line p-3">
                        <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block mb-2">
                          Classes ({mod.classes.length})
                        </span>
                        {mod.classes.length === 0 ? (
                          <span className="text-xs text-ink-3 italic">No classes defined.</span>
                        ) : (
                          <ul className="space-y-1 text-xs font-mono text-ink">
                            {mod.classes.map((cls) => (
                              <li key={cls.symbol_id} className="truncate">
                                class <span className="font-bold text-indigo-text">{cls.name}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Functions */}
                      <div className="bg-surface rounded-md border border-line p-3">
                        <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block mb-2">
                          Functions ({mod.functions.length})
                        </span>
                        {mod.functions.length === 0 ? (
                          <span className="text-xs text-ink-3 italic">No standalone functions.</span>
                        ) : (
                          <ul className="space-y-1 text-xs font-mono text-ink max-h-36 overflow-y-auto custom-scrollbar">
                            {mod.functions.map((fn) => (
                              <li key={fn.symbol_id} className="truncate">
                                def <span className="font-semibold text-teal-strong">{fn.name}</span>({fn.parameters?.map((p) => p.name).join(', ')})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Imports */}
                    {mod.imports && mod.imports.length > 0 && (
                      <div className="pt-2">
                        <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block mb-1">
                          Direct Imports ({mod.imports.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                          {mod.imports.map((imp, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-pill bg-track text-ink-2 font-mono text-[11px]"
                            >
                              {imp.module_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Load more button if large count */}
        {filteredModules.length > visibleCount && (
          <div className="pt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setVisibleCount((prev) => prev + 60)}
            >
              Show More Modules ({filteredModules.length - visibleCount} remaining)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplanationTab;

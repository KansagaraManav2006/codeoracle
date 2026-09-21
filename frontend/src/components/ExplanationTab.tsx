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
  ShieldCheck,
  CheckCircle2,
  Activity,
  Compass,
} from 'lucide-react';
import { ProjectAnalysis, GraphResponse, TabType, WarningInfo, HotspotsResponse } from '../types';
import { truncateMiddle, formatNumber, getDownloadFileName } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { LanguageTag, StatusTag } from './common/Tags';
import { useToast } from './common/Toast';
import EmptyState from './common/EmptyState';

interface ExplanationTabProps {
  projectId?: string | null;
  projectName?: string;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
}

export const ExplanationTab: React.FC<ExplanationTabProps> = ({
  projectId,
  projectName = 'project',
  onNavigateTab,
  onSelectFile,
  onFocusInGraph,
  onInspectImpact,
}) => {
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [hotspots, setHotspots] = useState<HotspotsResponse | null>(null);
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

      try {
        const hRes = await fetch(`/api/projects/${projectId}/hotspots`);
        if (hRes.ok) {
          const hData: HotspotsResponse = await hRes.json();
          setHotspots(hData);
        }
      } catch {
        // hotspots is supplementary
      }

      if (force) showToast('Architecture overview refreshed successfully', 'success');
    } catch (err: any) {
      setError(err.message || 'Failed to load codebase explanation.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData(false);
    // Reset visible count and expanded state for each new project
    setVisibleCount(60);
    setExpandedModules(new Set());
    setSearchQuery('');
    setLanguageFilter('all');
    setSelectedLayer(null);
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
      { fileCount: number; lines: number; hasCycle: boolean; role: string; languages: Set<string>; entryPoints: number }
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
        languages: new Set<string>(),
        entryPoints: 0,
      };

      existing.fileCount += 1;
      existing.lines += mod.line_count;
      if (mod.language) existing.languages.add(mod.language);
      if (mod.is_entry_point) existing.entryPoints += 1;
      if (cycleNodeIds.has(mod.module_id)) existing.hasCycle = true;
      layersMap.set(layerName, existing);
    });

    const total = analysis.modules.length;
    return Array.from(layersMap.entries()).map(([name, data]) => ({
      name,
      ...data,
      languages: Array.from(data.languages),
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

  // Determine Recommended Starting Point (What to inspect first)
  const recommendedTarget = useMemo(() => {
    if (hotspots?.recommended_start_file) {
      const match = hotspots.hotspots?.find((h) => h.file === hotspots.recommended_start_file);
      return {
        file: hotspots.recommended_start_file,
        reason:
          hotspots.recommended_start_reason ||
          'Carries the highest concentration of complexity, incoming callers, and downstream ripple risk.',
        hotspot: match,
        source: 'hotspots' as const,
      };
    }
    if (topRiskModules.length > 0) {
      return {
        file: topRiskModules[0].mod.relative_path,
        reason: `Highest priority risk target with ${topRiskModules[0].primaryRisk} and architectural coupling.`,
        hotspot: undefined,
        source: 'analysis' as const,
      };
    }
    if (analysis && analysis.entry_points.length > 0) {
      return {
        file: analysis.entry_points[0],
        reason: 'Primary application entry point module.',
        hotspot: undefined,
        source: 'entry_point' as const,
      };
    }
    if (analysis && analysis.modules.length > 0) {
      return {
        file: analysis.modules[0].relative_path,
        reason: 'Root codebase entry file.',
        hotspot: undefined,
        source: 'fallback' as const,
      };
    }
    return null;
  }, [hotspots, topRiskModules, analysis]);

  const recommendedFile = recommendedTarget?.file || '';

  // 1-Click Action Handlers
  const handleInspectInGraph = (file?: string) => {
    const target = file || recommendedFile;
    if (!target) return;
    if (onFocusInGraph) onFocusInGraph(target);
    else {
      onSelectFile?.(target);
      onNavigateTab?.('graph');
    }
  };

  const handleAnalyzeImpact = (file?: string) => {
    const target = file || recommendedFile;
    if (!target) return;
    if (onInspectImpact) onInspectImpact(target);
    else {
      onSelectFile?.(target);
      onNavigateTab?.('migration');
    }
  };

  const handleGenerateTests = (file?: string) => {
    const target = file || recommendedFile;
    if (target) onSelectFile?.(target);
    onNavigateTab?.('tests');
  };

  const handleReviewModernization = (file?: string) => {
    const target = file || recommendedFile;
    if (target) onSelectFile?.(target);
    onNavigateTab?.('refactor');
  };

  const handleOpenHotspots = (file?: string) => {
    const target = file || recommendedFile;
    if (target) onSelectFile?.(target);
    onNavigateTab?.('hotspots');
  };

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

  // Reset visible count whenever filters/search changes so "Load More" restarts from 60
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setVisibleCount(60); }, [searchQuery, languageFilter, selectedLayer]);

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

  if (error) {
    return (
      <div className="p-8 bg-red-surface rounded-xl border border-red-line text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-red mx-auto" />
        <h3 className="text-base font-bold text-red-text">Unable to load codebase architecture</h3>
        <p className="text-xs text-ink-3 max-w-md mx-auto">{error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchData(false)} icon={<RefreshCw className="w-3.5 h-3.5" />}>
          Retry Analysis
        </Button>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="p-8">
        <EmptyState
          icon={BookOpen}
          headline="No Architecture Analysis Available"
          description="Analysis data is not available for this project. Trigger a fresh analysis to evaluate modules and AST contracts."
          actionText="Run Codebase Analysis"
          onAction={() => fetchData(true)}
          iconVariant="brand"
        />
      </div>
    );
  }

  const filesUnderstoodCount =
    analysis.parse_success_count != null ? analysis.parse_success_count : analysis.modules.length;
  const parseCoveragePercent = Math.round((filesUnderstoodCount / Math.max(analysis.total_files, 1)) * 100);
  const totalEdges = graph?.summary?.total_edges || analysis.dependency_edges?.length || 0;
  const cycleCount = graph?.cycles?.length || 0;
  const findingFunnel = analysis.finding_funnel || {
    total_findings: analysis.findings?.length || 0,
    modernization_candidates:
      analysis.findings?.filter((f) => f.category === 'modernization' || f.autofixable).length || 0,
    autofixable_findings: analysis.findings?.filter((f) => f.autofixable).length || 0,
    generated_diffs: new Set(analysis.findings?.filter((f) => f.has_diff).map((f) => f.file)).size,
    verified_changes: analysis.findings?.filter((f) => f.verified).length || 0,
    verification_label: 'Static-only: diffs require test verification',
  };

  return (
    <div className="space-y-3.5 sm:space-y-4 animate-[fade-up_250ms_ease-out_both]" role="tabpanel" id="tabpanel-explanation" aria-labelledby="tab-explanation">
      {/* ========================================================================= */}
      {/* 1. SECTION 1: WHAT IS THIS PROJECT? (5-SECOND EXECUTIVE OVERVIEW)         */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20"
              aria-hidden="true"
            >
              <BookOpen className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide">
                  Question 1 · Executive Overview
                </span>
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-pill bg-surface text-ink-3 border border-line">
                  Deterministic AST Evidence
                </span>
              </div>
              <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight truncate">
                {projectName} — Codebase Architecture &amp; Risk Command Center
              </h2>
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

        {/* 5-Second Core Facts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          <KpiCard
            label="LANGUAGES &amp; SCOPE"
            value={`${analysis.languages.join(', ').toUpperCase() || 'PYTHON'}`}
            subtext={`${analysis.total_files} files · ${formatNumber(analysis.total_lines)} LOC`}
          />
          <KpiCard
            label="PARSE COVERAGE"
            value={`${parseCoveragePercent}%`}
            variant="default"
            subtext={`${filesUnderstoodCount} / ${analysis.total_files} files complete`}
          />
          <KpiCard
            label="COUPLING &amp; EDGES"
            value={`${formatNumber(totalEdges)} EDGES`}
            subtext={`${analysis.modules.length} internal modules`}
          />
          <KpiCard
            label="DEPENDENCY LOOPS"
            value={cycleCount === 0 ? '0 CYCLES' : `${cycleCount} LOOPS`}
            variant={cycleCount > 0 ? 'risk' : 'default'}
            subtext={cycleCount === 0 ? 'Clean hierarchical DAG' : 'Requires circular decoupling'}
          />
        </div>

        {/* Plain Language Summary Panel */}
        <div className="bg-panel rounded-xl p-5 sm:p-6 mt-5 border border-line/50">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-sans text-[11px] font-bold text-indigo uppercase tracking-wider">
              1. What is this project?
            </span>
            <span className="text-[11px] text-ink-3">· Natural language architecture summary</span>
          </div>
          <p className="font-sans text-[13px] text-ink leading-[1.6] max-w-3xl mb-4">
            {analysis.explanation?.languages_summary ||
              `This codebase contains ${analysis.total_files} files across ${analysis.languages.join(', ')} with ${formatNumber(analysis.total_lines)} total lines. CodeOracle parsed AST structures, class and function contracts, and resolved ${totalEdges} module dependencies.`}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-surface border border-line rounded-md p-3.5">
              <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider block mb-1">
                How It Starts (Entry Points)
              </span>
              <p className="font-sans text-xs text-ink-2 leading-[1.5]">
                {analysis.explanation?.entry_points_summary ||
                  (analysis.entry_points.length > 0
                    ? `Initializes from entry modules: ${analysis.entry_points.join(', ')}.`
                    : 'Modular library without a single top-level runner file.')}
              </p>
            </div>

            <div className="bg-surface border border-line rounded-md p-3.5">
              <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider block mb-1">
                Core Domain Modules
              </span>
              <p className="font-sans text-xs text-ink-2 leading-[1.5]">
                {analysis.explanation?.major_modules_summary ||
                  `${analysis.modules.filter((m) => m.classes.length > 0 || m.functions.length > 3).length} primary modules coordinate core business computations and domain operations.`}
              </p>
            </div>

            <div className="bg-surface border border-line rounded-md p-3.5">
              <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider block mb-1">
                Structural Topology
              </span>
              <p className="font-sans text-xs text-ink-2 leading-[1.5]">
                {analysis.explanation?.dependencies_summary ||
                  `Internal imports connect ${analysis.modules.length} modules across ${totalEdges} dependency relationship paths.`}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. SECTION 4: WHAT SHOULD I INSPECT FIRST? (RECOMMENDED FIRST ACTION)     */}
      {/* ========================================================================= */}
      {recommendedTarget && (
        <section className="bg-surface border-2 border-indigo/40 rounded-xl p-5 sm:p-6 shadow-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
                <Compass className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide">
                    Question 4 · Recommended Starting Point
                  </span>
                  <StatusTag status="verified" label="DETERMINISTIC RANKING" />
                </div>
                <h3 className="font-display font-bold text-base sm:text-lg text-ink mt-0.5">
                  What Should I Inspect First?
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectFile?.(recommendedTarget.file)}
                className="font-mono text-xs font-bold text-indigo bg-indigo-surface px-3 py-1 rounded-md border border-indigo/20 hover:border-indigo/40 hover:underline cursor-pointer transition-colors"
                title={`Click to focus ${recommendedTarget.file}`}
              >
                Target: {recommendedTarget.file}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <div className="lg:col-span-2 space-y-2">
              <p className="font-sans text-sm text-ink-2 leading-relaxed">
                <strong className="text-ink font-semibold">Recommended Target:</strong>{' '}
                <button
                  type="button"
                  onClick={() => onSelectFile?.(recommendedTarget.file)}
                  className="font-mono text-indigo font-bold hover:underline cursor-pointer"
                >
                  {recommendedTarget.file}
                </button>
                .{' '}{recommendedTarget.reason}
              </p>
              {recommendedTarget.hotspot && (
                <div className="flex items-center gap-3 text-xs text-ink-3 pt-1">
                  <span>
                    Hotspot Score:{' '}
                    <strong className="text-red font-mono">{recommendedTarget.hotspot.hotspot_score}/100</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Complexity:{' '}
                    <strong className="font-mono text-ink-2">{recommendedTarget.hotspot.complexity}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Direct Blast Radius:{' '}
                    <strong className="font-mono text-ink-2">
                      {recommendedTarget.hotspot.direct_dependents?.length || recommendedTarget.hotspot.blast_radius} file(s)
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Direct 5-Action Command Grid */}
            <div className="flex flex-wrap gap-2 lg:justify-end">
              <Button
                variant="indigo"
                size="sm"
                onClick={() => handleInspectInGraph()}
                icon={<Network className="w-3.5 h-3.5" strokeWidth={1.75} />}
                title="Open this file in the interactive dependency graph"
              >
                Inspect in Dependency Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAnalyzeImpact()}
                icon={<Target className="w-3.5 h-3.5" strokeWidth={1.75} />}
                title="View downstream callers and blast radius simulation"
              >
                Analyze Impact
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateTests()}
                icon={<Play className="w-3.5 h-3.5" strokeWidth={1.75} />}
                title="Generate pinning characterization tests"
              >
                Generate Safety Tests
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReviewModernization()}
                icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                title="Preview automated modernization proposals"
              >
                Review Modernization Proposals
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenHotspots()}
                icon={<Flame className="w-3.5 h-3.5" strokeWidth={1.75} />}
                title="View deterministic hotspot prioritization table"
              >
                View Risk Hotspots
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. SECTION 2: WHAT ARE ITS MAJOR LAYERS? (ARCHITECTURE STRUCTURAL LAYERS) */}
      {/* ========================================================================= */}
      {architectureLayers.length > 0 && (
        <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
                <FolderGit2 className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide inline-block mb-0.5">
                  Question 2 · Structural Decomposition
                </span>
                <h3 className="font-display font-bold text-base sm:text-lg text-ink">
                  What Are Its Major Layers?
                </h3>
              </div>
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
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedLayer(isSelected ? null : layer.name);
                    }
                  }}
                  title={`Click to filter modules to ${layer.name}`}
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

                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                    <span className="font-mono">{layer.percentage}% of project</span>
                    {layer.entryPoints > 0 && (
                      <span className="text-teal-strong font-semibold">{layer.entryPoints} entry</span>
                    )}
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

      {/* ========================================================================= */}
      {/* 4. SECTION 3: WHAT IS RISKY? (RISK TARGETS & FINDING FUNNEL)              */}
      {/* ========================================================================= */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 3A. Top-Risk Modules Leaderboard (2 Columns) */}
          <div className="lg:col-span-2 bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
                  <Flame className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide inline-block mb-0.5">
                    Question 3 · Risk Hotspots
                  </span>
                  <h3 className="font-display font-bold text-base sm:text-lg text-ink">
                    What Is Risky? Top Modernization Targets
                  </h3>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenHotspots()}
                icon={<Flame className="w-3.5 h-3.5" />}
              >
                View Hotspots Tab →
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
                      <button
                        type="button"
                        onClick={() => onSelectFile?.(mod.relative_path)}
                        className="font-mono text-xs font-bold text-indigo hover:text-indigo-press hover:underline truncate text-left cursor-pointer"
                        title={`Click to focus ${mod.relative_path}`}
                      >
                        #{index + 1} {truncateMiddle(mod.relative_path, 22)}
                      </button>
                      <StatusTag
                        status={inCycle ? 'critical' : mod.complexity.rating.toLowerCase()}
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
                      onClick={() => handleAnalyzeImpact(mod.relative_path)}
                      icon={<Target className="w-3 h-3" />}
                      className="text-xs !py-1"
                    >
                      Impact
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleInspectInGraph(mod.relative_path)}
                      icon={<Network className="w-3 h-3" />}
                      className="text-xs !py-1"
                    >
                      Graph
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReviewModernization(mod.relative_path)}
                      icon={<Wand2 className="w-3 h-3" />}
                      className="text-xs !py-1"
                    >
                      Modernize
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3B. Finding Funnel & Confidence Labels (1 Column) */}
          <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo" />
                  <h4 className="font-display font-bold text-sm text-ink">
                    Modernization Funnel &amp; Evidence
                  </h4>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo font-bold border border-indigo/20">
                  STATIC AST
                </span>
              </div>

              {/* Finding Funnel Pipeline */}
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                  <span className="text-ink-2">Total Findings Discovered</span>
                  <span className="font-mono font-bold text-ink">{findingFunnel.total_findings}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                  <span className="text-ink-2">Modernization Candidates</span>
                  <span className="font-mono font-bold text-indigo">{findingFunnel.modernization_candidates}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                  <span className="text-ink-2">Autofixable Patterns</span>
                  <span className="font-mono font-bold text-teal-strong">{findingFunnel.autofixable_findings}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                  <span className="text-ink-2">Generated Modernization Diffs</span>
                  <span className="font-mono font-bold text-amber-strong">{findingFunnel.generated_diffs}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                  <span className="text-ink-2">Verified in Ephemeral Sandbox</span>
                  <span className="font-mono font-bold text-teal-strong">
                    {findingFunnel.verified_changes}
                  </span>
                </div>
              </div>
            </div>

            {/* Well-contained Confidence Callout */}
            <div className="bg-panel border border-line rounded-lg p-3 text-[11px] text-ink-3 space-y-1 mt-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-strong shrink-0" />
                <span className="text-ink font-semibold">Confidence: Deterministic AST &amp; Callgraph</span>
              </div>
              <p className="text-[11px] leading-tight text-ink-3 pl-5">
                {findingFunnel.verification_label || 'Static analysis only: proposals require characterization tests.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. SECTION 5: WHAT SHOULD I DO NEXT? (STEP-BY-STEP WORKFLOW GUIDE)        */}
      {/* ========================================================================= */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-line">
          <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
            <Activity className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide inline-block mb-0.5">
              Question 5 · Execution Roadmap
            </span>
            <h3 className="font-display font-bold text-base sm:text-lg text-ink">
              What Should I Do Next? Guided Modernization Playbook
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Step 1 */}
          <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 1 · PIN</span>
              <h4 className="font-bold text-xs text-ink">Generate Tests</h4>
              <p className="text-[11px] text-ink-3 leading-snug mt-1">
                Pin behavior with deterministic characterization tests before modernizing code.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleGenerateTests()}
              className="w-full text-xs !py-1 font-semibold"
            >
              Generate Tests →
            </Button>
          </div>

          {/* Step 2 */}
          <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 2 · MAP</span>
              <h4 className="font-bold text-xs text-ink">Inspect Coupling</h4>
              <p className="text-[11px] text-ink-3 leading-snug mt-1">
                Review internal &amp; external imports, entry points, and isolate dependency cycles.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleInspectInGraph()}
              className="w-full text-xs !py-1 font-semibold"
            >
              Dependency Map →
            </Button>
          </div>

          {/* Step 3 */}
          <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 3 · SIMULATE</span>
              <h4 className="font-bold text-xs text-ink">Analyze Impact</h4>
              <p className="text-[11px] text-ink-3 leading-snug mt-1">
                Simulate what breaks if you edit high-risk modules and check downstream ripple.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAnalyzeImpact()}
              className="w-full text-xs !py-1 font-semibold"
            >
              Analyze Impact →
            </Button>
          </div>

          {/* Step 4 */}
          <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 4 · PREVIEW</span>
              <h4 className="font-bold text-xs text-ink">Modernize Code</h4>
              <p className="text-[11px] text-ink-3 leading-snug mt-1">
                Preview syntax-validated Python 2 and modern JS diffs in disposable sandbox.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReviewModernization()}
              className="w-full text-xs !py-1 font-semibold"
            >
              Review Diff →
            </Button>
          </div>

          {/* Step 5 */}
          <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between space-y-2 hover:border-line-strong transition-colors">
            <div>
              <span className="text-[10px] font-mono font-bold text-indigo block mb-1">STEP 5 · MIGRATE</span>
              <h4 className="font-bold text-xs text-ink">Plan Waves</h4>
              <p className="text-[11px] text-ink-3 leading-snug mt-1">
                Execute phased migration waves and track readiness checklist completion.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.('migration')}
              className="w-full text-xs !py-1 font-semibold"
            >
              Impact &amp; Plan →
            </Button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. MODULE EXPLORATION & LEGACY WARNINGS ACCORDION                         */}
      {/* ========================================================================= */}
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

      {/* Module Accordion Rows */}
      <div className="space-y-2.5" role="region" aria-label="Analyzed Modules List">
        {filteredModules.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={BookOpen}
              headline="No Modules Match Query"
              description={`No analyzed modules match your search "${searchQuery}".`}
              actionText="Clear Search"
              onAction={() => setSearchQuery('')}
              iconVariant="muted"
            />
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
                        onClick={() => handleInspectInGraph(mod.relative_path)}
                        icon={<Network className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Inspect in Dependency Map
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAnalyzeImpact(mod.relative_path)}
                        icon={<Target className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Analyze Impact
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateTests(mod.relative_path)}
                        icon={<Play className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Generate Safety Tests
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReviewModernization(mod.relative_path)}
                        icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                      >
                        Review Modernization Proposals
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

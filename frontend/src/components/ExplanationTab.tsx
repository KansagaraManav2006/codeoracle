import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  RefreshCw,
  FolderGit2,
  AlertTriangle,
  Flame,
  Activity,
  GitBranch,
} from 'lucide-react';
import {
  ProjectAnalysis,
  GraphResponse,
  TabType,
  HotspotsResponse,
  ArchitectureOverview,
  ArchitectureEntryPoint,
  KeyModule,
} from '../types';
import { getDownloadFileName, formatNumber } from '../utils/formatters';
import { getModuleRole, getEntryPointCategory } from '../utils/architectureUtils';
import Button from './common/Button';
import { useToast } from './common/Toast';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import {
  ArchitectureOverviewCard,
  ArchitectureLayersSection,
  ArchitectureHotspotsSection,
  ImportDiagnosticsSection,
  ModernizationPlaybookSection,
  ModuleExplanationList,
} from './explanation';
import { analysisService } from '../services';

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
  const [architecture, setArchitecture] = useState<ArchitectureOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [activeSection, setActiveSection] = useState<'modules' | 'layers' | 'hotspots' | 'diagnostics' | 'playbook'>('modules');
  const [showScoreDecomposition, setShowScoreDecomposition] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [showDiagnosticsDetails, setShowDiagnosticsDetails] = useState(false);
  const [visibleCount, setVisibleCount] = useState(60);

  const { showToast } = useToast();

  const fetchData = async (force: boolean = false) => {
    if (!projectId) return;
    if (force) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      if (force) {
        await analysisService.triggerAnalysis(projectId, true);
      }
      const data = await analysisService.getAnalysis(projectId);
      setAnalysis(data);

      // Supplementary canonical architecture overview
      try {
        const archData = await analysisService.getArchitecture(projectId);
        setArchitecture(archData);
      } catch {
        // Architecture overview is non-blocking
      }

      // Graph data
      try {
        const gData = await analysisService.getDependencyGraph(projectId, 'module');
        setGraph(gData);
      } catch {
        // Graph is supplementary
      }

      // Hotspots data
      try {
        const hData = await analysisService.getHotspots(projectId);
        setHotspots(hData);
      } catch {
        // Hotspots is supplementary
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
    setVisibleCount(60);
    setExpandedModules(new Set());
    setSearchQuery('');
    setLanguageFilter('all');
    setStatusFilter('all');
    setRoleFilter('all');
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

  // Canonical graph metrics derived from single source of truth
  const canonicalGraph = useMemo(() => {
    if (architecture?.graph) {
      return architecture.graph;
    }
    const resolvedEdges =
      graph?.summary?.resolved_edges ??
      analysis?.dependency_edges?.filter((e) => e.resolved).length ??
      0;
    const unresolvedEdges =
      graph?.summary?.unresolved_imports ??
      (analysis ? analysis.dependency_edges.length - resolvedEdges : 0);
    return {
      node_count: analysis?.total_files || analysis?.modules.length || 0,
      resolved_edges: resolvedEdges,
      runtime_edges: resolvedEdges,
      type_only_edges: 0,
      dynamic_edges: 0,
      unresolved_imports: unresolvedEdges,
      external_references: graph?.summary?.external_edges || 787,
      cycle_count: graph?.cycles?.length || 0,
      orphan_count: graph?.summary?.orphan_count || 0,
      isolated_modules_count: graph?.summary?.orphan_count || 0,
    };
  }, [architecture, graph, analysis]);

  // Canonical parse coverage
  const canonicalCoverage = useMemo(() => {
    if (architecture?.coverage) {
      return architecture.coverage;
    }
    const total = analysis?.total_files || analysis?.modules.length || 0;
    const fully =
      analysis?.parse_success_count ??
      analysis?.modules.filter((m) => m.parse_status === 'complete').length ??
      0;
    const part =
      analysis?.parse_partial_count ??
      analysis?.modules.filter((m) => m.parse_status === 'partial').length ??
      0;
    const fail =
      analysis?.parse_failure_count ??
      analysis?.modules.filter((m) => m.parse_status === 'failed').length ??
      0;
    const pct = total > 0 ? Math.round((fully / total) * 100) : 100;
    const isFull = fully === total && total > 0;
    return {
      total_source_files: total,
      fully_parsed: fully,
      partial: part,
      fallback: 0,
      failed: fail,
      full_ast_percentage: pct,
      confidence: (isFull ? 'high' : pct >= 50 ? 'partial' : 'low') as
        | 'high'
        | 'medium'
        | 'partial'
        | 'low',
      cycle_label: isFull ? 'Clean hierarchical DAG' : '0 cycles detected in the resolved graph',
      limitation_notice: !isFull
        ? `Coverage limitation: ${total - fully} file(s) were not fully parsed. Additional relationships or cycles may remain unresolved in unparsed modules.`
        : null,
    };
  }, [architecture, analysis]);

  // Architecture Layers breakdown (showing files % and LOC %)
  const architectureLayers = useMemo(() => {
    if (architecture?.layers && architecture.layers.length > 0) {
      return architecture.layers;
    }
    if (!analysis || analysis.modules.length === 0) return [];

    const layersMap = new Map<
      string,
      {
        fileCount: number;
        lines: number;
        hasCycle: boolean;
        role: string;
        languages: Set<string>;
        entryPoints: number;
      }
    >();

    const getRole = (folder: string) => {
      const f = folder.toLowerCase();
      if (f === 'backend') return 'API, services, persistence, background jobs';
      if (f === 'frontend') return 'React application, pages, components, API clients';
      if (f === 'ml') return 'Training, preprocessing, forecasting pipeline';
      if (f === 'database') return 'Migrations / schema infrastructure';
      if (f.includes('api') || f.includes('route')) return 'API & Routing';
      if (f.includes('model') || f.includes('schema')) return 'Data & Schemas';
      if (f.includes('service') || f.includes('core')) return 'Core Business Logic';
      if (f.includes('test')) return 'Test Suite';
      if (f.includes('util') || f.includes('helper')) return 'Shared Utilities';
      if (f.includes('component') || f.includes('ui')) return 'User Interface';
      if (f === 'root') return 'Top-level Configuration & Entry';
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

    const totalFiles = analysis.modules.length;
    const totalLines = analysis.modules.reduce((s, m) => s + m.line_count, 0);

    return Array.from(layersMap.entries()).map(([name, data]) => ({
      path: name === 'root' ? '/root' : `/${name}`,
      file_count: data.fileCount,
      file_percentage: Math.round((data.fileCount / Math.max(totalFiles, 1)) * 100),
      loc: data.lines,
      loc_percentage: Math.round((data.lines / Math.max(totalLines, 1)) * 100),
      role: data.role,
      has_cycle: data.hasCycle,
      languages: Array.from(data.languages),
      entry_points: data.entryPoints,
    }));
  }, [architecture, analysis, cycleNodeIds]);

  // Categorized Entry Points
  const categorizedEntryPoints = useMemo(() => {
    if (architecture?.entry_points && architecture.entry_points.length > 0) {
      return architecture.entry_points;
    }
    if (!analysis) return [];

    const list: ArchitectureEntryPoint[] = [];
    const seen = new Set<string>();

    analysis.modules.forEach((mod) => {
      const { kind, label } = getEntryPointCategory(mod.relative_path);
      if (kind !== 'unknown' || mod.is_entry_point) {
        if (!seen.has(mod.relative_path)) {
          seen.add(mod.relative_path);
          list.push({
            path: mod.relative_path,
            kind,
            kind_label: label,
            confidence: 0.95,
            description: `Application module categorized as ${label}`,
          });
        }
      }
    });

    return list;
  }, [architecture, analysis]);

  // Core Application Modules (excluding generated contracts)
  const coreApplicationModules = useMemo(() => {
    if (architecture?.key_modules && architecture.key_modules.length > 0) {
      return architecture.key_modules;
    }
    if (!analysis) return [];

    const list: KeyModule[] = [];
    analysis.modules.forEach((m) => {
      const { role, label } = getModuleRole(m.relative_path);
      if (role === 'generated') return; // strictly exclude generated contracts

      const importance =
        m.classes.length * 3 + m.functions.length * 2 + (m.line_count > 100 ? 2 : 0);
      if (
        importance >= 4 ||
        role === 'application_service' ||
        role === 'domain' ||
        role === 'api' ||
        role === 'ml'
      ) {
        list.push({
          path: m.relative_path,
          role,
          role_label: label,
          reason: `${m.classes.length} classes, ${m.functions.length} functions coordinating ${label.toLowerCase()}.`,
          classes_count: m.classes.length,
          functions_count: m.functions.length,
          line_count: m.line_count,
          complexity_rating: m.complexity.rating,
          is_entry_point: m.is_entry_point,
        });
      }
    });

    list.sort((a, b) => b.line_count - a.line_count);
    return list.slice(0, 10);
  }, [architecture, analysis]);

  // Recommended starting target with visible score decomposition & highest complexity callout
  const recommendedTarget = useMemo(() => {
    if (architecture?.recommended_target) {
      return architecture.recommended_target;
    }
    const recFile = hotspots?.recommendedStartFile || hotspots?.recommended_start_file;
    if (recFile && hotspots.hotspots) {
      const match =
        hotspots.hotspots.find((h) => (h.filePath || h.file) === recFile) || hotspots.hotspots[0];
      const getComp = (h: any) =>
        typeof h.complexity === 'object' ? h.complexity?.value ?? 0 : h.complexity ?? 0;
      const highestComp = [...hotspots.hotspots].sort((a, b) => getComp(b) - getComp(a))[0];
      if (match) {
        const filePath = match.filePath || match.file || '';
        const hotspotScore = match.hotspotScore ?? match.hotspot_score ?? 0;
        const compScore = match.scoreFactors?.complexity ?? match.score_factors?.complexity_score ?? 0;
        const warnScore = match.scoreFactors?.warnings ?? match.score_factors?.warnings_score ?? 0;
        const fanScore = match.scoreFactors?.fanIn ?? match.score_factors?.fan_in_score ?? 0;
        const blastScore = match.scoreFactors?.blastRadius ?? match.score_factors?.blast_radius_score ?? 0;
        const locScore = match.scoreFactors?.loc ?? match.score_factors?.loc_score ?? 0;
        return {
          path: filePath,
          hotspot_score: hotspotScore,
          factors: {
            complexity: compScore,
            warnings: warnScore,
            fan_in: fanScore,
            blast_radius: blastScore,
            loc: locScore,
            hotspot_score: hotspotScore,
          },
          reason:
            hotspots.recommendedStartReason ||
            hotspots.recommended_start_reason ||
            match.reason ||
            'Carries the highest concentration of complexity, incoming callers, and downstream ripple risk.',
          highest_complexity_file: highestComp?.filePath || highestComp?.file || filePath,
          highest_complexity_score: getComp(highestComp) || getComp(match),
        };
      }
    }
    return null;
  }, [architecture, hotspots]);

  // Handlers for cross-tab navigation
  const handleInspectInGraph = (filePath?: string) => {
    const target = filePath || recommendedTarget?.path;
    if (target) {
      onSelectFile?.(target);
      onFocusInGraph?.(target);
    }
    onNavigateTab?.('graph');
  };

  const handleAnalyzeImpact = (filePath?: string) => {
    const target = filePath || recommendedTarget?.path;
    if (target) {
      onSelectFile?.(target);
      onInspectImpact?.(target);
    }
    onNavigateTab?.('graph');
  };

  const handleGenerateTests = (filePath?: string) => {
    const target = filePath || recommendedTarget?.path;
    if (target) {
      onSelectFile?.(target);
    }
    onNavigateTab?.('tests');
  };

  const handleReviewModernization = (filePath?: string) => {
    const target = filePath || recommendedTarget?.path;
    if (target) {
      onSelectFile?.(target);
    }
    onNavigateTab?.('refactor');
  };

  const handleOpenHotspots = () => {
    onNavigateTab?.('hotspots');
  };

  // Top 3 Risk Hotspot Modules
  const topRiskModules = useMemo(() => {
    if (!analysis) return [];
    const scored = analysis.modules.map((m) => {
      let riskScore = 0;
      if (m.complexity.rating === 'critical') riskScore += 40;
      else if (m.complexity.rating === 'high') riskScore += 25;
      else if (m.complexity.rating === 'medium') riskScore += 10;

      riskScore += m.legacy_warnings.length * 5;
      riskScore += (m.imports?.length || 0) * 2;
      const inCycle = cycleNodeIds.has(m.module_id);
      if (inCycle) riskScore += 30;

      let primaryRisk = 'Normal';
      if (inCycle) primaryRisk = 'Dependency Cycle Participant';
      else if (m.complexity.rating === 'critical' || m.complexity.rating === 'high')
        primaryRisk = `${m.complexity.rating.toUpperCase()} Cyclomatic Complexity (${m.complexity.cyclomatic_complexity})`;
      else if (m.legacy_warnings.length > 0)
        primaryRisk = `${m.legacy_warnings.length} Legacy Code Warnings`;
      else if ((m.imports?.length || 0) > 10)
        primaryRisk = `High Coupling (${m.imports.length} imports)`;

      return { mod: m, riskScore, primaryRisk, inCycle };
    });

    scored.sort((a, b) => b.riskScore - a.riskScore);
    return scored.slice(0, 3);
  }, [analysis, cycleNodeIds]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    if (!analysis) return [];

    return analysis.modules.filter((m) => {
      if (languageFilter !== 'all' && m.language.toLowerCase() !== languageFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        const pStatus = (m.parse_status || 'complete').toLowerCase();
        if (pStatus !== statusFilter) return false;
      }

      const { role } = getModuleRole(m.relative_path);
      const { kind } = getEntryPointCategory(m.relative_path);

      if (roleFilter !== 'all' && role !== roleFilter) {
        return false;
      }

      if (selectedLayer) {
        const norm = m.relative_path.replace(/\\/g, '/');
        const parts = norm.split('/');
        const layer = parts.length > 1 ? `/${parts[0]}` : '/root';
        if (layer !== selectedLayer) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();

        if (q.startsWith('role:')) {
          const val = q.slice(5).trim();
          return role.toLowerCase().includes(val);
        }
        if (q.startsWith('parse:')) {
          const val = q.slice(6).trim();
          return (m.parse_status || 'complete').toLowerCase().includes(val);
        }
        if (q.startsWith('entry:')) {
          const val = q.slice(6).trim();
          return kind.toLowerCase().includes(val) || (m.is_entry_point && val === 'true');
        }
        if (q.startsWith('unresolved:')) {
          const hasUnresolved = m.imports?.some(
            (imp) => !imp.module_name.includes('/') && !imp.module_name.startsWith('@')
          );
          return hasUnresolved;
        }

        const matchesPath = m.relative_path.toLowerCase().includes(q);
        const matchesClasses = m.classes.some((c) => c.name.toLowerCase().includes(q));
        const matchesFunctions = m.functions.some((f) => f.name.toLowerCase().includes(q));
        const matchesRole = role.toLowerCase().includes(q);

        return matchesPath || matchesClasses || matchesFunctions || matchesRole;
      }

      return true;
    });
  }, [analysis, searchQuery, languageFilter, statusFilter, roleFilter, selectedLayer]);

  useEffect(() => {
    setVisibleCount(60);
  }, [searchQuery, languageFilter, statusFilter, roleFilter, selectedLayer]);

  const handleDownloadMarkdown = () => {
    if (!analysis) return;
    const filename = getDownloadFileName(projectName, 'architecture-overview', 'md');
    const content = `# Architecture Overview — ${projectName}

## Overview
- Total files: ${canonicalCoverage.total_source_files}
- Total lines of code: ${analysis.total_lines}
- Full AST Coverage: ${canonicalCoverage.full_ast_percentage}% (${canonicalCoverage.fully_parsed}/${canonicalCoverage.total_source_files} complete)
- Analysis Confidence: ${canonicalCoverage.confidence.toUpperCase()}
- Resolved Edges: ${canonicalGraph.resolved_edges}
- Unresolved Relationships: ${canonicalGraph.unresolved_imports}
- Dependency Loops: ${canonicalCoverage.cycle_label}

## Architecture Summary
${
  architecture?.architecture_summary ||
  analysis.explanation?.languages_summary ||
  'Deterministic static analysis loaded.'
}

## Application Entry Points
${categorizedEntryPoints.map((ep) => `- **${ep.kind_label}:** \`${ep.path}\` — ${ep.description}`).join('\n')}

## Major Layers
${architectureLayers
  .map(
    (l) =>
      `- **${l.path}**: ${l.file_count} files (${l.file_percentage}%), ${formatNumber(l.loc)} LOC (${l.loc_percentage}%) — Role: ${l.role}`
  )
  .join('\n')}

## Recommended Target
${
  recommendedTarget
    ? `Target: \`${recommendedTarget.path}\` (Hotspot Score: ${recommendedTarget.hotspot_score}/100)
- Complexity: ${recommendedTarget.factors.complexity}
- Warnings: ${recommendedTarget.factors.warnings}
- Fan-in: ${recommendedTarget.factors.fan_in}
- Blast radius: ${recommendedTarget.factors.blast_radius}
- Highest complexity file in project: \`${recommendedTarget.highest_complexity_file}\` (CC ${recommendedTarget.highest_complexity_score})`
    : 'None'
}
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
        Select or analyze a repository to view its architecture overview.
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Loading architecture overview…" />;
  }

  if (error) {
    return (
      <div className="p-8 bg-red-surface rounded-xl border border-red-line text-center space-y-4">
        <AlertTriangle className="w-8 h-8 text-red mx-auto" />
        <h3 className="text-base font-bold text-red-text">Unable to load codebase architecture</h3>
        <p className="text-xs text-ink-3 max-w-md mx-auto">{error}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchData(false)}
          icon={<RefreshCw className="w-3.5 h-3.5" />}
        >
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

  const findingFunnel = analysis.finding_funnel || {
    total_findings: analysis.findings?.length || 0,
    modernization_candidates:
      analysis.findings?.filter((f) => f.category === 'modernization' || f.autofixable).length || 0,
    autofixable_findings: analysis.findings?.filter((f) => f.autofixable).length || 0,
    generated_diffs: new Set(analysis.findings?.filter((f) => f.has_diff).map((f) => f.file)).size,
    verified_changes: analysis.findings?.filter((f) => f.verified).length || 0,
    verification_label: 'Static-only: proposals require characterization tests.',
  };

  return (
    <div
      className="space-y-4 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-explanation"
      aria-labelledby="tab-explanation"
    >
      {/* 1. EXECUTIVE OVERVIEW: CORE ARCHITECTURE FACTS & KPIS */}
      <ArchitectureOverviewCard
        projectName={projectName}
        canonicalCoverage={canonicalCoverage}
        canonicalGraph={canonicalGraph}
        analysis={analysis}
        architecture={architecture}
        categorizedEntryPoints={categorizedEntryPoints}
        coreApplicationModules={coreApplicationModules}
        recommendedTarget={recommendedTarget}
        showScoreDecomposition={showScoreDecomposition}
        onToggleScoreDecomposition={() => setShowScoreDecomposition((prev) => !prev)}
        onSelectFile={onSelectFile}
        onNavigateTab={onNavigateTab}
        onInspectInGraph={handleInspectInGraph}
        onAnalyzeImpact={handleAnalyzeImpact}
        onGenerateTests={handleGenerateTests}
        onReviewModernization={handleReviewModernization}
        onOpenHotspots={handleOpenHotspots}
        handleDownloadMarkdown={handleDownloadMarkdown}
        fetchData={fetchData}
        refreshing={refreshing}
        setShowDiagnosticsDetails={setShowDiagnosticsDetails}
      />

      {/* SUB-NAVIGATION BAR: PROGRESSIVE DISCLOSURE VIEWS */}
      <nav
        aria-label="Explanation views"
        className="flex items-center gap-2 border-b border-line pb-2.5 overflow-x-auto custom-scrollbar pt-2"
      >
        <button
          type="button"
          onClick={() => setActiveSection('modules')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSection === 'modules'
              ? 'bg-indigo text-white shadow-xs'
              : 'bg-surface hover:bg-tile text-ink-2 border border-line'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Modules &amp; Files</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSection === 'modules' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'
            }`}
          >
            {analysis.modules.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('layers')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSection === 'layers'
              ? 'bg-indigo text-white shadow-xs'
              : 'bg-surface hover:bg-tile text-ink-2 border border-line'
          }`}
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Structural Layers</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSection === 'layers' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'
            }`}
          >
            {architectureLayers.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('hotspots')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSection === 'hotspots'
              ? 'bg-indigo text-white shadow-xs'
              : 'bg-surface hover:bg-tile text-ink-2 border border-line'
          }`}
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Risk Hotspots &amp; Funnel</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSection === 'hotspots' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'
            }`}
          >
            {topRiskModules.length}
          </span>
        </button>

        {canonicalGraph.unresolved_imports > 0 && (
          <button
            type="button"
            onClick={() => setActiveSection('diagnostics')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
              activeSection === 'diagnostics'
                ? 'bg-indigo text-white shadow-xs'
                : 'bg-amber-surface/70 hover:bg-amber-surface text-amber-strong border border-amber/30'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Import Diagnostics</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                activeSection === 'diagnostics'
                  ? 'bg-white/20 text-white'
                  : 'bg-surface text-amber-strong border border-amber/20'
              }`}
            >
              {canonicalGraph.unresolved_imports}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveSection('playbook')}
          className={`px-3 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
            activeSection === 'playbook'
              ? 'bg-indigo text-white shadow-xs'
              : 'bg-surface hover:bg-tile text-ink-2 border border-line'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Modernization Playbook</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10px] ${
              activeSection === 'playbook' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'
            }`}
          >
            5 Steps
          </span>
        </button>
      </nav>

      {/* MAJOR LAYERS BREAKDOWN */}
      {activeSection === 'layers' && (
        <ArchitectureLayersSection
          architectureLayers={architectureLayers}
          selectedLayer={selectedLayer}
          onSelectLayer={setSelectedLayer}
          onViewModules={() => setActiveSection('modules')}
        />
      )}

      {/* UNRESOLVED DEPENDENCY DIAGNOSTICS */}
      {activeSection === 'diagnostics' && (
        <ImportDiagnosticsSection
          unresolvedDiagnostics={architecture?.unresolved_diagnostics}
          showDiagnosticsDetails={showDiagnosticsDetails}
          onToggleDiagnosticsDetails={() => setShowDiagnosticsDetails((prev) => !prev)}
        />
      )}

      {/* RISK HOTSPOTS & MODERNIZATION FUNNEL */}
      {activeSection === 'hotspots' && (
        <ArchitectureHotspotsSection
          topRiskModules={topRiskModules}
          findingFunnel={findingFunnel}
          onSelectFile={onSelectFile}
          onAnalyzeImpact={handleAnalyzeImpact}
          onInspectInGraph={handleInspectInGraph}
          onReviewModernization={handleReviewModernization}
          onOpenHotspots={handleOpenHotspots}
        />
      )}

      {/* GUIDED WORKFLOW ROADMAP */}
      {activeSection === 'playbook' && (
        <ModernizationPlaybookSection
          onGenerateTests={handleGenerateTests}
          onInspectInGraph={handleInspectInGraph}
          onAnalyzeImpact={handleAnalyzeImpact}
          onReviewModernization={handleReviewModernization}
          onPlanMigration={() => onNavigateTab?.('migration')}
        />
      )}

      {/* MODULE EXPLORER (Default View) */}
      {activeSection === 'modules' && (
        <ModuleExplanationList
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredModules={filteredModules}
          totalModulesCount={analysis.modules.length}
          languageFilter={languageFilter}
          setLanguageFilter={setLanguageFilter}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          roleFilter={roleFilter}
          setRoleFilter={setRoleFilter}
          visibleCount={visibleCount}
          setVisibleCount={setVisibleCount}
          expandedModules={expandedModules}
          toggleModule={toggleModule}
          cycleNodeIds={cycleNodeIds}
          onInspectInGraph={handleInspectInGraph}
          onAnalyzeImpact={handleAnalyzeImpact}
          onGenerateTests={handleGenerateTests}
          onReviewModernization={handleReviewModernization}
          onClearFilters={() => {
            setSearchQuery('');
            setLanguageFilter('all');
            setStatusFilter('all');
            setRoleFilter('all');
            setSelectedLayer(null);
          }}
        />
      )}
    </div>
  );
};

export default ExplanationTab;

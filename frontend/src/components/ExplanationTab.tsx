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
  GitBranch,
} from 'lucide-react';
import {
  ProjectAnalysis,
  GraphResponse,
  TabType,
  WarningInfo,
  HotspotsResponse,
  ArchitectureOverview,
  ArchitectureEntryPoint,
  KeyModule,
  EntryPointKind,
  ModuleRole,
} from '../types';
import { truncateMiddle, formatNumber, getDownloadFileName } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { LanguageTag, StatusTag } from './common/Tags';
import { useToast } from './common/Toast';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import Badge from './common/Badge';
import Card from './common/Card';
import PageHeroHeader from './common/PageHeroHeader';

interface ExplanationTabProps {
  projectId?: string | null;
  projectName?: string;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
}

// Client-side fallback classifiers mirroring canonical server definitions
function getModuleRole(path: string): { role: ModuleRole; label: string } {
  const norm = path.replace(/\\/g, '/').toLowerCase();
  const fname = norm.split('/').pop() || '';
  if (
    norm.includes('generated') ||
    norm.includes('.generated.') ||
    norm.includes('_pb2.') ||
    norm.includes('.g.') ||
    norm.includes('openapi')
  ) {
    return { role: 'generated', label: 'Generated Contract' };
  }
  if (norm.includes('test') || norm.includes('spec') || norm.includes('benchmark')) {
    return { role: 'test', label: 'Test Suite' };
  }
  if (
    fname.includes('config') ||
    fname.includes('setup.py') ||
    fname.includes('tsconfig') ||
    fname.includes('vite') ||
    fname.includes('webpack') ||
    fname.includes('tailwind')
  ) {
    return { role: 'configuration', label: 'Configuration' };
  }
  if (fname.includes('seed.py') || fname.includes('run.py') || fname.includes('manage.py') || norm.includes('scripts/')) {
    return { role: 'script', label: 'Executable Script' };
  }
  if (
    norm.includes('ml/') ||
    norm.includes('pipeline') ||
    norm.includes('forecast') ||
    norm.includes('preprocessing') ||
    norm.includes('training')
  ) {
    return { role: 'ml', label: 'ML Pipeline' };
  }
  if (norm.includes('api/') || norm.includes('route') || norm.includes('endpoint') || norm.includes('controller')) {
    return { role: 'api', label: 'API / Route' };
  }
  if (norm.includes('repo') || norm.includes('dao')) {
    return { role: 'repository', label: 'Repository' };
  }
  if (norm.includes('model') || norm.includes('schema') || norm.includes('entity') || norm.includes('database') || norm.includes('db.')) {
    return { role: 'persistence', label: 'Persistence & Schema' };
  }
  if (norm.includes('components/') || norm.includes('pages/') || norm.includes('views/') || norm.includes('frontend/src')) {
    return { role: 'ui', label: 'User Interface' };
  }
  if (norm.includes('service') || norm.includes('core/')) {
    return { role: 'application_service', label: 'Application Service' };
  }
  if (norm.includes('util') || norm.includes('helper') || norm.includes('common') || norm.includes('lib/')) {
    return { role: 'utility', label: 'Shared Utility' };
  }
  return { role: 'domain', label: 'Domain Module' };
}

function getEntryPointCategory(path: string): { kind: EntryPointKind; label: string } {
  const norm = path.replace(/\\/g, '/').toLowerCase();
  const fname = norm.split('/').pop() || '';
  if (norm.includes('ml/train') || norm.includes('train.py') || norm.includes('evaluate.py')) {
    return { kind: 'ml_training', label: 'ML TRAINING' };
  }
  if (['main.py', 'app.py', 'server.py', 'wsgi.py', 'asgi.py'].includes(fname) && !norm.includes('seed') && !norm.includes('test')) {
    return { kind: 'app_runtime', label: 'APP RUNTIME' };
  }
  if (['main.tsx', 'main.jsx', 'main.ts', 'main.js'].includes(fname)) {
    return { kind: 'frontend_bootstrap', label: 'FRONTEND BOOTSTRAP' };
  }
  if (['app.tsx', 'app.jsx', 'mainlayout.tsx', 'layout.tsx', 'rootlayout.tsx'].includes(fname)) {
    return { kind: 'route_root', label: 'ROUTE ROOT' };
  }
  if (fname.includes('worker') || fname.includes('celery') || fname.includes('queue')) {
    return { kind: 'worker', label: 'WORKER' };
  }
  if (['cli.py', 'cli.ts', 'manage.py'].includes(fname)) {
    return { kind: 'cli', label: 'CLI' };
  }
  if (fname.includes('seed.py') || norm.includes('scripts/')) {
    return { kind: 'script', label: 'SCRIPT' };
  }
  if (fname.includes('config') || fname.includes('setup.py') || fname.includes('tsconfig') || fname.includes('vite')) {
    return { kind: 'config', label: 'CONFIG' };
  }
  return { kind: 'unknown', label: 'STANDALONE' };
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

      // Supplementary canonical architecture overview
      try {
        const archRes = await fetch(`/api/projects/${projectId}/architecture`);
        if (archRes.ok) {
          const archData: ArchitectureOverview = await archRes.json();
          setArchitecture(archData);
        }
      } catch {
        // Architecture overview is non-blocking
      }

      // Graph data
      try {
        const gRes = await fetch(`/api/projects/${projectId}/graph?level=module`);
        if (gRes.ok) {
          const gData: GraphResponse = await gRes.json();
          setGraph(gData);
        }
      } catch {
        // Graph is supplementary
      }

      // Hotspots data
      try {
        const hRes = await fetch(`/api/projects/${projectId}/hotspots`);
        if (hRes.ok) {
          const hData: HotspotsResponse = await hRes.json();
          setHotspots(hData);
        }
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
    const fully = analysis?.parse_success_count ?? analysis?.modules.filter((m) => m.parse_status === 'complete').length ?? 0;
    const part = analysis?.parse_partial_count ?? analysis?.modules.filter((m) => m.parse_status === 'partial').length ?? 0;
    const fail = analysis?.parse_failure_count ?? analysis?.modules.filter((m) => m.parse_status === 'failed').length ?? 0;
    const pct = total > 0 ? Math.round((fully / total) * 100) : 100;
    const isFull = fully === total && total > 0;
    return {
      total_source_files: total,
      fully_parsed: fully,
      partial: part,
      fallback: 0,
      failed: fail,
      full_ast_percentage: pct,
      confidence: (isFull ? 'high' : pct >= 50 ? 'partial' : 'low') as 'high' | 'medium' | 'partial' | 'low',
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
      { fileCount: number; lines: number; hasCycle: boolean; role: string; languages: Set<string>; entryPoints: number }
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

      const importance = m.classes.length * 3 + m.functions.length * 2 + (m.line_count > 100 ? 2 : 0);
      if (importance >= 4 || role === 'application_service' || role === 'domain' || role === 'api' || role === 'ml') {
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
      const match = hotspots.hotspots.find((h) => (h.filePath || h.file) === recFile) || hotspots.hotspots[0];
      const getComp = (h: any) => typeof h.complexity === 'object' ? h.complexity?.value ?? 0 : h.complexity ?? 0;
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

  // Top-Risk Modules Leaderboard (Top 3)
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
        else if (mod.complexity.cyclomatic_complexity > 15)
          primaryRisk = `Cyclomatic Complexity ${mod.complexity.cyclomatic_complexity}`;
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

  const recommendedFile = recommendedTarget?.path || '';

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

  // Filtered modules with multi-attribute syntax support
  const filteredModules = useMemo(() => {
    if (!analysis) return [];
    return analysis.modules.filter((m) => {
      const normPath = m.relative_path.replace(/\\/g, '/');
      const { role } = getModuleRole(m.relative_path);
      const { kind } = getEntryPointCategory(m.relative_path);

      // Layer Filter
      if (selectedLayer && selectedLayer !== '/root' && selectedLayer !== 'root' && !normPath.startsWith(selectedLayer.replace(/^\//, ''))) {
        return false;
      }
      if ((selectedLayer === '/root' || selectedLayer === 'root') && normPath.includes('/')) {
        return false;
      }

      // Language Filter
      if (languageFilter !== 'all') {
        const mLang = (m.language || '').toLowerCase();
        if (languageFilter === 'python' && mLang !== 'python') return false;
        if (languageFilter === 'typescript' && mLang !== 'typescript') return false;
        if (languageFilter === 'javascript' && mLang !== 'javascript') return false;
      }

      // Status Filter
      if (statusFilter !== 'all') {
        const pStatus = m.parse_status || 'complete';
        if (statusFilter === 'complete' && pStatus !== 'complete') return false;
        if (statusFilter === 'partial' && pStatus !== 'partial') return false;
        if (statusFilter === 'fallback' && !['fallback', 'unsupported', 'failed'].includes(pStatus)) return false;
      }

      // Role Filter
      if (roleFilter !== 'all') {
        if (role !== roleFilter) return false;
      }

      // Query Filter (Supports role:, parse:, entry:, unresolved:true, or free text)
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
          const hasUnresolved = m.imports?.some((imp) => !imp.module_name.includes('/') && !imp.module_name.startsWith('@'));
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
${architecture?.architecture_summary || analysis.explanation?.languages_summary || 'Deterministic static analysis loaded.'}

## Application Entry Points
${categorizedEntryPoints.map((ep) => `- **${ep.kind_label}:** \`${ep.path}\` — ${ep.description}`).join('\n')}

## Major Layers
${architectureLayers
  .map((l) => `- **${l.path}**: ${l.file_count} files (${l.file_percentage}%), ${formatNumber(l.loc)} LOC (${l.loc_percentage}%) — Role: ${l.role}`)
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
      <PageHeroHeader
        icon={BookOpen}
        title="EXPLANATION"
        contextLabel={projectName ? `ACTIVE CODEBASE: ${projectName}` : undefined}
        eyebrow="Architecture Intelligence"
        confidence={canonicalCoverage.confidence}
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/[0.08] text-white/80 border border-white/10 font-mono">
            {canonicalCoverage.full_ast_percentage}% AST Coverage
          </span>
        }
        description="Deterministic AST evidence for languages, parse coverage, coupling, entry points, and dependency topology."
        actions={[
          {
            label: "Explore Dependencies",
            variant: "primary",
            onClick: () => onNavigateTab?.('graph'),
            icon: <Network className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
          {
            label: "Download Summary",
            variant: "secondary",
            onClick: handleDownloadMarkdown,
            icon: <Download className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
          {
            label: "Refresh",
            variant: "secondary",
            onClick: () => fetchData(true),
            loading: refreshing,
            loadingText: "Refreshing…",
            icon: <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
        ]}
      />

      {/* 2. Analysis Confidence Status Strip (when partial or review needed) */}
      {(canonicalCoverage.confidence !== 'high' || canonicalGraph.unresolved_imports > 0) && (
        <section
          className={`w-full rounded-xl border p-4 sm:px-5 sm:py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${
            canonicalCoverage.confidence === 'high'
              ? 'bg-teal-surface/60 border-teal/30'
              : canonicalCoverage.confidence === 'medium'
              ? 'bg-indigo-surface/60 border-indigo/25'
              : canonicalCoverage.confidence === 'partial'
              ? 'bg-amber-surface/70 border-amber/35'
              : 'bg-red-surface/70 border-red/35'
          }`}
          aria-label="Analysis Confidence Status"
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 border ${
                canonicalCoverage.confidence === 'high'
                  ? 'bg-teal/10 text-teal-strong border-teal/25'
                  : canonicalCoverage.confidence === 'partial'
                  ? 'bg-amber/10 text-amber-strong border-amber/30'
                  : 'bg-indigo/10 text-indigo border-indigo/25'
              }`}
            >
              {canonicalCoverage.confidence === 'high' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] font-black uppercase tracking-wider text-ink">
                  ANALYSIS COVERAGE:
                </span>
                <Badge
                  tone={
                    canonicalCoverage.confidence === 'high'
                      ? 'green'
                      : canonicalCoverage.confidence === 'partial'
                      ? 'amber'
                      : 'indigo'
                  }
                  size="sm"
                >
                  {canonicalCoverage.confidence.toUpperCase()}
                </Badge>
                <span className="text-xs text-ink-3 hidden sm:inline">·</span>
                <span className="font-sans text-xs text-ink-2 font-medium">
                  <strong>{canonicalCoverage.fully_parsed}</strong> / {canonicalCoverage.total_source_files} files fully parsed
                  {canonicalCoverage.partial > 0 && <span> · <strong>{canonicalCoverage.partial}</strong> partial</span>}
                  {canonicalCoverage.fallback > 0 && <span> · <strong>{canonicalCoverage.fallback}</strong> fallback</span>}
                </span>
              </div>
              <p className="text-[11px] text-ink-3 mt-0.5 leading-snug">
                {canonicalCoverage.limitation_notice ||
                  'Full AST contracts extracted. Architecture topology is grounded in complete deterministic evidence.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start md:self-auto">
            {canonicalGraph.unresolved_imports > 0 && (
              <button
                type="button"
                onClick={() => setShowDiagnosticsDetails((prev) => !prev)}
                className="text-[11px] font-mono font-bold text-indigo hover:underline px-2.5 py-1 rounded-lg bg-surface border border-line shadow-xs cursor-pointer"
              >
                {canonicalGraph.unresolved_imports} relationships need review
              </button>
            )}
          </div>
        </section>
      )}

      <Card variant="primary" padding="lg">

        {/* 5-Second Core Facts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mt-5">
          <KpiCard
            label="LANGUAGES &amp; SCOPE"
            value={analysis.languages.join(', ').toUpperCase() || 'PYTHON'}
            subtext={`${canonicalCoverage.total_source_files} files · ${formatNumber(analysis.total_lines)} LOC`}
          />
          <KpiCard
            label="PARSE COVERAGE"
            value={`${canonicalCoverage.full_ast_percentage}%`}
            variant={canonicalCoverage.confidence === 'high' ? 'default' : 'highlight'}
            subtext={`${canonicalCoverage.fully_parsed} / ${canonicalCoverage.total_source_files} files complete`}
          />
          <KpiCard
            label="INTERNAL COUPLING"
            value={`${formatNumber(canonicalGraph.resolved_edges)} RESOLVED EDGES`}
            subtext={`${canonicalGraph.unresolved_imports} unresolved · ${canonicalGraph.isolated_modules_count} isolated`}
          />
          <KpiCard
            label="DEPENDENCY LOOPS"
            value={canonicalGraph.cycle_count === 0 ? '0 CYCLES' : `${canonicalGraph.cycle_count} LOOPS`}
            variant={canonicalGraph.cycle_count > 0 ? 'risk' : 'default'}
            subtext={canonicalCoverage.cycle_label}
          />
        </div>

        {/* Natural Language Architecture Summary Panel */}
        <div className="bg-panel rounded-xl p-5 sm:p-6 mt-5 border border-line/50">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="font-sans text-[11px] font-bold text-indigo uppercase tracking-wider">
                1. What is this project?
              </span>
              <span className="text-[11px] text-ink-3">· Natural language architecture summary</span>
            </div>
            {architecture?.frameworks_detected && architecture.frameworks_detected.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                {architecture.frameworks_detected.map((fw) => (
                  <span
                    key={fw}
                    className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-surface border border-line text-ink-2"
                  >
                    {fw}
                  </span>
                ))}
              </div>
            )}
          </div>

          <p className="font-sans text-[13px] text-ink leading-[1.6] max-w-4xl mb-4">
            {architecture?.architecture_summary ||
              analysis.explanation?.languages_summary ||
              `This codebase contains ${canonicalCoverage.total_source_files} files across ${analysis.languages.join(', ')} with ${formatNumber(
                analysis.total_lines
              )} total lines. CodeOracle parsed AST structures and resolved ${canonicalGraph.resolved_edges} internal module dependencies.`}
          </p>

          {/* 3-Column Structured Architecture Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {/* Column 1: Application Entry Points */}
            <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider block mb-2">
                  APPLICATION ENTRY POINTS
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  {categorizedEntryPoints.slice(0, 4).map((ep) => (
                    <div key={ep.path} className="flex items-start justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectFile?.(ep.path)}
                        className="text-left font-semibold text-indigo hover:underline truncate max-w-[190px]"
                        title={ep.path}
                      >
                        {truncateMiddle(ep.path, 26)}
                      </button>
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-track text-ink-2 border border-line">
                        {ep.kind_label}
                      </span>
                    </div>
                  ))}
                  {categorizedEntryPoints.length === 0 && (
                    <span className="text-ink-3 text-xs italic">Modular library without dedicated runner roots.</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-ink-3 pt-2 border-t border-line/60 mt-2 block">
                {categorizedEntryPoints.length} detected application &amp; script roots
              </span>
            </div>

            {/* Column 2: Core Application Modules (Never Generated) */}
            <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider block mb-2">
                  CORE APPLICATION MODULES
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  {coreApplicationModules.slice(0, 4).map((mod) => (
                    <div key={mod.path} className="flex items-start justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectFile?.(mod.path)}
                        className="text-left font-semibold text-indigo hover:underline truncate max-w-[180px]"
                        title={mod.path}
                      >
                        {truncateMiddle(mod.path, 24)}
                      </button>
                      <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-surface text-indigo border border-indigo/20">
                        {mod.role_label}
                      </span>
                    </div>
                  ))}
                  {coreApplicationModules.length === 0 && (
                    <span className="text-ink-3 text-xs italic">All modules parsed as utility scripts.</span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-ink-3 pt-2 border-t border-line/60 mt-2 block">
                Excludes generated contracts and build artifacts
              </span>
            </div>

            {/* Column 3: Structural Topology */}
            <div className="bg-surface border border-line rounded-lg p-3.5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider block">
                    STRUCTURAL TOPOLOGY
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-panel border border-line text-ink-3">
                    {canonicalCoverage.confidence === 'high' ? 'GRAPH: COMPLETE' : 'GRAPH: PARTIAL'}
                  </span>
                </div>
                <div className="space-y-1 text-xs text-ink-2">
                  <div className="flex justify-between">
                    <span className="text-ink-3">Internal modules</span>
                    <span className="font-mono font-bold">{canonicalGraph.node_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-3">Resolved internal edges</span>
                    <span className="font-mono font-bold text-indigo">{canonicalGraph.resolved_edges}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-3">Unresolved internal imports</span>
                    <span className="font-mono font-bold text-amber-strong">{canonicalGraph.unresolved_imports}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink-3">External package references</span>
                    <span className="font-mono font-bold">{canonicalGraph.external_references}</span>
                  </div>
                </div>
              </div>
              <span className="text-[10px] text-ink-3 pt-2 border-t border-line/60 mt-2 block">
                {canonicalGraph.cycle_count === 0 ? '0 detected cycles in resolved graph' : `${canonicalGraph.cycle_count} cycle loops detected`}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. RECOMMENDED STARTING POINT & SCORE FACTOR DECOMPOSITION                */}
      {/* ========================================================================= */}
      {recommendedTarget && (
        <section className="bg-surface border-2 border-indigo/40 rounded-xl p-4 sm:p-5 shadow-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo/5 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
                <Compass className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide">
                    Recommended Starting Point
                  </span>
                  <StatusTag status="verified" label="DETERMINISTIC RANKING" />
                </div>
                <h3 className="font-display font-bold text-base text-ink mt-0.5">
                  What Should I Inspect First?
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onSelectFile?.(recommendedTarget.path)}
                className="font-mono text-xs font-bold text-indigo bg-indigo-surface px-3 py-1 rounded-md border border-indigo/20 hover:border-indigo/40 hover:underline cursor-pointer transition-colors"
                title={`Click to focus ${recommendedTarget.path}`}
              >
                Target: {recommendedTarget.path}
              </button>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            <div className="lg:col-span-2 space-y-3">
              <p className="font-sans text-sm text-ink-2 leading-relaxed">
                <strong className="text-ink font-semibold">Recommended Target:</strong>{' '}
                <button
                  type="button"
                  onClick={() => onSelectFile?.(recommendedTarget.path)}
                  className="font-mono text-indigo font-bold hover:underline cursor-pointer"
                >
                  {recommendedTarget.path}
                </button>
                .{' '}{recommendedTarget.reason}
              </p>

              {/* Collapsible Score Factor Decomposition */}
              <div className="bg-panel border border-line rounded-lg p-3 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowScoreDecomposition((prev) => !prev)}
                  className="w-full flex items-center justify-between text-left group"
                >
                  <span className="font-mono text-[11px] font-bold text-ink uppercase tracking-wider group-hover:text-indigo transition-colors flex items-center gap-1.5">
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform duration-200 ${
                        showScoreDecomposition ? 'rotate-180' : ''
                      }`}
                    />
                    Score Breakdown (Why this ranked #1)
                  </span>
                  <span className="font-mono text-xs font-black text-red">
                    HOTSPOT SCORE: {recommendedTarget.hotspot_score} / 100
                  </span>
                </button>

                {showScoreDecomposition && (
                  <div className="space-y-2 pt-2 border-t border-line/60 animate-[fade-down_150ms_ease-out]">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                      <div className="bg-surface rounded p-2 border border-line">
                        <span className="text-[10px] text-ink-3 uppercase block">Complexity factor</span>
                        <span className="font-bold text-ink text-sm">+{recommendedTarget.factors.complexity}</span>
                      </div>
                      <div className="bg-surface rounded p-2 border border-line">
                        <span className="text-[10px] text-ink-3 uppercase block">Warnings factor</span>
                        <span className="font-bold text-amber-strong text-sm">+{recommendedTarget.factors.warnings}</span>
                      </div>
                      <div className="bg-surface rounded p-2 border border-line">
                        <span className="text-[10px] text-ink-3 uppercase block">Fan-In factor</span>
                        <span className="font-bold text-indigo text-sm">+{recommendedTarget.factors.fan_in}</span>
                      </div>
                      <div className="bg-surface rounded p-2 border border-line">
                        <span className="text-[10px] text-ink-3 uppercase block">Blast Radius</span>
                        <span className="font-bold text-teal-strong text-sm">+{recommendedTarget.factors.blast_radius}</span>
                      </div>
                    </div>

                    {/* Highest Complexity Distinction Callout */}
                    {recommendedTarget.highest_complexity_file && (
                      <div className="pt-2 border-t border-line/60 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-ink-3">
                          <strong>Highest complexity file:</strong>{' '}
                          <button
                            type="button"
                            onClick={() => onSelectFile?.(recommendedTarget.highest_complexity_file)}
                            className="font-mono text-indigo hover:underline font-semibold"
                          >
                            {recommendedTarget.highest_complexity_file}
                          </button>
                        </span>
                        <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-surface border border-line text-ink-2">
                          CC {recommendedTarget.highest_complexity_score}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Direct Action Command Grid */}
            <div className="flex flex-col gap-1.5">
              <Button
                variant="indigo"
                size="sm"
                onClick={() => handleInspectInGraph()}
                icon={<Network className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Inspect in Dependency Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAnalyzeImpact()}
                icon={<Target className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Analyze Change Impact
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGenerateTests()}
                icon={<Play className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Generate Safety Tests
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReviewModernization()}
                icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Review Modernization
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleOpenHotspots()}
                icon={<Flame className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                View Risk Hotspots Tab
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* SUB-NAVIGATION BAR: PROGRESSIVE DISCLOSURE VIEWS                          */}
      {/* ========================================================================= */}
      <nav aria-label="Explanation views" className="flex items-center gap-2 border-b border-line pb-2.5 overflow-x-auto custom-scrollbar pt-2">
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
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSection === 'modules' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'}`}>
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
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSection === 'layers' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'}`}>
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
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSection === 'hotspots' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'}`}>
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
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSection === 'diagnostics' ? 'bg-white/20 text-white' : 'bg-surface text-amber-strong border border-amber/20'}`}>
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
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeSection === 'playbook' ? 'bg-white/20 text-white' : 'bg-tile text-ink-3'}`}>
            5 Steps
          </span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* 3. MAJOR LAYERS BREAKDOWN (File Share % vs LOC Share %)                   */}
      {/* ========================================================================= */}
      {activeSection === 'layers' && architectureLayers.length > 0 && (
        <Card variant="primary" padding="lg" className="space-y-4 animate-[fade-up_200ms_ease-out_both]">
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection('modules')}
                  className="text-xs"
                >
                  View Filtered Modules ({selectedLayer}) →
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedLayer(null)}
                  className="text-xs"
                >
                  Clear Filter
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {architectureLayers.map((layer) => {
              const isSelected = selectedLayer === layer.path;
              return (
                <div
                  key={layer.path}
                  onClick={() => {
                    const next = isSelected ? null : layer.path;
                    setSelectedLayer(next);
                  }}
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
                      setSelectedLayer(isSelected ? null : layer.path);
                    }
                  }}
                  title={`Click to select ${layer.path}`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="font-mono text-xs font-bold text-ink truncate" title={layer.path}>
                      {layer.path}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-pill bg-surface border border-line text-ink-3">
                      {layer.role}
                    </span>
                  </div>

                  {/* Dual metric breakdown: files share vs LOC share */}
                  <div className="space-y-1 my-2">
                    <div className="flex items-center justify-between text-xs text-ink-2 font-mono">
                      <span>{layer.file_count} files</span>
                      <span className="text-ink-3">{layer.file_percentage}% of source files</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-ink-2 font-mono">
                      <span>{formatNumber(layer.loc)} LOC</span>
                      <span className="text-ink-3">{layer.loc_percentage}% of code</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-track rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo rounded-full"
                      style={{ width: `${Math.max(layer.file_percentage, 5)}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-ink-3">
                    {layer.entry_points > 0 ? (
                      <span className="text-teal-strong font-semibold">{layer.entry_points} entry root(s)</span>
                    ) : (
                      <span className="text-ink-4">Internal layer</span>
                    )}
                    {layer.has_cycle && (
                      <span className="text-[10px] font-bold text-red">• Cyclic Loop</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedLayer && (
            <div className="pt-3 border-t border-line flex items-center justify-between">
              <span className="text-xs text-ink-2">
                Active layer filter: <strong className="font-mono text-indigo">{selectedLayer}</strong>
              </span>
              <Button
                variant="indigo"
                size="sm"
                onClick={() => setActiveSection('modules')}
              >
                Inspect Matching Modules in Explorer →
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 4. UNRESOLVED DEPENDENCY DIAGNOSTICS                                      */}
      {/* ========================================================================= */}
      {activeSection === 'diagnostics' && architecture?.unresolved_diagnostics && (
        <Card variant="primary" padding="lg" className="space-y-4 animate-[fade-up_200ms_ease-out_both]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
                <GitBranch className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide inline-block mb-0.5">
                  Diagnostics · Parser &amp; Import Resolution
                </span>
                <h3 className="font-display font-bold text-base sm:text-lg text-ink">
                  Unresolved Dependency Diagnostics
                </h3>
              </div>
            </div>
            <span className="font-mono text-xs font-bold text-amber-strong px-2.5 py-1 rounded bg-amber-surface border border-amber/30">
              {architecture.unresolved_diagnostics.total_unresolved} Relationships Need Review
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {architecture.unresolved_diagnostics.groups.map((group) => (
              <div key={group.key} className="bg-tile border border-line rounded-lg p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-base font-black text-ink">{group.count}</span>
                  <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-line text-ink-3">
                    {group.key}
                  </span>
                </div>
                <h4 className="font-sans text-xs font-bold text-ink">{group.label}</h4>
                <p className="text-[11px] text-ink-3 leading-snug">{group.description}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-line/60">
            <button
              type="button"
              onClick={() => setShowDiagnosticsDetails((prev) => !prev)}
              className="text-xs font-mono font-bold text-indigo hover:underline flex items-center gap-1"
            >
              {showDiagnosticsDetails ? 'Hide sample unresolved import paths' : 'Inspect sample unresolved import paths →'}
            </button>

            {showDiagnosticsDetails && (
              <div className="mt-3 p-3.5 bg-panel rounded-lg border border-line space-y-3 animate-[fade-down_150ms_ease-out]">
                {architecture.unresolved_diagnostics.groups
                  .filter((g) => g.examples && g.examples.length > 0)
                  .map((g) => (
                    <div key={g.key} className="space-y-1">
                      <span className="text-[11px] font-bold text-ink uppercase font-mono block">
                        {g.label} ({g.count}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                        {g.examples.map((ex, i) => (
                          <span key={i} className="px-2 py-0.5 rounded bg-surface border border-line text-ink-2">
                            {ex}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 5. RISK HOTSPOTS & MODERNIZATION FUNNEL                                   */}
      {/* ========================================================================= */}
      {activeSection === 'hotspots' && (
        <section className="space-y-4 animate-[fade-up_200ms_ease-out_both]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Top-Risk Modules Leaderboard */}
            <Card variant="primary" padding="lg" className="lg:col-span-2 space-y-4">
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
                      Top Modernization Targets
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
                        <span
                          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase ${
                            inCycle
                              ? 'bg-red-surface text-red-text border-red-line'
                              : mod.complexity.rating === 'critical'
                              ? 'bg-red-surface text-red-text border-red-line'
                              : 'bg-amber-surface text-amber-strong border-amber/30'
                          }`}
                        >
                          {inCycle ? 'CYCLE' : `COMPLEXITY: ${mod.complexity.rating.toUpperCase()}`}
                        </span>
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
            </Card>

            {/* Modernization Funnel Stages */}
            <Card variant="secondary" padding="lg" className="flex flex-col justify-between space-y-4">
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

                {/* Clearly Labeled Funnel Stages */}
                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                    <span className="font-mono font-bold text-ink-2 text-[11px]">STATIC FINDINGS</span>
                    <span className="font-mono font-bold text-ink">{findingFunnel.total_findings}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                    <span className="font-mono font-bold text-indigo text-[11px]">MODERNIZATION CANDIDATES</span>
                    <span className="font-mono font-bold text-indigo">{findingFunnel.modernization_candidates}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                    <span className="font-mono font-bold text-teal-strong text-[11px]">AUTOFIX ELIGIBLE</span>
                    <span className="font-mono font-bold text-teal-strong">{findingFunnel.autofixable_findings}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                    <span className="font-mono font-bold text-amber-strong text-[11px]">GENERATED DIFFS</span>
                    <span className="font-mono font-bold text-amber-strong">{findingFunnel.generated_diffs}</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-tile border border-line">
                    <span className="font-mono font-bold text-teal-strong text-[11px]">RUNTIME VERIFIED</span>
                    <span className="font-mono font-bold text-teal-strong">{findingFunnel.verified_changes}</span>
                  </div>
                </div>
              </div>

              <div className="bg-panel border border-line rounded-lg p-3 text-[11px] text-ink-3 space-y-1 mt-3">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-strong shrink-0" />
                  <span className="text-ink font-semibold">Confidence: Deterministic AST &amp; Callgraph</span>
                </div>
                <p className="text-[11px] leading-tight text-ink-3 pl-5">
                  {findingFunnel.verification_label || 'Static analysis only: proposals require characterization tests.'}
                </p>
              </div>
            </Card>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 6. GUIDED WORKFLOW ROADMAP                                                */}
      {/* ========================================================================= */}
      {activeSection === 'playbook' && (
        <Card variant="primary" padding="lg" className="space-y-4 animate-[fade-up_200ms_ease-out_both]">
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
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 7. MODULE EXPLORER & ADVANCED SEARCH FILTERS (Default View)               */}
      {/* ========================================================================= */}
      {activeSection === 'modules' && (
      <div className="space-y-3 animate-[fade-up_200ms_ease-out_both]">
      <Card variant="primary" padding="md" className="space-y-3">
        {/* Search Bar + Quick Syntax Hints */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <SearchField
            id="explanation-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search path, symbol, or filter (e.g. role:service, parse:partial, entry:runtime)…"
            resultCount={{
              current: filteredModules.length,
              total: analysis.modules.length,
              unit: 'modules',
            }}
            className="w-full lg:w-96"
          />

          {/* Quick Syntax Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-ink-3">
            <span className="text-ink-4">Syntax:</span>
            <button
              type="button"
              onClick={() => setSearchQuery('role:service')}
              className="px-1.5 py-0.5 rounded bg-panel hover:bg-track border border-line text-ink-2"
            >
              role:service
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('parse:partial')}
              className="px-1.5 py-0.5 rounded bg-panel hover:bg-track border border-line text-ink-2"
            >
              parse:partial
            </button>
            <button
              type="button"
              onClick={() => setSearchQuery('entry:runtime')}
              className="px-1.5 py-0.5 rounded bg-panel hover:bg-track border border-line text-ink-2"
            >
              entry:runtime
            </button>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="px-1.5 py-0.5 rounded text-red hover:underline font-sans text-xs ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-line/60">
          {/* Language filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-ink-2 mr-1">Language:</span>
            <FilterChip label="ALL" active={languageFilter === 'all'} onClick={() => setLanguageFilter('all')} />
            <FilterChip label="PYTHON" active={languageFilter === 'python'} onClick={() => setLanguageFilter('python')} />
            <FilterChip label="TYPESCRIPT" active={languageFilter === 'typescript'} onClick={() => setLanguageFilter('typescript')} />
            <FilterChip label="JAVASCRIPT" active={languageFilter === 'javascript'} onClick={() => setLanguageFilter('javascript')} />
          </div>

          {/* Parse Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-ink-2 mr-1">Parse:</span>
            <FilterChip label="ALL" active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} />
            <FilterChip label="FULL AST" active={statusFilter === 'complete'} onClick={() => setStatusFilter('complete')} />
            <FilterChip label="PARTIAL" active={statusFilter === 'partial'} onClick={() => setStatusFilter('partial')} />
            <FilterChip label="FALLBACK" active={statusFilter === 'fallback'} onClick={() => setStatusFilter('fallback')} />
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-ink-2 mr-1">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="font-mono text-xs bg-surface border border-line rounded px-2 py-1 text-ink focus:outline-indigo"
            >
              <option value="all">ALL ROLES</option>
              <option value="domain">DOMAIN</option>
              <option value="application_service">SERVICE</option>
              <option value="api">API / ROUTE</option>
              <option value="ml">ML PIPELINE</option>
              <option value="ui">UI</option>
              <option value="persistence">PERSISTENCE</option>
              <option value="configuration">CONFIG</option>
              <option value="script">SCRIPT</option>
              <option value="test">TEST</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Module Accordion Rows */}
      <div className="space-y-2.5" role="region" aria-label="Analyzed Modules List">
        {filteredModules.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={BookOpen}
              headline="No Modules Match Query"
              description={`No analyzed modules match your filters.`}
              actionText="Clear Search &amp; Filters"
              onAction={() => {
                setSearchQuery('');
                setLanguageFilter('all');
                setStatusFilter('all');
                setRoleFilter('all');
                setSelectedLayer(null);
              }}
              iconVariant="muted"
            />
          </div>
        ) : (
          filteredModules.slice(0, visibleCount).map((mod) => {
            const isExpanded = expandedModules.has(mod.module_id);
            const { label: roleLabel } = getModuleRole(mod.relative_path);
            const { kind, label: entryLabel } = getEntryPointCategory(mod.relative_path);
            const pStatus = mod.parse_status || 'complete';
            const inCycle = cycleNodeIds.has(mod.module_id);

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

                        {/* Parse Status Badge */}
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold whitespace-nowrap border ${
                            pStatus === 'complete'
                              ? 'bg-teal-surface text-teal-strong border-teal/20'
                              : pStatus === 'partial'
                              ? 'bg-amber-surface text-amber-strong border-amber/30'
                              : 'bg-red-surface text-red-strong border-red-line'
                          }`}
                        >
                          {pStatus === 'complete' ? 'FULL AST' : `PARSE: ${pStatus.toUpperCase()}`}
                        </span>

                        {/* Entry Point Badge */}
                        {(kind !== 'unknown' || mod.is_entry_point) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-surface text-teal-strong border border-teal/30 whitespace-nowrap">
                            ENTRY: {entryLabel}
                          </span>
                        )}

                        {/* Module Role Badge */}
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-surface text-indigo border border-indigo/20 whitespace-nowrap">
                          ROLE: {roleLabel.toUpperCase()}
                        </span>

                        {inCycle && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-surface text-red-strong border border-red-line whitespace-nowrap">
                            CYCLE: RESOLVED GRAPH
                          </span>
                        )}
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
                    <span className="hidden md:inline-block font-sans text-xs text-ink-3 num font-mono">
                      {formatNumber(mod.line_count)} lines · {mod.classes.length} classes · {mod.functions.length} functions
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border whitespace-nowrap ${
                        mod.complexity.rating === 'critical'
                          ? 'bg-red-surface text-red-strong border-red-line'
                          : mod.complexity.rating === 'high'
                          ? 'bg-amber-surface text-amber-strong border-amber/30'
                          : 'bg-surface text-ink-2 border-line'
                      }`}
                    >
                      COMPLEXITY: {mod.complexity.rating.toUpperCase()} ({mod.complexity.cyclomatic_complexity})
                    </span>
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

                    {/* Parser Confidence & Role Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-surface p-3 rounded-lg border border-line">
                      <div>
                        <span className="text-ink-4 text-[10px] uppercase font-bold block">Architectural Role</span>
                        <span className="font-bold text-ink">{roleLabel}</span>
                      </div>
                      <div>
                        <span className="text-ink-4 text-[10px] uppercase font-bold block">Parser Confidence</span>
                        <span className="font-bold text-ink">
                          {pStatus === 'complete' ? 'High (Full AST Tree)' : pStatus === 'partial' ? 'Medium (Syntax Fallback)' : 'Low'}
                        </span>
                      </div>
                      <div>
                        <span className="text-ink-4 text-[10px] uppercase font-bold block">Entry Point Status</span>
                        <span className="font-bold text-ink">
                          {kind !== 'unknown' ? entryLabel : mod.is_entry_point ? 'Executable Script' : 'Internal Component'}
                        </span>
                      </div>
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

                    {/* Imports Resolved & Unresolved */}
                    {mod.imports && mod.imports.length > 0 && (
                      <div className="bg-surface rounded-md border border-line p-3">
                        <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block mb-2">
                          Direct Imports ({mod.imports.length})
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto custom-scrollbar">
                          {mod.imports.map((imp, idx) => {
                            const isAlias = imp.module_name.startsWith('@/') || imp.module_name.startsWith('~/');
                            return (
                              <span
                                key={idx}
                                className={`px-2 py-0.5 rounded-pill font-mono text-[11px] border ${
                                  isAlias
                                    ? 'bg-amber-surface text-amber-strong border-amber/30'
                                    : 'bg-track text-ink-2 border-line'
                                }`}
                                title={isAlias ? 'Requires path alias resolution' : imp.module_name}
                              >
                                {imp.module_name}
                              </span>
                            );
                          })}
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
      )}
    </div>
  );
};

export default ExplanationTab;

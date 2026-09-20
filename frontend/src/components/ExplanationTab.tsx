import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  Download,
  FileCode,
  FolderGit2,
  GitFork,
  Hash,
  Layers,
  Network,
  Play,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Target,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { GraphResponse, ModuleAnalysis, ProjectAnalysis, TabType, WarningInfo } from '../types';
import { cleanText, complexityLabel, severityLabel, warningTitle } from '../utils/presentation';
import RiskBadge from './common/RiskBadge';
import FindingFunnel from './common/FindingFunnel';

interface ExplanationTabProps {
  projectId?: string | null;
  onNavigateTab?: (tab: TabType) => void;
}

interface LayerSummary {
  name: string;
  role: string;
  fileCount: number;
  lineCount: number;
  percentage: number;
  languages: string[];
  warningCount: number;
  hasCycle: boolean;
  highComplexityCount: number;
}

export const ExplanationTab: React.FC<ExplanationTabProps> = ({ projectId, onNavigateTab }) => {
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const fetchData = async (force: boolean = false) => {
    if (!projectId) return;
    setLoading(true);
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

      if (!analysisRes.ok) {
        throw new Error(`Failed to fetch analysis (${analysisRes.status})`);
      }
      const analysisData: ProjectAnalysis = await analysisRes.json();
      setAnalysis(analysisData);

      // Also fetch graph summary to cross-reference cycles and entry points
      try {
        const graphRes = await fetch(`/api/projects/${projectId}/graph?level=module`);
        if (graphRes.ok) {
          const graphData: GraphResponse = await graphRes.json();
          setGraph(graphData);
        }
      } catch {
        // Graph is optional supplement
      }

      setExpandedModules(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to load codebase static analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData(false);
    } else {
      setAnalysis(null);
      setGraph(null);
    }
  }, [projectId]);

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  // Cycle node IDs set
  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (graph?.cycles) {
      graph.cycles.forEach((cycle) => cycle.forEach((id) => set.add(id)));
    }
    return set;
  }, [graph]);

  // Language stats computation
  const languageStats = useMemo(() => {
    if (!analysis) return [];
    const counts: Record<string, number> = {};
    let total = 0;
    analysis.modules.forEach((mod) => {
      const lang = mod.language.toLowerCase();
      counts[lang] = (counts[lang] || 0) + mod.line_count;
      total += mod.line_count;
    });

    return Object.entries(counts)
      .map(([lang, lines]) => ({
        language: lang,
        lines,
        percentage: total > 0 ? Math.round((lines / total) * 100) : 0,
      }))
      .sort((a, b) => b.lines - a.lines);
  }, [analysis]);

  // Architecture Layers / Top-level folders computation
  const architectureLayers = useMemo<LayerSummary[]>(() => {
    if (!analysis) return [];
    const totalLines = analysis.total_lines || 1;
    const groups: Record<string, ModuleAnalysis[]> = {};

    analysis.modules.forEach((mod) => {
      const parts = mod.relative_path.replace(/\\/g, '/').split('/');
      let folder = parts.length > 1 ? parts[0] : 'root';
      // If folder is generic wrapper like src or backend, include second segment
      if (['src', 'app', 'backend', 'frontend', 'lib'].includes(folder.toLowerCase()) && parts.length > 2) {
        folder = `${parts[0]}/${parts[1]}`;
      }
      groups[folder] = groups[folder] || [];
      groups[folder].push(mod);
    });

    const inferRole = (folder: string): string => {
      const f = folder.toLowerCase();
      if (f.includes('api') || f.includes('route') || f.includes('endpoint')) return 'API & Routing';
      if (f.includes('model') || f.includes('schema') || f.includes('entity')) return 'Data & Schemas';
      if (f.includes('service') || f.includes('core') || f.includes('analysis')) return 'Core Business Logic';
      if (f.includes('test') || f.includes('spec')) return 'Test Suite';
      if (f.includes('util') || f.includes('helper') || f.includes('common')) return 'Shared Utilities';
      if (f.includes('component') || f.includes('view') || f.includes('ui')) return 'User Interface';
      if (f.includes('migration') || f.includes('refactor')) return 'Modernization Logic';
      if (f === 'root') return 'Entry & Configuration';
      return 'Module Subsystem';
    };

    return Object.entries(groups)
      .map(([name, mods]) => {
        const lineCount = mods.reduce((sum, m) => sum + m.line_count, 0);
        const warningCount = mods.reduce((sum, m) => sum + m.legacy_warnings.length, 0);
        const hasCycle = mods.some((m) => cycleNodeIds.has(m.module_id));
        const highComplexityCount = mods.filter(
          (m) => m.complexity.rating === 'high' || m.complexity.rating === 'critical'
        ).length;
        const languages = Array.from(new Set(mods.map((m) => m.language)));

        return {
          name,
          role: inferRole(name),
          fileCount: mods.length,
          lineCount,
          percentage: Math.round((lineCount / totalLines) * 100),
          languages,
          warningCount,
          hasCycle,
          highComplexityCount,
        };
      })
      .sort((a, b) => b.lineCount - a.lineCount);
  }, [analysis, cycleNodeIds]);

  // Top-Risk Modules Leaderboard
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
      .slice(0, 4);
  }, [analysis, cycleNodeIds]);

  // Dynamic Recommended First Action
  const recommendedAction = useMemo(() => {
    if (!analysis) return null;

    // 1. Priority 1: Cycles exist
    if (graph?.cycles && graph.cycles.length > 0) {
      const firstCycle = graph.cycles[0];
      return {
        type: 'cycle',
        badge: 'Priority 1 — Architectural Blocker',
        title: `Decouple Runtime Cycle (${graph.cycles.length} detected)`,
        description: `Circular runtime dependencies between ${firstCycle.slice(0, 2).join(' ↔ ')} prevent safe, isolated modernization. Break the cycle using dependency inversion before applying code diffs.`,
        actionLabel: 'Inspect Cycle in Graph',
        targetTab: 'graph' as TabType,
        icon: GitFork,
      };
    }

    // 2. Priority 2: High risk module needs characterization tests
    if (topRiskModules.length > 0 && topRiskModules[0].score > 25) {
      const target = topRiskModules[0].mod;
      return {
        type: 'tests',
        badge: 'Priority 1 — Safety Characterization',
        title: `Generate Tests for Riskiest Module: ${target.relative_path}`,
        description: `This file has high cyclomatic complexity (${target.complexity.cyclomatic_complexity}) and ${target.legacy_warnings.length} modernization findings. Lock in existing behavior with characterization tests prior to refactoring.`,
        actionLabel: 'Generate Safety Tests',
        targetTab: 'tests' as TabType,
        icon: ShieldAlert,
      };
    }

    // 3. Priority 3: Refactoring diffs ready
    if (analysis.finding_funnel && analysis.finding_funnel.generated_diffs > 0) {
      return {
        type: 'refactor',
        badge: 'Priority 1 — Modernization Candidate',
        title: `Preview ${analysis.finding_funnel.generated_diffs} Automated Refactor Diffs`,
        description: 'Deterministic AST-safe code transformations have been generated and validated for Python 3 / Modern JS. Review and verify proposals.',
        actionLabel: 'Preview Proposed Refactors',
        targetTab: 'refactor' as TabType,
        icon: Sparkles,
      };
    }

    // 4. Default: Migration roadmap
    return {
      type: 'migration',
      badge: 'Priority 1 — Modernization Roadmap',
      title: 'Review Phased Migration Assessment',
      description: 'Audit the complete 5-category modernization readiness score, estimated blast radius, and dependency wave plan.',
      actionLabel: 'View Migration Plan',
      targetTab: 'migration' as TabType,
      icon: Target,
    };
  }, [analysis, graph, topRiskModules]);

  // Filtered modules list
  const filteredModules = useMemo(() => {
    if (!analysis) return [];
    return analysis.modules.filter((mod) => {
      const normPath = mod.relative_path.replace(/\\/g, '/');
      if (selectedLayer && selectedLayer !== 'root' && !normPath.startsWith(selectedLayer)) {
        return false;
      }
      if (selectedLayer === 'root' && normPath.includes('/')) {
        return false;
      }

      if (languageFilter !== 'all' && mod.language.toLowerCase() !== languageFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPath = mod.relative_path.toLowerCase().includes(q);
        const matchesFn = mod.functions.some((f) => f.name.toLowerCase().includes(q));
        const matchesCls = mod.classes.some((c) => c.name.toLowerCase().includes(q));
        return matchesPath || matchesFn || matchesCls;
      }

      return true;
    });
  }, [analysis, selectedLayer, languageFilter, searchQuery]);

  // Parse coverage calculation
  const parseCoverage = useMemo(() => {
    if (!analysis || analysis.total_files === 0) return 100;
    return Math.round((analysis.parse_success_count / analysis.total_files) * 100);
  }, [analysis]);

  if (!projectId) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-10 text-center min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-3.5 bg-[#EAE9FB] text-[#4340A0] rounded-2xl border border-[#C7C4F7] mb-3">
          <FolderGit2 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-[#292622] mb-1">No Repository Ingested</h3>
        <p className="text-xs text-[#6B645A] max-w-md">
          Upload a ZIP archive or submit a public GitHub repository to launch the architecture overview.
        </p>
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-[#F0EBE2] rounded-xl w-1/3"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#EFE9DD]/60 rounded-[20px]"></div>
          ))}
        </div>
        <div className="h-64 bg-[#EFE9DD]/40 rounded-[20px]"></div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="p-3.5 bg-[#F6E5E2] text-[#C45F58] rounded-2xl border border-[#ECC7C3] mb-3">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-[#292622] mb-1">Analysis Failed</h3>
        <p className="text-xs text-[#6B645A] max-w-md mb-5">{error}</p>
        <button onClick={() => fetchData(true)} className="btn-brand-pill px-5 py-2 text-xs">
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Health Overview */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CFC2] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#EAE9FB] border border-[#C7C4F7] rounded-2xl text-[#4340A0]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-[#292622]">Architecture Overview</h2>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#E0EFEB] text-[#245F59] border border-[#BEE0D6]">
                  Command Center
                </span>
              </div>
              <p className="text-xs text-[#6B645A] mt-0.5">
                Executive architectural summary, structural layers, critical risk hotspots, and recommended modernization steps.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <a
              href={`/api/projects/${projectId}/analysis/download`}
              className="btn-brand-outline-pill px-4 py-2 text-xs flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Report</span>
            </a>
            <button
              onClick={() => fetchData(true)}
              disabled={loading}
              className="btn-brand-outline-pill px-4 py-2 text-xs flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Re-run Analysis</span>
            </button>
          </div>
        </div>

        {/* Project Health Stat Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="bg-[#F0EBE2]/60 p-3.5 rounded-2xl border border-[#D8CFC2]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B645A]">Parse Coverage</span>
              <FileCode className="w-4 h-4 text-[#4C4FD6]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-extrabold text-[#292622]">{parseCoverage}%</span>
              <span className="text-[10px] text-[#6B645A]">
                {analysis.parse_success_count}/{analysis.total_files} files
              </span>
            </div>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3.5 rounded-2xl border border-[#D8CFC2]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B645A]">Codebase Scale</span>
              <Hash className="w-4 h-4 text-[#4C4FD6]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-extrabold text-[#292622]">
                {analysis.total_lines.toLocaleString()}
              </span>
              <span className="text-[10px] text-[#6B645A] font-medium">lines across {analysis.total_files} files</span>
            </div>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3.5 rounded-2xl border border-[#D8CFC2]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B645A]">Runtime Cycles</span>
              <GitFork
                className={`w-4 h-4 ${
                  graph?.summary.cycle_count ? 'text-[#C45F58]' : 'text-[#368A80]'
                }`}
              />
            </div>
            <div className="flex items-baseline space-x-2">
              <span
                className={`text-xl font-extrabold ${
                  graph?.summary.cycle_count ? 'text-[#C45F58]' : 'text-[#368A80]'
                }`}
              >
                {graph?.summary.cycle_count ?? 0}
              </span>
              <span className="text-[10px] text-[#6B645A]">
                {graph?.summary.cycle_count ? 'cyclic dependencies' : 'clean flow'}
              </span>
            </div>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3.5 rounded-2xl border border-[#D8CFC2]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[#6B645A]">Total Findings</span>
              <ShieldAlert className="w-4 h-4 text-[#C7953D]" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-xl font-extrabold text-[#C7953D]">
                {analysis.finding_funnel?.total_findings ?? analysis.project_warnings.length}
              </span>
              <span className="text-[10px] text-[#6B645A]">
                {analysis.finding_funnel?.modernization_candidates ?? 0} candidates
              </span>
            </div>
          </div>
        </div>

        {/* Language distribution bar */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between text-xs text-[#6B645A]">
            <span className="font-bold text-[#292622]">Detected Languages:</span>
            <div className="flex items-center space-x-3">
              {languageStats.map((item) => (
                <span key={item.language} className="flex items-center space-x-1 text-[11px]">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      item.language === 'python'
                        ? 'bg-[#4C4FD6]'
                        : item.language === 'typescript'
                        ? 'bg-[#7B61D1]'
                        : 'bg-[#C7953D]'
                    }`}
                  ></span>
                  <span className="capitalize font-semibold text-[#292622]">{item.language}</span>
                  <span className="text-[#6B645A]">({item.percentage}%)</span>
                </span>
              ))}
            </div>
          </div>
          <div className="h-2 w-full bg-[#EFE9DD] rounded-full overflow-hidden flex">
            {languageStats.map((item) => (
              <div
                key={item.language}
                style={{ width: `${item.percentage}%` }}
                className={`h-full ${
                  item.language === 'python'
                    ? 'bg-[#4C4FD6]'
                    : item.language === 'typescript'
                    ? 'bg-[#7B61D1]'
                    : 'bg-[#C7953D]'
                }`}
                title={`${item.language}: ${item.lines.toLocaleString()} lines (${item.percentage}%)`}
              />
            ))}
          </div>
        </div>

        {/* Finding Funnel integration */}
        <FindingFunnel funnel={analysis.finding_funnel} />
      </div>

      {/* 2. Hero: Recommended First Action Card */}
      {recommendedAction && (
        <div className="bg-gradient-to-r from-[#EAE9FB] via-[#FFFDFC] to-[#F5E8CC]/40 border-2 border-[#C7C4F7] rounded-[24px] p-5 sm:p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full bg-[#4C4FD6] text-[#FFFDFC]">
                <Zap className="w-3 h-3" />
                {recommendedAction.badge}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-[#292622]">
              {recommendedAction.title}
            </h3>
            <p className="text-xs leading-relaxed text-[#4D4842]">
              {recommendedAction.description}
            </p>
          </div>

          <button
            onClick={() => onNavigateTab?.(recommendedAction.targetTab)}
            className="btn-brand-pill py-3 px-5 text-xs flex items-center justify-center gap-2 shrink-0 shadow-md hover:scale-105 transition-all"
          >
            <span>{recommendedAction.actionLabel}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Architecture Layers & Top-Level Folders */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CFC2] pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#292622] flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#4C4FD6]" />
              <span>Architectural Layers & Top-Level Directories</span>
            </h3>
            <p className="text-xs text-[#6B645A]">
              Click any layer to focus and inspect the modules belonging to that subsystem.
            </p>
          </div>
          {selectedLayer && (
            <button
              onClick={() => setSelectedLayer(null)}
              className="text-xs text-[#4C4FD6] font-bold flex items-center gap-1 self-start hover:underline"
            >
              <X className="w-3.5 h-3.5" /> Clear Layer Filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {architectureLayers.map((layer) => {
            const isSelected = selectedLayer === layer.name;
            return (
              <div
                key={layer.name}
                onClick={() => setSelectedLayer(isSelected ? null : layer.name)}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#4C4FD6] bg-[#EAE9FB]/50 ring-2 ring-[#4C4FD6] shadow-sm'
                    : 'border-[#D8CFC2] bg-[#F0EBE2]/40 hover:bg-[#F0EBE2]/80 hover:border-[#6B645A]/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2 truncate">
                    <FolderGit2 className="w-4 h-4 text-[#4C4FD6] shrink-0" />
                    <span className="font-mono text-xs font-bold text-[#292622] truncate" title={layer.name}>
                      {layer.name}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFDFC] border border-[#D8CFC2] text-[#4D4842] shrink-0">
                    {layer.role}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#6B645A] mb-2 font-medium">
                  <span>{layer.fileCount} {layer.fileCount === 1 ? 'file' : 'files'}</span>
                  <span>{layer.lineCount.toLocaleString()} lines ({layer.percentage}%)</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-[#EFE9DD] rounded-full overflow-hidden mb-2.5">
                  <div
                    style={{ width: `${Math.max(layer.percentage, 4)}%` }}
                    className="h-full bg-[#4C4FD6] rounded-full"
                  />
                </div>

                {/* Layer Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {layer.hasCycle && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F6E5E2] text-[#8F3F3A] border border-[#ECC7C3]">
                      Contains Cycle
                    </span>
                  )}
                  {layer.highComplexityCount > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F5E8CC] text-[#76561B] border border-[#E6D3A9]">
                      {layer.highComplexityCount} complex
                    </span>
                  )}
                  {layer.warningCount > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#F0EBE2] text-[#6B645A] border border-[#D8CFC2]">
                      {layer.warningCount} notes
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Top-Risk Modules Leaderboard & System Entry Points */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top-Risk Modules (2 columns) */}
        <div className="lg:col-span-2 bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#D8CFC2] pb-3">
            <div>
              <h3 className="text-sm font-extrabold text-[#292622] flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#C45F58]" />
                <span>Top-Risk Modules — What Should I Inspect First?</span>
              </h3>
              <p className="text-xs text-[#6B645A]">
                Ranked by combined cyclomatic complexity, cycle participation, and legacy findings.
              </p>
            </div>
            <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-[#F6E5E2] text-[#8F3F3A] border border-[#ECC7C3]">
              High Impact
            </span>
          </div>

          <div className="space-y-3">
            {topRiskModules.map(({ mod, primaryRisk, inCycle }, index) => (
              <div
                key={mod.module_id}
                className="p-3.5 rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] hover:border-[#4C4FD6] transition-all space-y-2.5 shadow-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#F0EBE2] text-[#4D4842] flex items-center justify-center text-[10px] font-bold">
                      {index + 1}
                    </span>
                    <span className="font-mono text-xs font-bold text-[#292622] break-all">
                      {mod.relative_path}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RiskBadge
                      level={inCycle ? 'danger' : 'warning'}
                      label={primaryRisk}
                      size="sm"
                    />
                    <span className="text-[11px] text-[#6B645A] font-mono">
                      {mod.line_count} lines
                    </span>
                  </div>
                </div>

                {mod.explanation && (
                  <p className="text-xs text-[#6B645A] pl-7">
                    {cleanText(mod.explanation.responsibility)}
                  </p>
                )}

                {/* Cross-tab deep links */}
                <div className="flex flex-wrap items-center gap-2 pl-7 pt-1">
                  <button
                    onClick={() => onNavigateTab?.('graph')}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7] hover:bg-[#D9D7F9] transition-colors flex items-center gap-1"
                    title="Trace upstream and downstream callers in dependency graph"
                  >
                    <Network className="w-3 h-3" />
                    <span>Inspect Graph</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab?.('tests')}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#E0EFEB] text-[#245F59] border border-[#BEE0D6] hover:bg-[#CEEAE2] transition-colors flex items-center gap-1"
                    title="Generate characterization tests for this file"
                  >
                    <Play className="w-3 h-3" />
                    <span>Generate Tests</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab?.('refactor')}
                    className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-[#F5E8CC] text-[#76561B] border border-[#E6D3A9] hover:bg-[#F0DEB4] transition-colors flex items-center gap-1"
                    title="Preview modernization diff proposals"
                  >
                    <Wrench className="w-3 h-3" />
                    <span>Preview Refactor</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Entry Points & Architectural Observations (1 column) */}
        <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-6 shadow-sm space-y-4">
          <div className="border-b border-[#D8CFC2] pb-3">
            <h3 className="text-sm font-extrabold text-[#292622] flex items-center gap-2">
              <Target className="w-4 h-4 text-[#368A80]" />
              <span>System Entry Points</span>
            </h3>
            <p className="text-xs text-[#6B645A]">
              Detected execution orchestrators and CLI/server runners.
            </p>
          </div>

          <div className="space-y-2">
            {analysis.modules.filter((m) => m.is_entry_point).length === 0 ? (
              <p className="text-xs text-[#6B645A] italic py-2">No explicit entry point filenames identified.</p>
            ) : (
              analysis.modules
                .filter((m) => m.is_entry_point)
                .map((m) => (
                  <div
                    key={m.module_id}
                    className="p-2.5 rounded-xl border border-[#BEE0D6] bg-[#E0EFEB]/40 flex items-center justify-between"
                  >
                    <div className="truncate pr-2">
                      <span className="font-mono text-xs font-bold text-[#245F59] block truncate">
                        {m.relative_path}
                      </span>
                      <span className="text-[10px] text-[#6B645A]">
                        {m.line_count} lines • {m.functions.length} functions
                      </span>
                    </div>
                    <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#E0EFEB] text-[#245F59] border border-[#BEE0D6]">
                      Entry
                    </span>
                  </div>
                ))
            )}
          </div>

          {analysis.explanation && analysis.explanation.architectural_observations.length > 0 && (
            <div className="pt-3 border-t border-[#D8CFC2] space-y-2">
              <span className="text-xs font-bold text-[#292622] block">
                Key Architectural Observations
              </span>
              <ul className="space-y-1 text-xs text-[#4D4842]">
                {analysis.explanation.architectural_observations.slice(0, 3).map((obs, idx) => (
                  <li key={idx} className="flex items-start space-x-1.5">
                    <span className="text-[#4C4FD6] font-bold">•</span>
                    <span>{cleanText(obs)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 5. Search & Detailed Module Explorer */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#D8CFC2] pb-3">
          <div>
            <h3 className="text-sm font-extrabold text-[#292622] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#4C4FD6]" />
              <span>Explore All Project Modules ({filteredModules.length})</span>
            </h3>
            <p className="text-xs text-[#6B645A]">
              Filter by subsystem layer, search by symbol, and inspect individual classes and functions.
            </p>
          </div>

          {/* Search input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#6B645A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search module or symbol name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#EFE9DD]/50 border border-[#D8CFC2] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#292622] placeholder-[#6B645A] focus:outline-none focus:border-[#4C4FD6] focus:bg-[#FFFDFC] transition-colors"
            />
          </div>
        </div>

        {/* Filter bar: Languages & Layer status */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[#6B645A] font-bold text-[11px]">Language:</span>
            {['all', 'python', 'javascript', 'typescript'].map((lang) => (
              <button
                key={lang}
                onClick={() => setLanguageFilter(lang)}
                className={`px-3 py-1 rounded-full uppercase font-bold text-[10px] transition-all border ${
                  languageFilter === lang
                    ? 'bg-[#EAE9FB] text-[#4340A0] border-[#C7C4F7] shadow-xs'
                    : 'bg-[#FFFDFC] text-[#6B645A] border-[#D8CFC2] hover:bg-[#F0EBE2]'
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

          {selectedLayer && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="text-[#6B645A]">Filtered by Layer:</span>
              <span className="font-mono font-bold text-[#4C4FD6] bg-[#EAE9FB] px-2 py-0.5 rounded-full border border-[#C7C4F7]">
                {selectedLayer}
              </span>
            </div>
          )}
        </div>

        {/* Modules List */}
        <div className="space-y-3 pt-2">
          {filteredModules.length === 0 ? (
            <div className="p-8 text-center text-[#6B645A] text-xs font-medium border border-dashed border-[#D8CFC2] rounded-2xl">
              No modules match current filter settings.
            </div>
          ) : (
            filteredModules.map((mod) => {
              const isExpanded = expandedModules.has(mod.module_id);
              const inCycle = cycleNodeIds.has(mod.module_id);
              const warningGroups = mod.legacy_warnings.reduce<Record<string, WarningInfo[]>>((groups, warning) => {
                (groups[warning.code] ||= []).push(warning);
                return groups;
              }, {});

              return (
                <div
                  key={mod.module_id}
                  className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] overflow-hidden transition-all shadow-xs"
                >
                  {/* Module Header Row */}
                  <button
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => toggleModuleExpand(mod.module_id)}
                    className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left transition-colors hover:bg-[#F0EBE2]/40 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                  >
                    <div className="flex min-w-0 items-start space-x-3">
                      <span className="text-[#6B645A] mt-0.5">
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="break-all font-mono text-xs font-bold text-[#4C4FD6]">
                            {mod.relative_path}
                          </span>
                          <RiskBadge level="info" label={mod.language} size="sm" />
                          <RiskBadge
                            level={
                              mod.parse_status === 'complete'
                                ? 'success'
                                : mod.parse_status === 'partial'
                                ? 'warning'
                                : 'danger'
                            }
                            label={mod.parse_status === 'complete' ? 'Analyzed' : mod.parse_status}
                            size="sm"
                          />
                          {mod.is_entry_point && (
                            <RiskBadge level="info" label="Entry Point" size="sm" />
                          )}
                          {inCycle && (
                            <RiskBadge level="danger" label="In Cycle" size="sm" />
                          )}
                        </div>
                        {mod.explanation && (
                          <p className="text-xs text-[#6B645A] mt-1">{cleanText(mod.explanation.responsibility)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-7 text-xs text-[#6B645A] sm:justify-end sm:pl-0 font-medium">
                      <span>{mod.line_count.toLocaleString()} lines</span>
                      <span>{mod.classes.length} classes</span>
                      <span>{mod.functions.length} functions</span>
                      <RiskBadge
                        level={
                          mod.complexity.rating === 'low'
                            ? 'success'
                            : mod.complexity.rating === 'medium'
                            ? 'warning'
                            : 'danger'
                        }
                        label={`Complexity: ${complexityLabel(mod.complexity.rating)}`}
                        size="sm"
                      />
                    </div>
                  </button>

                  {/* Expanded Details Body */}
                  {isExpanded && (
                    <div className="border-t border-[#D8CFC2] bg-[#EFE9DD]/30 p-6 space-y-6">
                      {/* Action quick links for this module */}
                      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#FFFDFC] border border-[#D8CFC2]">
                        <span className="text-xs font-bold text-[#292622]">Take Action on this Module:</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => onNavigateTab?.('graph')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7] hover:bg-[#D9D7F9] transition-colors flex items-center gap-1.5"
                          >
                            <Network className="w-3.5 h-3.5" />
                            <span>View in Graph</span>
                          </button>
                          <button
                            onClick={() => onNavigateTab?.('tests')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#E0EFEB] text-[#245F59] border border-[#BEE0D6] hover:bg-[#CEEAE2] transition-colors flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Run/Generate Tests</span>
                          </button>
                          <button
                            onClick={() => onNavigateTab?.('refactor')}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#F5E8CC] text-[#76561B] border border-[#E6D3A9] hover:bg-[#F0DEB4] transition-colors flex items-center gap-1.5"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                            <span>Preview Refactor</span>
                          </button>
                        </div>
                      </div>

                      {mod.legacy_warnings.length > 0 && (
                        <div className="bg-[#F5E8CC]/80 border border-[#E6D3A9] rounded-2xl p-4 space-y-2">
                          <div className="flex items-center space-x-2 text-[#76561B] text-xs font-bold">
                            <AlertTriangle className="w-4 h-4 text-[#C7953D]" />
                            <span>Modernization Suggestions ({mod.legacy_warnings.length})</span>
                          </div>
                          <div className="space-y-2 pt-1">
                            {Object.entries(warningGroups).map(([code, warnings]) => (
                              <details
                                key={code}
                                className="group rounded-xl border border-[#E6D3A9] bg-[#FFFDFC]"
                              >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-xs text-[#292622]">
                                  <span className="font-bold text-[#76561B]">{warningTitle(code)}</span>
                                  <span className="flex shrink-0 items-center gap-2">
                                    <span className="text-[10px] text-[#6B645A]">
                                      {warnings.length} {warnings.length === 1 ? 'finding' : 'findings'}
                                    </span>
                                    <RiskBadge level={warnings[0].severity} label={severityLabel(warnings[0].severity)} size="sm" />
                                    <ChevronRight className="h-3.5 w-3.5 text-[#6B645A] transition-transform group-open:rotate-90" />
                                  </span>
                                </summary>
                                <div className="space-y-2 border-t border-[#E6D3A9]/60 px-3 py-2">
                                  {warnings.map((warning, index) => (
                                    <p key={`${warning.line}-${index}`} className="text-[11px] leading-5 text-[#4D4842]">
                                      <span className="font-bold text-[#292622]">Line {warning.line || 1}:</span>{' '}
                                      {cleanText(warning.message)}
                                    </p>
                                  ))}
                                </div>
                              </details>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Classes Section */}
                      {mod.classes.length > 0 && (
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-[#6B645A] tracking-wider mb-3">
                            Classes ({mod.classes.length})
                          </h4>
                          <div className="space-y-2.5">
                            {mod.classes.map((cls) => (
                              <div
                                key={cls.symbol_id}
                                className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-xl p-4 space-y-2 shadow-xs"
                              >
                                <div className="flex items-center space-x-2">
                                  <Code2 className="w-4 h-4 text-[#4C4FD6]" />
                                  <span className="font-mono text-xs font-bold text-[#292622]">{cls.name}</span>
                                  <span className="text-[10px] text-[#6B645A] font-mono">
                                    L{cls.start_line}-L{cls.end_line}
                                  </span>
                                </div>
                                {cls.explanation && (
                                  <p className="text-xs text-[#4D4842]">{cleanText(cls.explanation.summary)}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Functions Section */}
                      {mod.functions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-extrabold uppercase text-[#6B645A] tracking-wider mb-3">
                            Functions & Methods ({mod.functions.length})
                          </h4>
                          <div className="space-y-2.5">
                            {mod.functions.map((fn) => (
                              <div
                                key={fn.symbol_id}
                                className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-xl p-4 space-y-2 shadow-xs"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CFC2]/60 pb-2">
                                  <div className="flex items-center space-x-2">
                                    {fn.is_async && (
                                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7]">
                                        async
                                      </span>
                                    )}
                                    <span className="font-mono text-xs font-bold text-[#4C4FD6]">
                                      {fn.qualified_name}
                                    </span>
                                    <span className="text-[10px] text-[#6B645A] font-mono">
                                      L{fn.start_line}-L{fn.end_line}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <RiskBadge
                                      level={fn.complexity > 10 ? 'danger' : 'success'}
                                      label={`Complexity: ${complexityLabel(undefined, fn.complexity)}`}
                                      size="sm"
                                    />
                                  </div>
                                </div>

                                {fn.explanation && (
                                  <div className="text-xs text-[#4D4842] space-y-1">
                                    <p className="text-[#6B645A]">{cleanText(fn.explanation.summary)}</p>
                                    <p>
                                      <strong className="text-[#292622]">Inputs:</strong>{' '}
                                      {cleanText(fn.explanation.inputs_summary)}
                                    </p>
                                    <p>
                                      <strong className="text-[#292622]">Returns:</strong>{' '}
                                      {cleanText(fn.explanation.returns_summary)}
                                    </p>
                                  </div>
                                )}
                              </div>
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
        </div>
      </div>
    </div>
  );
};

export default ExplanationTab;

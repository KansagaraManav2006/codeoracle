import React from 'react';
import {
  BookOpen,
  Network,
  Download,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Compass,
  ChevronDown,
  Target,
  Play,
  Wand2,
  Flame,
  Code2,
  ShieldCheck,
  Sparkles,
  Boxes,
  ArrowRight,
} from 'lucide-react';
import {
  ProjectAnalysis,
  ArchitectureOverview,
  TabType,
} from '../../types';
import { truncateMiddle, formatNumber } from '../../utils/formatters';
import Button from '../common/Button';
import KpiCard from '../common/KpiCard';
import Badge from '../common/Badge';
import Card from '../common/Card';
import PageHeroHeader from '../common/PageHeroHeader';
import { StatusTag } from '../common/Tags';

interface ArchitectureOverviewCardProps {
  projectName: string;
  canonicalCoverage: any;
  canonicalGraph: any;
  analysis: ProjectAnalysis;
  architecture: ArchitectureOverview | null;
  categorizedEntryPoints: any[];
  coreApplicationModules: any[];
  recommendedTarget: any;
  showScoreDecomposition: boolean;
  onToggleScoreDecomposition: () => void;
  onSelectFile?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onInspectInGraph: (path?: string) => void;
  onAnalyzeImpact: (path?: string) => void;
  onGenerateTests: (path?: string) => void;
  onReviewModernization: (path?: string) => void;
  onOpenHotspots: () => void;
  handleDownloadMarkdown: () => void;
  fetchData: (force: boolean) => void;
  refreshing: boolean;
  setShowDiagnosticsDetails: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ArchitectureOverviewCard: React.FC<ArchitectureOverviewCardProps> = ({
  projectName,
  canonicalCoverage,
  canonicalGraph,
  analysis,
  architecture,
  categorizedEntryPoints,
  coreApplicationModules,
  recommendedTarget,
  showScoreDecomposition,
  onToggleScoreDecomposition,
  onSelectFile,
  onNavigateTab,
  onInspectInGraph,
  onAnalyzeImpact,
  onGenerateTests,
  onReviewModernization,
  onOpenHotspots,
  handleDownloadMarkdown,
  fetchData,
  refreshing,
  setShowDiagnosticsDetails,
}) => {
  return (
    <>
      {/* 1. EXECUTIVE HERO HEADER */}
      <PageHeroHeader
        icon={BookOpen}
        title="Architecture Explanation"
        contextLabel={projectName ? `Codebase Intelligence · ${projectName}` : 'Codebase Intelligence'}
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
            label: 'Explore Dependencies',
            variant: 'primary',
            onClick: () => onNavigateTab?.('graph'),
            icon: <Network className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
          {
            label: 'Download Summary',
            variant: 'secondary',
            onClick: handleDownloadMarkdown,
            icon: <Download className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
          {
            label: 'Refresh',
            variant: 'secondary',
            onClick: () => fetchData(true),
            loading: refreshing,
            loadingText: 'Refreshing…',
            icon: <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
        ]}
      />

      {/* 2. Analysis Confidence Status Strip (when partial or review needed) */}
      {(canonicalCoverage.confidence !== 'high' || canonicalGraph.unresolved_imports > 0) && (
        <section
          className={`w-full rounded-xl border p-3.5 sm:px-4 sm:py-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs ${
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
              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
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
                  Analysis Coverage:
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
                <span className="font-sans text-xs text-ink font-medium">
                  <strong>{canonicalCoverage.fully_parsed}</strong> / {canonicalCoverage.total_source_files} files fully parsed
                  {canonicalCoverage.partial > 0 && (
                    <span className="text-ink-2">
                      {' '}· <strong>{canonicalCoverage.partial}</strong> partial
                    </span>
                  )}
                  {canonicalCoverage.fallback > 0 && (
                    <span className="text-ink-2">
                      {' '}· <strong>{canonicalCoverage.fallback}</strong> fallback
                    </span>
                  )}
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
                className="text-[11px] font-mono font-bold text-indigo hover:text-indigo-hover px-2.5 py-1.5 rounded-lg bg-surface border border-line shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
              >
                <span>{canonicalGraph.unresolved_imports} relationships need review</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </section>
      )}

      {/* 3. Core Architecture Facts (KPI Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <KpiCard
          label="Languages & Scope"
          icon={Code2}
          value={
            <div className="flex items-center gap-1.5 flex-wrap min-h-[30px]">
              {analysis.languages.map((lang) => (
                <span
                  key={lang}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-bold font-sans bg-indigo-surface text-indigo border border-indigo/20 capitalize shadow-2xs"
                >
                  {lang}
                </span>
              ))}
            </div>
          }
          subtext={`${canonicalCoverage.total_source_files} files · ${formatNumber(analysis.total_lines)} LOC`}
        />
        <KpiCard
          label="Parse Coverage"
          icon={ShieldCheck}
          value={`${canonicalCoverage.full_ast_percentage}%`}
          variant={canonicalCoverage.confidence === 'high' ? 'default' : 'highlight'}
          subtext={`${canonicalCoverage.fully_parsed} / ${canonicalCoverage.total_source_files} files complete`}
        />
        <KpiCard
          label="Internal Coupling"
          icon={Network}
          value={
            <span className="flex items-baseline gap-1.5">
              <span>{formatNumber(canonicalGraph.resolved_edges)}</span>
              <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider font-sans">edges</span>
            </span>
          }
          subtext={`${canonicalGraph.unresolved_imports} unresolved · ${canonicalGraph.isolated_modules_count} isolated`}
        />
        <KpiCard
          label="Dependency Loops"
          icon={CheckCircle2}
          value={
            <span className="flex items-baseline gap-1.5">
              <span>{canonicalGraph.cycle_count}</span>
              <span className="text-xs font-semibold text-ink-3 uppercase tracking-wider font-sans">cycles</span>
            </span>
          }
          variant={canonicalGraph.cycle_count > 0 ? 'risk' : 'default'}
          subtext={canonicalGraph.cycle_count === 0 ? 'Clean acyclic graph structure' : canonicalCoverage.cycle_label}
        />
      </div>

      {/* 4. Natural Language Architecture Summary Panel */}
      <Card variant="primary" padding="lg" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-ink leading-tight">
                System Architecture Blueprint
              </h2>
              <p className="text-[11px] text-ink-3">
                Deterministic AST analysis &amp; structural subsystem classification
              </p>
            </div>
          </div>

          {architecture?.frameworks_detected && architecture.frameworks_detected.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {architecture.frameworks_detected.map((fw) => (
                <span
                  key={fw}
                  className="px-2.5 py-1 rounded-pill text-[11px] font-mono font-bold bg-tile text-ink-2 border border-line shadow-2xs"
                >
                  {fw}
                </span>
              ))}
            </div>
          )}
        </div>

        <p className="font-sans text-[13px] sm:text-sm text-ink-2 leading-relaxed">
          {architecture?.architecture_summary ||
            analysis.explanation?.languages_summary ||
            `This codebase contains ${canonicalCoverage.total_source_files} files across ${analysis.languages.join(', ')} with ${formatNumber(
              analysis.total_lines
            )} total lines. CodeOracle parsed AST structures and resolved ${canonicalGraph.resolved_edges} internal module dependencies.`}
        </p>

        {/* 3-Column Structured Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
          {/* Column 1: Application Entry Points */}
          <div className="bg-surface rounded-xl border border-line p-4 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-line/60">
                <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Play className="w-3.5 h-3.5 text-indigo" />
                  Application Entry Points
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-tile text-ink-3 border border-line">
                  {categorizedEntryPoints.length}
                </span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                {categorizedEntryPoints.slice(0, 4).map((ep) => (
                  <div key={ep.path} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-tile/70 transition-colors">
                    <button
                      type="button"
                      onClick={() => onSelectFile?.(ep.path)}
                      className="text-left font-semibold text-indigo hover:underline truncate"
                      title={ep.path}
                    >
                      {truncateMiddle(ep.path, 32)}
                    </button>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-track text-ink-2 border border-line">
                      {ep.kind_label}
                    </span>
                  </div>
                ))}
                {categorizedEntryPoints.length === 0 && (
                  <span className="text-ink-3 text-xs italic p-1.5 block">Modular library without dedicated runner roots.</span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-ink-3 pt-2.5 border-t border-line/60 mt-3 block">
              {categorizedEntryPoints.length} detected application &amp; script roots
            </span>
          </div>

          {/* Column 2: Core Application Modules */}
          <div className="bg-surface rounded-xl border border-line p-4 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-line/60">
                <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Boxes className="w-3.5 h-3.5 text-indigo" />
                  Core Modules
                </span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-tile text-ink-3 border border-line">
                  {coreApplicationModules.length}
                </span>
              </div>
              <div className="space-y-1.5 text-xs font-mono">
                {coreApplicationModules.slice(0, 4).map((mod) => (
                  <div key={mod.path} className="flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-tile/70 transition-colors">
                    <button
                      type="button"
                      onClick={() => onSelectFile?.(mod.path)}
                      className="text-left font-semibold text-indigo hover:underline truncate"
                      title={mod.path}
                    >
                      {truncateMiddle(mod.path, 32)}
                    </button>
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-surface text-indigo border border-indigo/20">
                      {mod.role_label}
                    </span>
                  </div>
                ))}
                {coreApplicationModules.length === 0 && (
                  <span className="text-ink-3 text-xs italic p-1.5 block">All modules parsed as utility scripts.</span>
                )}
              </div>
            </div>
            <span className="text-[10px] text-ink-3 pt-2.5 border-t border-line/60 mt-3 block">
              Excludes generated contracts &amp; build artifacts
            </span>
          </div>

          {/* Column 3: Structural Topology */}
          <div className="bg-surface rounded-xl border border-line p-4 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-line/60">
                <span className="font-sans text-[11px] font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-indigo" />
                  Structural Topology
                </span>
                <span className={`px-2 py-0.5 rounded-pill text-[9px] font-mono font-bold border ${
                  canonicalCoverage.confidence === 'high'
                    ? 'bg-teal-surface text-teal-strong border-teal/20'
                    : 'bg-amber-surface text-amber-strong border-amber/20'
                }`}>
                  {canonicalCoverage.confidence === 'high' ? 'GRAPH: COMPLETE' : 'GRAPH: PARTIAL'}
                </span>
              </div>
              <div className="space-y-1.5 text-xs text-ink-2">
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-ink-3">Internal modules</span>
                  <span className="font-mono font-bold">{canonicalGraph.node_count}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-ink-3">Resolved internal edges</span>
                  <span className="font-mono font-bold text-indigo">{canonicalGraph.resolved_edges}</span>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-line/40">
                  <span className="text-ink-3">Unresolved imports</span>
                  <span className="font-mono font-bold text-amber-strong">{canonicalGraph.unresolved_imports}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-ink-3">External packages</span>
                  <span className="font-mono font-bold">{canonicalGraph.external_references}</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-ink-3 pt-2.5 border-t border-line/60 mt-3 block">
              {canonicalGraph.cycle_count === 0 ? '0 detected cycles in resolved graph' : `${canonicalGraph.cycle_count} cycle loops detected`}
            </span>
          </div>
        </div>
      </Card>

      {/* RECOMMENDED STARTING POINT & SCORE FACTOR DECOMPOSITION */}
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
                  onClick={onToggleScoreDecomposition}
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
                onClick={() => onInspectInGraph()}
                icon={<Network className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Inspect in Dependency Map
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAnalyzeImpact()}
                icon={<Target className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Analyze Change Impact
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onGenerateTests()}
                icon={<Play className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Generate Safety Tests
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onReviewModernization()}
                icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                Review Modernization
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenHotspots}
                icon={<Flame className="w-3.5 h-3.5" strokeWidth={1.75} />}
                className="w-full text-xs font-semibold justify-start"
              >
                View Risk Hotspots Tab
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  );
};

export default ArchitectureOverviewCard;

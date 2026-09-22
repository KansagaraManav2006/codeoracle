import React, { useEffect, useMemo, useState } from 'react';
import {
  Map,
  Download,
  Gauge,
  Network,
  Layers,
  CheckSquare,
  Square,
  Flame,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  TestTube,
  Wand2,
  CheckCircle2,
  Compass,
  Target,
  ChevronDown,
  ChevronRight,
  FileJson,
} from 'lucide-react';
import {
  MigrationPlanResponse,
  ChangeImpact,
  TabType,
  ScoreBlocker,
  ReadinessDimension,
} from '../types';
import { truncateMiddle, getRiskLevelStyle } from '../utils/formatters';
import Button from './common/Button';
import ReadinessGauge from './common/ReadinessGauge';
import ScoreCard from './common/ScoreCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { StatusTag } from './common/Tags';
import { useToast } from './common/Toast';
import FindingFunnel from './common/FindingFunnel';
import ChangeImpactView from './common/ChangeImpactView';
import PriorityMatrix from './migration/PriorityMatrix';
import ReadinessFormulaModal from './migration/ReadinessFormulaModal';

interface MigrationPlanTabProps {
  projectId?: string | null;
  projectName?: string;
  refreshKey?: number;
  isGeneratingTests?: boolean;
  testGenError?: string | null;
  targetFile?: string | null;
  onNavigateTab?: (tab: TabType) => void;
  onFocusInGraph?: (filePath: string) => void;
  onNavigateToTests?: () => void;
  onSelectFile?: (filePath: string) => void;
}

// Deterministic explanation of remaining risk per wave with conditional cycle messaging
const getWaveResidualRisk = (
  waveNum: number,
  cycleCount: number = 0
): { riskLevel: 'high' | 'medium' | 'low'; label: string; description: string } => {
  switch (waveNum) {
    case 0:
      return {
        riskLevel: 'high',
        label: 'HIGH STRUCTURAL RISK',
        description:
          'Source code still contains legacy syntax, cyclomatic complexity, and coupling. Baseline tests now provide a regression harness for subsequent waves.',
      };
    case 1:
      return {
        riskLevel: 'high',
        label: 'MODERATE-TO-HIGH RISK',
        description:
          cycleCount > 0
            ? 'Standalone leaf utilities are modernized, but circular dependency loops and core business services remain unmodernized.'
            : 'Standalone leaf utilities are modernized, but intermediate domain services and root entry points remain to be modernized.',
      };
    case 2:
      if (cycleCount === 0) {
        return {
          riskLevel: 'low',
          label: 'ZERO CYCLE RESIDUAL RISK',
          description: 'No dependency cycles were detected in the resolved graph. This wave is not required.',
        };
      }
      return {
        riskLevel: 'medium',
        label: 'CONTROLLED RISK',
        description:
          'Circular dependency loops are broken, but complex domain services and entry points still require refactoring and contract verification.',
      };
    case 3:
      return {
        riskLevel: 'medium',
        label: 'MODERATE RISK',
        description:
          'Core domain logic is modernized; only root entry points and runtime orchestration remain to be verified.',
      };
    case 4:
      return {
        riskLevel: 'low',
        label: 'LOW RESIDUAL RISK',
        description:
          'All internal layers modernized. Final end-to-end smoke verification and post-deployment monitoring required.',
      };
    default:
      return {
        riskLevel: 'low',
        label: 'CONTROLLED RISK',
        description:
          'Follow automated test execution and verify behavioral equivalence in disposable sandbox before merging.',
      };
  }
};

export const MigrationPlanTab: React.FC<MigrationPlanTabProps> = ({
  projectId,
  projectName: _projectName = 'project',
  refreshKey = 0,
  isGeneratingTests = false,
  testGenError = null,
  targetFile = null,
  onNavigateTab,
  onFocusInGraph,
  onNavigateToTests: _onNavigateToTests,
  onSelectFile,
}) => {
  const [plan, setPlan] = useState<MigrationPlanResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedWaveFilter, setSelectedWaveFilter] = useState<number | null>(null);
  const [activeTableFilter, setActiveTableFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [activeDimensionModal, setActiveDimensionModal] = useState<ReadinessDimension | null>(null);

  const { showToast } = useToast();

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  const toggleExpandRow = (moduleId: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [moduleId]: !prev[moduleId],
    }));
  };

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}/migration-plan?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Failed to load migration plan (${res.status})`);
        return res.json() as Promise<MigrationPlanResponse>;
      })
      .then((data) => {
        setPlan(data);
        setSelectedId((prev) => prev || data.top_priorities?.[0]?.module_id || data.impacts?.[0]?.module_id || '');
      })
      .catch((err) => {
        setError(err.message || 'Unable to load migration plan.');
      })
      .finally(() => setLoading(false));
  }, [projectId, refreshKey]);

  // Sync selectedId when targetFile changes
  useEffect(() => {
    if (targetFile && plan) {
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const match = plan.impacts.find((item) => {
        const itemNorm = item.relative_path.replace(/\\/g, '/').toLowerCase();
        return itemNorm === norm || item.module_id === targetFile || itemNorm.endsWith(norm);
      });
      if (match) setSelectedId(match.module_id);
    }
  }, [targetFile, plan]);

  // Sorted impacts
  const sortedImpacts = useMemo(() => {
    if (!plan) return [];
    return [...plan.impacts].sort((a, b) => {
      if ((b.hotspot_score || 0) !== (a.hotspot_score || 0)) {
        return (b.hotspot_score || 0) - (a.hotspot_score || 0);
      }
      return (b.blast_radius || 0) - (a.blast_radius || 0);
    });
  }, [plan]);

  // Search filtered impacts
  const searchFilteredImpacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedImpacts;
    return sortedImpacts.filter((item) =>
      item.relative_path.toLowerCase().includes(q)
    );
  }, [sortedImpacts, search]);

  const selectedItem: ChangeImpact | undefined =
    plan?.impacts.find((item) => item.module_id === selectedId) || searchFilteredImpacts[0];

  // Table Filter options
  const tableFilteredImpacts = useMemo(() => {
    if (!plan) return [];
    let list = [...plan.impacts];

    switch (activeTableFilter) {
      case 'w0':
        // Files in wave 0
        {
          const w0Files = new Set(plan.waves?.find((w) => w.wave === 0)?.files || []);
          list = list.filter((i) => w0Files.has(i.relative_path));
        }
        break;
      case 'w1':
        list = list.filter((i) => i.wave === 1);
        break;
      case 'w2':
        list = list.filter((i) => i.wave === 2 || i.is_cycle_participant);
        break;
      case 'w3':
        list = list.filter((i) => i.wave === 3);
        break;
      case 'w4':
        list = list.filter((i) => i.wave === 4);
        break;
      case 'high_risk':
        list = list.filter((i) => i.risk_level === 'high' || i.risk_level === 'critical' || (i.hotspot_score || 0) >= 60);
        break;
      case 'missing_protection':
        list = list.filter((i) => !i.protection_status?.generated_tests || i.protection_status.generated_tests === 0);
        break;
      case 'partial_parse':
        list = list.filter((i) => i.change_confidence === 'medium' || i.change_confidence === 'low');
        break;
      case 'high_blast':
        list = list.filter((i) => (i.blast_radius || 0) >= 2);
        break;
      case 'entry':
        list = list.filter((i) => i.wave === 4 || i.affected_entry_points?.length > 0);
        break;
      case 'mod_candidates':
        list = list.filter((i) => (i.reasons || []).some((r) => r.toLowerCase().includes('modernization')));
        break;
      default:
        break;
    }
    return list;
  }, [plan, activeTableFilter]);

  const handleDownloadReport = () => {
    if (!projectId) return;
    window.location.href = `/api/projects/${projectId}/migration-plan/download`;
    showToast('Downloading Executive Migration Markdown Report…', 'info');
  };

  const handleDownloadJson = () => {
    if (!projectId) return;
    window.location.href = `/api/projects/${projectId}/migration-plan/download-json`;
    showToast('Exporting Migration Plan JSON…', 'info');
  };

  if (!projectId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-56 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton h-28" />
          ))}
        </div>
        <div className="skeleton h-[400px] w-full" />
      </div>
    );
  }

  if (error || !plan) {
    return (
      <div className="p-8 bg-red-surface rounded-xl border border-red-line text-center">
        <p className="font-bold text-red-text text-sm mb-3">{error || 'Unable to load migration plan.'}</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (projectId) {
              setLoading(true);
              fetch(`/api/projects/${projectId}/migration-plan?t=${Date.now()}`)
                .then((r) => r.json())
                .then(setPlan)
                .catch(console.error)
                .finally(() => setLoading(false));
            }
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  const cycleCount = plan.waves?.find((w) => w.wave === 2)?.files.length || 0;

  return (
    <div
      className="space-y-4 sm:space-y-5 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-migration"
      aria-labelledby="tab-migration"
    >
      {/* Test Generation Progress Banner if active */}
      {isGeneratingTests && (
        <div className="flex items-center gap-3 p-3.5 bg-indigo-surface border border-indigo/20 rounded-lg text-indigo-text text-xs">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Generating characterization test suites in background… Readiness scores will refresh automatically.</span>
        </div>
      )}
      {testGenError && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-surface border border-amber/30 rounded-lg text-amber-strong text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Test generation note: {testGenError}</span>
        </div>
      )}

      {/* Plan Confidence Warning Banner */}
      {plan.plan_confidence_warning && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-surface/70 border border-amber/30 rounded-lg text-amber-strong text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <div>
            <strong className="font-bold uppercase tracking-wider font-mono mr-1.5">
              Plan Confidence: {plan.plan_confidence?.toUpperCase() || 'MEDIUM'}
            </strong>
            <span>{plan.plan_confidence_warning}</span>
          </div>
        </div>
      )}

      {/* 1. Hero Card: Modernization Intelligence & Executive Plan */}
      <section className="bg-surface border border-line rounded-xl p-6 sm:p-7 shadow-1 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-md bg-ink text-indigo-on-dark flex items-center justify-center shrink-0"
                aria-hidden="true"
              >
                <Map className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-display font-bold text-[20px] text-ink leading-tight">
                    Modernization Intelligence &amp; Plan
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-ink text-white font-sans text-[11px] font-bold tracking-[0.06em] uppercase select-none">
                    DECISION SUPPORT
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-tile border border-line text-ink font-mono text-[11px] font-bold uppercase">
                    CONFIDENCE: {plan.readiness_confidence?.toUpperCase() || 'MEDIUM'}
                  </span>
                </div>
                <p className="font-sans text-xs text-ink-3 mt-0.5">
                  Explainable readiness scoring, blast-radius ripple analysis, and staged modernization waves.
                </p>
              </div>
            </div>

            <p className="font-sans text-[13px] text-ink-2 leading-[1.6] pt-1">
              {plan.executive_summary}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                variant="ink"
                size="md"
                onClick={handleDownloadReport}
                icon={<Download className="w-4 h-4" strokeWidth={1.75} />}
              >
                Download Markdown Plan
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={handleDownloadJson}
                icon={<FileJson className="w-4 h-4" strokeWidth={1.75} />}
              >
                Export JSON Plan
              </Button>
            </div>
          </div>

          <div className="shrink-0 self-center lg:self-auto flex flex-col items-center">
            <ReadinessGauge
              score={plan.readiness_score}
              onExplainClick={() => {
                if (plan.categories?.[0]) setActiveDimensionModal(plan.categories[0]);
              }}
            />
            <div className="flex flex-col items-center mt-1 space-y-0.5">
              <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider">
                Threshold: <strong className="text-ink">{plan.readiness?.threshold_label || plan.readiness_label}</strong>
              </span>
              <span className="text-[10px] text-ink-3 text-center max-w-[220px] italic">
                Readiness is a static-analysis planning score, not a production safety guarantee.
              </span>
            </div>
          </div>
        </div>

        {/* "Why This Score?" Panel */}
        {plan.why_score && (
          <div className="p-4 bg-tile border border-line rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink font-mono">
                Why {plan.readiness_score} / 100? (Readiness Explanation)
              </span>
              <span className="text-[11px] font-mono text-ink-3">
                Full AST: {plan.full_ast_coverage_pct || 0}% &bull; Parser: {plan.parser_readiness_score || 0}/100
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-teal-strong uppercase tracking-wider block">
                  Strong Signals:
                </span>
                <ul className="space-y-1 text-ink-2">
                  {plan.why_score.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-teal-strong font-bold">&check;</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-1">
                <span className="text-[11px] font-bold text-amber-strong uppercase tracking-wider block">
                  Needs Attention:
                </span>
                <ul className="space-y-1 text-ink-2">
                  {plan.why_score.needs_attention.map((n, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-amber-strong font-bold">&bull;</span>
                      <span>{n}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Cross-Tab Navigation Links Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line text-xs">
          <div className="flex items-center gap-1.5 text-ink-3">
            <span className="font-bold text-ink uppercase tracking-wider text-[10px]">
              Explore Connected Views:
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab?.('graph')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <Network className="w-3.5 h-3.5 text-indigo" />
              <span>Dependency Map</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('tests')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <TestTube className="w-3.5 h-3.5 text-teal-strong" />
              <span>Safety Tests</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('hotspots')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <Flame className="w-3.5 h-3.5 text-amber-strong" />
              <span>Risk Hotspots</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab?.('refactor')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo" />
              <span>Modernization</span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Next Best Action Callout Card */}
      {plan.next_best_action && (
        <section className="bg-indigo-surface/40 border border-indigo/25 rounded-xl p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-md bg-indigo text-white flex items-center justify-center shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo">
                Next Best Action
              </span>
              <h3 className="font-bold text-sm text-ink mt-0.5">
                {plan.next_best_action.action}
              </h3>
              <p className="text-xs text-ink-2 mt-0.5">
                {plan.next_best_action.reason}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {plan.next_best_action.target_file && (
              <Button
                variant="indigo"
                size="sm"
                onClick={() => {
                  if (plan.next_best_action?.target_file) {
                    setSelectedId(plan.next_best_action.target_file);
                    onSelectFile?.(plan.next_best_action.target_file);
                  }
                }}
              >
                Inspect Target File
              </Button>
            )}
          </div>
        </section>
      )}

      {/* 3. Readiness Breakdown (5 Auditable Score Cards) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
            <h3 className="font-display font-bold text-base text-ink">Readiness Breakdown</h3>
          </div>
          <span className="text-[11px] font-mono text-ink-3">
            Click any dimension to inspect auditable formula &bull; Deterministic AST Scoring
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {plan.categories && plan.categories.length > 0 ? (
            plan.categories.map((cat, idx) => (
              <div
                key={cat.key || idx}
                onClick={() => setActiveDimensionModal(cat)}
                className="cursor-pointer transition-transform hover:-translate-y-0.5"
                title="Click to view auditable formula"
              >
                <ScoreCard
                  title={cat.label}
                  score={cat.score}
                  description={cat.reason}
                  index={idx}
                />
              </div>
            ))
          ) : (
            <div className="col-span-5 text-center text-xs text-ink-3 py-6">
              Calculating structural readiness dimensions…
            </div>
          )}
        </div>
      </section>

      {/* 4. Score Blockers Section: Separated Global vs Top File Blockers */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center border shrink-0 ${
                (plan.score_blockers?.length || 0) > 0
                  ? 'bg-amber-surface text-amber-strong border-amber/20'
                  : 'bg-teal-surface text-teal-strong border-teal/20'
              }`}
            >
              {(plan.score_blockers?.length || 0) > 0 ? (
                <AlertTriangle className="w-4 h-4" strokeWidth={2} />
              ) : (
                <ShieldCheck className="w-4 h-4" strokeWidth={2} />
              )}
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Readiness Blockers
              </h3>
              <p className="font-sans text-xs text-ink-3">
                Separated global repository-wide blockers from prioritized architectural file blockers.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-ink-2 px-2.5 py-1 rounded-pill bg-tile border border-line">
            {plan.score_blockers?.length || 0} Total Blocker(s)
          </span>
        </div>

        {/* Global Blockers */}
        {plan.global_blockers && plan.global_blockers.length > 0 && (
          <div className="space-y-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-3 block">
              Global Repository Blockers:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.global_blockers.map((b, idx) => (
                <div key={idx} className="p-3.5 rounded-lg bg-tile border border-line space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-ink font-sans flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                      {b.label}
                    </span>
                    <span className="font-mono text-[10px] text-ink-3 uppercase">Global</span>
                  </div>
                  <p className="text-ink-2 leading-relaxed">{b.blocker_reason}</p>
                  <p className="text-teal-strong font-medium leading-relaxed">
                    <strong className="text-ink">Action:</strong> {b.unblocking_action}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* File Blockers */}
        {plan.file_blockers && plan.file_blockers.length > 0 ? (
          <div className="space-y-2 pt-2">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-ink-3 block">
              Top Architectural File Blockers (Ranked by Risk + Blast + Role):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {plan.file_blockers.map((blocker: ScoreBlocker, idx: number) => {
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-amber-surface/30 border border-amber-line/70 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-surface text-amber-strong border border-amber/30">
                        {blocker.label}
                      </span>
                      <span className="text-xs font-mono font-bold text-red-text">
                        Risk: {blocker.risk_level?.toUpperCase() || 'HIGH'} (Score: {blocker.current_score}/100)
                      </span>
                    </div>

                    {blocker.target_file && (
                      <div className="flex items-center gap-1.5 text-xs font-mono text-ink">
                        <span className="text-ink-3 font-sans">Target:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(blocker.target_file!);
                            onSelectFile?.(blocker.target_file!);
                          }}
                          className="font-bold text-indigo hover:underline truncate max-w-[280px]"
                          title={blocker.target_file}
                        >
                          {truncateMiddle(blocker.target_file, 34)}
                        </button>
                      </div>
                    )}

                    <div className="text-xs text-ink-2 space-y-1">
                      <p className="leading-relaxed">
                        <strong className="text-ink">Root Cause:</strong> {blocker.blocker_reason}
                      </p>
                      <p className="leading-relaxed text-teal-strong font-medium">
                        <strong className="text-ink">Unblocking Action:</strong> {blocker.unblocking_action}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-amber-line/40">
                      {blocker.target_file && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onFocusInGraph?.(blocker.target_file!);
                            onNavigateTab?.('graph');
                          }}
                          icon={<Network className="w-3 h-3" />}
                        >
                          Inspect Graph
                        </Button>
                      )}
                      {blocker.target_file && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onSelectFile?.(blocker.target_file!);
                            onNavigateTab?.('tests');
                          }}
                          icon={<TestTube className="w-3 h-3 text-teal-strong" />}
                        >
                          Safety Tests
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-teal-surface/40 border border-teal/20 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-teal-strong shrink-0" />
            <div>
              <strong className="font-bold text-ink block">Zero Critical File Blockers Detected</strong>
              <span className="text-ink-3">
                All prioritized files satisfy baseline test harnesses and structural coupling thresholds.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Priority Matrix (Risk vs Downstream Impact) */}
      <PriorityMatrix
        impacts={sortedImpacts}
        selectedId={selectedId}
        onSelectFile={(f) => {
          setSelectedId(f);
          onSelectFile?.(f);
        }}
      />

      {/* 6. Finding Funnel Section */}
      {plan.finding_funnel && (
        <FindingFunnel funnel={plan.finding_funnel} />
      )}

      {/* 7. Prioritized File Plan Table */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-red-surface text-red-text flex items-center justify-center border border-red-line shrink-0">
              <Target className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Prioritized File Plan
              </h3>
              <p className="font-sans text-xs text-ink-3">
                Every file includes its canonical risk rating, architectural role, wave eligibility rationale, and protection status.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-ink-3">
            Showing {tableFilteredImpacts.length} file(s)
          </span>
        </div>

        {/* Filter Chips Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2">
          <FilterChip
            label="ALL FILES"
            active={activeTableFilter === 'all'}
            onClick={() => setActiveTableFilter('all')}
          />
          <FilterChip
            label="WAVE 0 (PROTECT)"
            active={activeTableFilter === 'w0'}
            onClick={() => setActiveTableFilter('w0')}
          />
          <FilterChip
            label="WAVE 1 (LEAVES)"
            active={activeTableFilter === 'w1'}
            onClick={() => setActiveTableFilter('w1')}
          />
          <FilterChip
            label="WAVE 2 (CYCLES)"
            active={activeTableFilter === 'w2'}
            onClick={() => setActiveTableFilter('w2')}
          />
          <FilterChip
            label="WAVE 3 (SERVICES)"
            active={activeTableFilter === 'w3'}
            onClick={() => setActiveTableFilter('w3')}
          />
          <FilterChip
            label="WAVE 4 (ENTRY)"
            active={activeTableFilter === 'w4'}
            onClick={() => setActiveTableFilter('w4')}
          />
          <FilterChip
            label="HIGH RISK"
            active={activeTableFilter === 'high_risk'}
            onClick={() => setActiveTableFilter('high_risk')}
          />
          <FilterChip
            label="MISSING TESTS"
            active={activeTableFilter === 'missing_tests'}
            onClick={() => setActiveTableFilter('missing_tests')}
          />
          <FilterChip
            label="HIGH BLAST"
            active={activeTableFilter === 'high_blast'}
            onClick={() => setActiveTableFilter('high_blast')}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-tile text-ink-2 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-2.5 w-7"></th>
                <th className="p-2.5">File</th>
                <th className="p-2.5">Wave</th>
                <th className="p-2.5">Risk Rating</th>
                <th className="p-2.5">Role</th>
                <th className="p-2.5">Blast Radius</th>
                <th className="p-2.5">Protection</th>
                <th className="p-2.5">Confidence</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono">
              {tableFilteredImpacts.map((item) => {
                const riskStyle = getRiskLevelStyle(item.risk_level);
                const isSelected = selectedItem?.module_id === item.module_id;
                const isExpanded = Boolean(expandedRows[item.module_id]);
                const directCount = item.direct_dependents?.length || 0;
                const rippleCount = item.blast_radius || 0;
                const testCount = item.protection_status?.generated_tests || (item.suggested_tests?.length > 0 && !item.suggested_tests[0].includes('Generate') ? item.suggested_tests.length : 0);

                return (
                  <React.Fragment key={item.module_id}>
                    <tr
                      className={`transition-colors hover:bg-tile/70 ${
                        isSelected ? 'bg-indigo-surface/40 font-bold' : ''
                      }`}
                    >
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpandRow(item.module_id)}
                          className="p-0.5 rounded text-ink-3 hover:text-ink"
                          title="Toggle why wave / why priority details"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedId(item.module_id);
                            onSelectFile?.(item.relative_path);
                          }}
                          className="text-indigo hover:underline text-left block truncate max-w-[240px]"
                          title={item.relative_path}
                        >
                          {truncateMiddle(item.relative_path, 28)}
                        </button>
                      </td>
                      <td className="p-2.5">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-tile border border-line text-ink">
                          WAVE {item.wave || 1}
                        </span>
                      </td>
                      <td className="p-2.5 font-sans">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-[10px] px-2 py-0.5 rounded-pill font-mono font-bold uppercase tracking-wider ${riskStyle.badgeClass}`}>
                            RISK: {riskStyle.label} {item.hotspot_score !== undefined ? `· ${item.hotspot_score}` : ''}
                          </span>
                          {item.complexity_severity === 'critical' && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-surface text-red-strong border border-red-line font-mono font-bold uppercase">
                              COMPLEX: CRITICAL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-2.5 text-ink-3 uppercase text-[10px]">
                        {item.architecture_role || 'utility'}
                      </td>
                      <td className="p-2.5 text-ink font-bold">
                        {rippleCount} {rippleCount === 1 ? 'file' : 'files'} ({directCount} dir)
                      </td>
                      <td className="p-2.5">
                        {testCount > 0 ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-teal-surface text-teal-strong border border-teal/20 font-mono">
                            {testCount} test(s)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-surface text-amber-strong border border-amber/25 font-mono">
                            Unprotected
                          </span>
                        )}
                      </td>
                      <td className="p-2.5 text-ink-3 uppercase text-[10px]">
                        {item.change_confidence || 'medium'}
                      </td>
                      <td className="p-2.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(item.module_id);
                              onSelectFile?.(item.relative_path);
                            }}
                            className="px-2 py-1 rounded text-[11px] font-semibold bg-tile hover:bg-indigo-surface text-ink hover:text-indigo border border-line"
                          >
                            Inspect
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onFocusInGraph?.(item.relative_path);
                              onNavigateTab?.('graph');
                            }}
                            title="Focus in Dependency Map"
                            className="p-1 rounded text-ink-3 hover:text-indigo hover:bg-tile"
                          >
                            <Network className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectFile?.(item.relative_path);
                              onNavigateTab?.('hotspots');
                            }}
                            title="Risk Hotspots"
                            className="p-1 rounded text-ink-3 hover:text-amber-strong hover:bg-tile"
                          >
                            <Flame className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onSelectFile?.(item.relative_path);
                              onNavigateTab?.('tests');
                            }}
                            title="Safety Tests"
                            className="p-1 rounded text-ink-3 hover:text-teal-strong hover:bg-tile"
                          >
                            <TestTube className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Explanation Row */}
                    {isExpanded && (
                      <tr className="bg-tile/40 text-xs font-sans">
                        <td colSpan={9} className="p-4 border-b border-line space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink block">
                                Why Wave {item.wave || 1}?
                              </span>
                              <p className="text-ink-2 text-xs leading-relaxed">
                                {item.wave_eligibility_reason || 'Standard wave assignment based on incoming dependents and blast radius.'}
                              </p>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink block">
                                Risk Evidence &amp; Blast Factors:
                              </span>
                              <div className="flex flex-wrap gap-1">
                                {(item.risk_evidence || []).map((ev, eIdx) => (
                                  <span key={eIdx} className="px-2 py-0.5 rounded bg-surface border border-line font-mono text-[10px] text-ink-2">
                                    {ev}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-1">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink block">
                                Recommended Next Action:
                              </span>
                              <p className="text-teal-strong font-medium text-xs leading-relaxed">
                                {item.recommended_action}
                              </p>
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
      </section>

      {/* 8. "What Breaks If I Change This?" Section */}
      <section className="space-y-3">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            What Breaks If I Change This?
          </h3>
          <p className="font-sans text-xs text-ink-3 mt-0.5">
            Select any file to calculate downstream blast radius, direct callers, affected entry points, and required protection tests.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start">
          {/* Left: Source files list */}
          <div
            role="listbox"
            aria-label="Blast radius source files"
            className="bg-surface border border-line rounded-lg p-3 shadow-1 max-h-[520px] flex flex-col"
          >
            <div className="px-1 pb-3 border-b border-line">
              <SearchField
                id="migration-filter"
                value={search}
                onChange={setSearch}
                placeholder="Search source files…"
                className="w-full"
              />
            </div>

            <div className="overflow-y-auto custom-scrollbar divide-y divide-line/40 mt-2 pr-1">
              {searchFilteredImpacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-3">
                  No files match &ldquo;{search}&rdquo;.
                </div>
              ) : (
                searchFilteredImpacts.map((item) => {
                  const isSelected = selectedItem?.module_id === item.module_id;
                  const itemRisk = getRiskLevelStyle(item.risk_level);
                  const downstreamCount = item.direct_dependents?.length || 0;

                  return (
                    <button
                      key={item.module_id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedId(item.module_id);
                        onSelectFile?.(item.relative_path);
                      }}
                      className={`w-full text-left p-2.5 rounded-md transition-colors my-0.5 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                        isSelected
                          ? 'bg-indigo-surface text-indigo-text font-bold shadow-xs'
                          : 'hover:bg-tile text-ink'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="font-mono text-xs truncate"
                          title={item.relative_path}
                        >
                          {truncateMiddle(item.relative_path, 26)}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded-pill uppercase tracking-wider shrink-0 ${itemRisk.badgeClass}`}
                        >
                          {itemRisk.label}
                        </span>
                      </div>
                      <div className="text-[11px] font-sans font-normal text-ink-3 mt-1">
                        {downstreamCount} downstream {downstreamCount === 1 ? 'file' : 'files'} affected
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Blast-Radius Detail Area powered by ChangeImpactView */}
          <div className="w-full">
            <ChangeImpactView
              projectId={projectId}
              targetFile={selectedItem?.relative_path || targetFile}
              impact={selectedItem}
              onSelectFile={(f) => {
                const found = plan?.impacts.find(
                  (i) => i.relative_path === f || i.relative_path.endsWith(f)
                );
                if (found) setSelectedId(found.module_id);
                onSelectFile?.(f);
              }}
              onFocusInGraph={onFocusInGraph}
              onNavigateTab={onNavigateTab}
              showHeroAction={true}
              onPrimaryAction={() => {
                if (selectedItem) {
                  onFocusInGraph?.(selectedItem.relative_path);
                  onNavigateTab?.('graph');
                }
              }}
            />
          </div>
        </div>
      </section>

      {/* 9. Migration Waves: Staged Modernization Roadmap */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-md bg-indigo-surface text-indigo flex items-center justify-center border border-indigo/20">
              <Layers className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Migration Waves Roadmap
              </h3>
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                Topologically ordered execution waves designed to isolate risk and prevent cascading regressions.
              </p>
            </div>
          </div>

          {/* Wave Filter Chips */}
          {plan.waves && plan.waves.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <FilterChip
                label={`ALL WAVES (${plan.waves.length})`}
                active={selectedWaveFilter === null}
                onClick={() => setSelectedWaveFilter(null)}
              />
              {plan.waves.map((w) => (
                <FilterChip
                  key={w.wave}
                  label={`WAVE ${w.wave}`}
                  active={selectedWaveFilter === w.wave}
                  onClick={() => setSelectedWaveFilter(w.wave)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Migration Progression Flow Graphic */}
        <div className="p-4 bg-surface border border-line rounded-xl shadow-xs space-y-3">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-3 block">
            Staged Execution Dependency Flow:
          </span>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-surface/30 border border-red-line text-ink font-bold">
              <span className="w-2 h-2 rounded-full bg-red-strong" />
              <span>PROTECT (W0)</span>
            </div>
            <span className="text-ink-3 font-bold">&rarr;</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-surface/30 border border-teal/20 text-ink font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-strong" />
              <span>LEAVES (W1)</span>
            </div>
            <span className="text-ink-3 font-bold">&rarr;</span>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-bold ${
              cycleCount === 0
                ? 'bg-tile border-line text-ink-3'
                : 'bg-amber-surface/30 border-amber-line text-ink'
            }`}>
              <span className={`w-2 h-2 rounded-full ${cycleCount === 0 ? 'bg-ink-3' : 'bg-amber-strong'}`} />
              <span>CYCLES (W2){cycleCount === 0 ? ' — NOT REQUIRED' : ''}</span>
            </div>
            <span className="text-ink-3 font-bold">&rarr;</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-surface/30 border border-indigo/20 text-ink font-bold">
              <span className="w-2 h-2 rounded-full bg-indigo" />
              <span>CORE SERVICES (W3)</span>
            </div>
            <span className="text-ink-3 font-bold">&rarr;</span>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-line text-ink font-bold">
              <span className="w-2 h-2 rounded-full bg-ink" />
              <span>ENTRY POINTS (W4)</span>
            </div>
          </div>
        </div>

        {/* Waves List */}
        <div className="space-y-4">
          {(plan.waves && plan.waves.length > 0
            ? plan.waves.filter((w) => selectedWaveFilter === null || w.wave === selectedWaveFilter)
            : []
          ).map((wave) => {
            const residualRisk = getWaveResidualRisk(wave.wave, cycleCount);
            const isNotRequired = wave.status === 'not_required';

            return (
              <article
                key={wave.wave}
                className={`bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4 transition-all ${
                  isNotRequired ? 'opacity-80' : ''
                }`}
              >
                {/* Wave Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-line">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-md bg-ink text-white font-mono font-bold text-xs flex items-center justify-center shrink-0">
                      W{wave.wave}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-display font-bold text-ink text-sm sm:text-base">
                          {wave.title}
                        </h4>
                        {isNotRequired ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-tile text-ink-3 border border-line">
                            NOT REQUIRED
                          </span>
                        ) : (
                          <StatusTag
                            status={wave.risk_level}
                            label={wave.risk_level.toUpperCase()}
                          />
                        )}
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-tile border border-line text-ink-3">
                          CONFIDENCE: {wave.confidence?.toUpperCase() || 'MEDIUM'}
                        </span>
                      </div>
                      <p className="text-xs text-ink-3 mt-0.5 font-medium">
                        <strong className="text-ink font-sans">Goal:</strong> {wave.goal}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-ink-3">
                    <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                      {wave.files.length} {wave.files.length === 1 ? 'file' : 'files'}
                    </span>
                    <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                      Protection: <strong className="text-ink">{wave.protection_readiness_pct || 0}%</strong>
                    </span>
                    <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                      Ripple: <strong className="text-ink">{wave.total_transitive_blast_radius}</strong>
                    </span>
                  </div>
                </div>

                {/* Why this wave comes first / next (Topological Rationale) */}
                <div className="p-3.5 bg-indigo-surface/40 border border-indigo/20 rounded-lg text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-ink">
                    <Compass className="w-3.5 h-3.5 text-indigo shrink-0" />
                    <span>Why this wave comes first / next:</span>
                  </div>
                  <p className="text-ink-2 leading-relaxed pl-5">
                    {wave.strategy}
                  </p>
                </div>

                {/* Wave Files (Click to inspect in blast radius) */}
                {wave.files.length > 0 ? (
                  <div>
                    <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider block mb-2">
                      Files in this wave ({wave.files.length}) &bull; Click to inspect blast radius:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                      {wave.files.map((file) => (
                        <button
                          key={file}
                          type="button"
                          onClick={() => {
                            setSelectedId(file);
                            onSelectFile?.(file);
                          }}
                          className={`font-mono text-xs px-2.5 py-1 rounded-md border transition-colors ${
                            selectedId === file
                              ? 'bg-indigo-surface text-indigo-text font-bold border-indigo/30'
                              : 'bg-surface text-ink border-line hover:bg-tile'
                          }`}
                        >
                          {truncateMiddle(file, 28)}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  isNotRequired && (
                    <div className="p-3 rounded-lg bg-tile border border-line text-xs text-ink-3 italic">
                      No files assigned &bull; Dependency cycles were not detected in this project.
                    </div>
                  )
                )}

                {/* Suggested Tests & Wave Checklist */}
                {!isNotRequired && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Suggested Test Order */}
                    <div className="bg-tile border border-line rounded-md p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-ink block">
                          Suggested Protection Tests to Run:
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateTab?.('tests')}
                          className="text-[11px] font-semibold text-teal-strong hover:underline"
                        >
                          Open Safety Tests &rarr;
                        </button>
                      </div>

                      {wave.suggested_test_order && wave.suggested_test_order.length > 0 ? (
                        <ol className="space-y-1 list-decimal pl-4 font-mono text-[11px] text-ink-2 max-h-36 overflow-y-auto custom-scrollbar">
                          {wave.suggested_test_order.slice(0, 6).map((testPath, idx) => (
                            <li key={idx} className="truncate" title={testPath}>
                              {testPath}
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p className="text-xs text-ink-3 italic">
                          Run general project tests before and after modifying this wave.
                        </p>
                      )}
                    </div>

                    {/* Checklist */}
                    <div className="bg-tile border border-line rounded-md p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-ink">
                          <CheckSquare className="w-3.5 h-3.5 text-teal-strong" />
                          <span>Wave Checklist:</span>
                        </div>
                        <span className="text-[10px] font-mono text-ink-3 font-semibold">
                          {wave.checklist.filter((c) => completedTasks[c.id]).length} / {wave.checklist.length} done
                        </span>
                      </div>

                      <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar pr-1">
                        {wave.checklist.map((item) => {
                          const isDone = Boolean(completedTasks[item.id]);
                          return (
                            <div
                              key={item.id}
                              role="checkbox"
                              aria-checked={isDone}
                              tabIndex={0}
                              onClick={() => toggleTask(item.id)}
                              onKeyDown={(e) => {
                                if (e.key === ' ' || e.key === 'Enter') {
                                  e.preventDefault();
                                  toggleTask(item.id);
                                }
                              }}
                              className={`flex items-start gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                                isDone ? 'bg-teal-surface text-teal-strong line-through' : 'hover:bg-surface text-ink-2'
                              }`}
                            >
                              {isDone ? (
                                <CheckSquare className="mt-0.5 w-3.5 h-3.5 shrink-0 text-teal-strong" />
                              ) : (
                                <Square className="mt-0.5 w-3.5 h-3.5 shrink-0 text-ink-3" />
                              )}
                              <span className="leading-snug">{item.task}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* Residual Risk Remaining Box */}
                <div
                  className={`p-3.5 rounded-lg border text-xs space-y-1 ${
                    residualRisk.riskLevel === 'high'
                      ? 'bg-amber-surface/40 border-amber-line/70'
                      : residualRisk.riskLevel === 'medium'
                      ? 'bg-indigo-surface/30 border-indigo/20'
                      : 'bg-teal-surface/30 border-teal/20'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-ink flex-wrap">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-strong shrink-0" />
                    <span>Residual Risk Remaining After Wave {wave.wave}:</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-pill font-sans uppercase tracking-wider font-bold border ${
                        residualRisk.riskLevel === 'high'
                          ? 'bg-amber-surface text-amber-text border-amber-line/60'
                          : residualRisk.riskLevel === 'medium'
                          ? 'bg-amber-surface/70 text-amber-text border-amber-line/40'
                          : 'bg-teal-surface text-teal-text border-teal/25'
                      }`}
                    >
                      {residualRisk.label}
                    </span>
                  </div>
                  <p className="text-ink-2 pl-5 leading-relaxed">
                    {residualRisk.description}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Auditable Readiness Formula Modal */}
      <ReadinessFormulaModal
        dimension={activeDimensionModal}
        isOpen={Boolean(activeDimensionModal)}
        onClose={() => setActiveDimensionModal(null)}
      />
    </div>
  );
};

export default MigrationPlanTab;

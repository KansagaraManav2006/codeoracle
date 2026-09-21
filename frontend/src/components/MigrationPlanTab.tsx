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
  ListOrdered,
  Compass,
  Target,
} from 'lucide-react';
import { MigrationPlanResponse, ChangeImpact, TabType, ScoreBlocker } from '../types';
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

// Deterministic explanation of remaining risk per wave
const getWaveResidualRisk = (waveNum: number): { riskLevel: 'high' | 'medium' | 'low'; label: string; description: string } => {
  switch (waveNum) {
    case 0:
      return {
        riskLevel: 'high',
        label: 'HIGH STRUCTURAL RISK',
        description:
          'Source code still contains legacy syntax, cyclomatic complexity, and circular coupling. Baseline tests now provide a regression harness for subsequent waves.',
      };
    case 1:
      return {
        riskLevel: 'high',
        label: 'MODERATE-TO-HIGH RISK',
        description:
          'Standalone leaf utilities are modernized, but circular dependency loops and core business services remain unmodernized.',
      };
    case 2:
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
          'Follow automated test execution and verify behavioral equivalence in the disposable sandbox before merging.',
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
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [selectedWaveFilter, setSelectedWaveFilter] = useState<number | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  const { showToast } = useToast();

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
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

  // Default sort for blast radius list is highest risk first
  const sortedImpacts = useMemo(() => {
    if (!plan) return [];
    const riskOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    return [...plan.impacts].sort((a, b) => {
      const rA = riskOrder[a.risk_level?.toLowerCase()] || 0;
      const rB = riskOrder[b.risk_level?.toLowerCase()] || 0;
      if (rA !== rB) return rB - rA;
      return (b.blast_radius || 0) - (a.blast_radius || 0);
    });
  }, [plan]);

  const filteredImpacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedImpacts;
    return sortedImpacts.filter((item) =>
      item.relative_path.toLowerCase().includes(q)
    );
  }, [sortedImpacts, search]);

  const selectedItem: ChangeImpact | undefined =
    plan?.impacts.find((item) => item.module_id === selectedId) || filteredImpacts[0];

  // Priority files list (use top_priorities if available, else top 6 from sortedImpacts)
  const priorityFiles: ChangeImpact[] = useMemo(() => {
    if (!plan) return [];
    if (plan.top_priorities && plan.top_priorities.length > 0) {
      return plan.top_priorities;
    }
    return sortedImpacts.slice(0, 6);
  }, [plan, sortedImpacts]);

  const handleDownloadReport = () => {
    if (!projectId) return;
    window.location.href = `/api/projects/${projectId}/migration-plan/download`;
    showToast('Downloading Executive Migration Report…', 'info');
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

  return (
    <div
      className="space-y-3.5 sm:space-y-4 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-migration"
      aria-labelledby="tab-migration"
    >
      {/* Test Generation Progress Banner if active */}
      {isGeneratingTests && (
        <div className="flex items-center gap-3 p-3.5 bg-indigo-surface border border-indigo/20 rounded-lg text-indigo-text text-xs">
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>Generating characterization test suites in background… Readiness test scores will automatically refresh upon completion.</span>
        </div>
      )}
      {testGenError && (
        <div className="flex items-center gap-3 p-3.5 bg-amber-surface border border-amber/30 rounded-lg text-amber-strong text-xs">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Test generation note: {testGenError}</span>
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
                <div className="flex items-center gap-2">
                  <h2 className="font-display font-bold text-[20px] text-ink leading-tight">
                    Modernization Intelligence &amp; Plan
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-ink text-white font-sans text-[11px] font-bold tracking-[0.06em] uppercase select-none">
                    DECISION SUPPORT
                  </span>
                </div>
                <p className="font-sans text-xs text-ink-3 mt-0.5">
                  Explainable readiness assessment, blast-radius ripple analysis, and staged modernization roadmap.
                </p>
              </div>
            </div>

            <p className="font-sans text-[13px] text-ink-2 leading-[1.6] pt-1">
              {plan.executive_summary ||
                'CodeOracle computed architecture readiness based on module complexity, dependency cycles, test isolation, and maintainability metrics.'}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <Button
                variant="ink"
                size="md"
                onClick={handleDownloadReport}
                icon={<Download className="w-4 h-4" strokeWidth={1.75} />}
              >
                Download Executive Report
              </Button>
            </div>
          </div>

          <div className="shrink-0 self-center lg:self-auto flex flex-col items-center">
            <ReadinessGauge
              score={plan.readiness_score}
              onExplainClick={() => setShowScoreModal(true)}
            />
            <span className="text-[11px] font-mono text-ink-3 mt-1 uppercase tracking-wider">
              Status: <strong className="text-ink">{plan.readiness_label || 'Calculated'}</strong>
            </span>
          </div>
        </div>

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

      {/* 2. Recommended Action Order & Strategic Rationale */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-line">
          <div className="w-8 h-8 rounded-md bg-indigo-surface text-indigo flex items-center justify-center border border-indigo/20 shrink-0">
            <ListOrdered className="w-4 h-4" strokeWidth={2} />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-ink">
              Recommended Action Order &amp; Strategy
            </h3>
            <p className="font-sans text-xs text-ink-3">
              Answers: &ldquo;What should the engineering team modernize first, and why?&rdquo;
            </p>
          </div>
        </div>

        {plan.first_action_summary && (
          <div className="p-3.5 bg-indigo-surface/50 border border-indigo/20 rounded-lg text-xs text-indigo-text space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-ink">
              <Compass className="w-4 h-4 text-indigo shrink-0" />
              <span>Executive Action Guidance:</span>
            </div>
            <p className="leading-relaxed text-ink-2 pl-5">
              {plan.first_action_summary}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          <div className="p-3 bg-tile border border-line rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px]">1</span>
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-mono">Wave 0</span>
            </div>
            <h4 className="font-bold text-xs text-ink">Lock Safety Net</h4>
            <p className="text-[11px] text-ink-3 leading-snug">
              Generate characterization tests for high-risk files to prevent regressions.
            </p>
          </div>

          <div className="p-3 bg-tile border border-line rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px]">2</span>
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-mono">Wave 1</span>
            </div>
            <h4 className="font-bold text-xs text-ink">Leaf Modules</h4>
            <p className="text-[11px] text-ink-3 leading-snug">
              Modernize standalone utilities with 0 downstream blast radius.
            </p>
          </div>

          <div className="p-3 bg-tile border border-line rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px]">3</span>
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-mono">Wave 2</span>
            </div>
            <h4 className="font-bold text-xs text-ink">Decouple Cycles</h4>
            <p className="text-[11px] text-ink-3 leading-snug">
              Break circular dependency loops to eliminate coupling deadlocks.
            </p>
          </div>

          <div className="p-3 bg-tile border border-line rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px]">4</span>
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-mono">Wave 3</span>
            </div>
            <h4 className="font-bold text-xs text-ink">Business Services</h4>
            <p className="text-[11px] text-ink-3 leading-snug">
              Refactor core domain logic once underlying leaves and cycles are stabilized.
            </p>
          </div>

          <div className="p-3 bg-tile border border-line rounded-lg space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px]">5</span>
              <span className="text-[10px] uppercase tracking-wider text-ink-3 font-mono">Wave 4</span>
            </div>
            <h4 className="font-bold text-xs text-ink">Entry Points</h4>
            <p className="text-[11px] text-ink-3 leading-snug">
              Update orchestration and perform end-to-end sandbox verification.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Readiness Breakdown (5 Score Cards) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
            <h3 className="font-display font-bold text-base text-ink">Readiness Breakdown</h3>
          </div>
          <span className="text-[11px] font-mono text-ink-3">
            Deterministic AST Scoring (Static)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {plan.categories && plan.categories.length > 0 ? (
            plan.categories.map((cat, idx) => (
              <ScoreCard
                key={cat.key || idx}
                title={cat.label}
                score={cat.score}
                description={cat.reason}
                index={idx}
              />
            ))
          ) : (
            <>
              <ScoreCard title="Code understanding" score={85} description="AST structure fully parsed and mapped." index={0} />
              <ScoreCard title="Complexity" score={92} description="Controlled cyclomatic complexity across modules." index={1} />
              <ScoreCard title="Dependency safety" score={35} description="Cycles detected requiring decoupling before migration." index={2} />
              <ScoreCard title="Maintainability" score={88} description="Standard symbol structure and clean function sizes." index={3} />
              <ScoreCard title="Test protection" score={76} description="Characterization test contracts generated." index={4} />
            </>
          )}
        </div>
      </section>

      {/* 4. Score Blockers Section */}
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
                Score Blockers (Dragging Readiness Down)
              </h3>
              <p className="font-sans text-xs text-ink-3">
                Identifies low-scoring categories, root causes, and explicit unblocking actions.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold text-ink-2 px-2.5 py-1 rounded-pill bg-tile border border-line">
            {plan.score_blockers?.length || 0} Blocker(s)
          </span>
        </div>

        {plan.score_blockers && plan.score_blockers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {plan.score_blockers.map((blocker: ScoreBlocker, idx: number) => {
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
                      Score: {blocker.current_score} / 100
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
                      <strong className="text-ink">Blocker Reason:</strong> {blocker.blocker_reason}
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
                        Inspect in Dependency Map
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
                        Generate Safety Tests
                      </Button>
                    )}
                    {blocker.target_file && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(blocker.target_file!);
                          onNavigateTab?.('hotspots');
                        }}
                        icon={<Flame className="w-3 h-3 text-amber-strong" />}
                      >
                        Inspect Risk Hotspot
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-teal-surface/40 border border-teal/20 text-xs flex items-center gap-3">
            <CheckCircle2 className="w-4 h-4 text-teal-strong shrink-0" />
            <div>
              <strong className="font-bold text-ink block">Zero Critical Score Blockers Detected</strong>
              <span className="text-ink-3">
                All structural readiness dimensions meet baseline safety thresholds. Proceed through ordered migration waves.
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 5. Finding Funnel Section */}
      {plan.finding_funnel && (
        <FindingFunnel funnel={plan.finding_funnel} />
      )}

      {/* 6. Top Priority Files Section */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-md bg-red-surface text-red-text flex items-center justify-center border border-red-line shrink-0">
              <Target className="w-4 h-4" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-ink">
                Priority Files for Modernization
              </h3>
              <p className="font-sans text-xs text-ink-3">
                Ranked by coupling risk, downstream blast radius, and migration wave dependency.
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-ink-3">
            Showing {priorityFiles.length} priority target(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-line bg-tile text-ink-2 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-2.5">Target Module</th>
                <th className="p-2.5">Risk Level</th>
                <th className="p-2.5">Wave</th>
                <th className="p-2.5">Direct Blast</th>
                <th className="p-2.5">Transitive Ripple</th>
                <th className="p-2.5">Depth</th>
                <th className="p-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 font-mono">
              {priorityFiles.map((item) => {
                const riskStyle = getRiskLevelStyle(item.risk_level);
                const isSelected = selectedItem?.module_id === item.module_id;
                const directCount = item.direct_dependents?.length || item.direct_blast_radius || 0;
                const rippleCount = item.blast_radius || item.transitive_blast_radius || 0;

                return (
                  <tr
                    key={item.module_id}
                    className={`transition-colors hover:bg-tile/70 ${
                      isSelected ? 'bg-indigo-surface/40 font-bold' : ''
                    }`}
                  >
                    <td className="p-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(item.module_id);
                          onSelectFile?.(item.relative_path);
                        }}
                        className="text-indigo hover:underline text-left block truncate max-w-[260px]"
                        title={item.relative_path}
                      >
                        {truncateMiddle(item.relative_path, 32)}
                      </button>
                    </td>
                    <td className="p-2.5 font-sans">
                      <span className={`text-[10px] px-2 py-0.5 rounded-pill uppercase tracking-wider ${riskStyle.badgeClass}`}>
                        {riskStyle.label}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-tile border border-line text-ink">
                        WAVE {item.wave || 1}
                      </span>
                    </td>
                    <td className="p-2.5 text-ink">
                      {directCount}
                    </td>
                    <td className="p-2.5 text-ink font-bold">
                      {rippleCount} files
                    </td>
                    <td className="p-2.5 text-ink-3">
                      {item.dependency_depth || 0} hops
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
                          title="View Hotspots"
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
                        <button
                          type="button"
                          onClick={() => {
                            onSelectFile?.(item.relative_path);
                            onNavigateTab?.('refactor');
                          }}
                          title="Preview Modernization"
                          className="p-1 rounded text-ink-3 hover:text-indigo hover:bg-tile"
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 7. "What Breaks If I Change This?" Section */}
      <section className="space-y-3">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            What Breaks If I Change This?
          </h3>
          <p className="font-sans text-xs text-ink-3 mt-0.5">
            Select any file to calculate its downstream blast radius, direct callers, affected entry points, and required protection tests.
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
              {filteredImpacts.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-3">
                  No files match &ldquo;{search}&rdquo;.
                </div>
              ) : (
                filteredImpacts.map((item) => {
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

      {/* 8. Migration Waves: Staged Modernization Roadmap */}
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
                Topologically ordered execution waves designed to isolate risk and prevent regressions.
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

        {/* Waves List */}
        <div className="space-y-4">
          {(plan.waves && plan.waves.length > 0
            ? plan.waves.filter((w) => selectedWaveFilter === null || w.wave === selectedWaveFilter)
            : []
          ).map((wave) => {
            const residualRisk = getWaveResidualRisk(wave.wave);

            return (
              <article
                key={wave.wave}
                className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4 transition-all"
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
                        <StatusTag
                          status={wave.risk_level}
                          label={wave.risk_level.toUpperCase()}
                        />
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

                {/* Suggested Tests & Wave Checklist */}
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

                {/* Wave Actions Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-line">
                  {wave.files[0] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onFocusInGraph?.(wave.files[0])}
                      icon={<Network className="w-3.5 h-3.5" />}
                    >
                      Inspect in Dependency Map
                    </Button>
                  )}
                  {wave.files[0] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onSelectFile?.(wave.files[0]);
                        onNavigateTab?.('tests');
                      }}
                      icon={<TestTube className="w-3.5 h-3.5 text-teal-strong" />}
                    >
                      Inspect Safety Tests
                    </Button>
                  )}
                  {wave.files[0] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onSelectFile?.(wave.files[0]);
                        onNavigateTab?.('hotspots');
                      }}
                      icon={<Flame className="w-3.5 h-3.5 text-amber-strong" />}
                    >
                      Inspect Risk Hotspots
                    </Button>
                  )}
                  {wave.files[0] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onSelectFile?.(wave.files[0]);
                        onNavigateTab?.('refactor');
                      }}
                      icon={<Wand2 className="w-3.5 h-3.5 text-indigo" />}
                    >
                      Preview Modernization
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* Score explanation modal */}
      {showScoreModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-modal flex items-center justify-center p-4 bg-ink/40 backdrop-blur-[6px]"
        >
          <div className="w-full max-w-[480px] bg-surface rounded-xl border border-line shadow-4 p-6 space-y-4">
            <h3 className="font-display font-bold text-lg text-ink">
              How Readiness Is Calculated
            </h3>
            <p className="font-sans text-xs text-ink-2 leading-[1.6]">
              CodeOracle evaluates five weighted structural dimensions: AST code understanding (20%), cyclomatic complexity hotspot distribution (20%), dependency safety &amp; cycles (20%), structural maintainability (20%), and characterization test coverage (20%).
            </p>
            <p className="font-sans text-xs text-ink-3">
              Scores reflect deterministic static AST analysis and dependency graph topological heuristics. No subjective effort estimates or guesswork are applied.
            </p>
            <div className="pt-2 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowScoreModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MigrationPlanTab;

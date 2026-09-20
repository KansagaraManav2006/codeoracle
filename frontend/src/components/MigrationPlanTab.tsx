import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  Download,
  FileWarning,
  Gauge,
  GitFork,
  Layers,
  ListOrdered,
  Loader2,
  Map,
  Network,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Target,
  Wrench,
} from 'lucide-react';
import { ChangeImpact, MigrationPlanResponse, TabType } from '../types';
import ReadinessGauge from './common/ReadinessGauge';
import RiskBadge from './common/RiskBadge';
import FindingFunnel from './common/FindingFunnel';

interface Props {
  projectId?: string | null;
  refreshKey?: number;
  isGeneratingTests?: boolean;
  testGenError?: string | null;
  targetFile?: string | null;
  onNavigateTab?: (tab: TabType) => void;
  onFocusInGraph?: (filePath: string) => void;
  onNavigateToTests?: () => void;
}

const errorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    return typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const getScoreBarColor = (score: number) => {
  if (score < 40) return '#C45F58'; // Danger
  if (score < 60) return '#C7953D'; // Signal Amber / Warning
  return '#368A80'; // Calm Success Green
};

export const MigrationPlanTab: React.FC<Props> = ({
  projectId,
  refreshKey = 0,
  isGeneratingTests = false,
  testGenError = null,
  targetFile = null,
  onNavigateTab,
  onFocusInGraph,
  onNavigateToTests,
}) => {
  const [plan, setPlan] = useState<MigrationPlanResponse | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [selectedWaveFilter, setSelectedWaveFilter] = useState<number | null>(null);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  };

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}/migration-plan?t=${Date.now()}`, {
      headers: { 'Cache-Control': 'no-cache' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorMessage(response));
        return response.json() as Promise<MigrationPlanResponse>;
      })
      .then((data) => {
        if (!active) return;
        setPlan(data);
        setSelectedId((prev) => prev || data.top_priorities[0]?.module_id || data.impacts[0]?.module_id || '');
      })
      .catch((reason) =>
        active && setError(reason instanceof Error ? reason.message : 'Unable to create migration plan.')
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId, refreshKey]);

  // Sync selectedId when targetFile prop changes
  useEffect(() => {
    if (targetFile && plan) {
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const match = plan.impacts.find((item) => {
        const itemNorm = item.relative_path.replace(/\\/g, '/').toLowerCase();
        return itemNorm === norm || item.module_id === targetFile || itemNorm.endsWith(norm);
      });
      if (match) {
        setSelectedId(match.module_id);
      }
    }
  }, [targetFile, plan]);

  const filteredImpacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plan?.impacts.filter((item) => !query || item.relative_path.toLowerCase().includes(query)) || [];
  }, [plan, search]);

  const selected: ChangeImpact | undefined = plan?.impacts.find((item) => item.module_id === selectedId);

  if (!projectId) return null;

  if (loading)
    return (
      <div className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] shadow-sm">
        <div className="text-center text-sm font-medium text-[#4D4842]">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-[#4C4FD6]" />
          Building the safest migration path...
        </div>
      </div>
    );

  if (error)
    return (
      <div className="rounded-[24px] border border-[#ECC7C3] bg-[#F6E5E2] p-8 text-center text-sm font-semibold text-[#8F3F3A]">
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-[#C45F58]" />
        {error}
      </div>
    );

  if (!plan) return null;

  return (
    <div className="space-y-6">
      {/* 1. Hero Card: Modernization Intelligence & Readiness Score */}
      <section className="rounded-[32px] border-2 border-[#C8BEB0] bg-[#FFFDFC] p-6 sm:p-8 shadow-warm-lg">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#181715] text-white shadow-md">
                <Map className="h-6 w-6 text-indigo-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold tracking-tight text-[#181715]">Modernization Intelligence</h2>
                  <span className="rounded-full bg-[#181715] px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white">
                    Decision Support
                  </span>
                </div>
                <p className="text-xs font-semibold text-[#5C554D]">Explainable readiness assessment and blast-radius breakdown</p>
              </div>
            </div>

            <p className="text-sm leading-6 font-medium text-[#3B3733]">{plan.executive_summary}</p>

            <div className="pt-2">
              <a
                href={`/api/projects/${projectId}/migration-plan/download`}
                className="btn-dark-pill px-6 py-2.5 text-xs inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Executive Report</span>
              </a>
            </div>
          </div>

          {/* Readiness Hero Score Ring */}
          <div className="flex shrink-0 items-center gap-5 rounded-[24px] border-2 border-[#C8BEB0] bg-[#ECE5DA] p-6 shadow-sm">
            <ReadinessGauge score={plan.readiness_score} size="hero" label="out of 100" />
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#5C554D]">Readiness Rating</p>
              <p className="mt-1 max-w-[140px] text-base font-extrabold text-[#181715]">
                {plan.readiness_label}
              </p>
              <p className="mt-1 text-[11px] font-bold text-[#5C554D]">Explainable score</p>
            </div>
          </div>
        </div>
      </section>

      <FindingFunnel funnel={plan.finding_funnel} />

      {/* Modernization Priority Banner: What should the team modernize first, and why? */}
      {plan.first_action_summary && (
        <section className="rounded-[24px] border-2 border-[#4C4FD6] bg-gradient-to-r from-[#EAE9FB] via-[#FFFDFC] to-[#E0EFEB] p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1.5 max-w-3xl">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4C4FD6] text-white shadow-2xs">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <h3 className="text-sm font-extrabold uppercase tracking-wide text-[#4340A0]">
                  Modernization Strategy: What to Modernize First & Why
                </h3>
              </div>
              <p className="text-xs leading-5 font-bold text-[#292622]">
                {plan.first_action_summary}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  const w1 = plan.waves?.find((w) => w.wave === 1);
                  if (w1?.files?.[0]) setSelectedId(w1.files[0]);
                }}
                className="btn-brand-pill px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Jump to Wave 1</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Score Blockers Panel */}
      {plan.score_blockers && plan.score_blockers.length > 0 && (
        <section className="rounded-[24px] border border-[#ECC7C3] bg-[#F6E5E2]/40 p-4 sm:p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-[#C45F58]" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#8F3F3A]">
                Readiness Score Blockers ({plan.score_blockers.length})
              </h4>
            </div>
            <span className="text-[10px] font-bold text-[#8F3F3A] bg-[#ECC7C3]/60 px-2.5 py-0.5 rounded-full">
              Holding score below 100
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {plan.score_blockers.map((blocker, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-[#ECC7C3] bg-[#FFFDFC] p-3.5 shadow-2xs space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-[#8F3F3A] uppercase tracking-wide">
                      {blocker.label} ({blocker.current_score}/100)
                    </span>
                    {blocker.target_file && (
                      <span
                        onClick={() => setSelectedId(blocker.target_file!)}
                        className="font-mono text-[9px] font-bold text-[#4340A0] bg-[#EAE9FB] px-2 py-0.5 rounded-full cursor-pointer hover:underline truncate max-w-[140px]"
                        title={blocker.target_file}
                      >
                        {blocker.target_file}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#4D4842] leading-4 font-medium">
                    {blocker.blocker_reason}
                  </p>
                </div>
                <p className="text-[10px] text-[#245F59] font-bold leading-4 pt-2 border-t border-[#D8CFC2]/40">
                  ➔ {blocker.unblocking_action}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 2. Interactive Change Impact: "What Breaks If I Change This?" (Central Feature) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#F6E5E2] text-[#C45F58]">
              <Target className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292622]">What Breaks If I Change This?</h3>
              <p className="text-xs text-[#6B645A]">
                Select any file to calculate its downstream blast radius, dependency depth, affected entry points, and required tests.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
          {/* Left Selector Drawer */}
          <div className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-sm flex flex-col justify-between">
            <div>
              <div className="relative mb-3">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B645A]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search source files..."
                  className="w-full rounded-xl border border-[#D8CFC2] bg-[#EFE9DD]/50 py-2 pl-9 pr-3 text-xs text-[#292622] outline-none focus:border-[#4C4FD6] focus:bg-[#FFFDFC]"
                />
              </div>

              <div className="max-h-[500px] space-y-1.5 overflow-y-auto pr-1">
                {filteredImpacts.map((item) => {
                  const isSelected = selectedId === item.module_id;
                  return (
                    <button
                      key={item.module_id}
                      onClick={() => setSelectedId(item.module_id)}
                      className={`w-full rounded-xl border p-3 text-left transition-all ${
                        isSelected
                          ? 'border-[#4C4FD6] bg-[#EAE9FB] shadow-xs ring-1 ring-[#4C4FD6]'
                          : 'border-transparent hover:bg-[#F0EBE2]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`min-w-0 truncate font-mono text-[11px] font-bold ${
                            isSelected ? 'text-[#4340A0]' : 'text-[#292622]'
                          }`}
                          title={item.relative_path}
                        >
                          {item.relative_path}
                        </span>
                        <RiskBadge level={item.risk_level} size="sm" />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-[#6B645A]">
                        <span>{item.blast_radius} downstream file(s)</span>
                        {item.dependency_depth > 0 && <span>Depth: {item.dependency_depth}</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Detail Panel */}
          <div className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 shadow-sm space-y-5">
            {selected ? (
              <div className="space-y-5">
                {/* File Title & Metric Badges */}
                <div className="flex flex-col gap-3 border-b border-[#D8CFC2] pb-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-[#6B645A] block">
                      Target File for Modernization
                    </span>
                    <p className="break-all font-mono text-base font-extrabold text-[#4C4FD6]">
                      {selected.relative_path}
                    </p>
                    <p className="mt-0.5 text-xs text-[#6B645A]">
                      Downstream blast-radius and change-safety analysis
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <RiskBadge level={selected.risk_level} label={`${selected.risk_level} risk`} />
                    {selected.wave_title && (
                      <span className="rounded-full border border-[#BEE0D6] bg-[#E0EFEB] px-3 py-1 text-[10px] font-bold text-[#245F59]">
                        {selected.wave_title}
                      </span>
                    )}
                    {selected.is_cycle_participant && (
                      <span className="rounded-full border border-[#ECC7C3] bg-[#F6E5E2] px-3 py-1 text-[10px] font-bold text-[#8F3F3A]">
                        Cycle Participant
                      </span>
                    )}
                    {selected.is_score_blocker && (
                      <span className="rounded-full border border-[#E6D3A9] bg-[#FDF6E2] px-3 py-1 text-[10px] font-bold text-[#8C6218]">
                        Score Blocker
                      </span>
                    )}
                    <span className="rounded-full border border-[#D8CFC2] bg-[#F0EBE2] px-3 py-1 text-[10px] font-bold text-[#4D4842]">
                      Blast radius: {selected.blast_radius} files
                    </span>
                    {selected.dependency_depth > 0 && (
                      <span className="rounded-full border border-[#C7C4F7] bg-[#EAE9FB] px-3 py-1 text-[10px] font-bold text-[#4340A0]">
                        Depth: {selected.dependency_depth} {selected.dependency_depth === 1 ? 'hop' : 'hops'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Recommended Next Action Banner */}
                {selected.recommended_action && (
                  <div className="rounded-2xl border-2 border-[#C7C4F7] bg-gradient-to-r from-[#EAE9FB] via-[#FFFDFC] to-[#F5E8CC]/40 p-4 shadow-xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-extrabold text-[#4340A0]">
                        <Sparkles className="w-4 h-4 text-[#4C4FD6]" />
                        <span>Recommended Modernization Action:</span>
                      </div>
                      <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#4C4FD6] text-white">
                        Safety Guidance
                      </span>
                    </div>
                    <p className="text-xs leading-5 text-[#292622] font-medium">
                      {selected.recommended_action}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#C7C4F7]/60">
                      <button
                        onClick={() =>
                          onFocusInGraph ? onFocusInGraph(selected.relative_path) : onNavigateTab?.('graph')
                        }
                        className="btn-brand-pill px-3 py-1.5 text-xs inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <Network className="w-3.5 h-3.5" />
                        <span>Focus in Dependency Graph</span>
                      </button>
                      <button
                        onClick={() =>
                          onNavigateToTests ? onNavigateToTests() : onNavigateTab?.('tests')
                        }
                        className="btn-brand-outline-pill px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Generate/Run Tests</span>
                      </button>
                      <button
                        onClick={() => onNavigateTab?.('refactor')}
                        className="btn-brand-outline-pill px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        <span>Preview Refactor</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4-Card Impact Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <ImpactList
                    icon={<Network className="h-4 w-4 text-[#C45F58]" />}
                    title={`Direct Dependents (${selected.direct_dependents.length})`}
                    subtitle="Files that import or call this file directly"
                    items={selected.direct_dependents}
                  />
                  <ImpactList
                    icon={<ArrowRight className="h-4 w-4 text-[#4C4FD6]" />}
                    title={`Transitive Dependents (${selected.transitive_dependents?.length ?? selected.blast_radius})`}
                    subtitle={`Full ripple blast radius (${selected.dependency_depth || 0} levels deep)`}
                    items={selected.transitive_dependents?.length ? selected.transitive_dependents : selected.direct_dependents}
                  />
                  <ImpactList
                    icon={<FileWarning className="h-4 w-4 text-[#C7953D]" />}
                    title={`Affected Entry Points (${selected.affected_entry_points.length})`}
                    subtitle="Application entry files impacted if this changes"
                    items={selected.affected_entry_points}
                  />
                  <ImpactList
                    icon={<ShieldCheck className="h-4 w-4 text-[#368A80]" />}
                    title={`Tests to Run (${selected.suggested_tests.length})`}
                    subtitle="Characterization test suites to protect behavior"
                    items={selected.suggested_tests}
                  />
                </div>

                {/* Dependency Cycle Alert if file is in cycle */}
                {selected.cycles && selected.cycles.length > 0 && (
                  <div className="rounded-xl border border-[#ECC7C3] bg-[#F6E5E2] p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#8F3F3A]">
                      <GitFork className="w-4 h-4 text-[#C45F58]" />
                      <span>Involved in {selected.cycles.length} Runtime Dependency Cycle(s)</span>
                    </div>
                    <p className="text-[11px] text-[#8F3F3A]">
                      This file participates in circular dependencies. Changes will produce cascading feedback loops until the cycle is untangled:
                    </p>
                    <div className="space-y-1 pt-1">
                      {selected.cycles.map((cycle, idx) => (
                        <div
                          key={idx}
                          className="font-mono text-[10px] bg-[#FFFDFC] border border-[#ECC7C3] rounded-lg p-2 text-[#8F3F3A] break-all"
                        >
                          {cycle.join(' ➔ ')}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Risk Evidence Box */}
                {selected.risk_evidence && selected.risk_evidence.length > 0 && (
                  <div className="rounded-xl border border-[#D8CFC2] bg-[#F0EBE2]/60 p-4 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#292622]">
                      <Target className="w-3.5 h-3.5 text-[#4C4FD6]" />
                      <span>Concrete Risk Evidence & Static Indicators:</span>
                    </div>
                    <ul className="space-y-1 text-[11px] leading-5 text-[#4D4842]">
                      {selected.risk_evidence.map((ev, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#4C4FD6]" />
                          <span>{ev}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid min-h-[380px] place-items-center text-sm font-medium text-[#6B645A]">
                Select a file on the left to calculate impact.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 3. Readiness Breakdown Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAE9FB] text-[#4340A0]">
            <Gauge className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold text-[#292622]">Readiness Breakdown</h3>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {plan.categories.map((category) => {
            const isTestability = category.key === 'testability';
            const isPendingTestGen = isTestability && isGeneratingTests;
            const isUncalculatedTest = isTestability && category.score === 35 && !isPendingTestGen;
            const isRiskFlag = category.score < 40 && !isPendingTestGen;
            const barColor = isPendingTestGen ? '#4C4FD6' : getScoreBarColor(category.score);
            const statusLabel = isPendingTestGen
              ? 'Generating tests...'
              : isUncalculatedTest
              ? 'Not calculated'
              : category.status;

            return (
              <div
                key={category.key}
                className={`rounded-[20px] border p-4 transition-all duration-150 flex flex-col justify-between ${
                  isRiskFlag
                    ? 'border-[#ECC7C3] bg-[#F6E5E2]/60 shadow-xs'
                    : 'border-[#D8CFC2] bg-[#FFFDFC] shadow-sm hover:border-[#4C4FD6]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#292622]">{category.label}</p>
                    <span
                      className={`font-mono text-sm font-extrabold ${
                        isPendingTestGen
                          ? 'text-[#4C4FD6]'
                          : category.score < 40
                          ? 'text-[#C45F58]'
                          : category.score < 60
                          ? 'text-[#C7953D]'
                          : 'text-[#368A80]'
                      }`}
                    >
                      {isPendingTestGen ? '...' : `${category.score}/100`}
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#EFE9DD]">
                    <div
                      style={{ width: isPendingTestGen ? '100%' : `${Math.max(category.score, 4)}%` }}
                      className={`h-full rounded-full transition-all duration-300 ${
                        isPendingTestGen ? 'animate-pulse' : ''
                      }`}
                      style-color={barColor}
                    />
                  </div>

                  <p className="mt-2 text-[10px] font-bold text-[#6B645A]">{statusLabel}</p>
                  <p className="mt-1 text-[11px] leading-5 text-[#4D4842]">{category.reason}</p>
                  {isTestability && testGenError && (
                    <p className="mt-1.5 text-[10px] font-semibold text-[#C45F58]">
                      Error: {testGenError}
                    </p>
                  )}
                </div>

                {isUncalculatedTest && onNavigateToTests && (
                  <button
                    onClick={onNavigateToTests}
                    className="mt-3 btn-brand-pill px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1.5 shadow-xs w-full justify-center"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Generate safety tests</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. Migration Waves: Staged Modernization Roadmap */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAE9FB] text-[#4340A0]">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#292622]">Migration Waves</h3>
              <p className="text-xs text-[#6B645A]">
                Topologically ordered execution waves designed to isolate risk and avoid circular regressions.
              </p>
            </div>
          </div>

          {/* Wave Filter Pills */}
          {plan.waves && plan.waves.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setSelectedWaveFilter(null)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all ${
                  selectedWaveFilter === null
                    ? 'bg-[#181715] text-white shadow-xs'
                    : 'bg-[#EFE9DD] text-[#5C554D] hover:bg-[#E5DFD5]'
                }`}
              >
                All Waves ({plan.waves.length})
              </button>
              {plan.waves.map((w) => (
                <button
                  key={w.wave}
                  onClick={() => setSelectedWaveFilter(w.wave)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold transition-all ${
                    selectedWaveFilter === w.wave
                      ? 'bg-[#4C4FD6] text-white shadow-xs'
                      : 'bg-[#EAE9FB] text-[#4340A0] hover:bg-[#DDD9F8]'
                  }`}
                >
                  Wave {w.wave}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Waves Grid */}
        <div className="space-y-4">
          {(plan.waves && plan.waves.length > 0
            ? plan.waves.filter((w) => selectedWaveFilter === null || w.wave === selectedWaveFilter)
            : []
          ).map((wave) => {
            const waveColor =
              wave.wave === 0
                ? 'border-[#C7C4F7] bg-[#FAF9FE]'
                : wave.wave === 1
                ? 'border-[#BEE0D6] bg-[#F7FCFA]'
                : wave.wave === 2
                ? 'border-[#ECC7C3] bg-[#FEF9F9]'
                : wave.wave === 3
                ? 'border-[#D8CFC2] bg-[#FFFDFC]'
                : 'border-[#E6D3A9] bg-[#FFFDF8]';

            const badgeBg =
              wave.wave === 0
                ? 'bg-[#4C4FD6] text-white'
                : wave.wave === 1
                ? 'bg-[#245F59] text-white'
                : wave.wave === 2
                ? 'bg-[#C45F58] text-white'
                : wave.wave === 3
                ? 'bg-[#4D4842] text-white'
                : 'bg-[#8C6218] text-white';

            return (
              <article
                key={wave.wave}
                className={`rounded-[24px] border-2 ${waveColor} p-5 sm:p-6 shadow-sm space-y-4 transition-all`}
              >
                {/* Wave Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#D8CFC2]/60 pb-3">
                  <div className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black shadow-xs ${badgeBg}`}
                    >
                      W{wave.wave}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-extrabold text-[#292622] text-sm">{wave.title}</h4>
                        <RiskBadge level={wave.risk_level} size="sm" />
                      </div>
                      <p className="text-xs text-[#5C554D] mt-0.5">{wave.goal}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-semibold text-[#5C554D]">
                    <span className="rounded-full bg-[#EFE9DD] px-3 py-0.5 text-[11px] font-bold text-[#4D4842]">
                      {wave.files.length} {wave.files.length === 1 ? 'file' : 'files'}
                    </span>
                    <span className="hidden md:inline text-[11px]">
                      Direct: <strong className="text-[#292622]">{wave.total_direct_dependents}</strong> | Ripple: <strong className="text-[#292622]">{wave.total_transitive_blast_radius}</strong>
                    </span>
                  </div>
                </div>

                {/* Strategy / Rationale Box */}
                <div className="rounded-xl border border-[#D8CFC2] bg-[#FFFDFC]/80 p-3 text-xs leading-5 text-[#3B3733]">
                  <p className="font-bold text-[#4340A0] text-[11px] uppercase tracking-wide flex items-center gap-1.5 mb-0.5">
                    <Sparkles className="h-3 w-3 text-[#4C4FD6]" />
                    Why Modernize This Wave at This Step:
                  </p>
                  <p className="font-medium text-[#4D4842]">{wave.strategy}</p>
                </div>

                {/* Files in Wave */}
                <div>
                  <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                    Files in this wave (click to inspect):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {wave.files.map((file) => (
                      <button
                        key={file}
                        onClick={() => setSelectedId(file)}
                        className={`rounded-lg font-mono text-[11px] font-bold px-2.5 py-1 border transition-all ${
                          selectedId === file
                            ? 'border-[#4C4FD6] bg-[#EAE9FB] text-[#4340A0] shadow-xs ring-1 ring-[#4C4FD6]'
                            : 'border-[#D8CFC2] bg-[#FFFDFC] text-[#4D4842] hover:bg-[#F0EBE2]'
                        }`}
                        title={file}
                      >
                        {file}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 pt-1">
                  {/* Suggested Test Order */}
                  <div className="rounded-xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#292622]">
                      <ListOrdered className="h-3.5 w-3.5 text-[#4C4FD6]" />
                      <span>Suggested Test Execution Order:</span>
                    </div>
                    {wave.suggested_test_order && wave.suggested_test_order.length > 0 ? (
                      <ol className="space-y-1.5 pl-4 list-decimal text-[11px] text-[#4D4842]">
                        {wave.suggested_test_order.slice(0, 5).map((testPath, idx) => (
                          <li key={idx} className="font-mono text-[10px] leading-4 truncate" title={testPath}>
                            {testPath}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="text-[11px] italic text-[#6B645A]">
                        Run general project test suites before and after modifying this wave.
                      </p>
                    )}
                  </div>

                  {/* Interactive Checklist */}
                  <div className="rounded-xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#292622]">
                        <CheckSquare className="h-3.5 w-3.5 text-[#368A80]" />
                        <span>Wave Checklist Actions:</span>
                      </div>
                      <span className="text-[10px] font-bold text-[#6B645A]">
                        {wave.checklist.filter((c) => completedTasks[c.id]).length} / {wave.checklist.length} done
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {wave.checklist.map((item) => {
                        const isDone = Boolean(completedTasks[item.id]);
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleTask(item.id)}
                            className={`flex items-start gap-2 p-1.5 rounded-lg text-[11px] leading-4 cursor-pointer transition-all ${
                              isDone ? 'bg-[#E0EFEB]/50 text-[#245F59]' : 'hover:bg-[#F0EBE2]/60 text-[#4D4842]'
                            }`}
                          >
                            {isDone ? (
                              <CheckSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#368A80]" />
                            ) : (
                              <Square className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8C8479]" />
                            )}
                            <span className={isDone ? 'line-through opacity-75' : ''}>{item.task}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Wave Action Bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#D8CFC2]/60">
                  {wave.files[0] && (
                    <button
                      onClick={() =>
                        onFocusInGraph ? onFocusInGraph(wave.files[0]) : onNavigateTab?.('graph')
                      }
                      className="btn-brand-pill px-3 py-1.5 text-xs inline-flex items-center gap-1.5 shadow-xs"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>Focus Wave in Graph</span>
                    </button>
                  )}
                  <button
                    onClick={() =>
                      onNavigateToTests ? onNavigateToTests() : onNavigateTab?.('tests')
                    }
                    className="btn-brand-outline-pill px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Run Characterization Tests</span>
                  </button>
                  <button
                    onClick={() => onNavigateTab?.('refactor')}
                    className="btn-brand-outline-pill px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
                  >
                    <Wrench className="w-3.5 h-3.5" />
                    <span>Preview Refactors</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
};

const ImpactList: React.FC<{
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  items: string[];
}> = ({ icon, title, subtitle, items }) => (
  <div className="rounded-xl border border-[#D8CFC2] bg-[#EFE9DD]/40 p-3.5 space-y-2">
    <div>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-xs font-bold text-[#292622]">{title}</p>
      </div>
      {subtitle && <p className="text-[10px] text-[#6B645A] mt-0.5 pl-6">{subtitle}</p>}
    </div>
    {items.length ? (
      <ul className="space-y-1 pl-6">
        {items.slice(0, 8).map((item) => (
          <li key={item} className="break-all font-mono text-[10px] leading-4 text-[#4D4842]">
            {item}
          </li>
        ))}
        {items.length > 8 && (
          <li className="text-[10px] text-[#6B645A] font-semibold">
            + {items.length - 8} more file(s)
          </li>
        )}
      </ul>
    ) : (
      <p className="text-[10px] italic text-[#6B645A] pl-6">None detected</p>
    )}
  </div>
);

export default MigrationPlanTab;

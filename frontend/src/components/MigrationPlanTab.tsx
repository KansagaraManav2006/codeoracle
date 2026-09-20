import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileWarning,
  Gauge,
  GitFork,
  Loader2,
  Map,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
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

      {/* 4. Recommended Migration Roadmap */}
      <section className="space-y-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAE9FB] text-[#4340A0]">
            <Map className="h-4 w-4" />
          </div>
          <h3 className="text-base font-bold text-[#292622]">Recommended Migration Roadmap</h3>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {plan.phases.map((phase) => (
            <article
              key={phase.phase}
              className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#4C4FD6] text-xs font-extrabold text-white shadow-xs">
                  {phase.phase}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-bold text-[#292622]">{phase.title}</h4>
                    <RiskBadge level={phase.risk_level} size="sm" />
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#4D4842]">{phase.goal}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 pt-3 border-t border-[#D8CFC2]/60">
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B645A]">
                    Priority files
                  </p>
                  <ul className="space-y-1">
                    {phase.files.slice(0, 5).map((file) => (
                      <li
                        key={file}
                        onClick={() => setSelectedId(file)}
                        className="truncate font-mono text-[10px] font-semibold text-[#4340A0] cursor-pointer hover:underline"
                        title={file}
                      >
                        {file}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B645A]">
                    Actions
                  </p>
                  <ul className="space-y-1">
                    {phase.actions.map((action) => (
                      <li key={action} className="flex gap-1.5 text-[10px] leading-4 text-[#4D4842]">
                        <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-[#368A80]" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          ))}
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

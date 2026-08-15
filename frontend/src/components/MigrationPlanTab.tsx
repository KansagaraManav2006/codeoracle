import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileWarning,
  Gauge,
  Loader2,
  Map,
  Network,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { ChangeImpact, MigrationPlanResponse } from '../types';
import ReadinessGauge from './common/ReadinessGauge';
import RiskBadge from './common/RiskBadge';

interface Props {
  projectId?: string | null;
  refreshKey?: number;
  isGeneratingTests?: boolean;
  testGenError?: string | null;
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
      {/* Hero Card: Modernization Intelligence & Readiness Score (32px radius, strongest shadow) */}
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

      {/* Readiness Breakdown Section */}
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
            const displayReason = isPendingTestGen
              ? 'Safety test suite generation is in progress...'
              : testGenError && isUncalculatedTest
              ? testGenError
              : category.reason;

            return (
              <div
                key={category.key}
                className={`rounded-[20px] border p-4 transition-all flex flex-col justify-between ${
                  isPendingTestGen
                    ? 'border-[#C7C4F7] bg-[#EAE9FB]/50 shadow-[0_4px_14px_rgba(76,79,214,0.1)]'
                    : isRiskFlag
                    ? 'border-[#ECC7C3] bg-[#F6E5E2]/40 shadow-[0_4px_14px_rgba(196,95,88,0.1)]'
                    : 'border-[#D8CFC2] bg-[#FFFDFC] shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-xs font-bold ${
                        isPendingTestGen
                          ? 'text-[#4340A0]'
                          : isRiskFlag
                          ? 'text-[#8F3F3A]'
                          : 'text-[#292622]'
                      }`}
                    >
                      {category.label}
                    </p>
                    {isPendingTestGen ? (
                      <Loader2 className="h-5 w-5 animate-spin text-[#4C4FD6]" />
                    ) : (
                      <span
                        className={`text-lg font-extrabold ${
                          isRiskFlag ? 'text-[#8F3F3A]' : 'text-[#292622]'
                        }`}
                      >
                        {category.score}
                      </span>
                    )}
                  </div>

                  <div className="my-2.5 h-2 overflow-hidden rounded-full bg-[#EFE9DD]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isPendingTestGen ? 'animate-pulse' : ''
                      }`}
                      style={{
                        width: isPendingTestGen ? '100%' : `${category.score}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>

                  <p
                    className="text-[11px] font-bold"
                    style={{ color: barColor }}
                  >
                    {statusLabel}
                  </p>
                  <p className="mt-1 text-[11px] leading-4 text-[#6B645A]">{displayReason}</p>
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

      {/* Interactive Blast Radius Assessment Section */}
      <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
        {/* Left Selector Drawer */}
        <div className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F6E5E2] text-[#C45F58]">
              <Target className="h-4 w-4" />
            </div>
            <h3 className="text-sm font-bold text-[#292622]">What Breaks If I Change This?</h3>
          </div>
          <p className="mb-3 text-[11px] leading-5 text-[#6B645A]">
            Select any file to reveal its downstream blast radius and protective tests.
          </p>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B645A]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search source files..."
              className="w-full rounded-xl border border-[#D8CFC2] bg-[#EFE9DD]/50 py-2 pl-9 pr-3 text-xs text-[#292622] outline-none focus:border-[#4C4FD6] focus:bg-[#FFFDFC]"
            />
          </div>

          <div className="max-h-[420px] space-y-1.5 overflow-y-auto pr-1">
            {filteredImpacts.map((item) => {
              const isSelected = selectedId === item.module_id;
              return (
                <button
                  key={item.module_id}
                  onClick={() => setSelectedId(item.module_id)}
                  className={`w-full rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-[#4C4FD6] bg-[#EAE9FB] shadow-xs'
                      : 'border-transparent hover:bg-[#F0EBE2]/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`min-w-0 truncate font-mono text-[11px] font-bold ${
                        isSelected ? 'text-[#4340A0]' : 'text-[#292622]'
                      }`}
                    >
                      {item.relative_path}
                    </span>
                    <RiskBadge level={item.risk_level} size="sm" />
                  </div>
                  <p className="mt-1 text-[10px] text-[#6B645A]">
                    {item.blast_radius} downstream file(s) affected
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 shadow-sm">
          {selected ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 border-b border-[#D8CFC2] pb-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="break-all font-mono text-base font-extrabold text-[#4C4FD6]">
                    {selected.relative_path}
                  </p>
                  <p className="mt-0.5 text-xs text-[#6B645A]">Change-impact & blast-radius assessment</p>
                </div>
                <div className="flex gap-2">
                  <RiskBadge level={selected.risk_level} label={`${selected.risk_level} risk`} />
                  <span className="rounded-full border border-[#D8CFC2] bg-[#F0EBE2] px-3 py-1 text-[10px] font-bold text-[#4D4842]">
                    Blast radius: {selected.blast_radius}
                  </span>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <ImpactList
                  icon={<Network className="h-4 w-4 text-[#C45F58]" />}
                  title="Files that depend on this"
                  items={selected.direct_dependents}
                />
                <ImpactList
                  icon={<ArrowRight className="h-4 w-4 text-[#4C4FD6]" />}
                  title="Files this depends on"
                  items={selected.direct_dependencies}
                />
                <ImpactList
                  icon={<FileWarning className="h-4 w-4 text-[#C7953D]" />}
                  title="Entry points affected"
                  items={selected.affected_entry_points}
                />
                <ImpactList
                  icon={<ShieldCheck className="h-4 w-4 text-[#368A80]" />}
                  title="Tests to run"
                  items={selected.suggested_tests}
                />
              </div>

              <div className="rounded-xl border border-[#D8CFC2] bg-[#EFE9DD]/50 p-4">
                <p className="mb-2 text-xs font-bold text-[#292622]">Why this risk level?</p>
                <ul className="space-y-1 text-[11px] leading-5 text-[#4D4842]">
                  {selected.reasons.map((reason) => (
                    <li key={reason} className="flex gap-2">
                      <CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-[#4C4FD6]" />
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[380px] place-items-center text-sm font-medium text-[#6B645A]">
              Select a file on the left to calculate impact.
            </div>
          )}
        </div>
      </section>

      {/* Recommended Migration Roadmap */}
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
                        className="truncate font-mono text-[10px] font-semibold text-[#4340A0]"
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

const ImpactList: React.FC<{ icon: React.ReactNode; title: string; items: string[] }> = ({
  icon,
  title,
  items,
}) => (
  <div className="rounded-xl border border-[#D8CFC2] bg-[#EFE9DD]/40 p-3.5">
    <div className="mb-2 flex items-center gap-2">
      {icon}
      <p className="text-xs font-bold text-[#292622]">{title}</p>
    </div>
    {items.length ? (
      <ul className="space-y-1">
        {items.slice(0, 8).map((item) => (
          <li key={item} className="break-all font-mono text-[10px] leading-4 text-[#4D4842]">
            {item}
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-[10px] italic text-[#6B645A]">None detected</p>
    )}
  </div>
);

export default MigrationPlanTab;

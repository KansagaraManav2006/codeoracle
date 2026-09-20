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
} from 'lucide-react';
import { MigrationPlanResponse, ChangeImpact, TabType } from '../types';
import { truncateMiddle, getRiskLevelStyle } from '../utils/formatters';
import Button from './common/Button';
import ReadinessGauge from './common/ReadinessGauge';
import ScoreCard from './common/ScoreCard';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { StatusTag } from './common/Tags';
import { useToast } from './common/Toast';

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
      className="space-y-6 animate-[fade-up_250ms_ease-out_both]"
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

      {/* 1. Hero Card: Modernization Intelligence & Executive Report */}
      <section className="bg-surface border border-line rounded-xl p-6 sm:p-7 shadow-1">
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
                    Modernization Intelligence
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-ink text-white font-sans text-[11px] font-bold tracking-[0.06em] uppercase select-none">
                    DECISION SUPPORT
                  </span>
                </div>
                <p className="font-sans text-xs text-ink-3 mt-0.5">
                  Explainable readiness assessment and blast-radius impact analysis.
                </p>
              </div>
            </div>

            <p className="font-sans text-[13px] text-ink-2 leading-[1.6] pt-1">
              {plan.executive_summary ||
                'CodeOracle computed architecture readiness based on module complexity, dependency cycles, test isolation, and maintainability metrics.'}
            </p>

            <div className="pt-2">
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

          <div className="shrink-0 self-center lg:self-auto">
            <ReadinessGauge
              score={plan.readiness_score}
              onExplainClick={() => setShowScoreModal(true)}
            />
          </div>
        </div>
      </section>

      {/* 2. Readiness Breakdown (5 Score Cards) */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
          <h3 className="font-display font-bold text-base text-ink">Readiness Breakdown</h3>
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

      {/* 3. "What Breaks If I Change This?" Section */}
      <section className="space-y-3">
        <div>
          <h3 className="font-display font-bold text-base text-ink">
            What Breaks If I Change This?
          </h3>
          <p className="font-sans text-xs text-ink-3 mt-0.5">
            Select any file to calculate its downstream blast radius, affected callers, and recommended tests.
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
                  No files match "{search}".
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

      {/* 4. Migration Waves: Staged Modernization Roadmap (Phase 8) */}
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
                          status={
                            wave.risk_level === 'critical'
                              ? 'critical'
                              : wave.risk_level === 'high'
                              ? 'complex'
                              : 'analyzed'
                          }
                          label={wave.risk_level.toUpperCase()}
                        />
                      </div>
                      <p className="text-xs text-ink-3 mt-0.5">{wave.goal}</p>
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

                {/* Wave Strategy */}
                <div className="p-3 bg-tile border border-line rounded-md text-xs">
                  <span className="font-bold text-ink block mb-0.5">Execution Strategy:</span>
                  <p className="text-ink-2 leading-relaxed">{wave.strategy}</p>
                </div>

                {/* Wave Files */}
                <div>
                  <span className="text-[11px] font-bold text-ink-3 uppercase tracking-wider block mb-2">
                    Files in this wave (click to inspect in blast radius):
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {wave.files.map((file) => (
                      <button
                        key={file}
                        type="button"
                        onClick={() => setSelectedId(file)}
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

                {/* Interactive Checklist & Suggested Test Order */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
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
                            onClick={() => toggleTask(item.id)}
                            className={`flex items-start gap-2 p-1.5 rounded-md text-xs cursor-pointer transition-colors ${
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

                  {/* Suggested Test Order */}
                  <div className="bg-tile border border-line rounded-md p-3.5 space-y-2">
                    <span className="text-xs font-bold text-ink block">
                      Suggested Test Execution Order:
                    </span>
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
                      Focus Wave in Graph
                    </Button>
                  )}
                  {wave.files[0] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        onNavigateTab?.('hotspots');
                      }}
                      icon={<Flame className="w-3.5 h-3.5 text-amber-strong" />}
                    >
                      Check Hotspots
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
              CodeOracle evaluates five weighted dimensions: AST code understanding (20%), cyclomatic complexity hotspot distribution (20%), dependency safety &amp; cycles (20%), structural maintainability (20%), and characterization test coverage (20%).
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

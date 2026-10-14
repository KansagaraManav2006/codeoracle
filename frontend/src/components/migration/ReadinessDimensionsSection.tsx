import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Gauge,
  Network,
  ShieldCheck,
  TestTube,
} from 'lucide-react';
import { MigrationPlanResponse, ReadinessDimension, ScoreBlocker, TabType } from '../../types';
import { truncateMiddle } from '../../utils/formatters';
import Button from '../common/Button';
import FindingFunnel from '../common/FindingFunnel';
import ScoreCard from '../common/ScoreCard';

interface ReadinessDimensionsSectionProps {
  plan: MigrationPlanResponse;
  onInspectDimension: (dimension: ReadinessDimension) => void;
  onSelectFile?: (filePath: string) => void;
  onFocusInGraph?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const ReadinessDimensionsSection: React.FC<ReadinessDimensionsSectionProps> = ({
  plan,
  onInspectDimension,
  onSelectFile,
  onFocusInGraph,
  onNavigateTab,
}) => {
  const totalBlockers =
    (plan.global_blockers?.length || 0) + (plan.file_blockers?.length || 0);

  return (
    <section className="space-y-5 animate-[fade-in_150ms_ease-out]">
      {/* Readiness Breakdown (5 Auditable Score Cards) */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-ink-2" strokeWidth={1.75} />
            <h3 className="font-display font-bold text-base text-ink">Readiness Dimensions</h3>
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
                onClick={() => onInspectDimension(cat)}
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
      </div>

      {/* Score Blockers Section: Separated Global vs Top File Blockers */}
      <div className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-line">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-md flex items-center justify-center border shrink-0 ${
                totalBlockers > 0
                  ? 'bg-amber-surface text-amber-strong border-amber/20'
                  : 'bg-teal-surface text-teal-strong border-teal/20'
              }`}
            >
              {totalBlockers > 0 ? (
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
            {totalBlockers} Total Blocker(s)
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
              {plan.file_blockers.map((blocker: ScoreBlocker, idx: number) => (
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
                        onClick={() => onSelectFile?.(blocker.target_file!)}
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
              ))}
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
      </div>

      {/* Finding Funnel Section */}
      {plan.finding_funnel && <FindingFunnel funnel={plan.finding_funnel} />}
    </section>
  );
};

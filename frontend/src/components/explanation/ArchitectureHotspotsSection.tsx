import React from 'react';
import { Flame, ShieldCheck, CheckCircle2, Target, Network, Wand2 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import { truncateMiddle, formatNumber } from '../../utils/formatters';

interface ArchitectureHotspotsSectionProps {
  topRiskModules: any[];
  findingFunnel: any;
  onSelectFile?: (path: string) => void;
  onAnalyzeImpact: (path?: string) => void;
  onInspectInGraph: (path?: string) => void;
  onReviewModernization: (path?: string) => void;
  onOpenHotspots: () => void;
}

export const ArchitectureHotspotsSection: React.FC<ArchitectureHotspotsSectionProps> = ({
  topRiskModules,
  findingFunnel,
  onSelectFile,
  onAnalyzeImpact,
  onInspectInGraph,
  onReviewModernization,
  onOpenHotspots,
}) => {
  return (
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
              onClick={onOpenHotspots}
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
                    onClick={() => onAnalyzeImpact(mod.relative_path)}
                    icon={<Target className="w-3 h-3" />}
                    className="text-xs !py-1"
                  >
                    Impact
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onInspectInGraph(mod.relative_path)}
                    icon={<Network className="w-3 h-3" />}
                    className="text-xs !py-1"
                  >
                    Graph
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onReviewModernization(mod.relative_path)}
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
  );
};

export default ArchitectureHotspotsSection;

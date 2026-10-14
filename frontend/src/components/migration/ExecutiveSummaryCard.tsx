import React, { useState } from 'react';
import { Compass, Flame, Info, Network, TestTube, Wand2 } from 'lucide-react';
import { MigrationPlanResponse, ReadinessDimension, TabType } from '../../types';
import Button from '../common/Button';
import Card from '../common/Card';
import ReadinessGauge from '../common/ReadinessGauge';

interface ExecutiveSummaryCardProps {
  plan: MigrationPlanResponse;
  onSelectFile?: (filePath: string) => void;
  onInspectDimension?: (dimension: ReadinessDimension) => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const ExecutiveSummaryCard: React.FC<ExecutiveSummaryCardProps> = ({
  plan,
  onSelectFile,
  onInspectDimension,
  onNavigateTab,
}) => {
  const [showWhyScore, setShowWhyScore] = useState(false);

  return (
    <Card variant="primary" padding="md" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-center">
        {/* Left: Summary & Next Action */}
        <div className="space-y-3">
          <div>
            <span className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-3">
              Executive Modernization Summary
            </span>
            <p className="font-sans text-[13px] text-ink-2 leading-[1.6] pt-1">
              {plan.executive_summary}
            </p>
          </div>

          {/* Next Best Action Callout */}
          {plan.next_best_action && (
            <div className="p-3.5 rounded-lg bg-indigo-surface/40 border border-indigo/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-md bg-indigo text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-indigo">
                    Next Recommended Action
                  </span>
                  <h4 className="font-bold text-xs sm:text-sm text-ink">
                    {plan.next_best_action.action}
                  </h4>
                  <p className="text-xs text-ink-3 mt-0.5">
                    {plan.next_best_action.reason}
                  </p>
                </div>
              </div>

              {plan.next_best_action.target_file && (
                <div className="shrink-0 self-end sm:self-auto">
                  <Button
                    variant="indigo"
                    size="sm"
                    onClick={() => {
                      if (plan.next_best_action?.target_file) {
                        onSelectFile?.(plan.next_best_action.target_file);
                      }
                    }}
                  >
                    Inspect Target File
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Readiness Gauge & Threshold */}
        <div className="flex flex-col items-center justify-center p-4 bg-tile rounded-xl border border-line">
          <ReadinessGauge
            score={plan.readiness_score}
            onExplainClick={() => {
              if (plan.categories?.[0] && onInspectDimension) {
                onInspectDimension(plan.categories[0]);
              }
            }}
          />
          <div className="flex flex-col items-center mt-2 space-y-0.5 text-center">
            <span className="text-[11px] font-mono text-ink-3 uppercase tracking-wider">
              Threshold: <strong className="text-ink">{plan.readiness?.threshold_label || plan.readiness_label}</strong>
            </span>
            <span className="text-[10px] text-ink-3 max-w-[240px] italic">
              Static planning readiness score &bull; Click gauge to view auditable formula
            </span>
          </div>
          {plan.why_score && (
            <button
              type="button"
              onClick={() => setShowWhyScore(!showWhyScore)}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo hover:underline"
            >
              <Info className="w-3 h-3" />
              <span>{showWhyScore ? 'Hide score explanation' : 'Why this score?'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Accordion: Why This Score? */}
      {showWhyScore && plan.why_score && (
        <div className="mt-4 pt-4 border-t border-line grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fade-in_150ms_ease-out]">
          <div className="p-3.5 rounded-lg bg-teal-surface/20 border border-teal/20 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-teal-strong flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-teal-strong" />
              Key Score Strengths:
            </span>
            <ul className="space-y-1.5 text-xs text-ink-2 pl-4 list-disc">
              {plan.why_score.strengths.map((s, idx) => (
                <li key={idx} className="leading-relaxed">
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 rounded-lg bg-amber-surface/20 border border-amber-line/60 space-y-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-strong" />
              Needs Attention:
            </span>
            <ul className="space-y-1.5 text-xs text-ink-2 pl-4 list-disc">
              {plan.why_score.needs_attention.map((n, idx) => (
                <li key={idx} className="leading-relaxed">
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* First Action Narrative Summary Banner */}
      {plan.first_action_summary && (
        <div className="p-3.5 rounded-lg bg-surface border border-line flex items-start gap-2.5">
          <Info className="w-4 h-4 text-ink-3 shrink-0 mt-0.5" />
          <p className="text-xs text-ink-2 leading-relaxed">
            <strong className="text-ink">Modernization Sequence:</strong> {plan.first_action_summary}
          </p>
        </div>
      )}

      {/* Cross-Tab Navigation Links Banner */}
      {onNavigateTab && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-line text-xs">
          <span className="font-bold text-ink uppercase tracking-wider text-[10px]">
            Connected Views:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onNavigateTab('graph')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <Network className="w-3.5 h-3.5 text-indigo" />
              <span>Dependency Map</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('tests')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <TestTube className="w-3.5 h-3.5 text-teal-strong" />
              <span>Safety Tests</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('hotspots')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <Flame className="w-3.5 h-3.5 text-amber-strong" />
              <span>Risk Hotspots</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('refactor')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill bg-surface border border-line text-ink hover:bg-tile hover:border-line-strong transition-all font-medium text-xs shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo" />
              <span>Modernization</span>
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};

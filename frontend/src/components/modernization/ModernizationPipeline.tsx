import React from 'react';
import {
  Search,
  Wrench,
  Sparkles,
  FileDiff,
  CheckCircle,
  ShieldCheck,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import { ModernizationState } from '../../types';

interface ModernizationPipelineProps {
  state: ModernizationState;
  activeStage?: string;
  onSelectStage?: (stageId: string) => void;
}

export const ModernizationPipeline: React.FC<ModernizationPipelineProps> = ({
  state,
  activeStage,
  onSelectStage,
}) => {
  const stages = [
    {
      id: 'findings',
      label: 'STATIC FINDING',
      count: state.findings,
      icon: Search,
      desc: 'Static analyzer detections',
    },
    {
      id: 'candidates',
      label: 'MODERNIZATION CANDIDATE',
      count: state.candidates,
      icon: Wrench,
      desc: 'Actionable review targets',
    },
    {
      id: 'autofix',
      label: 'AUTOFIX ELIGIBLE',
      count: state.autofixEligible,
      icon: Sparkles,
      desc: 'Matches deterministic AST rules',
    },
    {
      id: 'diffs',
      label: 'DIFF GENERATED',
      count: state.generatedDiffs,
      icon: FileDiff,
      desc: 'Patch proposals produced',
    },
    {
      id: 'validated',
      label: 'STATICALLY VALIDATED',
      count: state.staticallyValidated,
      icon: CheckCircle,
      desc: 'AST parses without errors',
    },
    {
      id: 'verified',
      label: 'RUNTIME VERIFIED',
      count: state.runtimeVerified,
      icon: ShieldCheck,
      desc: state.runtimeVerified > 0 ? 'Sandbox tests passed' : 'Execution locked / not run',
    },
    {
      id: 'approved',
      label: 'HUMAN APPROVED',
      count: state.humanApproved,
      icon: UserCheck,
      desc: 'Reviewed & signed off for merge',
    },
  ];

  return (
    <section
      className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-1 space-y-3"
      aria-label="Modernization state pipeline"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display font-bold text-sm sm:text-base text-ink">
              Canonical Modernization State Pipeline
            </h3>
            <span className="px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo-text font-mono text-[10px] font-bold uppercase tracking-wider border border-indigo/20">
              7 Strict Stages
            </span>
          </div>
          <p className="font-sans text-xs text-ink-3 mt-0.5">
            Static findings advance through 7 non-overlapping stages. Stages are never conflated or skipped dynamically.
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-ink-3">
          <span>{state.candidates} candidates</span>
          <span>·</span>
          <span>{state.generatedDiffs} diffs</span>
          <span>·</span>
          <span>{state.runtimeVerified} runtime verified</span>
        </div>
      </div>

      {/* Pipeline Stages Progression */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
        {stages.map((stage, idx) => {
          const Icon = stage.icon;
          const isSelected = activeStage === stage.id;
          const isNonZero = stage.count > 0;

          return (
            <div key={stage.id} className="relative flex flex-col">
              <button
                type="button"
                onClick={() => onSelectStage?.(stage.id)}
                className={`w-full text-left p-3 rounded-lg border transition-all flex flex-col justify-between h-full group select-none ${
                  isSelected
                    ? 'border-indigo bg-indigo-surface/60 shadow-xs ring-1 ring-indigo/30'
                    : isNonZero
                    ? 'border-line bg-tile hover:bg-surface hover:border-indigo/40'
                    : 'border-line/60 bg-tile/40 text-ink-4 hover:border-line'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[10px] font-mono font-bold text-ink-3">
                      STAGE {idx + 1}
                    </span>
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isSelected
                          ? 'text-indigo'
                          : isNonZero
                          ? 'text-teal-strong'
                          : 'text-ink-4'
                      }`}
                    />
                  </div>

                  <div className="font-display font-black text-lg sm:text-xl text-ink leading-none num">
                    {stage.count}
                  </div>

                  <div className="text-[10px] font-bold uppercase tracking-wider text-ink-2 mt-1 truncate">
                    {stage.label}
                  </div>
                </div>

                <div className="text-[10px] text-ink-3 mt-2 pt-1.5 border-t border-line/40 leading-tight">
                  {stage.desc}
                </div>
              </button>

              {idx < stages.length - 1 && (
                <div className="hidden lg:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-ink-4 pointer-events-none">
                  <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ModernizationPipeline;

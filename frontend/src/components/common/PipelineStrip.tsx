import React from 'react';
import { Check } from 'lucide-react';

export type PipelineStage = 'ingest' | 'analyze' | 'output';

interface PipelineStripProps {
  stage: PipelineStage;
  hasProject: boolean;
  onIngest: () => void;
  onAnalyze: () => void;
  onOutput: () => void;
}

const STEPS: { id: PipelineStage; n: number; label: string; hint: string }[] = [
  { id: 'ingest', n: 1, label: 'Ingest', hint: 'ZIP or GitHub' },
  { id: 'analyze', n: 2, label: 'Analyze', hint: 'Explain · graph' },
  { id: 'output', n: 3, label: 'Output', hint: 'Tests · plan' },
];

export const PipelineStrip: React.FC<PipelineStripProps> = ({
  stage,
  hasProject,
  onIngest,
  onAnalyze,
  onOutput,
}) => {
  const order: PipelineStage[] = ['ingest', 'analyze', 'output'];
  const currentIdx = order.indexOf(stage);

  const handleClick = (id: PipelineStage) => {
    if (id === 'ingest') onIngest();
    if (id === 'analyze' && hasProject) onAnalyze();
    if (id === 'output' && hasProject) onOutput();
  };

  return (
    <nav
      aria-label="Analysis pipeline"
      className="mb-5 rounded-xl border border-line bg-surface px-3 sm:px-4 py-2.5 shadow-1"
    >
      <ol className="flex items-center gap-0 sm:gap-1">
        {STEPS.map((step, idx) => {
          const isDone = idx < currentIdx;
          const isCurrent = step.id === stage;
          const locked = step.id !== 'ingest' && !hasProject;
          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <li
                  aria-hidden="true"
                  className={`flex-1 h-px mx-1 sm:mx-2 min-w-[12px] rounded-full ${
                    idx <= currentIdx ? 'bg-indigo' : 'bg-line'
                  }`}
                />
              )}
              <li className="shrink-0">
                <button
                  type="button"
                  disabled={locked}
                  onClick={() => handleClick(step.id)}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={`flex items-center gap-2 rounded-lg px-1.5 sm:px-2 py-1 text-left transition-colors ${
                    locked
                      ? 'opacity-40 cursor-not-allowed'
                      : 'hover:bg-tile cursor-pointer'
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-[11px] font-bold border ${
                      isCurrent
                        ? 'bg-indigo text-white border-indigo'
                        : isDone
                        ? 'bg-teal-surface text-teal-strong border-teal/30'
                        : 'bg-tile text-ink-4 border-line'
                    }`}
                  >
                    {isDone && !isCurrent ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : step.n}
                  </span>
                  <span className="hidden sm:block min-w-0">
                    <span
                      className={`block text-[12px] font-semibold leading-none ${
                        isCurrent ? 'text-indigo-text' : 'text-ink'
                      }`}
                    >
                      {step.label}
                    </span>
                    <span className="block text-[10px] text-ink-4 mt-0.5">{step.hint}</span>
                  </span>
                </button>
              </li>
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
};

export default PipelineStrip;

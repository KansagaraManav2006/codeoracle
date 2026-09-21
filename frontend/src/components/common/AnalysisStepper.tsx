import { Check, Loader2, AlertCircle } from 'lucide-react';
import Button from './Button';

export type StepState = 'pending' | 'running' | 'completed' | 'failed';

export interface StepperStep {
  id: number;
  title: string;
  state: StepState;
  detail?: string;
}

interface AnalysisStepperProps {
  currentStage: string;
  progressPercentage?: number;
  errorMessage?: string | null;
  onCancel?: () => void;
  onRetry?: () => void;
  className?: string;
}

export const AnalysisStepper: React.FC<AnalysisStepperProps> = ({
  currentStage,
  progressPercentage,
  errorMessage,
  onCancel,
  onRetry,
  className = '',
}) => {
  // Determine step status based on current stage and error
  const getStepStates = (): StepperStep[] => {
    const stage = (currentStage || '').toLowerCase();
    const isError = Boolean(errorMessage);

    const steps: StepperStep[] = [
      { id: 1, title: 'Fetching repository', state: 'pending' },
      { id: 2, title: 'Reading and classifying files', state: 'pending' },
      { id: 3, title: 'Building dependency graph', state: 'pending' },
      { id: 4, title: 'Generating explanations and tests', state: 'pending' },
      { id: 5, title: 'Scoring readiness', state: 'pending' },
    ];

    if (stage.includes('fetch') || stage.includes('download') || stage.includes('extract') || stage.includes('clone') || stage.includes('preparing')) {
      steps[0].state = isError ? 'failed' : 'running';
      steps[0].detail = currentStage;
    } else if (stage.includes('classif') || stage.includes('read') || stage.includes('pars')) {
      steps[0].state = 'completed';
      steps[1].state = isError ? 'failed' : 'running';
      steps[1].detail = currentStage;
    } else if (stage.includes('graph') || stage.includes('dependenc')) {
      steps[0].state = 'completed';
      steps[1].state = 'completed';
      steps[2].state = isError ? 'failed' : 'running';
      steps[2].detail = currentStage;
    } else if (stage.includes('generat') || stage.includes('test') || stage.includes('explan')) {
      steps[0].state = 'completed';
      steps[1].state = 'completed';
      steps[2].state = 'completed';
      steps[3].state = isError ? 'failed' : 'running';
      steps[3].detail = currentStage;
    } else if (stage.includes('score') || stage.includes('readiness') || stage.includes('migrat')) {
      steps[0].state = 'completed';
      steps[1].state = 'completed';
      steps[2].state = 'completed';
      steps[3].state = 'completed';
      steps[4].state = isError ? 'failed' : 'running';
      steps[4].detail = currentStage;
    } else if (stage.includes('complete')) {
      steps.forEach((s) => (s.state = 'completed'));
    } else {
      // Default: running step 1
      steps[0].state = isError ? 'failed' : 'running';
      steps[0].detail = currentStage;
    }

    if (isError) {
      const activeIdx = steps.findIndex((s) => s.state === 'running');
      if (activeIdx !== -1) {
        steps[activeIdx].state = 'failed';
        steps[activeIdx].detail = errorMessage || 'Step failed';
      }
    }

    return steps;
  };

  const steps = getStepStates();

  return (
    <div
      className={`max-w-[560px] w-full mx-auto bg-surface rounded-xl border border-line shadow-shell p-6 sm:p-8 ${className}`}
    >
      <div className="mb-5 border-b border-line pb-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display font-bold text-lg text-ink">Analyzing Codebase</h3>
          {progressPercentage !== undefined && progressPercentage > 0 && (
            <span className="text-xs font-mono font-bold text-indigo bg-indigo-surface px-2 py-0.5 rounded border border-indigo/20">
              {progressPercentage}%
            </span>
          )}
        </div>
        <p className="text-xs text-ink-3 mt-1 font-sans">
          Deterministic static analysis, dependency resolution, and contract characterization.
        </p>

        {/* Live Progress Bar */}
        <div className="w-full bg-track rounded-full h-2 overflow-hidden mt-3.5 border border-line/60">
          <div
            className="h-full bg-gradient-to-r from-indigo to-teal rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${
                progressPercentage && progressPercentage > 0
                  ? progressPercentage
                  : steps.filter((s) => s.state === 'completed').length * 20 + 10
              }%`,
            }}
          />
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step) => {
          return (
            <div key={step.id} className="flex items-start gap-3.5">
              {/* Step indicator */}
              <div className="shrink-0 mt-0.5">
                {step.state === 'completed' && (
                  <div className="w-6 h-6 rounded-full bg-teal-surface text-teal-strong flex items-center justify-center border border-teal/30">
                    <Check className="w-3.5 h-3.5" strokeWidth={2.5} />
                  </div>
                )}
                {step.state === 'running' && (
                  <div className="w-6 h-6 rounded-full bg-indigo-surface text-indigo flex items-center justify-center border border-indigo/30">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2} />
                  </div>
                )}
                {step.state === 'failed' && (
                  <div className="w-6 h-6 rounded-full bg-red-surface text-red-strong flex items-center justify-center border border-red-line">
                    <AlertCircle className="w-3.5 h-3.5" strokeWidth={2} />
                  </div>
                )}
                {step.state === 'pending' && (
                  <div className="w-6 h-6 rounded-full border border-ink-4/40 flex items-center justify-center text-[11px] font-mono text-ink-4">
                    {step.id}
                  </div>
                )}
              </div>

              {/* Step content */}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-[13px] font-sans ${
                    step.state === 'running'
                      ? 'font-bold text-ink'
                      : step.state === 'completed'
                      ? 'font-medium text-ink-2'
                      : step.state === 'failed'
                      ? 'font-bold text-red-text'
                      : 'text-ink-4 font-normal'
                  }`}
                >
                  {step.title}
                </div>
                {step.detail && step.state === 'running' && (
                  <div className="text-xs font-mono text-indigo-text mt-0.5 truncate">
                    {step.detail}
                  </div>
                )}
                {step.state === 'failed' && (
                  <div className="text-xs text-red-text font-sans mt-0.5">
                    {step.detail}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Cancel / Retry actions */}
      <div className="mt-8 pt-4 border-t border-line flex items-center justify-between">
        <span className="text-xs text-ink-3 font-mono">
          {progressPercentage !== undefined && progressPercentage > 0
            ? `${progressPercentage}% complete`
            : 'Static analysis in progress'}
        </span>

        <div className="flex items-center gap-2">
          {errorMessage && onRetry ? (
            <Button variant="outline" size="sm" onClick={onRetry}>
              Retry
            </Button>
          ) : (
            onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisStepper;

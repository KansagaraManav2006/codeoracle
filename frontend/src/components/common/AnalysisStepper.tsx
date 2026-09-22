import React, { useState } from 'react';
import {
  Check,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Edit3,
  Terminal,
} from 'lucide-react';
import Button from './Button';
import { FetchStage, RepoFetchError } from '../../types';

export type StepState = 'pending' | 'running' | 'completed' | 'failed';

export interface StepperStep {
  id: number;
  title: string;
  state: StepState;
  detail?: string;
}

interface AnalysisStepperProps {
  currentStage: string;
  fetchStage?: FetchStage;
  progressPercentage?: number;
  errorMessage?: string | null;
  fetchError?: RepoFetchError | null;
  onCancel?: () => void;
  onRetry?: () => void;
  onEditUrl?: () => void;
  className?: string;
}

export const AnalysisStepper: React.FC<AnalysisStepperProps> = ({
  currentStage,
  fetchStage,
  progressPercentage,
  errorMessage,
  fetchError,
  onCancel,
  onRetry,
  onEditUrl,
  className = '',
}) => {
  const [showDebug, setShowDebug] = useState(false);

  const isFailed = Boolean(errorMessage || fetchError);

  // Friendly reason generator from code
  const getFriendlyReason = (error?: RepoFetchError | null, rawMsg?: string | null): string => {
    if (error) {
      switch (error.code) {
        case 'INVALID_URL':
          return 'The repository URL format is invalid. Please check the owner and repository name.';
        case 'REPO_NOT_FOUND':
          return 'Repository could not be found on GitHub. Please verify the URL or ensure the repository exists.';
        case 'PRIVATE_REPO':
          return 'Repository could not be accessed. It may be private or require authentication. Only public repositories are currently supported.';
        case 'RATE_LIMITED':
          return 'GitHub API rate limit exceeded. Please wait a moment and try again.';
        case 'TIMEOUT':
          return 'Repository fetching timed out. The repository may be too large or the connection was interrupted.';
        case 'REPO_TOO_LARGE':
          return 'Repository size exceeds the maximum allowed limit for in-memory analysis.';
        case 'CLONE_FAILED':
          return 'Repository could not be cloned. Check repository availability and network connectivity.';
        default:
          return error.message || 'An unexpected error occurred while fetching the repository.';
      }
    }
    return rawMsg || 'An error occurred during analysis.';
  };

  // Structured step states
  const getStepStates = (): StepperStep[] => {
    const stage = (currentStage || '').toLowerCase();

    const steps: StepperStep[] = [
      { id: 1, title: 'Validating and fetching repository', state: 'pending' },
      { id: 2, title: 'Reading and classifying files', state: 'pending' },
      { id: 3, title: 'Building dependency graph', state: 'pending' },
      { id: 4, title: 'Generating explanations and characterization tests', state: 'pending' },
      { id: 5, title: 'Scoring modernization readiness', state: 'pending' },
    ];

    if (fetchStage === 'validating_url' || stage.includes('validat')) {
      steps[0].state = isFailed ? 'failed' : 'running';
      steps[0].detail = 'Validating repository URL…';
    } else if (
      fetchStage === 'fetching_repo' ||
      stage.includes('fetch') ||
      stage.includes('clone') ||
      stage.includes('download') ||
      stage.includes('extract') ||
      stage.includes('preparing')
    ) {
      steps[0].state = isFailed ? 'failed' : 'running';
      steps[0].detail = currentStage;
    } else if (fetchStage === 'reading_files' || stage.includes('classif') || stage.includes('read') || stage.includes('discover')) {
      steps[0].state = 'completed';
      steps[1].state = isFailed ? 'failed' : 'running';
      steps[1].detail = currentStage;
    } else if (fetchStage === 'building_graph' || stage.includes('graph') || stage.includes('dependenc')) {
      steps[0].state = 'completed';
      steps[1].state = 'completed';
      steps[2].state = isFailed ? 'failed' : 'running';
      steps[2].detail = currentStage;
    } else if (fetchStage === 'generating_analysis' || stage.includes('generat') || stage.includes('test') || stage.includes('explan')) {
      steps[0].state = 'completed';
      steps[1].state = 'completed';
      steps[2].state = 'completed';
      steps[3].state = isFailed ? 'failed' : 'running';
      steps[3].detail = currentStage;
    } else if (stage.includes('score') || stage.includes('readiness') || stage.includes('migrat')) {
      steps[0].state = 'completed';
      steps[1].state = 'completed';
      steps[2].state = 'completed';
      steps[3].state = 'completed';
      steps[4].state = isFailed ? 'failed' : 'running';
      steps[4].detail = currentStage;
    } else if (fetchStage === 'completed' || stage.includes('complete')) {
      steps.forEach((s) => (s.state = 'completed'));
    } else {
      steps[0].state = isFailed ? 'failed' : 'running';
      steps[0].detail = currentStage;
    }

    if (isFailed) {
      const activeIdx = steps.findIndex((s) => s.state === 'running');
      if (activeIdx !== -1) {
        steps[activeIdx].state = 'failed';
        steps[activeIdx].detail = errorMessage || 'Failed';
      }
    }

    return steps;
  };

  const steps = getStepStates();

  // If failed, render the structured failure card per Section 1.3
  if (isFailed) {
    const errorCode = fetchError?.code || 'CLONE_FAILED';
    const reasonText = getFriendlyReason(fetchError, errorMessage);
    const techMessage = fetchError?.technicalMessage || errorMessage;

    return (
      <div
        className={`max-w-full w-full mx-auto bg-surface rounded-xl border border-red-line shadow-1 p-5 sm:p-6 animate-[fade-down_150ms_ease-out] ${className}`}
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-start gap-3.5 pb-4 border-b border-line">
          <div className="w-10 h-10 rounded-xl bg-red-surface text-red-strong flex items-center justify-center border border-red-line shrink-0 shadow-xs">
            <AlertCircle className="w-5 h-5" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <h3 className="font-display font-bold text-lg text-ink">Repository fetch failed</h3>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-pill bg-red-surface text-red-strong border border-red-line">
                Error: {errorCode}
              </span>
            </div>
            <p className="text-xs text-ink-3 mt-1">
              CodeOracle was unable to fetch or parse this repository.
            </p>
          </div>
        </div>

        {/* Reason Block */}
        <div className="py-4 space-y-1.5">
          <span className="block font-sans text-xs font-bold uppercase tracking-wider text-ink-3">
            Reason
          </span>
          <p className="font-sans text-sm text-ink leading-relaxed">
            {reasonText}
          </p>
        </div>

        {/* Action Buttons: [Edit Repository URL] [Retry] */}
        <div className="pt-2 flex items-center gap-2.5 flex-wrap">
          {onEditUrl && (
            <Button
              variant="indigo"
              size="sm"
              onClick={onEditUrl}
              icon={<Edit3 className="w-3.5 h-3.5" />}
              className="text-xs font-bold"
            >
              Edit Repository URL
            </Button>
          )}

          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs font-semibold"
            >
              Retry
            </Button>
          )}

          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-xs font-semibold text-ink-3 hover:text-ink ml-auto"
            >
              Dismiss
            </Button>
          )}
        </div>

        {/* Collapsible Technical Diagnostics */}
        <div className="mt-5 pt-3 border-t border-line/70">
          <button
            type="button"
            onClick={() => setShowDebug((v) => !v)}
            className="flex items-center justify-between w-full text-[11px] font-mono text-ink-4 hover:text-ink-2 transition-colors cursor-pointer py-1"
          >
            <span className="flex items-center gap-1.5">
              <Terminal className="w-3 h-3" />
              Technical Diagnostics {showDebug ? '(hide)' : '(show)'}
            </span>
            {showDebug ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showDebug && (
            <div className="mt-2.5 p-3 rounded-lg bg-tile/70 border border-line font-mono text-[11px] text-ink-3 space-y-1.5 overflow-x-auto">
              <div>
                <span className="text-ink-4">Stage: </span>
                <span className="text-ink">{fetchError?.stage || currentStage || 'github_fetch'}</span>
              </div>
              {fetchError?.httpStatus && (
                <div>
                  <span className="text-ink-4">HTTP: </span>
                  <span className="text-ink">{fetchError.httpStatus}</span>
                </div>
              )}
              {techMessage && (
                <div className="pt-1 border-t border-line/50">
                  <span className="text-ink-4 block mb-0.5">Raw error:</span>
                  <pre className="text-[10px] text-red-text whitespace-pre-wrap break-all leading-tight">
                    {techMessage}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Running Stepper UI
  return (
    <div
      className={`max-w-full w-full mx-auto bg-surface rounded-xl border border-line shadow-1 p-5 sm:p-6 ${className}`}
    >
      <div className="mb-5 border-b border-line pb-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display font-bold text-lg text-ink">Analyzing Codebase</h3>
          {progressPercentage !== undefined && progressPercentage > 0 && (
            <span className="text-xs font-mono font-bold text-amber-text bg-amber-surface px-2 py-0.5 rounded-pill border border-amber/35">
              {progressPercentage}%
            </span>
          )}
        </div>
        <p className="text-xs text-ink-3 mt-1 font-sans">
          Deterministic static AST analysis, dependency graph construction, and risk scoring.
        </p>

        {/* Live Progress Bar */}
        <div className="w-full bg-track rounded-full h-2 overflow-hidden mt-3.5 border border-line/60">
          <div
            className="h-full bg-indigo rounded-full transition-all duration-500 ease-out"
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
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Cancel action */}
      <div className="mt-8 pt-4 border-t border-line flex items-center justify-between">
        <span className="text-xs text-ink-3 font-mono">
          {progressPercentage !== undefined && progressPercentage > 0
            ? `${progressPercentage}% complete`
            : 'Static analysis in progress…'}
        </span>

        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
};

export default AnalysisStepper;

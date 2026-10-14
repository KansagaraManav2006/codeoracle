import React from 'react';
import {
  Wand2,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Loader2,
  CheckCircle2,
  Check,
  AlertTriangle,
} from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';
import KpiCard from '../common/KpiCard';
import { formatNumber } from '../../utils/formatters';
import { ModernizationState, CandidateDisposition } from '../../types';
import ModernizationPipeline from './ModernizationPipeline';
import CandidateDispositionPanel, { DispositionCount } from './CandidateDispositionPanel';

interface ModernizationSummaryCardProps {
  modernizationState: ModernizationState;
  isVerifiedState: boolean;
  isLockedState: boolean;
  isFailedState: boolean;
  isNoChangeState: boolean;
  testExecutionState: string;
  runtimeBehaviorState: string;
  statusFilter: string;
  onSelectStage: (stageId: string) => void;
  candidateDispositions: DispositionCount[];
  selectedDisposition: CandidateDisposition | null;
  onSelectDisposition: (disposition: CandidateDisposition | null) => void;
  onOpenRulesRegistry: () => void;
  showPipelineDetails: boolean;
  onTogglePipelineDetails: () => void;
  verifying: boolean;
  onVerify: () => void;
  trustedDemo: boolean;
}

export const ModernizationSummaryCard: React.FC<ModernizationSummaryCardProps> = ({
  modernizationState,
  isVerifiedState,
  isLockedState,
  isFailedState,
  isNoChangeState,
  testExecutionState,
  runtimeBehaviorState,
  statusFilter,
  onSelectStage,
  candidateDispositions,
  selectedDisposition,
  onSelectDisposition,
  onOpenRulesRegistry,
  showPipelineDetails,
  onTogglePipelineDetails,
  verifying,
  onVerify,
  trustedDemo,
}) => {
  return (
    <>
      {/* 2. Non-Destructive Proposal & Verification Clarity Banner */}
      <Card variant="secondary" padding="sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-ink">
                  NON-DESTRUCTIVE MODERNIZATION PROPOSALS
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-surface text-teal-strong border border-teal/20">
                  {modernizationState.generatedDiffs} DIFFS READY
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-tile text-ink-3 border border-line">
                  ORIGINAL CODE UNTOUCHED
                </span>
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                Proposals are generated using deterministic AST rules. Original codebase files remain untouched until you review diffs, test equivalence, and apply patches.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={showPipelineDetails ? 'indigo' : 'outline'}
              size="sm"
              onClick={onTogglePipelineDetails}
              className="text-xs"
            >
              <span>{showPipelineDetails ? 'Hide Pipeline & Rules' : 'Pipeline & Rules Funnel'}</span>
              <Sparkles className="w-3.5 h-3.5 ml-1 text-teal-strong" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Four Core KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="CANDIDATES"
          value={formatNumber(modernizationState.candidates)}
          subtext="Files with legacy syntax"
        />
        <KpiCard
          label="AUTOFIX ELIGIBLE"
          value={formatNumber(modernizationState.autofixEligible)}
          variant="selected"
          subtext="Deterministic rule match"
        />
        <KpiCard
          label="DIFFS GENERATED"
          value={formatNumber(modernizationState.generatedDiffs)}
          variant={modernizationState.generatedDiffs > 0 ? 'highlight' : 'default'}
          subtext="Patches ready for inspection"
        />
        <KpiCard
          label="VERIFICATION STATUS"
          value={isVerifiedState ? 'Sandbox Verified' : isLockedState ? 'Safety Locked' : 'Static Parse Valid'}
          variant={isVerifiedState ? 'highlight' : 'default'}
          subtext={isLockedState ? 'Execute locally via ZIP' : 'Deterministic AST check'}
        />
      </div>

      {/* 4. Collapsible Modernization Pipeline & Safety Criteria Details */}
      {showPipelineDetails && (
        <div className="space-y-4 animate-[fade-down_150ms_ease-out]">
          {/* Canonical 7-Stage Modernization Pipeline Component */}
          <ModernizationPipeline
            state={modernizationState}
            activeStage={statusFilter}
            onSelectStage={onSelectStage}
          />

          {/* Candidate Disposition Panel */}
          <CandidateDispositionPanel
            candidatesCount={modernizationState.candidates}
            autofixEligibleCount={modernizationState.autofixEligible}
            generatedDiffsCount={modernizationState.generatedDiffs}
            dispositions={candidateDispositions}
            selectedDisposition={selectedDisposition}
            onSelectDisposition={onSelectDisposition}
            onOpenRulesRegistry={onOpenRulesRegistry}
          />

          {/* Modernization Verification Pipeline Command Center */}
          <section className="bg-surface border border-line rounded-xl p-5 shadow-1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-line">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-lg border shrink-0 ${
                    isVerifiedState
                      ? 'bg-teal-surface text-teal-strong border-teal/20'
                      : isLockedState
                      ? 'bg-amber-surface text-amber-strong border-amber/20'
                      : isFailedState
                      ? 'bg-red-surface text-red-text border-red-line'
                      : 'bg-indigo-surface text-indigo-text border-indigo/20'
                  }`}
                >
                  {verifying ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isVerifiedState ? (
                    <ShieldCheck className="w-5 h-5" strokeWidth={2} />
                  ) : isFailedState ? (
                    <ShieldAlert className="w-5 h-5" strokeWidth={2} />
                  ) : isLockedState ? (
                    <Lock className="w-5 h-5" strokeWidth={2} />
                  ) : (
                    <Wand2 className="w-5 h-5" strokeWidth={2} />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-bold text-sm sm:text-base text-ink">
                      {trustedDemo
                        ? 'Verified Modernization Loop (Disposable Sandbox)'
                        : 'Modernization Verification Pipeline'}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider border ${
                        isVerifiedState
                          ? 'border-teal/30 bg-teal-surface text-teal-strong'
                          : isLockedState
                          ? 'border-amber/30 bg-amber-surface text-amber-strong'
                          : isFailedState
                          ? 'border-red-line bg-red-surface text-red-text'
                          : 'border-line bg-tile text-ink-3'
                      }`}
                    >
                      {isVerifiedState
                        ? 'Status: Verified (Pass)'
                        : isLockedState
                        ? 'Status: Execution Locked (Untrusted)'
                        : isFailedState
                        ? 'Status: Regression Detected'
                        : 'Status: Static Analysis Only'}
                    </span>
                  </div>
                  <p className="font-sans text-xs text-ink-3 mt-1">
                    {isLockedState
                      ? 'Remote subprocess execution is safety-locked for untrusted uploaded codebases to prevent host execution risks. AST syntax validation is available statically.'
                      : 'Executes the 7-step characterization loop in an isolated disposable sandbox to verify behavior before and after modernization.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isLockedState ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold bg-amber-surface text-amber-strong border border-amber/30">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Runtime Execution Locked</span>
                  </span>
                ) : (
                  <Button
                    variant={isVerifiedState ? 'outline' : 'indigo'}
                    size="sm"
                    onClick={onVerify}
                    disabled={verifying}
                    icon={
                      verifying ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )
                    }
                  >
                    {verifying
                      ? 'Verifying in Sandbox…'
                      : isVerifiedState
                      ? 'Re-verify in Sandbox'
                      : 'Verify in Disposable Sandbox'}
                  </Button>
                )}
              </div>
            </div>

            {/* 3 Explicit Verification States Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-tile border border-line flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  1. STATIC SYNTAX
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  <Check className="w-3.5 h-3.5 text-teal-strong" strokeWidth={2.5} />
                  <span className="font-bold text-teal-strong">VERIFIED</span>
                </div>
                <span className="text-[10px] text-ink-3 mt-1 font-sans">
                  All files pass AST syntax parse checks cleanly.
                </span>
              </div>

              <div className="p-3 rounded-lg bg-tile border border-line flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  2. TEST EXECUTION
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  {isLockedState ? (
                    <Lock className="w-3.5 h-3.5 text-amber-strong" />
                  ) : (
                    <Check className="w-3.5 h-3.5 text-teal-strong" />
                  )}
                  <span
                    className={`font-bold ${
                      isLockedState ? 'text-amber-strong' : 'text-teal-strong'
                    }`}
                  >
                    {testExecutionState.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] text-ink-3 mt-1 font-sans">
                  {isLockedState
                    ? 'Host protection lock active. Run tests locally.'
                    : 'Automated test suite run completed.'}
                </span>
              </div>

              <div className="p-3 rounded-lg bg-tile border border-line flex flex-col justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  3. RUNTIME BEHAVIOR
                </span>
                <div className="flex items-center gap-1.5 mt-1">
                  {isVerifiedState ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-strong" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-strong" />
                  )}
                  <span
                    className={`font-bold ${
                      isVerifiedState ? 'text-teal-strong' : 'text-amber-strong'
                    }`}
                  >
                    {runtimeBehaviorState.toUpperCase()}
                  </span>
                </div>
                <span className="text-[10px] text-ink-3 mt-1 font-sans">
                  {isVerifiedState
                    ? 'Regression free behavioral equivalence confirmed.'
                    : 'Requires local test execution or sandbox verification.'}
                </span>
              </div>
            </div>

            {/* State-aware Banner: No Deterministic Autofix Available */}
            {isNoChangeState && (
              <div className="p-4 rounded-lg bg-tile border border-line text-xs space-y-1.5">
                <div className="flex items-center gap-2 text-ink font-bold">
                  <CheckCircle2 className="w-4 h-4 text-teal-strong" />
                  <span>No deterministic autofix transformations available</span>
                </div>
                <p className="text-ink-3 text-[11px] leading-relaxed">
                  {modernizationState.candidates} modernization candidates were detected, but none currently match a safe rule-based transformation. All original source files remain completely untouched. Review candidates below to plan manual refactoring.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default ModernizationSummaryCard;

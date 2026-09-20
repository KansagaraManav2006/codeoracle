import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Download, FileDiff, Info, Loader2, ShieldAlert, ShieldCheck, Wand2, XCircle } from 'lucide-react';
import { ProjectRefactorResult, RefactorVerificationResult } from '../types';
import { cleanText, warningTitle } from '../utils/presentation';
import EmptyState from './common/EmptyState';
import StatCard from './common/StatCard';
import FindingFunnel from './common/FindingFunnel';

interface Props {
  projectId?: string | null;
  trustedDemo?: boolean;
}

type ViewMode = 'diff' | 'original' | 'modernized';

const errorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body.detail || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export const RefactoredCodeTab: React.FC<Props> = ({ projectId, trustedDemo = false }) => {
  const [result, setResult] = useState<ProjectRefactorResult | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [mode, setMode] = useState<ViewMode>('diff');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/refactor`);
    if (response.status === 409) return;
    if (!response.ok) throw new Error(await errorMessage(response));
    const data: ProjectRefactorResult = await response.json();

    // Check if cached verification exists
    if (!data.verification) {
      try {
        const vRes = await fetch(`/api/projects/${projectId}/refactor/verify`);
        if (vRes.ok) {
          data.verification = await vRes.json();
        }
      } catch {
        // Ignore optional verification load error
      }
    }

    setResult(data);
    setSelectedPath(
      (current) =>
        current ||
        data.files.find((file) => file.changed)?.relative_path ||
        data.files[0]?.relative_path ||
        ''
    );
  }, [projectId]);

  useEffect(() => {
    setResult(null);
    setSelectedPath('');
    setError(null);
    load().catch((reason) =>
      setError(reason instanceof Error ? reason.message : 'Unable to load proposal.')
    );
  }, [load]);

  const generate = async () => {
    if (!projectId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const data: ProjectRefactorResult = await response.json();
      setResult(data);
      setSelectedPath(
        data.files.find((file) => file.changed)?.relative_path || data.files[0]?.relative_path || ''
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Refactor generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const verifyRefactor = async () => {
    if (!projectId || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const verifData: RefactorVerificationResult = await response.json();
      setResult((prev) => (prev ? { ...prev, verification: verifData } : prev));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Verification failed.');
    } finally {
      setVerifying(false);
    }
  };

  const files = useMemo(() => result?.files.filter((file) => file.changed) || [], [result]);
  const selected = files.find((file) => file.relative_path === selectedPath) || files[0];
  const displayedCode = selected
    ? mode === 'diff'
      ? selected.unified_diff
      : mode === 'original'
      ? selected.original_code
      : selected.refactored_code
    : '';

  const verification = result?.verification;

  if (!projectId)
    return (
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center text-sm font-medium text-[#6B645A]">
        Analyze a repository to create a modernization proposal.
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header Action Strip */}
      <section className="flex flex-col gap-4 rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 md:flex-row md:items-center md:justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#E0EFEB] text-[#368A80] rounded-2xl border border-[#BEE0D6]">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#292622]">Modernization Proposal & Verification</h2>
            <p className="mt-0.5 text-xs text-[#6B645A]">
              Suggested updates validated in an isolated disposable sandbox before-and-after change review.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {result && (
            <a
              href={`/api/projects/${projectId}/refactor/download`}
              className="btn-brand-outline-pill px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Download proposal</span>
            </a>
          )}
          <button
            onClick={generate}
            disabled={loading || verifying}
            className="btn-brand-pill px-5 py-2.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            <span>{result ? 'Regenerate' : 'Generate proposal'}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#ECC7C3] bg-[#F6E5E2] p-4 text-xs font-bold text-[#8F3F3A]">
          <XCircle className="h-4 w-4 text-[#C45F58] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#C7C4F7] bg-[#EAE9FB]/70 p-4 text-xs font-bold text-[#4340A0]">
          <Loader2 className="h-4 w-4 animate-spin text-[#4C4FD6]" />
          <span>Analyzing safe modernization opportunities...</span>
        </div>
      )}

      {verifying && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#BEE0D6] bg-[#E0EFEB] p-4 text-xs font-bold text-[#245F59]">
          <Loader2 className="h-4 w-4 animate-spin text-[#368A80]" />
          <span>Executing verified modernization loop in disposable sandbox...</span>
        </div>
      )}

      {/* Shared Empty State */}
      {!result && !loading && (
        <EmptyState
          icon={ShieldAlert}
          iconVariant="success"
          headline="Source code stays untouched"
          description="CodeOracle constructs a separate refactor proposal to modernize legacy patterns without mutating original files."
          actionText="Generate Refactor Proposal"
          onAction={generate}
          trustCopy="Nothing is written back to the uploaded repository. All proposed changes can be downloaded as a reviewable diff."
        />
      )}

      {/* Result Metrics & Proposal Viewer */}
      {result && (
        <>
          {/* Verified Modernization Sandbox Panel */}
          <section className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 shadow-xs">
            {/* Panel Header & Status */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#F0EBE2] pb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-3 rounded-2xl border ${
                    verification?.verified
                      ? 'bg-[#E0EFEB] text-[#245F59] border-[#BEE0D6]'
                      : verification?.status === 'safety_locked'
                      ? 'bg-[#FDF6E2] text-[#8C6218] border-[#E6D3A9]'
                      : verification?.status === 'failed'
                      ? 'bg-[#F6E5E2] text-[#8F3F3A] border-[#ECC7C3]'
                      : 'bg-[#EAE9FB] text-[#4340A0] border-[#C7C4F7]'
                  }`}
                >
                  {verification?.verified ? (
                    <ShieldCheck className="h-6 w-6" />
                  ) : (
                    <ShieldAlert className="h-6 w-6" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-extrabold text-[#292622]">
                      Modernization Verification Loop
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide border ${
                        verification?.verified
                          ? 'border-[#BEE0D6] bg-[#E0EFEB] text-[#245F59]'
                          : verification?.status === 'safety_locked'
                          ? 'border-[#E6D3A9] bg-[#FDF6E2] text-[#8C6218]'
                          : verification?.status === 'failed'
                          ? 'border-[#ECC7C3] bg-[#F6E5E2] text-[#8F3F3A]'
                          : 'border-[#D8CFC2] bg-[#F2EDE4] text-[#6B645A]'
                      }`}
                    >
                      {verification?.verified
                        ? 'Status: Verified'
                        : verification?.status === 'safety_locked'
                        ? 'Status: Safety Locked'
                        : verification?.status === 'failed'
                        ? 'Status: Regression Detected'
                        : 'Status: Unverified'}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-[#6B645A]">
                    {verification?.verification_summary ||
                      (!trustedDemo
                        ? 'Untrusted uploaded repositories are execution-locked to prevent arbitrary code execution. Sandbox verification is enabled for trusted built-in demos.'
                        : 'Never claim safety without verification evidence. Run the verification loop to test proposals in a disposable sandbox.')}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                {!trustedDemo && (
                  <span className="text-[10px] font-bold text-[#8C6218] bg-[#FDF6E2] border border-[#E6D3A9] px-2.5 py-1 rounded-full">
                    Untrusted Upload • Locked
                  </span>
                )}
                <button
                  onClick={verifyRefactor}
                  disabled={verifying || loading || !trustedDemo}
                  title={!trustedDemo ? 'Execution is locked for untrusted repositories.' : 'Verify refactor in disposable copy'}
                  className={`px-4 py-2 text-xs inline-flex items-center gap-1.5 shadow-sm rounded-full font-bold transition-all ${
                    !trustedDemo
                      ? 'bg-[#E5DFD5] text-[#8C8479] cursor-not-allowed border border-[#D8CFC2]'
                      : 'btn-brand-pill'
                  }`}
                >
                  {verifying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  <span>
                    {!trustedDemo
                      ? 'Execution Locked'
                      : verification
                      ? 'Re-verify in Sandbox'
                      : 'Verify in Disposable Sandbox'}
                  </span>
                </button>
              </div>
            </div>

            {/* Comparison Metrics Grid */}
            {verification && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* 1. Characterization Tests Before & After */}
                <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B645A]">
                    Regression Tests
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-[#292622]">
                    {verification.after_tests.passed_tests} / {verification.baseline_tests.passed_tests} passed
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B645A]">
                    Before: {verification.baseline_tests.passed_tests} passed • After: {verification.after_tests.passed_tests} passed
                  </p>
                </div>

                {/* 2. Syntax Validation */}
                <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B645A]">
                    Syntax Validation
                  </p>
                  <p className={`mt-1 text-lg font-extrabold ${verification.syntax_status === 'passed' ? 'text-[#245F59]' : 'text-[#8F3F3A]'}`}>
                    {verification.syntax_status === 'passed' ? 'AST Validated' : 'Syntax Error'}
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B645A]">
                    {verification.changed_files.length} modified file(s) checked
                  </p>
                </div>

                {/* 3. Dependency Cycles */}
                <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B645A]">
                    Dependency Loops
                  </p>
                  <p className={`mt-1 text-lg font-extrabold ${verification.metrics.new_cycles === 0 ? 'text-[#245F59]' : 'text-[#8F3F3A]'}`}>
                    {verification.metrics.new_cycles} new cycles
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#6B645A]">
                    Total loops: {verification.metrics.cycles_after}
                  </p>
                </div>

                {/* 4. Re-analyzed Readiness Score */}
                <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B645A]">
                    Reanalyzed Readiness
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-[#292622]">
                    {verification.metrics.readiness_before}/100 → {verification.metrics.readiness_after}/100
                  </p>
                  <p className="mt-0.5 text-[11px] text-[#245F59] font-bold">
                    {verification.metrics.readiness_delta >= 0
                      ? `+${verification.metrics.readiness_delta} pts improvement`
                      : `${verification.metrics.readiness_delta} pts`}
                  </p>
                </div>
              </div>
            )}
          </section>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Files reviewed" value={String(result.analyzed_files)} />
            <StatCard label="Files with suggestions" value={String(result.changed_files)} />
            <StatCard label="Suggested updates" value={String(result.total_changes)} />
            <StatCard
              label="Breaking-change risks"
              value={String(result.breaking_warning_count)}
              signalAmber={result.breaking_warning_count > 0}
            />
          </div>

          <FindingFunnel funnel={result.finding_funnel} />

          {/* Why not every finding produces a refactor diff */}
          <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 text-xs leading-5 text-[#4D4842]">
            <div className="flex items-start gap-2.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#4C4FD6]" />
              <div>
                <p className="font-extrabold text-[#292622]">Why not every finding produces a refactor diff</p>
                <p className="mt-0.5 text-[#6B645A]">
                  Of the <span className="font-bold text-[#292622]">{result.finding_funnel.total_findings} total findings</span> detected statically,{' '}
                  <span className="font-bold text-[#292622]">{result.finding_funnel.modernization_candidates}</span> are modernization candidates, and{' '}
                  <span className="font-bold text-[#292622]">{result.finding_funnel.autofixable_findings}</span> have deterministic transformation rules.{' '}
                  Structural issues (like dependency cycles, security warnings, and dynamic constructs) require architectural review rather than token substitution. Python proposals are AST-parsed; JavaScript and TypeScript proposals receive a structural bracket check only and must be parsed and tested before applying.
                </p>
              </div>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="rounded-2xl border border-[#E6D3A9] bg-[#F5E8CC] p-4 text-xs leading-5 text-[#76561B]">
              <p className="font-bold">No refactor proposals generated</p>
              <p className="mt-1 text-xs text-[#6B645A]">
                The original code was left unchanged because no reliable modernization rule applied.
              </p>
            </div>
          ) : (
            <div className="grid min-h-[480px] gap-4 lg:grid-cols-[280px_1fr]">
              <aside className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-3 shadow-xs">
                <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                  Files with suggestions
                </p>
                {files.map((file) => (
                  <button
                    key={file.relative_path}
                    onClick={() => setSelectedPath(file.relative_path)}
                    className={`mb-1.5 w-full rounded-xl p-3 text-left transition-all ${
                      selected?.relative_path === file.relative_path
                        ? 'bg-[#EAE9FB] text-[#4340A0] font-bold shadow-xs'
                        : 'text-[#4D4842] hover:bg-[#F0EBE2]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <FileDiff className="h-4 w-4 shrink-0 text-[#4C4FD6]" />
                      <span className="truncate">{file.relative_path}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#6B645A]">
                      {file.changes.length} updates | {file.warnings.length} notes
                    </div>
                  </button>
                ))}
              </aside>

              <section className="overflow-hidden rounded-[20px] border-2 border-[#181715] bg-[#1C1A17] shadow-md">
                {selected && (
                  <>
                    <header className="flex flex-col gap-3 border-b border-[#3B3733] bg-[#181715] px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-white">
                      <div>
                        <p className="break-all text-xs font-extrabold text-indigo-300">
                          {selected.relative_path}
                        </p>
                        <p
                          className={`text-[10px] font-bold ${
                            !selected.syntax_valid ? 'text-rose-400' : selected.language === 'python' ? 'text-emerald-400' : 'text-amber-300'
                          }`}
                        >
                          {selected.syntax_valid
                            ? selected.language === 'python' ? 'Python syntax check passed' : 'Bracket balance checked; syntax unverified'
                            : selected.syntax_error}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-full border border-[#3B3733] bg-[#2D2A26] p-0.5">
                          {(['diff', 'original', 'modernized'] as ViewMode[]).map((item) => (
                            <button
                              key={item}
                              onClick={() => setMode(item)}
                              className={`rounded-full px-3 py-1 text-[10px] capitalize font-extrabold transition-all ${
                                mode === item
                                  ? 'bg-[#4C4FD6] text-white shadow-xs'
                                  : 'text-[#A3998E] hover:text-white'
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => navigator.clipboard.writeText(displayedCode)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#383BA8] text-white hover:bg-[#4C4FD6] transition-colors border border-indigo-400/30 inline-flex items-center gap-1"
                          title="Copy code"
                        >
                          <Clipboard className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </header>

                    {selected.warnings.length > 0 && (
                      <div className="border-b border-[#3B3733] bg-[#76561B]/40 p-3 text-amber-200">
                        {selected.warnings.map((warning, index) => (
                          <div
                            key={`${warning.code}-${index}`}
                            className="mb-1 flex gap-2 text-[10px] font-semibold text-amber-300"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <span>
                              <strong>{warningTitle(warning.code)}</strong>: {cleanText(warning.message)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <pre className="max-h-[560px] overflow-auto p-4 text-xs font-mono leading-6 text-[#F3F0EB] bg-[#1C1A17]">
                      <code>{displayedCode}</code>
                    </pre>
                  </>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RefactoredCodeTab;

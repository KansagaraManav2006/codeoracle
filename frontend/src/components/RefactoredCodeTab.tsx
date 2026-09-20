import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wand2,
  Download,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ProjectRefactorResult, RefactoredFile, RefactorVerificationResult } from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import Notice from './common/Notice';
import DiffViewer, { DiffMode } from './common/DiffViewer';
import SearchField from './common/SearchField';
import { useToast } from './common/Toast';

interface RefactoredCodeTabProps {
  projectId?: string | null;
  projectName?: string;
  trustedDemo?: boolean;
}

export const RefactoredCodeTab: React.FC<RefactoredCodeTabProps> = ({
  projectId,
  projectName: _projectName = 'project',
  trustedDemo = false,
}) => {
  const [result, setResult] = useState<ProjectRefactorResult | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [mode, setMode] = useState<DiffMode>('diff');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { showToast } = useToast();

  const loadProposal = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor`);
      if (response.status === 409) return;
      if (!response.ok) throw new Error(`Failed to load proposal (${response.status})`);
      const data: ProjectRefactorResult = await response.json();

      // Check if existing verification exists
      try {
        const vRes = await fetch(`/api/projects/${projectId}/refactor/verify`);
        if (vRes.ok) {
          data.verification = await vRes.json();
        }
      } catch {
        // Verification is optional/pre-computed
      }

      setResult(data);

      const firstChanged = data.files.find((f) => f.changed)?.relative_path || data.files[0]?.relative_path || '';
      setSelectedPath((curr) => curr || firstChanged);
    } catch (err: any) {
      setError(err.message || 'Unable to load modernization proposal.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const handleRegenerate = async () => {
    if (!projectId || regenerating) return;
    setRegenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!response.ok) throw new Error('Refactor regeneration failed');
      const data: ProjectRefactorResult = await response.json();
      setResult(data);
      const firstChanged = data.files.find((f) => f.changed)?.relative_path || data.files[0]?.relative_path || '';
      setSelectedPath(firstChanged);
      showToast('Modernization proposal regenerated', 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to regenerate refactoring proposal';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleVerify = async () => {
    if (!projectId || !trustedDemo || verifying) return;
    setVerifying(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || `Verification failed (${response.status})`);
      }
      const verifData: RefactorVerificationResult = await response.json();
      setResult((prev) => (prev ? { ...prev, verification: verifData } : prev));
      showToast('Modernization verified in disposable sandbox', 'success');
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : 'Verification failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setVerifying(false);
    }
  };

  const handleDownloadProposal = () => {
    if (!projectId) return;
    window.location.href = `/api/projects/${projectId}/refactor/download`;
    showToast('Downloading modernization patch proposal…', 'info');
  };

  const changedFiles = useMemo(() => {
    return (result?.files || []).filter((f) => f.changed);
  }, [result]);

  const filteredFiles = useMemo(() => {
    return changedFiles.filter((f) =>
      f.relative_path.toLowerCase().includes(search.toLowerCase())
    );
  }, [changedFiles, search]);

  const selectedFile: RefactoredFile | undefined =
    changedFiles.find((f) => f.relative_path === selectedPath) || changedFiles[0];

  const ruleWarning = useMemo(() => {
    if (!selectedFile || !selectedFile.warnings || selectedFile.warnings.length === 0) {
      return null;
    }
    const firstWarn = selectedFile.warnings[0];
    return {
      name: firstWarn.code,
      description: firstWarn.message,
    };
  }, [selectedFile]);

  if (!projectId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-28 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
        <div className="skeleton h-[420px] w-full" />
      </div>
    );
  }

  const filesReviewed = result?.analyzed_files || 0;
  const filesWithSuggestions = result?.changed_files || changedFiles.length;
  const suggestedUpdates = result?.total_changes || 0;
  const breakingRisks = result?.breaking_warning_count || 0;
  const verification = result?.verification;

  return (
    <div
      className="space-y-5 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-refactor"
      aria-labelledby="tab-refactor"
    >
      {/* 1. Header Bar */}
      <section className="bg-surface border border-line rounded-lg p-4 sm:p-5 shadow-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-11 h-11 rounded-md bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/20"
            aria-hidden="true"
          >
            <Wand2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight">
              Modernization Proposal &amp; Verification
            </h2>
            <p className="font-sans text-xs text-ink-3 mt-0.5">
              Suggested updates shown as reviewable diffs, tested in a disposable sandbox before merging.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadProposal}
            icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Download proposal
          </Button>

          <Button
            variant="indigo"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerating}
            loadingText="Regenerating…"
            icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Regenerate
          </Button>
        </div>
      </section>

      {/* 2. Four KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="FILES REVIEWED"
          value={formatNumber(filesReviewed)}
          subtext="Audited for modernization"
        />
        <KpiCard
          label="FILES WITH SUGGESTIONS"
          value={formatNumber(filesWithSuggestions)}
          variant="selected"
          subtext="Ready for human review"
        />
        <KpiCard
          label="SUGGESTED UPDATES"
          value={formatNumber(suggestedUpdates)}
          subtext="Deterministic rule diffs"
        />
        <KpiCard
          label="BREAKING-CHANGE RISKS"
          value={formatNumber(breakingRisks)}
          variant={breakingRisks > 0 ? 'highlight' : 'default'}
          subtext="Requires runtime audit"
        />
      </div>

      {/* 3. Verified Modernization Sandbox Panel (Phase 7) */}
      <section className="bg-surface border border-line rounded-xl p-5 shadow-1 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-line">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-lg border shrink-0 ${
                verification?.verified
                  ? 'bg-teal-surface text-teal-strong border-teal/20'
                  : verification?.status === 'safety_locked'
                  ? 'bg-amber-surface text-amber-strong border-amber/20'
                  : verification?.status === 'failed'
                  ? 'bg-red-surface text-red-text border-red-line'
                  : 'bg-indigo-surface text-indigo-text border-indigo/20'
              }`}
            >
              {verification?.verified ? (
                <ShieldCheck className="w-5 h-5" strokeWidth={2} />
              ) : (
                <ShieldAlert className="w-5 h-5" strokeWidth={2} />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm sm:text-base text-ink">
                  Modernization Verification Loop
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider border ${
                    verification?.verified
                      ? 'border-teal/30 bg-teal-surface text-teal-strong'
                      : verification?.status === 'safety_locked'
                      ? 'border-amber/30 bg-amber-surface text-amber-strong'
                      : verification?.status === 'failed'
                      ? 'border-red-line bg-red-surface text-red-text'
                      : 'border-line bg-tile text-ink-3'
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
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                {verification?.verification_summary ||
                  (!trustedDemo
                    ? 'Untrusted uploaded repositories are execution-locked to prevent arbitrary code execution. Sandbox verification is enabled for trusted built-in demos.'
                    : 'Execute characterization tests in an isolated disposable sandbox to verify the modernization before-and-after.')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!trustedDemo ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-semibold bg-amber-surface text-amber-strong border border-amber/30">
                <Lock className="w-3.5 h-3.5" />
                <span>Execution Locked (Untrusted)</span>
              </span>
            ) : (
              <Button
                variant={verification?.verified ? 'outline' : 'indigo'}
                size="sm"
                onClick={handleVerify}
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
                  : verification
                  ? 'Re-verify in Sandbox'
                  : 'Verify in Disposable Sandbox'}
              </Button>
            )}
          </div>
        </div>

        {/* Verification Metrics Grid */}
        {verification && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            <div className="bg-tile border border-line rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                Regression Tests
              </span>
              <p className="mt-1 font-mono text-base font-bold text-ink">
                {verification.after_tests.passed_tests} / {verification.baseline_tests.passed_tests} passed
              </p>
              <p className="text-[11px] text-ink-3 mt-0.5">
                Baseline: {verification.baseline_tests.passed_tests} · Modernized: {verification.after_tests.passed_tests}
              </p>
            </div>

            <div className="bg-tile border border-line rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                Syntax Validation
              </span>
              <p
                className={`mt-1 font-mono text-base font-bold ${
                  verification.syntax_status === 'passed' ? 'text-teal-strong' : 'text-red'
                }`}
              >
                {verification.syntax_status === 'passed' ? 'AST Validated' : 'Syntax Error'}
              </p>
              <p className="text-[11px] text-ink-3 mt-0.5">
                {verification.changed_files.length} modified file(s) checked
              </p>
            </div>

            <div className="bg-tile border border-line rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                Dependency Loops
              </span>
              <p
                className={`mt-1 font-mono text-base font-bold ${
                  verification.metrics.new_cycles === 0 ? 'text-teal-strong' : 'text-red'
                }`}
              >
                {verification.metrics.new_cycles} new cycles
              </p>
              <p className="text-[11px] text-ink-3 mt-0.5">
                Total loops after: {verification.metrics.cycles_after}
              </p>
            </div>

            <div className="bg-tile border border-line rounded-lg p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                Readiness Score Delta
              </span>
              <p className="mt-1 font-mono text-base font-bold text-ink">
                {verification.metrics.readiness_before}/100 → {verification.metrics.readiness_after}/100
              </p>
              <p className="text-[11px] font-semibold text-teal-strong mt-0.5">
                {verification.metrics.readiness_delta >= 0
                  ? `+${verification.metrics.readiness_delta} pts improvement`
                  : `${verification.metrics.readiness_delta} pts`}
              </p>
            </div>
          </div>
        )}
      </section>

      {/* 4. Amber Notice */}
      <Notice type="warning">
        Human review required — Prepared {suggestedUpdates} modernization rule {suggestedUpdates === 1 ? 'group' : 'groups'} across {filesWithSuggestions} {filesWithSuggestions === 1 ? 'file' : 'files'}. Review every diff and run the generated tests before merging.
      </Notice>

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 5. Master–Detail Layout: Files with suggestions list (280px) + Dark Diff Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left: Files with suggestions */}
        <div
          role="listbox"
          aria-label="Files with suggestions"
          className="bg-surface border border-line rounded-lg p-3 shadow-1 max-h-[580px] flex flex-col"
        >
          <div className="px-2 pt-1 pb-3 border-b border-line">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2 block mb-2">
              FILES WITH SUGGESTIONS ({changedFiles.length})
            </span>
            <SearchField
              id="refactor-filter"
              value={search}
              onChange={setSearch}
              placeholder="Filter files…"
              className="w-full"
            />
          </div>

          <div className="overflow-y-auto custom-scrollbar divide-y divide-line/40 mt-2 pr-1">
            {filteredFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-3">
                No files with suggestions match your filter.
              </div>
            ) : (
              filteredFiles.map((f) => {
                const isSelected = selectedFile?.relative_path === f.relative_path;
                return (
                  <button
                    key={f.relative_path}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedPath(f.relative_path)}
                    className={`w-full text-left p-2.5 rounded-md transition-colors my-0.5 flex items-start gap-2.5 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                      isSelected
                        ? 'bg-indigo-surface text-indigo-text font-bold shadow-xs'
                        : 'hover:bg-tile text-ink'
                    }`}
                  >
                    <FileText
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isSelected ? 'text-indigo' : 'text-ink-3'
                      }`}
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs truncate" title={f.relative_path}>
                        {truncateMiddle(f.relative_path, 26)}
                      </div>
                      <div className="text-[11px] font-sans font-normal text-ink-3 mt-0.5">
                        {f.changes?.length || 1} update · {f.warnings?.length || 0} notes
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Dark Diff Viewer per DESIGN.md §7.9 */}
        <div>
          <DiffViewer
            filePath={selectedFile?.relative_path || 'No file selected'}
            diffCode={selectedFile?.unified_diff || ''}
            originalCode={selectedFile?.original_code || ''}
            modernizedCode={selectedFile?.refactored_code || ''}
            mode={mode}
            onModeChange={setMode}
            syntaxCheckPassed={selectedFile?.syntax_valid}
            ruleWarning={ruleWarning}
          />
        </div>
      </div>
    </div>
  );
};

export default RefactoredCodeTab;

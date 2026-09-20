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
  Target,
  TestTube,
  Code2,
  AlertTriangle,
  CheckSquare,
} from 'lucide-react';
import {
  ProjectRefactorResult,
  RefactoredFile,
  RefactorVerificationResult,
  ProjectTestResult,
  GeneratedTestFile,
  HotspotItem,
  TabType,
} from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import DiffViewer, { DiffMode } from './common/DiffViewer';
import SearchField from './common/SearchField';
import { StatusTag } from './common/Tags';
import { useToast } from './common/Toast';

interface RefactoredCodeTabProps {
  projectId?: string | null;
  projectName?: string;
  trustedDemo?: boolean;
  targetFile?: string | null;
  onSelectFile?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
}

export const RefactoredCodeTab: React.FC<RefactoredCodeTabProps> = ({
  projectId,
  projectName: _projectName = 'project',
  trustedDemo = false,
  targetFile = null,
  onSelectFile,
  onInspectImpact,
  onNavigateTab,
}) => {
  const [result, setResult] = useState<ProjectRefactorResult | null>(null);
  const [testsResult, setTestsResult] = useState<ProjectTestResult | null>(null);
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);

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

      const firstChanged =
        data.files.find((f) => f.changed)?.relative_path || data.files[0]?.relative_path || '';
      setSelectedPath((curr) => curr || firstChanged);
    } catch (err: any) {
      setError(err.message || 'Unable to load modernization proposal.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load complementary cross-tab safety test data & hotspots
  useEffect(() => {
    if (!projectId) return;

    // Load generated tests
    fetch(`/api/projects/${projectId}/tests?t=${Date.now()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.test_files) setTestsResult(data);
      })
      .catch(() => {});

    // Load hotspots
    fetch(`/api/projects/${projectId}/hotspots`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hotspots) setHotspots(data.hotspots);
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  // Sync selectedPath when targetFile prop changes
  useEffect(() => {
    if (targetFile && result?.files?.length) {
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const match = result.files.find((f) => {
        const fNorm = f.relative_path.replace(/\\/g, '/').toLowerCase();
        return fNorm === norm || fNorm.endsWith(norm) || norm.endsWith(fNorm);
      });
      if (match) {
        setSelectedPath(match.relative_path);
      }
    }
  }, [targetFile, result]);

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
      const firstChanged =
        data.files.find((f) => f.changed)?.relative_path || data.files[0]?.relative_path || '';
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
    changedFiles.find((f) => f.relative_path === selectedPath) ||
    result?.files.find((f) => f.relative_path === selectedPath) ||
    changedFiles[0] ||
    result?.files[0];

  // Match related safety test for the selected file
  const relatedTest: GeneratedTestFile | undefined = useMemo(() => {
    if (!selectedFile || !testsResult?.test_files) return undefined;
    const sel = selectedFile.relative_path.toLowerCase();
    return testsResult.test_files.find((t) => {
      const tTarget = t.target_relative_path.toLowerCase();
      return tTarget === sel || tTarget.endsWith(sel) || sel.endsWith(tTarget);
    });
  }, [selectedFile, testsResult]);

  // Match related findings for the selected file
  const relatedFindings = useMemo(() => {
    if (!selectedFile) return [];
    const sel = selectedFile.relative_path.toLowerCase();
    const findings = (result?.findings || []).filter((f) => {
      const fFile = f.file.toLowerCase();
      return fFile === sel || fFile.endsWith(sel) || sel.endsWith(fFile);
    });
    return findings;
  }, [selectedFile, result?.findings]);

  // Match related hotspot for the selected file
  const relatedHotspot = useMemo(() => {
    if (!selectedFile || !hotspots.length) return null;
    const sel = selectedFile.relative_path.toLowerCase();
    return (
      hotspots.find((h) => {
        const hFile = h.file.toLowerCase();
        return hFile === sel || hFile.endsWith(sel) || sel.endsWith(hFile);
      }) || null
    );
  }, [selectedFile, hotspots]);

  // Deterministic risk level evaluation for modernizing the selected file
  const fileRisk = useMemo(() => {
    if (!selectedFile) return { level: 'low', reason: 'No changes', label: 'LOW' };
    const hasBreaking = selectedFile.warnings.some((w) => w.breaking_change);
    const warnCount = selectedFile.warnings.length;
    const changeCount = selectedFile.changes.length;
    const isCriticalHotspot = relatedHotspot?.risk_level === 'critical';

    if (hasBreaking || isCriticalHotspot) {
      return {
        level: 'critical',
        label: 'CRITICAL RISK',
        reason: hasBreaking
          ? 'Breaking change possible: runtime iterator or object semantics altered (e.g. iteritems returns items view in Python 3). Requires strict regression testing.'
          : `High-risk architecture hotspot (${relatedHotspot?.hotspot_score}/100) undergoing modernization. Extensive characterization tests required.`,
      };
    }
    if (warnCount >= 2 || changeCount >= 3 || relatedHotspot?.risk_level === 'high') {
      return {
        level: 'high',
        label: 'HIGH RISK',
        reason: `Substantial modernization with ${changeCount} transforms across multiple constructs. Manual verification required.`,
      };
    }
    if (changeCount > 0) {
      return {
        level: 'low',
        label: 'LOW RISK',
        reason: 'Deterministic syntactic modernization with clean static AST validation and minimal regression surface.',
      };
    }
    return {
      level: 'low',
      label: 'CLEAN',
      reason: 'No legacy patterns or breaking risks found in this file.',
    };
  }, [selectedFile, relatedHotspot]);

  // Primary rule warning for diff viewer
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
              Suggested updates shown as reviewable diffs, linked to safety protection tests and verified in sandbox before merging.
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
          subtext="Requires runtime test audit"
        />
      </div>

      {/* 3. Verified Modernization Sandbox Panel */}
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
              <div className="flex items-center gap-2 flex-wrap">
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
                <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider bg-tile border border-line text-ink-3">
                  Verification: {trustedDemo ? 'Available' : 'Unavailable (Safety Locked)'}
                </span>
              </div>
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                {verification?.verification_summary ||
                  (!trustedDemo
                    ? 'Untrusted uploaded repositories are execution-locked to prevent arbitrary code execution on the server. Sandbox verification is enabled for trusted built-in demos.'
                    : 'Execute characterization tests in an isolated disposable sandbox to verify behavior before and after modernization.')}
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

      {/* 4. Mandatory Human Review Notice & Requirement Bar */}
      <section className="bg-amber-surface/70 border border-amber-line rounded-xl p-4 shadow-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-strong shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-bold text-sm text-ink">
                Human Review Requirement: MANDATORY BEFORE MERGE
              </h4>
              <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-amber-strong text-white uppercase">
                Review Required
              </span>
            </div>
            <p className="font-sans text-xs text-ink-2 leading-relaxed">
              Automated syntax transformations cannot establish behavioral equivalence without human review. Inspect every diff chunk, verify edge cases, and run local test suites before merging into production.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-ink-2 bg-surface/80 px-3 py-2 rounded-lg border border-amber-line/60">
          <span className="flex items-center gap-1.5 font-bold">
            <CheckSquare className="w-4 h-4 text-amber-strong" />
            Checklist:
          </span>
          <span>1. Diff audited</span>
          <span>·</span>
          <span>2. Tests run</span>
          <span>·</span>
          <span>3. Impact checked</span>
        </div>
      </section>

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 5. Master–Detail Layout: Files List (280px) + Modernization Details & Diff Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left: Files with suggestions list */}
        <div
          role="listbox"
          aria-label="Files with suggestions"
          className="bg-surface border border-line rounded-lg p-3 shadow-1 max-h-[680px] flex flex-col"
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
                const hasBreaking = f.warnings.some((w) => w.breaking_change);
                return (
                  <button
                    key={f.relative_path}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedPath(f.relative_path);
                      onSelectFile?.(f.relative_path);
                    }}
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
                      <div className="flex items-center justify-between text-[11px] font-sans font-normal text-ink-3 mt-0.5">
                        <span>{f.changes?.length || 1} update{f.changes?.length === 1 ? '' : 's'}</span>
                        {hasBreaking && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-red-surface text-red-text border border-red-line uppercase">
                            Breaking
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Modernization Connections & Diff Viewer */}
        <div className="space-y-4">
          {selectedFile && (
            <>
              {/* Target File Header & Action Bar */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                  <div>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      TARGET SOURCE FILE
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-base font-bold text-ink">
                        {selectedFile.relative_path}
                      </span>
                      {selectedFile.changed ? (
                        <span className="px-2 py-0.5 rounded-pill bg-amber-surface text-amber-strong text-[11px] font-bold border border-amber/30">
                          MODERNIZATION PROPOSED ({selectedFile.changes.length} updates)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-pill bg-tile text-ink-3 text-[11px] font-medium border border-line">
                          CLEAN / UNCHANGED
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {onInspectImpact && (
                      <Button
                        variant="indigo"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(selectedFile.relative_path);
                          onInspectImpact(selectedFile.relative_path);
                        }}
                        icon={<Target className="w-3.5 h-3.5" />}
                        className="font-bold text-xs shadow-xs"
                      >
                        What breaks if I change this?
                      </Button>
                    )}

                    {onNavigateTab && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(selectedFile.relative_path);
                          onNavigateTab('tests');
                        }}
                        icon={<TestTube className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Inspect Safety Tests
                      </Button>
                    )}
                  </div>
                </div>

                {/* Risk Level & Syntax Validation Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Risk Level Card */}
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      fileRisk.level === 'critical'
                        ? 'bg-red-surface border-red-line text-red-text'
                        : fileRisk.level === 'high'
                        ? 'bg-amber-surface border-amber-line text-amber-text'
                        : 'bg-tile border-line text-ink-2'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px]">
                        Modernization Risk Level
                      </span>
                      <StatusTag
                        status={
                          fileRisk.level === 'critical'
                            ? 'critical'
                            : fileRisk.level === 'high'
                            ? 'complexity-high'
                            : 'complexity-low'
                        }
                        label={fileRisk.label}
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {fileRisk.reason}
                    </p>
                  </div>

                  {/* Syntax Validation Card (Static vs Real separation) */}
                  <div className="bg-tile border border-line rounded-lg p-3 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-ink-3">
                        Static Syntax Validation
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedFile.syntax_valid
                            ? 'bg-teal-surface text-teal-strong border border-teal/20'
                            : 'bg-red-surface text-red-text border border-red-line'
                        }`}
                      >
                        {selectedFile.syntax_valid ? 'AST Validated' : 'Syntax Error'}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-2 leading-relaxed">
                      {selectedFile.syntax_valid
                        ? 'Modernized code parsed cleanly through language AST parser without syntax errors.'
                        : selectedFile.syntax_error || 'Syntax error encountered in proposal.'}
                    </p>
                    <p className="text-[10px] text-ink-4 pt-1 border-t border-line/40">
                      Static grammar check only — does NOT verify runtime behavioral equivalence.
                    </p>
                  </div>
                </div>
              </div>

              {/* Related Safety Protection Tests Connection Card */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                    <TestTube className="w-4 h-4 text-indigo" />
                    Related Safety Protection Tests
                  </span>
                  {relatedTest ? (
                    <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wider bg-teal-surface text-teal-strong border border-teal/30">
                      Protection Available
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wider bg-amber-surface text-amber-strong border border-amber/30">
                      Protection Missing
                    </span>
                  )}
                </div>

                {relatedTest ? (
                  <div className="bg-tile border border-line rounded-lg p-3 space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-ink">
                          {relatedTest.safe_test_path}
                        </span>
                        <div className="text-[11px] text-ink-3 mt-0.5 flex items-center gap-2 flex-wrap">
                          <span>{relatedTest.test_count} cases</span>
                          <span>·</span>
                          <span>Category: {relatedTest.test_category}</span>
                          <span>·</span>
                          <span>
                            Coverage:{' '}
                            {relatedTest.is_import_only
                              ? '0% (Import smoke only)'
                              : relatedTest.line_coverage != null
                              ? `${Math.round(relatedTest.line_coverage)}% line`
                              : 'Estimated contract'}
                          </span>
                        </div>
                      </div>

                      {onNavigateTab && (
                        <Button
                          variant="indigo"
                          size="sm"
                          onClick={() => {
                            onSelectFile?.(selectedFile.relative_path);
                            onNavigateTab('tests');
                          }}
                          icon={<TestTube className="w-3.5 h-3.5" />}
                          className="shrink-0 text-xs"
                        >
                          View in Safety Tests Tab
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-amber-surface/60 border border-amber-line rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-text">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-strong shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-ink">No Safety Unit Tests Found</strong>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          This module has proposed modernizations but lacks characterization protection tests. Creating tests is strongly recommended before modernizing to prevent regressions.
                        </p>
                      </div>
                    </div>
                    {onNavigateTab && (
                      <Button
                        variant="indigo"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(selectedFile.relative_path);
                          onNavigateTab('tests');
                        }}
                        icon={<TestTube className="w-3.5 h-3.5" />}
                        className="shrink-0 text-xs font-bold shadow-xs"
                      >
                        Generate Safety Tests
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {/* Target AST Findings Card */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2">
                <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                  <Code2 className="w-4 h-4 text-indigo" />
                  Target AST Findings &amp; Rule Transforms ({selectedFile.changes.length})
                </span>

                {selectedFile.changes.length > 0 ? (
                  <div className="divide-y divide-line/60 bg-tile border border-line rounded-lg overflow-hidden text-xs">
                    {selectedFile.changes.map((chg, i) => {
                      const relatedFinding = relatedFindings[i];
                      const matchingWarn = selectedFile.warnings[i];
                      return (
                        <div key={i} className="p-3 space-y-1">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-mono font-bold text-ink flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded bg-surface border border-line text-[10px]">
                                {matchingWarn?.code || relatedFinding?.rule_id || `RULE #${i + 1}`}
                              </span>
                              <span>{chg}</span>
                            </span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                matchingWarn?.breaking_change
                                  ? 'bg-red-surface text-red-text border border-red-line'
                                  : 'bg-teal-surface text-teal-strong'
                              }`}
                            >
                              {matchingWarn?.breaking_change ? 'BREAKING RISK' : 'DETERMINISTIC'}
                            </span>
                          </div>
                          {matchingWarn && (
                            <p className="text-[11px] text-ink-3">
                              {matchingWarn.message}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-tile border border-line rounded text-xs text-ink-3 italic">
                    No active modernization rules applied to this file.
                  </div>
                )}
              </div>

              {/* Diff Viewer with Original vs Modernized Code */}
              <DiffViewer
                filePath={selectedFile.relative_path}
                diffCode={selectedFile.unified_diff || ''}
                originalCode={selectedFile.original_code || ''}
                modernizedCode={selectedFile.refactored_code || ''}
                mode={mode}
                onModeChange={setMode}
                syntaxCheckPassed={selectedFile.syntax_valid}
                ruleWarning={ruleWarning}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RefactoredCodeTab;

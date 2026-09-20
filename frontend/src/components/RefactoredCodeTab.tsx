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
  ChevronDown,
  ChevronUp,
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
  const [showResolvedFindings, setShowResolvedFindings] = useState(false);

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
        reason:
          'Deterministic syntactic modernization with clean static AST validation and minimal regression surface.',
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

  // Compute verification workflow state
  const isLockedState = !trustedDemo || verification?.status === 'safety_locked';
  const isNoChangeState = verification?.status === 'no_changes' || (result && changedFiles.length === 0);
  const isFailedState = verification?.status === 'failed';
  const isVerifiedState = verification?.status === 'verified' || verification?.verified === true;
  const isReadyState = !verification && trustedDemo && !verifying && changedFiles.length > 0;

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
              Suggested updates shown as reviewable diffs, linked to safety protection tests and verified in disposable sandbox before merging.
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

      {/* 3. Verified Modernization Sandbox Command Center */}
      <section className="bg-surface border border-line rounded-xl p-5 shadow-1 space-y-4">
        {/* Header & Status Bar */}
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
                  Verified Modernization Loop (Disposable Sandbox)
                </h3>
                <span
                  className={`px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider border ${
                    verifying
                      ? 'border-indigo/30 bg-indigo-surface text-indigo-text animate-pulse'
                      : isVerifiedState
                      ? 'border-teal/30 bg-teal-surface text-teal-strong'
                      : isLockedState
                      ? 'border-amber/30 bg-amber-surface text-amber-strong'
                      : isFailedState
                      ? 'border-red-line bg-red-surface text-red-text'
                      : isNoChangeState
                      ? 'border-line bg-tile text-teal-strong'
                      : 'border-line bg-tile text-ink-3'
                  }`}
                >
                  {verifying
                    ? 'Status: Verifying Loop in Sandbox…'
                    : isVerifiedState
                    ? 'Status: Verified (Pass)'
                    : isLockedState
                    ? 'Status: Safety Locked'
                    : isFailedState
                    ? 'Status: Regression Detected (Failed)'
                    : isNoChangeState
                    ? 'Status: No Changes Required'
                    : 'Status: Ready for Verification'}
                </span>
                <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider bg-tile border border-line text-ink-3">
                  Verification: {trustedDemo ? 'Available' : 'Unavailable (Safety Locked)'}
                </span>
                <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider bg-teal-surface/60 border border-teal/20 text-teal-text">
                  Original Code: Untouched (Read-Only)
                </span>
              </div>
              <p className="font-sans text-xs text-ink-3 mt-1">
                {verification?.verification_summary ||
                  (!trustedDemo
                    ? 'Untrusted uploaded repositories are execution-locked to prevent arbitrary code execution on the server. Sandbox verification is enabled for trusted built-in demos.'
                    : 'Executes the 7-step characterization loop in an isolated disposable sandbox to verify behavior before and after modernization.')}
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
                variant={isVerifiedState ? 'outline' : 'indigo'}
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
                  : isVerifiedState
                  ? 'Re-verify in Sandbox'
                  : 'Verify in Disposable Sandbox'}
              </Button>
            )}
          </div>
        </div>

        {/* --- State 1: Loading State (Verifying in Sandbox) --- */}
        {verifying && (
          <div className="p-4 rounded-lg bg-indigo-surface/40 border border-indigo/20 space-y-3">
            <div className="flex items-center gap-2 text-indigo-text font-bold text-xs">
              <Loader2 className="w-4 h-4 animate-spin text-indigo" />
              <span>Executing 7-Step Verified Modernization Loop in Ephemeral Disposable Sandbox…</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] font-mono text-ink-2">
              <div className="p-2 rounded bg-surface border border-line flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo text-white text-[9px] flex items-center justify-center font-bold">1</span>
                <span>Generate baseline tests</span>
              </div>
              <div className="p-2 rounded bg-surface border border-line flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo text-white text-[9px] flex items-center justify-center font-bold">2</span>
                <span>Run baseline tests</span>
              </div>
              <div className="p-2 rounded bg-surface border border-line flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo text-white text-[9px] flex items-center justify-center font-bold">3</span>
                <span>Create disposable copy</span>
              </div>
              <div className="p-2 rounded bg-surface border border-line flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo text-white text-[9px] flex items-center justify-center font-bold">4</span>
                <span>Apply modernization to copy</span>
              </div>
              <div className="p-2 rounded bg-surface border border-line flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo text-white text-[9px] flex items-center justify-center font-bold">5</span>
                <span>Run tests on modified copy</span>
              </div>
              <div className="p-2 rounded bg-surface border border-line flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo text-white text-[9px] flex items-center justify-center font-bold">6</span>
                <span>Reanalyze AST &amp; cycles</span>
              </div>
              <div className="p-2 rounded bg-surface border border-line flex items-center gap-2 sm:col-span-2">
                <span className="w-4 h-4 rounded-full bg-indigo text-white text-[9px] flex items-center justify-center font-bold">7</span>
                <span>Compare before vs after metrics</span>
              </div>
            </div>
            <p className="text-[10px] text-ink-4">
              Immutability Guarantee: Original project repository is never modified. Subprocess execution runs exclusively inside an ephemeral disposable directory.
            </p>
          </div>
        )}

        {/* --- State 2: Locked State (Untrusted Codebase) --- */}
        {!verifying && isLockedState && (
          <div className="p-4 rounded-lg bg-amber-surface/60 border border-amber-line text-xs space-y-2.5">
            <div className="flex items-center gap-2 text-amber-strong font-bold">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Verification Unavailable: Untrusted Codebase (Remote Execution Safety Locked)</span>
            </div>
            <p className="text-ink-2 leading-relaxed text-[11px]">
              To protect server infrastructure from arbitrary hostile code execution, remote subprocess execution is permanently disabled for uploaded repositories. Verification is exclusively permitted for trusted built-in demo benchmarks.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
              <div className="bg-surface/80 p-2.5 rounded border border-amber-line/40">
                <strong className="block text-ink font-sans">Original Project</strong>
                <span className="text-teal-strong font-bold">Strictly Read-Only (Untouched)</span>
              </div>
              <div className="bg-surface/80 p-2.5 rounded border border-amber-line/40">
                <strong className="block text-ink font-sans">Static Analysis</strong>
                <span className="text-ink-2">AST Syntax Checked Statically</span>
              </div>
              <div className="bg-surface/80 p-2.5 rounded border border-amber-line/40">
                <strong className="block text-ink font-sans">Runtime Verification</strong>
                <span className="text-amber-strong font-bold">Run Locally via Downloaded Suite</span>
              </div>
            </div>
          </div>
        )}

        {/* --- State 3: Failed State (Regression or Syntax Issue Detected) --- */}
        {!verifying && isFailedState && verification && (
          <div className="p-4 rounded-lg bg-red-surface border border-red-line text-xs space-y-3 text-red-text">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Modernization Verification Failed: Regression or Syntax Error Detected</span>
              </div>
              <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-red-strong text-white uppercase">
                FAILED
              </span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {verification.verification_summary ||
                'The modernization proposal failed automated regression verification in the disposable sandbox. Do not merge without resolving detected regressions.'}
            </p>
            {verification.after_tests.failed_tests > 0 && (
              <div className="p-2 rounded bg-white/70 border border-red-line/60 font-mono text-[11px]">
                <strong>Failed Tests:</strong> {verification.after_tests.failed_tests} characterization test(s) failed after applying modernization diffs.
              </div>
            )}
            {verification.syntax_errors.length > 0 && (
              <div className="p-2 rounded bg-white/70 border border-red-line/60 font-mono text-[11px]">
                <strong>Syntax Errors:</strong> {verification.syntax_errors.join(', ')}
              </div>
            )}
            {verification.metrics.new_cycles > 0 && (
              <div className="p-2 rounded bg-white/70 border border-red-line/60 font-mono text-[11px]">
                <strong>New Dependency Cycles:</strong> {verification.metrics.new_cycles} new circular loop(s) introduced.
              </div>
            )}
          </div>
        )}

        {/* --- State 4: No-Change State (Source Code Already Clean) --- */}
        {!verifying && isNoChangeState && (
          <div className="p-4 rounded-lg bg-tile border border-line text-xs space-y-2">
            <div className="flex items-center gap-2 text-ink font-bold">
              <CheckCircle2 className="w-4 h-4 text-teal-strong" />
              <span>No Modernization Changes Required: Source Code Already Modernized</span>
            </div>
            <p className="text-ink-3 text-[11px] leading-relaxed">
              No deterministic legacy patterns (Python 2 xrange/print/iteritems, or JS var) were detected in this codebase. The engine left all source files untouched and baseline tests are verified.
            </p>
          </div>
        )}

        {/* --- State 5: Ready / Unverified State (Trusted Demo Awaiting Verification) --- */}
        {!verifying && isReadyState && (
          <div className="p-4 rounded-lg bg-indigo-surface/40 border border-indigo/20 text-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-ink text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo" />
                  Ready for Disposable Sandbox Verification (Trusted Demo)
                </h4>
                <p className="text-[11px] text-ink-3 mt-0.5">
                  Execute characterization tests in an isolated disposable sandbox to verify behavior before and after modernization without touching original files.
                </p>
              </div>
              <Button
                variant="indigo"
                size="sm"
                onClick={handleVerify}
                disabled={verifying}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              >
                Verify in Disposable Sandbox
              </Button>
            </div>
            <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono text-ink-3 pt-1 border-t border-indigo/20">
              <span className="font-bold text-indigo">7-Step Loop:</span>
              <span>1. Baseline tests</span>
              <span>→</span>
              <span>2. Run baseline</span>
              <span>→</span>
              <span>3. Disposable copy</span>
              <span>→</span>
              <span>4. Apply diff</span>
              <span>→</span>
              <span>5. Re-run tests</span>
              <span>→</span>
              <span>6. Reanalyze AST</span>
              <span>→</span>
              <span>7. Compare metrics</span>
            </div>
          </div>
        )}

        {/* --- Comprehensive Comparison Metrics Grid (All 10 Items Displayed) --- */}
        {!verifying && verification && (
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-2">
                Before &amp; After Modernization Verification Metrics
              </span>
              <span className="text-[11px] font-mono text-ink-3">
                Engine: {verification.verification_version} · Verified at {verification.verified_at.slice(0, 19).replace('T', ' ')} UTC
              </span>
            </div>

            {/* 10-Item Structured Comparison Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {/* 1 & 2. Tests Before vs After */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  1. Tests Before vs After
                </span>
                <p className="font-mono text-sm font-bold text-ink">
                  {verification.baseline_tests.passed_tests} → {verification.after_tests.passed_tests} passed
                </p>
                <div className="flex items-center justify-between text-[11px] text-ink-3">
                  <span>Failed: {verification.after_tests.failed_tests}</span>
                  <span
                    className={`font-bold ${
                      verification.after_tests.failed_tests === 0 ? 'text-teal-strong' : 'text-red'
                    }`}
                  >
                    {verification.after_tests.failed_tests === 0 ? 'NO REGRESSIONS' : 'FAILED'}
                  </span>
                </div>
              </div>

              {/* 3. Syntax Status */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  2. Syntax AST Status
                </span>
                <p
                  className={`font-mono text-sm font-bold ${
                    verification.syntax_status === 'passed' ? 'text-teal-strong' : 'text-red'
                  }`}
                >
                  {verification.syntax_status === 'passed' ? 'AST Validated' : 'Syntax Error'}
                </p>
                <p className="text-[11px] text-ink-3">
                  {verification.changed_files.length} modified file(s) parsed
                </p>
              </div>

              {/* 4. Coverage Before vs After */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  3. Line Coverage
                </span>
                <p className="font-mono text-sm font-bold text-ink">
                  {verification.after_tests.line_coverage != null
                    ? `${Math.round(verification.after_tests.line_coverage)}% line`
                    : 'Instrumented'}
                </p>
                <p className="text-[11px] text-ink-3">
                  Baseline: {verification.baseline_tests.line_coverage != null ? `${Math.round(verification.baseline_tests.line_coverage)}%` : 'Unmeasured'}
                </p>
              </div>

              {/* 5. New Dependency Cycles */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  4. Dependency Cycles
                </span>
                <p
                  className={`font-mono text-sm font-bold ${
                    verification.metrics.new_cycles === 0 ? 'text-teal-strong' : 'text-red'
                  }`}
                >
                  {verification.metrics.new_cycles} new cycles
                </p>
                <p className="text-[11px] text-ink-3">
                  Total: {verification.metrics.cycles_after} (base: {verification.metrics.cycles_before})
                </p>
              </div>

              {/* 6. Resolved Findings */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  5. Resolved Findings
                </span>
                <p className="font-mono text-sm font-bold text-teal-strong">
                  {verification.metrics.resolved_warnings_count} resolved
                </p>
                {verification.metrics.resolved_warnings.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setShowResolvedFindings((v) => !v)}
                    className="text-[11px] text-indigo hover:underline flex items-center gap-0.5"
                  >
                    <span>{showResolvedFindings ? 'Hide list' : 'View list'}</span>
                    {showResolvedFindings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                ) : (
                  <p className="text-[11px] text-ink-3">Zero findings to resolve</p>
                )}
              </div>

              {/* 7. Readiness Before */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  6. Readiness Before
                </span>
                <p className="font-mono text-sm font-bold text-ink">
                  {verification.metrics.readiness_before} / 100
                </p>
                <p className="text-[11px] text-ink-3">Baseline readiness score</p>
              </div>

              {/* 8. Readiness After */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  7. Readiness After
                </span>
                <p className="font-mono text-sm font-bold text-ink">
                  {verification.metrics.readiness_after} / 100
                </p>
                <p className="text-[11px] text-ink-3">Re-analyzed post-refactor</p>
              </div>

              {/* 9. Readiness Delta */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  8. Readiness Delta
                </span>
                <p
                  className={`font-mono text-sm font-bold ${
                    verification.metrics.readiness_delta >= 0 ? 'text-teal-strong' : 'text-red'
                  }`}
                >
                  {verification.metrics.readiness_delta >= 0 ? '+' : ''}
                  {verification.metrics.readiness_delta} pts
                </p>
                <p className="text-[11px] font-semibold text-teal-strong">
                  {verification.metrics.readiness_delta >= 0 ? 'Score improved' : 'Decreased'}
                </p>
              </div>

              {/* 10. Verified Status */}
              <div className="bg-tile border border-line rounded-lg p-3 space-y-1 col-span-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                  9 &amp; 10. Verification Outcome
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                      verification.verified
                        ? 'bg-teal-surface text-teal-strong border border-teal/30'
                        : 'bg-red-surface text-red-text border border-red-line'
                    }`}
                  >
                    {verification.verified ? 'VERIFIED: PASS' : 'NOT VERIFIED'}
                  </span>
                  <span className="text-[11px] text-ink-2 font-semibold">
                    {verification.verified
                      ? 'Behavioral Equivalence Confirmed'
                      : 'Regression / Syntax Issues'}
                  </span>
                </div>
                <p className="text-[10px] text-ink-4">
                  Original repository source files remained 100% untouched.
                </p>
              </div>
            </div>

            {/* Expandable Resolved Findings List */}
            {showResolvedFindings && verification.metrics.resolved_warnings.length > 0 && (
              <div className="p-3 bg-tile border border-line rounded-lg text-xs space-y-1.5 animate-[fade-down_150ms_ease-out]">
                <span className="font-bold text-ink text-[11px] block">
                  Resolved Findings &amp; Warnings:
                </span>
                <ul className="space-y-1 font-mono text-[11px] text-ink-2 list-disc list-inside">
                  {verification.metrics.resolved_warnings.map((warn, i) => (
                    <li key={i} className="truncate">
                      {warn}
                    </li>
                  ))}
                </ul>
              </div>
            )}
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

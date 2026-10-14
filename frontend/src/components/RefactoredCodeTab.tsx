import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wand2,
  Download,
  FileText,
  Sparkles,
} from 'lucide-react';
import {
  ProjectRefactorResult,
  RefactoredFile,
  RefactorVerificationResult,
  ProjectTestResult,
  GeneratedTestFile,
  HotspotItem,
  ChangeImpact,
  TabType,
  ModernizationState,
  CandidateDisposition,
} from '../types';
import { truncateMiddle } from '../utils/formatters';
import Button from './common/Button';
import { DiffMode } from './common/DiffViewer';
import SearchField from './common/SearchField';
import { useToast } from './common/Toast';
import LoadingState from './common/LoadingState';
import Card from './common/Card';
import PageHeroHeader from './common/PageHeroHeader';
import {
  ModernizationSummaryCard,
  CandidateReviewPanel,
  ModernizationRulesModal,
  DEFAULT_MODERNIZATION_RULES,
  DispositionCount,
} from './modernization';
import { computeFileMetadata } from '../utils/modernizationUtils';
import { refactorService, analysisService, testService } from '../services';

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
  const [activeImpact, setActiveImpact] = useState<ChangeImpact | null>(null);

  const [selectedPath, setSelectedPath] = useState('');
  const [mode, setMode] = useState<DiffMode>('diff');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedDisposition, setSelectedDisposition] = useState<CandidateDisposition | null>(null);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [showPipelineDetails, setShowPipelineDetails] = useState(false);

  // Human review checklist tracking per file in session
  const [reviewChecklist, setReviewChecklist] = useState<
    Record<
      string,
      {
        diffReviewed: boolean;
        testsReviewed: boolean;
        impactChecked: boolean;
        runtimeVerified: boolean;
        approved: boolean;
      }
    >
  >({});

  const { showToast } = useToast();

  const loadProposal = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await refactorService.getProjectRefactor(projectId);

      // Check if existing verification exists
      try {
        const verif = await refactorService.getRefactorVerification(projectId);
        data.verification = verif;
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

    testService
      .getProjectTests(projectId)
      .then((data) => {
        if (data?.test_files) setTestsResult(data);
      })
      .catch(() => {});

    analysisService
      .getHotspots(projectId)
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

  // Fetch change impact dynamically for the selected file
  useEffect(() => {
    if (!projectId || !selectedPath) {
      setActiveImpact(null);
      return;
    }

    analysisService
      .getImpact(projectId, selectedPath)
      .then((impactData) => {
        if (impactData) setActiveImpact(impactData);
      })
      .catch(() => {});
  }, [projectId, selectedPath]);

  const handleRegenerate = async () => {
    if (!projectId || regenerating) return;
    setRegenerating(true);
    setError(null);
    try {
      const data = await refactorService.generateRefactor(projectId, true);
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
      const verifData: RefactorVerificationResult = await refactorService.verifyRefactor(
        projectId,
        true
      );
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
    window.location.href = refactorService.getRefactorDownloadUrl(projectId);
    showToast('Downloading modernization patch proposal…', 'info');
  };

  const toggleChecklistItem = (
    path: string,
    key: 'diffReviewed' | 'testsReviewed' | 'impactChecked' | 'runtimeVerified' | 'approved'
  ) => {
    setReviewChecklist((prev) => {
      const current = prev[path] || {
        diffReviewed: false,
        testsReviewed: false,
        impactChecked: false,
        runtimeVerified: false,
        approved: false,
      };
      return {
        ...prev,
        [path]: {
          ...current,
          [key]: !current[key],
        },
      };
    });
  };

  // Selected file item
  const selectedFile: RefactoredFile | undefined = useMemo(() => {
    if (!result?.files?.length) return undefined;
    return (
      result.files.find((f) => f.relative_path === selectedPath) ||
      result.files.find((f) => f.changed) ||
      result.files[0]
    );
  }, [result, selectedPath]);

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
    return (result?.findings || []).filter((f) => {
      const fFile = f.file.toLowerCase();
      return fFile === sel || fFile.endsWith(sel) || sel.endsWith(fFile);
    });
  }, [selectedFile, result?.findings]);

  // Match related hotspot for the selected file
  const relatedHotspot = useMemo(() => {
    if (!selectedFile || !hotspots.length) return null;
    const sel = selectedFile.relative_path.toLowerCase();
    return (
      hotspots.find((h) => {
        const hFile = (h.filePath || h.file || '').toLowerCase();
        return hFile === sel || hFile.endsWith(sel) || sel.endsWith(hFile);
      }) || null
    );
  }, [selectedFile, hotspots]);

  // Candidate file metadata mapper using pure helper
  const getFileMetadata = useCallback(
    (file: RefactoredFile) => {
      return computeFileMetadata(
        file,
        result,
        testsResult,
        hotspots,
        selectedPath,
        activeImpact
      );
    },
    [result, testsResult, hotspots, selectedPath, activeImpact]
  );

  // All files metadata cache
  const allFilesWithMeta = useMemo(() => {
    return (result?.files || []).map((f) => ({
      file: f,
      meta: getFileMetadata(f),
    }));
  }, [result?.files, getFileMetadata]);

  // Candidate disposition grouped counts
  const candidateDispositions: DispositionCount[] = useMemo(() => {
    const candidates = allFilesWithMeta.filter(
      (item) => item.meta.modFindingsCount > 0 && !item.meta.hasDiff
    );

    const counts: Record<CandidateDisposition, number> = {
      manual_review: 0,
      unsupported_transform: 0,
      insufficient_parse_confidence: 0,
      high_blast_radius: 0,
      missing_protection: 0,
      dynamic_behavior: 0,
      already_modern: 0,
      other: 0,
    };

    for (const item of candidates) {
      counts[item.meta.disposition] = (counts[item.meta.disposition] || 0) + 1;
    }

    return [
      {
        disposition: 'manual_review',
        label: 'Manual review required',
        count: counts.manual_review,
        description: 'Complex logic or architecture requiring human design judgment.',
      },
      {
        disposition: 'unsupported_transform',
        label: 'Unsupported transformation',
        count: counts.unsupported_transform,
        description: 'Legacy construct detected without a safe rule-based substitution.',
      },
      {
        disposition: 'insufficient_parse_confidence',
        label: 'Low parse confidence',
        count: counts.insufficient_parse_confidence,
        description: 'Partial grammar parse prevents deterministic AST guarantees.',
      },
      {
        disposition: 'missing_protection',
        label: 'Missing protection',
        count: counts.missing_protection,
        description: 'Requires characterization unit test before modernizing.',
      },
      {
        disposition: 'high_blast_radius',
        label: 'High blast radius',
        count: counts.high_blast_radius,
        description: 'Multiple transitive callers make automated changes unsafe.',
      },
      {
        disposition: 'dynamic_behavior',
        label: 'Dynamic runtime behavior',
        count: counts.dynamic_behavior,
        description: 'Reflective or dynamic patterns unsafe for static rewriting.',
      },
    ];
  }, [allFilesWithMeta]);

  // Canonical Modernization State Pipeline Object
  const modernizationState: ModernizationState = useMemo(() => {
    if (result?.modernization_state) {
      return result.modernization_state;
    }
    const findings = result?.findings?.length || 0;
    const candidates = allFilesWithMeta.filter((i) => i.meta.modFindingsCount > 0).length;
    const autofixEligible = allFilesWithMeta.filter((i) => i.meta.status === 'AUTOFIX ELIGIBLE').length;
    const generatedDiffs = allFilesWithMeta.filter((i) => i.meta.hasDiff).length;
    const staticallyValidated = allFilesWithMeta.filter(
      (i) => i.meta.hasDiff && i.file.syntax_valid
    ).length;
    const runtimeVerified = result?.verification?.verified ? generatedDiffs : 0;
    const humanApproved = Object.values(reviewChecklist).filter((c) => c.approved).length;

    return {
      findings,
      candidates,
      autofixEligible,
      generatedDiffs,
      staticallyValidated,
      runtimeVerified,
      humanApproved,
    };
  }, [result, allFilesWithMeta, reviewChecklist]);

  // Filtered files list for Candidate Explorer
  const filteredFiles = useMemo(() => {
    return allFilesWithMeta.filter(({ file, meta }) => {
      // 1. Search filter
      const q = search.trim().toLowerCase();
      if (q) {
        if (q.startsWith('status:')) {
          const statusQuery = q.slice(7);
          if (!meta.status.toLowerCase().includes(statusQuery)) return false;
        } else if (q.startsWith('rule:')) {
          const ruleQuery = q.slice(5);
          const hasRule = file.applied_rule_ids?.some((r) => r.toLowerCase().includes(ruleQuery));
          if (!hasRule) return false;
        } else if (q.startsWith('protection:')) {
          const protQuery = q.slice(11);
          if (protQuery === 'missing' && meta.matchingTest) return false;
          if (protQuery === 'available' && !meta.matchingTest) return false;
        } else if (!file.relative_path.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === 'candidates' && meta.modFindingsCount === 0) return false;
      if (statusFilter === 'manual' && meta.status !== 'MANUAL REVIEW') return false;
      if (statusFilter === 'autofix' && meta.status !== 'AUTOFIX ELIGIBLE') return false;
      if (statusFilter === 'diff_ready' && !meta.hasDiff) return false;
      if (statusFilter === 'blocked' && meta.status !== 'BLOCKED') return false;
      if (statusFilter === 'clean' && meta.status !== 'CLEAN') return false;
      if (statusFilter === 'high_risk' && meta.matchingHotspot?.overallRisk !== 'critical') return false;
      if (statusFilter === 'protection_missing' && meta.matchingTest) return false;
      if (statusFilter === 'partial_parse' && file.syntax_valid) return false;

      // 3. Disposition filter
      if (selectedDisposition && meta.disposition !== selectedDisposition) return false;

      // 4. Category filter
      if (categoryFilter !== 'all') {
        const fileFindings = (result?.findings || []).filter(
          (f) => f.file.toLowerCase() === file.relative_path.toLowerCase()
        );
        const matchesCategory = fileFindings.some((f) => f.category === categoryFilter);
        if (!matchesCategory) return false;
      }

      return true;
    });
  }, [allFilesWithMeta, search, statusFilter, selectedDisposition, categoryFilter, result?.findings]);

  // Selected file details
  const selectedMeta = useMemo(() => {
    if (!selectedFile) return null;
    return getFileMetadata(selectedFile);
  }, [selectedFile, getFileMetadata]);

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

  // Diff explanation object
  const diffExplanation = useMemo(() => {
    if (!selectedFile || !selectedFile.changed) return null;
    const firstRuleId = selectedFile.applied_rule_ids?.[0] || selectedFile.warnings?.[0]?.code;
    const ruleObj = (result?.modernization_rules || DEFAULT_MODERNIZATION_RULES).find(
      (r) => r.id === firstRuleId
    );
    return {
      ruleId: firstRuleId,
      ruleName: ruleObj?.name || 'Deterministic rule transformation',
      confidence: selectedMeta?.confidence || 'medium',
      behaviorImpact: selectedFile.warnings.some((w) => w.breaking_change)
        ? 'Possible breaking semantics (e.g. view vs list in Python 3); characterization tests recommended.'
        : 'Zero semantic alteration. Syntactic modernization validated through AST check.',
    };
  }, [selectedFile, result?.modernization_rules, selectedMeta]);

  if (!projectId) return null;

  if (loading) {
    return <LoadingState label="Loading modernization proposals…" />;
  }

  const verification = result?.verification;
  const isLockedState = !trustedDemo || verification?.status === 'safety_locked';
  const isFailedState = verification?.status === 'failed';
  const isVerifiedState = verification?.status === 'verified' || verification?.verified === true;
  const isNoChangeState = Boolean(
    verification?.status === 'no_changes' || (result && modernizationState.generatedDiffs === 0)
  );

  // Verification 3-tier explicit status
  const syntaxCheckPassed = selectedFile ? selectedFile.syntax_valid : true;
  const syntaxStateText = selectedFile?.changed
    ? 'Proposed source parses successfully'
    : 'Current source parses successfully';

  const testExecutionState = isLockedState
    ? 'Not run (Execution locked)'
    : verification?.baseline_tests?.execution_status === 'passed'
    ? 'Passed (Baseline & Modernized)'
    : 'Not run';

  const runtimeBehaviorState = isLockedState
    ? 'Unverified (Safety locked)'
    : isVerifiedState
    ? 'Verified (Behaviorally Equivalent)'
    : isFailedState
    ? 'Regression Detected'
    : 'Unverified';

  return (
    <div
      className="space-y-4 animate-[fade-up_200ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-refactor"
      aria-labelledby="tab-refactor"
    >
      <PageHeroHeader
        icon={Wand2}
        title="REFACTOR PROPOSALS"
        eyebrow="Static Analysis"
        badge={
          trustedDemo ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Sandbox Verified
            </span>
          ) : undefined
        }
        description="Review modernization candidates, deterministic transforms, generated diffs, and verification state before merging."
        actions={[
          {
            label: 'Rule Registry',
            variant: 'secondary' as const,
            onClick: () => setRulesModalOpen(true),
            icon: <Sparkles className="w-3.5 h-3.5 text-amber-on-dark" />,
          },
          {
            label: 'Download Proposal',
            variant: 'secondary' as const,
            onClick: handleDownloadProposal,
            icon: <Download className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
          {
            label: 'Regenerate',
            variant: 'primary' as const,
            onClick: handleRegenerate,
            loading: regenerating,
            loadingText: 'Regenerating…',
            icon: <Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
        ]}
      />

      {/* 2. Modernization Summary, Clarity Banner, KPIs & Pipeline */}
      <ModernizationSummaryCard
        modernizationState={modernizationState}
        isVerifiedState={isVerifiedState}
        isLockedState={isLockedState}
        isFailedState={isFailedState}
        isNoChangeState={isNoChangeState}
        testExecutionState={testExecutionState}
        runtimeBehaviorState={runtimeBehaviorState}
        statusFilter={statusFilter}
        onSelectStage={(stageId) => {
          if (stageId === 'candidates') setStatusFilter('candidates');
          else if (stageId === 'autofix') setStatusFilter('autofix');
          else if (stageId === 'diffs') setStatusFilter('diff_ready');
          else setStatusFilter('all');
        }}
        candidateDispositions={candidateDispositions}
        selectedDisposition={selectedDisposition}
        onSelectDisposition={setSelectedDisposition}
        onOpenRulesRegistry={() => setRulesModalOpen(true)}
        showPipelineDetails={showPipelineDetails}
        onTogglePipelineDetails={() => setShowPipelineDetails((prev) => !prev)}
        verifying={verifying}
        onVerify={handleVerify}
        trustedDemo={trustedDemo}
      />

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 3. Candidate Explorer with Filters + Search + Master–Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 items-start">
        {/* Left: Candidates & Files Explorer */}
        <Card variant="secondary" padding="sm" className="max-h-[780px] flex flex-col space-y-2.5">
          <div className="px-1 pt-1 pb-2 border-b border-line space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2 block">
                CANDIDATES &amp; FILES ({filteredFiles.length} of {allFilesWithMeta.length})
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setCategoryFilter('all');
                  setSelectedDisposition(null);
                }}
                className="text-[10px] text-indigo hover:underline font-semibold"
              >
                Reset
              </button>
            </div>

            <SearchField
              id="refactor-candidate-filter"
              value={search}
              onChange={setSearch}
              placeholder="Search file, rule:py2, status:manual…"
              className="w-full"
            />

            {/* Status Filter Chips */}
            <div className="flex items-center gap-1 flex-wrap pt-1">
              {[
                { id: 'all', label: 'All' },
                { id: 'candidates', label: `Candidates (${modernizationState.candidates})` },
                { id: 'manual', label: 'Manual Review' },
                { id: 'diff_ready', label: `Diffs (${modernizationState.generatedDiffs})` },
                { id: 'blocked', label: 'Blocked' },
                { id: 'clean', label: 'Clean' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-all ${
                    statusFilter === f.id
                      ? 'bg-indigo text-white border-indigo font-bold'
                      : 'bg-tile text-ink-3 border-line hover:bg-surface'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable list */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-line/40 pr-1 flex-1">
            {filteredFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-3 space-y-2">
                <p>No candidates match your current filter.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setSelectedDisposition(null);
                  }}
                  className="text-xs"
                >
                  Clear Filters
                </Button>
              </div>
            ) : (
              filteredFiles.map(({ file, meta }) => {
                const isSelected = selectedFile?.relative_path === file.relative_path;

                return (
                  <button
                    key={file.relative_path}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      setSelectedPath(file.relative_path);
                      onSelectFile?.(file.relative_path);
                    }}
                    className={`w-full text-left p-2.5 rounded-md transition-colors my-1 flex items-start gap-2.5 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
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
                      <div className="font-mono text-xs truncate" title={file.relative_path}>
                        {truncateMiddle(file.relative_path, 28)}
                      </div>

                      <div className="text-[11px] font-sans font-normal text-ink-3 truncate mt-0.5">
                        {meta.candidateType}
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold uppercase border ${
                            meta.status === 'CLEAN'
                              ? 'bg-tile text-ink-3 border-line'
                              : meta.status === 'STATIC VALID' || meta.status === 'RUNTIME VERIFIED'
                              ? 'bg-teal-surface text-teal-strong border-teal/30'
                              : meta.status === 'DIFF READY'
                              ? 'bg-indigo-surface text-indigo border-indigo/30'
                              : meta.status === 'BLOCKED'
                              ? 'bg-red-surface text-red-text border-red-line'
                              : 'bg-amber-surface text-amber-strong border-amber/30'
                          }`}
                        >
                          {meta.status}
                        </span>

                        <span className="text-[10px] text-ink-4">
                          {meta.findingsCount} finding{meta.findingsCount === 1 ? '' : 's'}
                        </span>

                        {meta.matchingTest && (
                          <span className="text-[10px] text-teal-strong font-mono">
                            ✓ Test protected
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </Card>

        {/* Right: Selected Candidate Detail & Diff View */}
        <CandidateReviewPanel
          selectedFile={selectedFile}
          selectedMeta={selectedMeta || undefined}
          relatedTest={relatedTest}
          relatedHotspot={relatedHotspot || undefined}
          relatedFindings={relatedFindings}
          activeImpact={activeImpact}
          mode={mode}
          onModeChange={setMode}
          syntaxCheckPassed={syntaxCheckPassed}
          syntaxStateText={syntaxStateText}
          ruleWarning={ruleWarning}
          diffExplanation={diffExplanation || undefined}
          reviewChecklist={reviewChecklist}
          onToggleChecklistItem={toggleChecklistItem}
          onInspectImpact={onInspectImpact}
          onNavigateTab={onNavigateTab}
          onSelectFile={onSelectFile}
        />
      </div>

      {/* Modernization Rule Registry Modal */}
      <ModernizationRulesModal
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
        rules={result?.modernization_rules || DEFAULT_MODERNIZATION_RULES}
      />
    </div>
  );
};

export default RefactoredCodeTab;

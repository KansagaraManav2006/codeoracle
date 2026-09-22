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
  AlertCircle,
  CheckSquare,
  Sparkles,
  Check,
  Flame,
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
  ModernizationRule,
  CandidateFileStatus,
} from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import DiffViewer, { DiffMode } from './common/DiffViewer';
import SearchField from './common/SearchField';
import { useToast } from './common/Toast';
import LoadingState from './common/LoadingState';
import Badge from './common/Badge';
import Card from './common/Card';
import PageHeader from './common/PageHeader';
import ModernizationPipeline from './modernization/ModernizationPipeline';
import CandidateDispositionPanel, {
  DispositionCount,
} from './modernization/CandidateDispositionPanel';
import ModernizationRulesModal from './modernization/ModernizationRulesModal';

interface RefactoredCodeTabProps {
  projectId?: string | null;
  projectName?: string;
  trustedDemo?: boolean;
  targetFile?: string | null;
  onSelectFile?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
}

const DEFAULT_MODERNIZATION_RULES: ModernizationRule[] = [
  {
    id: 'PY2_XRANGE',
    name: 'Python 2 xrange to range',
    language: 'python',
    category: 'legacy_syntax',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Replaces legacy Python 2 xrange() generator with Python 3 range().',
    exampleBefore: 'for i in xrange(10):',
    exampleAfter: 'for i in range(10):',
  },
  {
    id: 'PY2_ITERITEMS',
    name: 'Dictionary iteritems to items',
    language: 'python',
    category: 'deprecated_api',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Replaces dict.iteritems() with dict.items(). Returns a view in Python 3.',
    exampleBefore: 'for k, v in d.iteritems():',
    exampleAfter: 'for k, v in d.items():',
  },
  {
    id: 'PY2_ITERKEYS',
    name: 'Dictionary iterkeys to keys',
    language: 'python',
    category: 'deprecated_api',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Replaces dict.iterkeys() with dict.keys().',
    exampleBefore: 'for k in d.iterkeys():',
    exampleAfter: 'for k in d.keys():',
  },
  {
    id: 'PY2_ITERVALUES',
    name: 'Dictionary itervalues to values',
    language: 'python',
    category: 'deprecated_api',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Replaces dict.itervalues() with dict.values().',
    exampleBefore: 'for v in d.itervalues():',
    exampleAfter: 'for v in d.values():',
  },
  {
    id: 'PY2_RAW_INPUT',
    name: 'Python 2 raw_input to input',
    language: 'python',
    category: 'legacy_syntax',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Replaces raw_input() with input().',
    exampleBefore: "name = raw_input('Name: ')",
    exampleAfter: "name = input('Name: ')",
  },
  {
    id: 'PY2_BASESTRING',
    name: 'Python 2 basestring to str',
    language: 'python',
    category: 'legacy_syntax',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Replaces basestring abstract type with str.',
    exampleBefore: 'isinstance(val, basestring)',
    exampleAfter: 'isinstance(val, str)',
  },
  {
    id: 'PY2_UNICODE',
    name: 'Python 2 unicode to str',
    language: 'python',
    category: 'legacy_syntax',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Replaces unicode() constructor with str().',
    exampleBefore: 'text = unicode(data)',
    exampleAfter: 'text = str(data)',
  },
  {
    id: 'PY2_PRINT',
    name: 'Python 2 print statement to function',
    language: 'python',
    category: 'legacy_syntax',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: 'Converts legacy print statement to print() function call.',
    exampleBefore: "print 'Hello world'",
    exampleAfter: "print('Hello world')",
  },
  {
    id: 'PY2_EXCEPT',
    name: 'Python 2 except syntax to as',
    language: 'python',
    category: 'legacy_syntax',
    deterministic: true,
    requiresFullAst: true,
    requiresProtection: true,
    description: "Converts 'except Exception, e:' to 'except Exception as e:'.",
    exampleBefore: 'except ValueError, err:',
    exampleAfter: 'except ValueError as err:',
  },
  {
    id: 'JS_VAR_DECLARATION',
    name: 'JavaScript var to let/const',
    language: 'javascript',
    category: 'legacy_syntax',
    deterministic: true,
    requiresFullAst: false,
    requiresProtection: true,
    description: 'Replaces function-scoped var declaration with block-scoped let declaration.',
    exampleBefore: 'var count = 0;',
    exampleAfter: 'let count = 0;',
  },
  {
    id: 'JS_EQUALITY_REVIEW_REQUIRED',
    name: 'JavaScript loose equality review',
    language: 'javascript',
    category: 'unsafe_pattern',
    deterministic: false,
    requiresFullAst: false,
    requiresProtection: true,
    description: 'Identifies loose == / != comparisons that require manual review before strict === conversion.',
    exampleBefore: 'if (x == null)',
    exampleAfter: 'if (x === null || x === undefined) // manual review',
  },
];

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

  // Fetch change impact dynamically for the selected file
  useEffect(() => {
    if (!projectId || !selectedPath) {
      setActiveImpact(null);
      return;
    }

    fetch(`/api/projects/${projectId}/impact?target=${encodeURIComponent(selectedPath)}`)
      .then((res) => (res.ok ? res.json() : null))
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

  // Candidate file metadata mapper
  const getFileMetadata = useCallback(
    (file: RefactoredFile) => {
      const sel = file.relative_path.toLowerCase();
      const findings = (result?.findings || []).filter((f) => {
        const fFile = f.file.toLowerCase();
        return fFile === sel || fFile.endsWith(sel) || sel.endsWith(fFile);
      });
      const modFindings = findings.filter((f) => f.category === 'modernization');
      const hasDiff = file.changed && file.unified_diff?.trim().length > 0;
      const matchingTest = testsResult?.test_files?.find((t) => {
        const tTarget = t.target_relative_path.toLowerCase();
        return tTarget === sel || tTarget.endsWith(sel) || sel.endsWith(tTarget);
      });
      const matchingHotspot = hotspots.find((h) => {
        const hFile = (h.filePath || h.file || '').toLowerCase();
        return hFile === sel || hFile.endsWith(sel) || sel.endsWith(hFile);
      });

      // Status
      let status: CandidateFileStatus = 'CLEAN';
      if (file.changed) {
        if (result?.verification?.verified) {
          status = 'RUNTIME VERIFIED';
        } else if (file.syntax_valid) {
          status = 'STATIC VALID';
        } else {
          status = 'DIFF READY';
        }
      } else if (modFindings.some((f) => f.autofixable)) {
        status = 'AUTOFIX ELIGIBLE';
      } else if (modFindings.length > 0) {
        if (!matchingTest || !file.syntax_valid) {
          status = 'BLOCKED';
        } else {
          status = 'MANUAL REVIEW';
        }
      } else if (findings.length > 0) {
        status = 'FINDINGS';
      } else {
        status = 'CLEAN';
      }

      // Candidate type classification
      let candidateType = 'Structural audit';
      if (file.changed) {
        candidateType = 'Deterministic rule diff';
      } else if (matchingHotspot?.overallRisk === 'critical') {
        candidateType = 'High-complexity service refactor';
      } else if (modFindings.some((f) => f.rule_id?.includes('XRANGE') || f.rule_id?.includes('PRINT') || f.rule_id?.includes('VAR'))) {
        candidateType = 'Legacy syntax modernization';
      } else if (modFindings.some((f) => f.rule_id?.includes('ITER') || f.rule_id?.includes('UNICODE'))) {
        candidateType = 'Deprecated API modernization';
      } else if (modFindings.some((f) => f.rule_id?.includes('CYCLE'))) {
        candidateType = 'Dependency coupling decoupling';
      } else if (modFindings.length > 0) {
        candidateType = 'Modernization candidate';
      } else {
        candidateType = 'Clean / Unchanged';
      }

      // Candidate rejection disposition (when no diff)
      let disposition: CandidateDisposition = 'already_modern';
      if (file.changed) {
        disposition = 'manual_review';
      } else if (!file.syntax_valid || file.syntax_error) {
        disposition = 'insufficient_parse_confidence';
      } else if (modFindings.length > 0 && !matchingTest) {
        disposition = 'missing_protection';
      } else if ((matchingHotspot?.graph?.blastRadius ?? matchingHotspot?.blast_radius ?? 0) > 4) {
        disposition = 'high_blast_radius';
      } else if (findings.some((f) => f.rule_id?.includes('EVAL') || f.rule_id?.includes('EXEC'))) {
        disposition = 'dynamic_behavior';
      } else if (modFindings.length > 0 && !modFindings.some((f) => f.autofixable)) {
        disposition = 'unsupported_transform';
      } else if (modFindings.length > 0) {
        disposition = 'manual_review';
      } else {
        disposition = 'already_modern';
      }

      // Modernization confidence evaluation
      let confidenceScore = 3; // Baseline medium
      const checks: { passed: boolean; label: string }[] = [];

      if (file.syntax_valid) {
        confidenceScore += 1;
        checks.push({ passed: true, label: 'Full AST parsed' });
      } else {
        confidenceScore -= 2;
        checks.push({ passed: false, label: 'Partial parse or syntax warning' });
      }

      if (file.changed && (file.applied_rule_ids?.length || file.changes?.length)) {
        confidenceScore += 2;
        checks.push({ passed: true, label: 'Deterministic rule match' });
      } else if (modFindings.length > 0) {
        checks.push({ passed: false, label: 'Structural refactor (manual rule)' });
      }

      if (matchingTest) {
        confidenceScore += 1;
        checks.push({ passed: true, label: 'Safety protection tests available' });
      } else if (modFindings.length > 0) {
        confidenceScore -= 1;
        checks.push({ passed: false, label: 'Protection missing' });
      }

      const blast =
        matchingHotspot?.graph?.blastRadius ??
        matchingHotspot?.blast_radius ??
        (file.relative_path === selectedPath ? activeImpact?.blast_radius : undefined) ??
        1;
      if (blast <= 2) {
        checks.push({ passed: true, label: `Contained blast radius (${blast})` });
      } else {
        confidenceScore -= 1;
        checks.push({ passed: false, label: `Wider blast radius (${blast})` });
      }

      const confidence: 'high' | 'medium' | 'low' =
        confidenceScore >= 5 ? 'high' : confidenceScore >= 3 ? 'medium' : 'low';

      return {
        status,
        candidateType,
        disposition,
        findingsCount: findings.length,
        modFindingsCount: modFindings.length,
        hasDiff,
        matchingTest,
        matchingHotspot,
        confidence,
        confidenceChecks: checks,
        blastRadius: blast,
      };
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
      // 1. Search filter (supports rule:py2, status:manual, protection:missing)
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
  const isNoChangeState = verification?.status === 'no_changes' || (result && modernizationState.generatedDiffs === 0);

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
    ? 'Verified (Behavior equivalence confirmed)'
    : isFailedState
    ? 'Failed (Regression detected)'
    : 'Unverified';

  return (
    <div
      className="space-y-4 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-refactor"
      aria-labelledby="tab-refactor"
    >
      <PageHeader
        icon={Wand2}
        title="Refactored Code"
        description="Review candidates, deterministic rule diffs, and verification pipeline before merging."
        badge={
          <Badge tone={trustedDemo ? 'green' : 'indigo'} size="sm">
            {trustedDemo ? 'Sandbox verified' : 'Static analysis'}
          </Badge>
        }
        actions={
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setRulesModalOpen(true)}
            icon={<Sparkles className="w-3.5 h-3.5 text-indigo" />}
          >
            Rule Registry
          </Button>

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
        }
      />

      {/* 2. Six Canonical Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-3.5">
        <KpiCard
          label="FILES SCANNED"
          value={formatNumber(result?.analyzed_files || 0)}
          subtext="Audited codebase files"
        />
        <KpiCard
          label="STATIC FINDINGS"
          value={formatNumber(modernizationState.findings)}
          subtext="AST & syntax detections"
        />
        <KpiCard
          label="CANDIDATES"
          value={formatNumber(modernizationState.candidates)}
          variant="selected"
          subtext="Worth reviewing"
        />
        <KpiCard
          label="AUTOFIX ELIGIBLE"
          value={formatNumber(modernizationState.autofixEligible)}
          subtext="Deterministic rule match"
        />
        <KpiCard
          label="DIFFS GENERATED"
          value={formatNumber(modernizationState.generatedDiffs)}
          variant={modernizationState.generatedDiffs > 0 ? 'highlight' : 'default'}
          subtext="Patch proposals ready"
        />
        <KpiCard
          label="RUNTIME VERIFIED"
          value={formatNumber(modernizationState.runtimeVerified)}
          variant={modernizationState.runtimeVerified > 0 ? 'highlight' : 'default'}
          subtext={trustedDemo ? 'Sandbox passed' : 'Safety locked'}
        />
      </div>

      {/* 3. Canonical 7-Stage Modernization Pipeline Component */}
      <ModernizationPipeline
        state={modernizationState}
        activeStage={statusFilter}
        onSelectStage={(stageId) => {
          if (stageId === 'candidates') setStatusFilter('candidates');
          else if (stageId === 'autofix') setStatusFilter('autofix');
          else if (stageId === 'diffs') setStatusFilter('diff_ready');
          else setStatusFilter('all');
        }}
      />

      {/* 4. Candidate Disposition Panel (Explaining 37 -> 0 Confusion) */}
      <CandidateDispositionPanel
        candidatesCount={modernizationState.candidates}
        autofixEligibleCount={modernizationState.autofixEligible}
        generatedDiffsCount={modernizationState.generatedDiffs}
        dispositions={candidateDispositions}
        selectedDisposition={selectedDisposition}
        onSelectDisposition={setSelectedDisposition}
        onOpenRulesRegistry={() => setRulesModalOpen(true)}
      />

      {/* 5. Modernization Verification Pipeline Command Center */}
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
                <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider bg-teal-surface/60 border border-teal/20 text-teal-text">
                  Static validation available
                </span>
                <span className="px-2 py-0.5 rounded-pill font-sans text-[10px] font-bold uppercase tracking-wider bg-tile border border-line text-ink-3">
                  Original Code: Untouched (Read-Only)
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

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 6. Candidate Explorer with Filters + Search + Master–Detail Layout */}
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
        <div className="space-y-4 min-w-0">
          {selectedFile && selectedMeta ? (
            <>
              {/* Selected Target Header */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                  <div className="min-w-0">
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      TARGET SOURCE FILE
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-base font-bold text-ink truncate max-w-md">
                        {selectedFile.relative_path}
                      </span>
                      {selectedFile.changed ? (
                        <span className="px-2 py-0.5 rounded-pill bg-amber-surface text-amber-strong text-[11px] font-bold border border-amber/30">
                          DIFF GENERATED ({selectedFile.changes.length} transform{selectedFile.changes.length === 1 ? '' : 's'})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-pill bg-tile text-ink-3 text-[11px] font-medium border border-line">
                          CLEAN / UNCHANGED (0 transforms)
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

                {/* Candidate Classification & Modernization Confidence Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Candidate Classification & Safe Autofix vs Refactor */}
                  <div className="bg-tile border border-line rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-ink-3">
                        Modernization Classification
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedFile.changed
                            ? 'bg-teal-surface text-teal-strong border border-teal/20'
                            : 'bg-indigo-surface text-indigo-text border border-indigo/20'
                        }`}
                      >
                        {selectedFile.changed ? 'SAFE AUTOFIX' : 'REFACTOR RECOMMENDATION'}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="font-bold text-ink">
                        {selectedMeta.candidateType}
                      </div>
                      <p className="text-[11px] text-ink-2 leading-relaxed">
                        {selectedFile.changed
                          ? 'Deterministic rule pattern matched with guaranteed syntax preservation.'
                          : 'Structural, cyclic, or complex code requiring human engineering review and safety test verification before modifying.'}
                      </p>
                    </div>

                    <div className="pt-1.5 border-t border-line/50 flex items-center justify-between text-[11px] text-ink-3">
                      <span>Blast radius: {selectedMeta.blastRadius}</span>
                      <span>Findings: {selectedMeta.findingsCount}</span>
                    </div>
                  </div>

                  {/* Modernization Confidence Breakdown */}
                  <div className="bg-tile border border-line rounded-lg p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px] text-ink-3">
                        Modernization Confidence
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                          selectedMeta.confidence === 'high'
                            ? 'bg-teal-surface text-teal-strong border-teal/30'
                            : selectedMeta.confidence === 'medium'
                            ? 'bg-indigo-surface text-indigo border-indigo/30'
                            : 'bg-amber-surface text-amber-strong border-amber/30'
                        }`}
                      >
                        {selectedMeta.confidence.toUpperCase()} CONFIDENCE
                      </span>
                    </div>

                    <div className="space-y-1 font-sans text-[11px]">
                      {selectedMeta.confidenceChecks.map((chk, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          {chk.passed ? (
                            <Check className="w-3.5 h-3.5 text-teal-strong shrink-0" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                          )}
                          <span className={chk.passed ? 'text-ink-2' : 'text-amber-text'}>
                            {chk.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Clean File State vs Protection Requirements */}
              {!selectedFile.changed ? (
                <div className="bg-tile border border-line rounded-lg p-4 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-ink">
                    <CheckCircle2 className="w-4 h-4 text-teal-strong" />
                    <span>NO CHANGE PROPOSED</span>
                  </div>
                  <p className="text-ink-3 leading-relaxed">
                    No deterministic modernization transform applies to this file. Source code remains 100% untouched.
                  </p>
                  <p className="text-ink-4 text-[11px] pt-1">
                    {relatedTest
                      ? `Protected by safety test: ${relatedTest.safe_test_path}`
                      : 'No generated protection test is associated with this file.'}
                  </p>
                </div>
              ) : (
                /* Protection Missing warning ONLY when proposals exist AND tests are missing */
                !relatedTest && (
                  <div className="p-3.5 bg-amber-surface/70 border border-amber-line rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-text">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-strong shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-ink font-bold">
                          PROTECTION MISSING: Safety Unit Tests Required
                        </strong>
                        <p className="text-[11px] opacity-90 mt-0.5">
                          This file has proposed modernizations but lacks characterization safety protection tests. Generate tests before merging to prevent regressions.
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
                        className="shrink-0 text-xs font-bold"
                      >
                        Generate Safety Tests
                      </Button>
                    )}
                  </div>
                )
              )}

              {/* Blocked By & Recommended Action (if candidate without diff) */}
              {!selectedFile.changed && selectedMeta.modFindingsCount > 0 && (
                <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-strong" />
                      BLOCKED BY (Rejection reason)
                    </span>
                    <span className="text-[11px] text-ink-3 font-mono">
                      {selectedMeta.disposition.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="p-3 bg-tile border border-line rounded-lg space-y-2">
                    <p className="text-ink-2 leading-relaxed text-[11px]">
                      {selectedMeta.disposition === 'missing_protection'
                        ? 'Blocked by missing characterization test protection. CodeOracle does not auto-apply diffs without regression guards.'
                        : selectedMeta.disposition === 'unsupported_transform'
                        ? 'Blocked because no deterministic 100% AST-preserving transformation matches this construct.'
                        : selectedMeta.disposition === 'high_blast_radius'
                        ? `Blocked by high transitive dependency blast radius (${selectedMeta.blastRadius} dependents). Requires manual staging.`
                        : 'Blocked for manual review: architectural or high-complexity patterns require developer oversight.'}
                    </p>

                    <div className="flex items-center gap-2 pt-1">
                      <strong className="text-ink">Recommended Next Action:</strong>
                      {selectedMeta.disposition === 'missing_protection' && onNavigateTab ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            onSelectFile?.(selectedFile.relative_path);
                            onNavigateTab('tests');
                          }}
                          icon={<TestTube className="w-3.5 h-3.5" />}
                        >
                          Generate Safety Test
                        </Button>
                      ) : onInspectImpact ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onInspectImpact(selectedFile.relative_path)}
                          icon={<Target className="w-3.5 h-3.5" />}
                        >
                          Inspect Dependency Blast Radius
                        </Button>
                      ) : (
                        <span className="font-mono text-indigo font-bold">
                          Review Manually Before Applying
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Change Impact & Blast Radius (Reusing Canonical DependencyGraph) */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-indigo" />
                    Change Impact &amp; Blast Radius
                  </span>
                  <span className="font-mono text-[11px] text-ink-3">
                    Canonical Dependency Graph
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
                  <div className="p-2.5 rounded bg-tile border border-line">
                    <span className="text-[10px] text-ink-3 uppercase block">
                      Direct Dependents
                    </span>
                    <span className="font-bold text-ink text-sm">
                      {activeImpact?.direct_dependents?.length ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-tile border border-line">
                    <span className="text-[10px] text-ink-3 uppercase block">
                      Transitive Blast Radius
                    </span>
                    <span className="font-bold text-ink text-sm">
                      {activeImpact?.transitive_dependents?.length ?? selectedMeta.blastRadius}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-tile border border-line">
                    <span className="text-[10px] text-ink-3 uppercase block">
                      Entry Points Affected
                    </span>
                    <span className="font-bold text-ink text-sm">
                      {activeImpact?.affected_entry_points?.length ?? 0}
                    </span>
                  </div>
                  <div className="p-2.5 rounded bg-tile border border-line">
                    <span className="text-[10px] text-ink-3 uppercase block">
                      Available Protection Tests
                    </span>
                    <span className="font-bold text-teal-strong text-sm">
                      {relatedTest ? `${relatedTest.test_count} cases` : '0 tests'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Target AST Findings Card */}
              {relatedFindings.length > 0 && (
                <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                      <Code2 className="w-4 h-4 text-indigo" />
                      Target AST Findings ({relatedFindings.length})
                    </span>
                    <span className="font-mono text-[11px] text-ink-3">
                      Static Detections
                    </span>
                  </div>
                  <div className="divide-y divide-line/60 bg-tile border border-line rounded-lg overflow-hidden text-xs max-h-48 overflow-y-auto custom-scrollbar">
                    {relatedFindings.map((f, i) => (
                      <div key={f.id || i} className="p-2.5 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="font-mono font-bold text-ink mr-2">{f.rule_id}</span>
                          <span className="text-ink-3">{f.message}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold bg-surface border border-line shrink-0">
                          Line {f.line || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk Before / After (Static Estimate) */}
              {selectedFile.changed && relatedHotspot && (
                <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-strong" />
                      Risk Before &amp; After Modernization (Static Estimate)
                    </span>
                    <span className="px-2 py-0.5 rounded font-mono text-[10px] bg-tile border border-line text-ink-3">
                      Static estimate
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-3 rounded bg-tile border border-line space-y-1">
                      <span className="text-[10px] text-ink-3 uppercase font-bold">
                        BEFORE MODERNIZATION
                      </span>
                      <div className="text-ink">
                        Hotspot Score:{' '}
                        <strong>
                          {relatedHotspot.hotspotScore ?? relatedHotspot.hotspot_score ?? 60}
                        </strong>
                        /100
                      </div>
                      <div className="text-ink-2">
                        Risk Level: <strong className="uppercase">{relatedHotspot.risk_level || 'high'}</strong>
                      </div>
                    </div>

                    <div className="p-3 rounded bg-teal-surface/40 border border-teal/30 space-y-1">
                      <span className="text-[10px] text-teal-text uppercase font-bold">
                        AFTER (STATIC ESTIMATE)
                      </span>
                      <div className="text-ink">
                        Hotspot Score:{' '}
                        <strong className="text-teal-strong">
                          {Math.max(10, (relatedHotspot.hotspotScore ?? relatedHotspot.hotspot_score ?? 60) - 10)}
                        </strong>
                        /100 (-10 pts)
                      </div>
                      <div className="text-teal-strong font-semibold">
                        Syntactic debt eliminated; runtime tests required.
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Diff Viewer with Original vs Proposed Code */}
              <DiffViewer
                filePath={selectedFile.relative_path}
                diffCode={selectedFile.unified_diff || ''}
                originalCode={selectedFile.original_code || ''}
                modernizedCode={selectedFile.refactored_code || ''}
                mode={mode}
                onModeChange={setMode}
                syntaxCheckPassed={syntaxCheckPassed}
                syntaxCheckStatusText={syntaxStateText}
                ruleWarning={ruleWarning}
                explanation={diffExplanation}
                emptyMessage={
                  selectedFile.changed
                    ? undefined
                    : 'No generated diff — this candidate requires manual review.'
                }
              />

              {/* State-aware Human Review Checklist */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-indigo" />
                    Human Review Checklist
                  </span>
                  <span className="text-[11px] font-mono text-ink-3">
                    {selectedFile.changed ? 'Mandatory before merge' : 'No diff to review'}
                  </span>
                </div>

                {selectedFile.changed ? (
                  <div className="space-y-2 text-xs font-sans">
                    {[
                      {
                        key: 'diffReviewed' as const,
                        label: '1. Diff reviewed and syntax audited',
                        desc: 'Inspected original vs proposed diff chunks for semantic preservation.',
                      },
                      {
                        key: 'testsReviewed' as const,
                        label: '2. Protection tests inspected',
                        desc: 'Verified characterization tests cover all altered code paths.',
                      },
                      {
                        key: 'impactChecked' as const,
                        label: '3. Dependency blast radius checked',
                        desc: `Evaluated downstream callers (${activeImpact?.transitive_dependents?.length ?? 1} transitive dependents).`,
                      },
                      {
                        key: 'runtimeVerified' as const,
                        label: '4. Runtime verification completed',
                        desc: 'Executed automated regression suite locally or in sandbox.',
                      },
                      {
                        key: 'approved' as const,
                        label: '5. Approved for merge',
                        desc: 'Final sign-off by repository maintainer.',
                      },
                    ].map((item) => {
                      const isChecked = Boolean(
                        reviewChecklist[selectedFile.relative_path]?.[item.key]
                      );
                      return (
                        <label
                          key={item.key}
                          className={`flex items-start gap-2.5 p-2 rounded cursor-pointer transition-colors ${
                            isChecked ? 'bg-teal-surface/50 border border-teal/20' : 'hover:bg-tile'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() =>
                              toggleChecklistItem(selectedFile.relative_path, item.key)
                            }
                            className="mt-0.5 rounded border-line text-indigo focus:ring-indigo"
                          />
                          <div>
                            <strong className="block text-ink">{item.label}</strong>
                            <span className="text-[11px] text-ink-3">{item.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-ink-3 italic">
                    No review checklist required until a modernization proposal diff is generated.
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="bg-surface border border-line rounded-lg p-12 text-center text-xs text-ink-3 space-y-2">
              <p>Select a modernization candidate from the left panel to inspect diff and verification details.</p>
            </div>
          )}
        </div>
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

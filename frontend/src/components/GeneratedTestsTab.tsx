import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  TestTube,
  Download,
  Play,
  FileQuestion,
  Target,
  Wand2,
  Flame,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Layers,
  ChevronRight,
  Sparkles,
  AlertTriangle,
  FileCode2,
} from 'lucide-react';
import {
  JobResponse,
  ProjectTestResult,
  GeneratedTestFile,
  HotspotItem,
  ChangeImpact,
  ProjectRefactorResult,
  TabType,
  UnprotectedModuleDetail,
} from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import CodeViewer from './common/CodeViewer';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { StatusTag } from './common/Tags';
import { useToast } from './common/Toast';
import LoadingState from './common/LoadingState';
import Card from './common/Card';
import PageHeroHeader from './common/PageHeroHeader';

interface GeneratedTestsTabProps {
  projectId?: string | null;
  projectName?: string;
  trustedDemo?: boolean;
  targetFile?: string | null;
  onSelectFile?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onTestsUpdated?: () => void;
  onStatusChange?: (generating: boolean, error?: string | null) => void;
}

export const GeneratedTestsTab: React.FC<GeneratedTestsTabProps> = ({
  projectId,
  projectName: _projectName = 'project',
  trustedDemo = false,
  targetFile = null,
  onSelectFile,
  onInspectImpact,
  onNavigateTab,
  onTestsUpdated,
  onStatusChange,
}) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [refactorResult, setRefactorResult] = useState<ProjectRefactorResult | null>(null);
  const [activeImpact, setActiveImpact] = useState<ChangeImpact | null>(null);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'tests' | 'unprotected'>('tests');
  const [explorerMode, setExplorerMode] = useState<'grouped' | 'flat'>('grouped');

  // Filters
  const [search, setSearch] = useState('');
  const [archetypeFilter, setArchetypeFilter] = useState<string>('all');
  const [strengthFilter, setStrengthFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [showTaxonomyDetails, setShowTaxonomyDetails] = useState(false);

  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const loadResult = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/tests?t=${Date.now()}`);
      if (response.status === 409) return;
      if (!response.ok) throw new Error(`Failed to load tests (${response.status})`);
      const data: ProjectTestResult = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch generated tests.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load complementary cross-tab data (Hotspots & Refactor proposal)
  useEffect(() => {
    if (!projectId) return;

    fetch(`/api/projects/${projectId}/hotspots`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hotspots) setHotspots(data.hotspots);
      })
      .catch(() => {});

    fetch(`/api/projects/${projectId}/refactor`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.files) setRefactorResult(data);
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  // Filtered files calculation
  const filteredFiles = useMemo(() => {
    return (result?.test_files || []).filter((f) => {
      const matchesSearch =
        f.safe_test_path.toLowerCase().includes(search.toLowerCase()) ||
        f.target_relative_path.toLowerCase().includes(search.toLowerCase()) ||
        (f.display_name && f.display_name.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;

      // Archetype filter
      if (archetypeFilter !== 'all') {
        const arch = f.framework_archetype || 'generic';
        if (archetypeFilter === 'react' && arch !== 'react') return false;
        if (archetypeFilter === 'fastapi' && arch !== 'fastapi') return false;
        if (archetypeFilter === 'service' && arch !== 'service') return false;
        if (archetypeFilter === 'ml' && arch !== 'ml') return false;
        if (archetypeFilter === 'vitest' && f.framework !== 'vitest') return false;
        if (archetypeFilter === 'pytest' && f.framework !== 'pytest') return false;
      }

      // Strength filter
      if (strengthFilter !== 'all') {
        const str = (f.strength_level || 'L3').toUpperCase();
        if (strengthFilter !== str) return false;
      }

      // Confidence filter
      if (confidenceFilter !== 'all') {
        const conf = (f.confidence || 'medium').toLowerCase();
        if (confidenceFilter !== conf) return false;
      }

      return true;
    });
  }, [result, search, archetypeFilter, strengthFilter, confidenceFilter]);

  // Sync selectedIdx when targetFile changes
  useEffect(() => {
    if (targetFile && filteredFiles.length) {
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const idx = filteredFiles.findIndex((t) => {
        const tNorm = t.target_relative_path.replace(/\\/g, '/').toLowerCase();
        return tNorm === norm || tNorm.endsWith(norm) || norm.endsWith(tNorm);
      });
      if (idx !== -1) {
        setSelectedIdx(idx);
        setSidebarTab('tests');
      }
    }
  }, [targetFile, filteredFiles]);

  const activeFile: GeneratedTestFile | undefined =
    filteredFiles[selectedIdx] || filteredFiles[0] || result?.test_files[0];

  // Fetch change impact for the active file's target
  useEffect(() => {
    if (!projectId || !activeFile?.target_relative_path) {
      setActiveImpact(null);
      return;
    }

    let isMounted = true;
    fetch(`/api/projects/${projectId}/impact?target=${encodeURIComponent(activeFile.target_relative_path)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted) setActiveImpact(data);
      })
      .catch(() => {
        if (isMounted) setActiveImpact(null);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, activeFile?.target_relative_path]);

  // Match related hotspot
  const relatedHotspot = useMemo(() => {
    if (!activeFile?.target_relative_path || !hotspots.length) return null;
    const target = activeFile.target_relative_path.toLowerCase();
    return (
      hotspots.find((h) => {
        const hFile = (h.filePath || h.file || '').toLowerCase();
        return hFile === target || hFile.endsWith(target) || target.endsWith(hFile);
      }) || null
    );
  }, [activeFile, hotspots]);

  // Match related refactor proposal
  const relatedRefactor = useMemo(() => {
    if (!activeFile?.target_relative_path || !refactorResult?.files) return null;
    const target = activeFile.target_relative_path.toLowerCase();
    return (
      refactorResult.files.find((f) => {
        const fPath = f.relative_path.toLowerCase();
        return fPath === target || fPath.endsWith(target) || target.endsWith(fPath);
      }) || null
    );
  }, [activeFile, refactorResult]);

  // Grouped tests map (by source module)
  const groupedBySource = useMemo(() => {
    const map = new Map<string, GeneratedTestFile[]>();
    for (const file of filteredFiles) {
      const src = file.target_relative_path;
      if (!map.has(src)) map.set(src, []);
      map.get(src)!.push(file);
    }
    return Array.from(map.entries()).map(([sourcePath, tests]) => ({
      sourcePath,
      tests,
    }));
  }, [filteredFiles]);

  const handleRegenerate = async () => {
    if (!projectId || regenerating) return;
    setRegenerating(true);
    setError(null);
    onStatusChange?.(true, null);

    try {
      const response = await fetch(`/api/projects/${projectId}/tests/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, execute: trustedDemo }),
      });
      if (!response.ok) throw new Error('Test regeneration request failed');
      const job: JobResponse = await response.json();

      for (let i = 0; i < 60; i++) {
        const pollRes = await fetch(job.polling_url);
        if (pollRes.ok) {
          const pollData: JobResponse = await pollRes.json();
          if (pollData.state === 'completed') {
            await loadResult();
            onStatusChange?.(false, null);
            onTestsUpdated?.();
            showToast('Characterization test suites refreshed', 'success');
            return;
          }
          if (pollData.state === 'failed') {
            throw new Error(pollData.error_message || 'Regeneration failed');
          }
        }
        await new Promise((r) => setTimeout(r, 750));
      }
      throw new Error('Test generation timed out');
    } catch (err: any) {
      const msg = err.message || 'Failed to regenerate tests';
      setError(msg);
      onStatusChange?.(false, msg);
      showToast(msg, 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = (scope: 'all' | 'protected' | 'selected') => {
    if (!projectId) return;
    let url = `/api/projects/${projectId}/tests/download?scope=${scope}`;
    if (scope === 'selected' && activeFile) {
      url += `&test_id=${encodeURIComponent(activeFile.test_id)}&target_path=${encodeURIComponent(activeFile.target_relative_path)}`;
    }
    window.location.href = url;
    setDownloadModalOpen(false);
    showToast(`Downloading ${scope} tests archive…`, 'info');
  };

  if (!projectId) return null;

  if (loading && !result) {
    return <LoadingState label="Loading generated characterization tests…" />;
  }

  const totalCases = result?.total_generated_tests || 0;
  const totalGenFiles = result?.test_files?.length || 0;
  const syntaxValidCount = result?.syntax_valid_count || 0;
  const totalSourceModules = result?.target_source_files || Math.max(1, (result?.protected_files?.length || 0) + (result?.unprotected_files?.length || 0));
  const protectedModulesCount = result?.protected_files?.length || 0;
  const unprotectedModulesList: UnprotectedModuleDetail[] = result?.unprotected_modules_detail || (result?.unprotected_files || []).map((path) => ({
    path,
    reason: 'Module marked for characterization test expansion',
    risk_score: 20,
    risk_level: 'medium' as const,
    blast_radius: 1,
    is_modernization_candidate: false,
    has_planned_changes: false,
    priority: 'P2' as const,
    priority_label: 'P2 — Optional / low risk',
    caller_count: 1,
  }));

  const protectionPercentage = totalSourceModules > 0 ? Math.round((protectedModulesCount / totalSourceModules) * 100) : 0;
  const strengthCounts = result?.strength_counts || {
    syntax: 0,
    import: result?.test_files?.filter((t) => t.is_import_only).length || 0,
    contract: result?.test_files?.filter((t) => !t.is_import_only).length || 0,
    behavior: 0,
    integration: 0,
  };

  return (
    <div
      className="space-y-4 animate-[fade-up_200ms_ease-out_both] w-full max-w-full min-w-0"
      role="tabpanel"
      id="tabpanel-tests"
      aria-labelledby="tab-tests"
    >
      <PageHeroHeader
        icon={TestTube}
        title="GENERATED TESTS"
        eyebrow="Characterization"
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Static Verified
          </span>
        }
        description="Review generated characterization suites that preserve existing contracts before modernization."
        actions={[
          {
            label: 'Download Tests',
            variant: 'secondary' as const,
            onClick: () => setDownloadModalOpen(true),
            icon: <Download className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
          {
            label: 'Regenerate Safety Tests',
            variant: 'primary' as const,
            onClick: handleRegenerate,
            loading: regenerating,
            loadingText: 'Regenerating…',
            icon: <Play className="w-3.5 h-3.5 fill-current" strokeWidth={1.75} />,
          },
        ]}
      />

      {/* 2. State & Safety Clarity Banner */}
      <Card variant="secondary" padding="sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-md bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/25">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-ink">
                  {totalGenFiles} TEST SUITES GENERATED · AST VALIDATED
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-surface text-teal-strong border border-teal/20">
                  {syntaxValidCount} / {totalGenFiles} SYNTAX OK
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-surface text-amber-strong border border-amber/30">
                  {trustedDemo ? 'SANDBOX READY' : 'EXECUTION: LOCAL RUNNER'}
                </span>
              </div>
              <p className="text-xs text-ink-3 mt-0.5">
                Contract characterization tests synthesized from AST signatures to pin current behavior before refactoring. Code coverage is measured when run in your test runner (pytest / vitest).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={showTaxonomyDetails ? 'indigo' : 'outline'}
              size="sm"
              onClick={() => setShowTaxonomyDetails((prev) => !prev)}
              className="text-xs"
            >
              <span>{showTaxonomyDetails ? 'Hide Taxonomy & Levels' : 'Taxonomy & Levels (L1–L5)'}</span>
              <ChevronRight
                className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${
                  showTaxonomyDetails ? 'rotate-90' : ''
                }`}
              />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. Four Core KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="GENERATED TEST FILES"
          value={formatNumber(totalGenFiles)}
          subtext={`${formatNumber(totalCases)} generated assertions`}
        />
        <KpiCard
          label="SYNTAX VALIDATION"
          value={`${syntaxValidCount} / ${totalGenFiles}`}
          variant={syntaxValidCount === totalGenFiles ? 'default' : 'risk'}
          subtext="Static AST grammar parse"
        />
        <KpiCard
          label="SOURCE PROTECTION"
          value={`${protectedModulesCount} / ${totalSourceModules}`}
          variant="selected"
          subtext={`${protectionPercentage}% source modules protected`}
        />
        <KpiCard
          label="EXECUTION STATUS"
          value={trustedDemo ? 'Sandbox Ready' : 'Local Runner'}
          subtext={trustedDemo ? 'Disposable runner verified' : 'Download ZIP to execute'}
        />
      </div>

      {/* 4. Collapsible Taxonomy & Framework Archetypes Breakdown */}
      {showTaxonomyDetails && (
        <div className="space-y-3 animate-[fade-down_150ms_ease-out]">
          {/* Verification Pipeline Ladder */}
          <Card variant="secondary" padding="sm">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                VERIFICATION PIPELINE LADDER
              </span>
              <span className="text-[11px] font-mono text-ink-3">Static vs Runtime Distinction</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2 pt-1">
              <div className="bg-teal-surface/60 border border-teal/20 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-teal-strong uppercase flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 1. GENERATED
                </div>
                <div className="text-[11px] font-mono font-bold text-ink mt-0.5">{totalGenFiles} Suites</div>
              </div>

              <div className="bg-teal-surface/60 border border-teal/20 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-teal-strong uppercase flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 2. SYNTAX VALID
                </div>
                <div className="text-[11px] font-mono font-bold text-ink mt-0.5">{syntaxValidCount} / {totalGenFiles} Passed</div>
              </div>

              <div className="bg-teal-surface/60 border border-teal/20 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-teal-strong uppercase flex items-center justify-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> 3. IMPORT VALID
                </div>
                <div className="text-[11px] font-mono font-bold text-ink mt-0.5">AST Verified</div>
              </div>

              <div className="bg-amber-surface/40 border border-amber/30 rounded p-2 text-center">
                <div className="text-[10px] font-bold text-amber-strong uppercase flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> 4. RUNTIME EXECUTED
                </div>
                <div className="text-[11px] font-mono font-semibold text-amber-text mt-0.5">
                  {trustedDemo ? 'Ready in Sandbox' : 'Safety Locked'}
                </div>
              </div>

              <div className="bg-tile border border-line rounded p-2 text-center">
                <div className="text-[10px] font-bold text-ink-3 uppercase flex items-center justify-center gap-1">
                  <Lock className="w-3 h-3" /> 5. BEHAVIOR VERIFIED
                </div>
                <div className="text-[11px] font-mono text-ink-3 mt-0.5">Run Locally via ZIP</div>
              </div>
            </div>
          </Card>

          {/* 3 Supporting Distribution Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {/* Protection Progress Card */}
            <div className="bg-surface border border-line rounded-lg p-4 shadow-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                    SOURCE PROTECTION PROGRESS
                  </span>
                  <span className="text-xs font-mono font-bold text-indigo">
                    {protectedModulesCount} / {totalSourceModules} · {protectionPercentage}%
                  </span>
                </div>

                {/* Segmented Progress Bar */}
                <div className="w-full h-3.5 bg-track rounded-pill overflow-hidden flex p-0.5 gap-0.5 border border-line/60">
                  <div
                    className="bg-indigo rounded-pill transition-all duration-300"
                    style={{ width: `${Math.max(4, protectionPercentage)}%` }}
                    title={`Protected modules: ${protectedModulesCount}`}
                  />
                  <div
                    className="bg-amber-strong/40 rounded-pill transition-all duration-300 flex-1"
                    title={`Unprotected modules: ${unprotectedModulesList.length}`}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] mt-2 font-medium text-ink-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo inline-block" />
                    Protected: <strong>{protectedModulesCount}</strong>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-strong/40 inline-block" />
                    Unprotected: <strong>{unprotectedModulesList.length}</strong>
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-ink-3 mt-3 pt-2.5 border-t border-line/60">
                A source module is protected when it possesses a valid characterization test covering callable exports.
              </p>
            </div>

            {/* Test Strength Distribution Card */}
            <div className="bg-surface border border-line rounded-lg p-4 shadow-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  TEST STRENGTH LEVELS
                </span>
                <span className="text-[10px] text-ink-3 font-mono">AST Taxonomy</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 text-center pt-1">
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L1</div>
                  <div className="text-[10px] font-semibold text-ink">SYNTAX</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.syntax || 0}</div>
                </div>
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L2</div>
                  <div className="text-[10px] font-semibold text-ink">IMPORT</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.import || 0}</div>
                </div>
                <div className="bg-indigo-surface rounded p-1.5 border border-indigo/20">
                  <div className="text-[9px] font-bold text-indigo">L3</div>
                  <div className="text-[10px] font-bold text-indigo-text">CONTRACT</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.contract || totalGenFiles}</div>
                </div>
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L4</div>
                  <div className="text-[10px] font-semibold text-ink">BEHAVIOR</div>
                  <div className="text-xs font-mono font-bold text-indigo mt-0.5">{strengthCounts.behavior || 0}</div>
                </div>
                <div className="bg-tile rounded p-1.5 border border-line">
                  <div className="text-[9px] font-bold text-ink-3">L5</div>
                  <div className="text-[10px] font-semibold text-ink">INTEGR.</div>
                  <div className="text-xs font-mono font-bold text-ink-3 mt-0.5">{strengthCounts.integration || 0}</div>
                </div>
              </div>

              <p className="text-[10px] text-ink-3 mt-2.5 pt-2 border-t border-line/60">
                L3 Contract tests guarantee callable signatures and boundary error resistance without invoking side effects.
              </p>
            </div>

            {/* Framework Archetype Coverage Card */}
            <div className="bg-surface border border-line rounded-lg p-4 shadow-1">
              <div className="flex items-center justify-between mb-2">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3">
                  GENERATION BY ARCHETYPE
                </span>
                <span className="text-[10px] text-teal-strong font-semibold">Framework-Aware</span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">React / TSX Components</span>
                  <span className="font-mono text-ink font-semibold">
                    {result?.framework_coverage?.react ? `${result.framework_coverage.react.protected} / ${result.framework_coverage.react.total}` : 'Vitest + RTL'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">FastAPI Routes &amp; Endpoints</span>
                  <span className="font-mono text-ink font-semibold">
                    {result?.framework_coverage?.fastapi ? `${result.framework_coverage.fastapi.protected} / ${result.framework_coverage.fastapi.total}` : 'API Contract'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">Python Service Layer</span>
                  <span className="font-mono text-ink font-semibold">
                    {result?.framework_coverage?.service ? `${result.framework_coverage.service.protected} / ${result.framework_coverage.service.total}` : 'Mocked DB/Redis'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-1 px-2 rounded bg-tile">
                  <span className="text-ink-2 font-medium">ML &amp; Data Pipeline Models</span>
                  <span className="font-mono text-ink font-semibold">
                    {result?.framework_coverage?.ml ? `${result.framework_coverage.ml.protected} / ${result.framework_coverage.ml.total}` : 'Shape Contract'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 5. Master–Detail Layout: Test Explorer + Selected Test Header & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start w-full max-w-full min-w-0">
        {/* Left Column: Explorer Drawer */}
        <Card
          variant="secondary"
          padding="sm"
          className="flex flex-col max-h-[820px] w-full min-w-0"
        >
          {/* Sub-tab switcher: Tests vs Unprotected Queue */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-track rounded-lg mb-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarTab('tests')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                sidebarTab === 'tests'
                  ? 'bg-surface text-ink shadow-xs font-bold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Tests ({result?.test_files?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('unprotected')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
                sidebarTab === 'unprotected'
                  ? 'bg-surface text-ink shadow-xs font-bold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              <span>Unprotected</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                unprotectedModulesList.length > 0 ? 'bg-amber-surface text-amber-strong font-bold' : 'bg-tile text-ink-3'
              }`}>
                {unprotectedModulesList.length}
              </span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="space-y-2 pb-2.5 border-b border-line shrink-0">
            <SearchField
              id="tests-filter"
              value={search}
              onChange={setSearch}
              placeholder={sidebarTab === 'tests' ? 'Search test or source path…' : 'Search unprotected module…'}
              className="w-full"
            />

            {sidebarTab === 'tests' && (
              <div className="space-y-1.5 pt-0.5">
                {/* Mode toggle: Group by Source vs Flat list */}
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-ink-3 font-medium">Layout</span>
                  <div className="flex items-center gap-1 bg-tile p-0.5 rounded border border-line">
                    <button
                      type="button"
                      onClick={() => setExplorerMode('grouped')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        explorerMode === 'grouped' ? 'bg-surface text-indigo font-bold shadow-2xs' : 'text-ink-3'
                      }`}
                    >
                      By Source
                    </button>
                    <button
                      type="button"
                      onClick={() => setExplorerMode('flat')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        explorerMode === 'flat' ? 'bg-surface text-indigo font-bold shadow-2xs' : 'text-ink-3'
                      }`}
                    >
                      Flat List
                    </button>
                  </div>
                </div>

                {/* Archetype filter chips */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <FilterChip
                    label="ALL"
                    active={archetypeFilter === 'all'}
                    onClick={() => setArchetypeFilter('all')}
                  />
                  <FilterChip
                    label="REACT"
                    active={archetypeFilter === 'react'}
                    onClick={() => setArchetypeFilter('react')}
                  />
                  <FilterChip
                    label="FASTAPI"
                    active={archetypeFilter === 'fastapi'}
                    onClick={() => setArchetypeFilter('fastapi')}
                  />
                  <FilterChip
                    label="SERVICE"
                    active={archetypeFilter === 'service'}
                    onClick={() => setArchetypeFilter('service')}
                  />
                  <FilterChip
                    label="ML"
                    active={archetypeFilter === 'ml'}
                    onClick={() => setArchetypeFilter('ml')}
                  />
                </div>

                {/* Strength filters */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-ink-4 mr-1">LEVEL:</span>
                  {['all', 'L2', 'L3', 'L4'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setStrengthFilter(lvl)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                        strengthFilter === lvl
                          ? 'bg-indigo-surface text-indigo font-bold border border-indigo/30'
                          : 'text-ink-3 hover:text-ink'
                      }`}
                    >
                      {lvl.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-line/40 mt-2 pr-1 flex-1 min-h-[360px]">
            {sidebarTab === 'tests' ? (
              filteredFiles.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-3 space-y-2">
                  <p>No characterization test files match filter.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setArchetypeFilter('all');
                      setStrengthFilter('all');
                      setConfidenceFilter('all');
                    }}
                    className="text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : explorerMode === 'grouped' ? (
                // Grouped by Source File
                <div className="space-y-2 divide-y-0">
                  {groupedBySource.map((group) => {
                    const isGroupActive = group.tests.some((t) => t.test_id === activeFile?.test_id);
                    return (
                      <div
                        key={group.sourcePath}
                        className={`rounded-md border p-1.5 space-y-1 transition-colors ${
                          isGroupActive ? 'border-indigo/50 bg-indigo-surface/10' : 'border-line/60 bg-tile/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 px-1 py-0.5 text-ink font-mono text-[11px] font-bold truncate">
                          <Layers className="w-3.5 h-3.5 text-indigo shrink-0" />
                          <span className="truncate" title={group.sourcePath}>
                            {truncateMiddle(group.sourcePath, 28)}
                          </span>
                        </div>
                        <div className="space-y-0.5 pl-3 border-l-2 border-indigo/30 ml-2">
                          {group.tests.map((tf) => {
                            const isSelected = tf.test_id === activeFile?.test_id;
                            const displayName = tf.display_name || truncateMiddle(tf.safe_test_path, 24);
                            return (
                              <button
                                key={tf.test_id}
                                type="button"
                                onClick={() => {
                                  const idx = filteredFiles.findIndex((f) => f.test_id === tf.test_id);
                                  if (idx !== -1) setSelectedIdx(idx);
                                  onSelectFile?.(tf.target_relative_path);
                                }}
                                className={`w-full text-left p-1.5 rounded transition-colors text-[11px] flex items-center justify-between gap-1.5 ${
                                  isSelected
                                    ? 'bg-indigo-surface text-indigo-text font-bold shadow-xs'
                                    : 'hover:bg-tile text-ink-2'
                                }`}
                              >
                                <span className="font-mono truncate">{displayName}</span>
                                <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase bg-surface border border-line shrink-0">
                                  {tf.strength_level || 'L3'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Flat List with Human-Readable Display Names
                filteredFiles.map((f, idx) => {
                  const isSelected = activeFile?.test_id === f.test_id;
                  const displayName = f.display_name || truncateMiddle(f.safe_test_path, 26);
                  return (
                    <button
                      key={f.test_id || idx}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedIdx(idx);
                        onSelectFile?.(f.target_relative_path);
                      }}
                      className={`w-full text-left p-2.5 rounded-md transition-colors my-0.5 flex items-start gap-2.5 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                        isSelected
                          ? 'bg-indigo-surface text-indigo-text font-bold shadow-xs'
                          : 'hover:bg-tile text-ink'
                      }`}
                    >
                      <FileCode2
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isSelected ? 'text-indigo' : 'text-ink-3'
                        }`}
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-semibold truncate" title={displayName}>
                          {displayName}
                        </div>
                        <div className="text-[11px] text-ink-3 font-sans truncate mt-0.5">
                          Target: {truncateMiddle(f.target_relative_path, 22)}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-sans text-ink-3 mt-1 pt-1 border-t border-line/40">
                          <span className="font-bold text-indigo font-mono">
                            {f.strength_level || 'L3'} · {f.framework.toUpperCase()}
                          </span>
                          <span>
                            {f.test_count} {f.test_count === 1 ? 'case' : 'cases'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : unprotectedModulesList.length === 0 ? (
              <div className="p-6 text-center text-xs text-teal-strong font-semibold">
                All repository source modules have characterization suites attached!
              </div>
            ) : (
              // Unprotected Queue Prioritized by P0, P1, P2
              <div className="space-y-1">
                {unprotectedModulesList.map((item) => (
                  <div
                    key={item.path}
                    className="p-2.5 rounded-md bg-tile/40 hover:bg-tile text-xs transition-colors border border-line/60 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 font-mono text-ink truncate font-bold text-[11px]" title={item.path}>
                          <FileQuestion className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                          <span className="truncate">{truncateMiddle(item.path, 22)}</span>
                        </div>
                        <div className="text-[10px] text-ink-3 leading-tight mt-0.5">
                          {item.reason}
                        </div>
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase font-mono ${
                          item.priority === 'P0'
                            ? 'bg-red-surface text-red-text border border-red-line'
                            : item.priority === 'P1'
                            ? 'bg-amber-surface text-amber-strong border border-amber/30'
                            : 'bg-tile text-ink-3 border border-line'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    {/* Neutral semantics if no proposed change, alert only if changes proposed */}
                    {item.has_planned_changes ? (
                      <div className="p-1 px-1.5 rounded bg-amber-surface/70 border border-amber/30 text-[10px] text-amber-text font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-strong shrink-0" />
                        <span>Planned modernization change proposed without tests!</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-ink-3 italic">
                        No characterization test attached. File is currently unchanged.
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-line/40">
                      <span className="text-[10px] text-ink-3 font-mono">
                        Risk: {item.risk_score}/100 · {item.caller_count} callers
                      </span>
                      {onInspectImpact && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectFile?.(item.path);
                            onInspectImpact(item.path);
                          }}
                          className="text-[11px] font-bold text-indigo hover:underline flex items-center gap-0.5"
                        >
                          Check Blast Radius →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Selected Test Header, Metadata, Why Generated, and Fixed Code Viewer */}
        <div className="space-y-4 min-w-0 w-full max-w-full">
          {activeFile ? (
            <>
              {/* 1. Selected Test Header Bar */}
              <div className="bg-surface border border-line rounded-lg p-4 sm:p-5 shadow-1 space-y-3 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-line">
                  <div className="min-w-0 flex-1">
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      SELECTED CHARACTERIZATION TEST
                    </span>
                    <div className="font-mono text-base sm:text-lg font-bold text-ink truncate mt-0.5" title={activeFile.display_name || activeFile.safe_test_path}>
                      {activeFile.display_name || activeFile.safe_test_path}
                    </div>
                    <div className="text-xs text-ink-3 font-mono mt-0.5 truncate">
                      Protects: <strong className="text-ink font-semibold">{activeFile.target_relative_path}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap shrink-0">
                    {onInspectImpact && (
                      <Button
                        variant="indigo"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(activeFile.target_relative_path);
                          onInspectImpact(activeFile.target_relative_path);
                        }}
                        icon={<Target className="w-3.5 h-3.5" strokeWidth={2} />}
                        className="font-bold text-xs shadow-xs"
                      >
                        Check Blast Radius
                      </Button>
                    )}

                    {onNavigateTab && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(activeFile.target_relative_path);
                          onNavigateTab('refactor');
                        }}
                        icon={<Wand2 className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Modernization Diff
                      </Button>
                    )}
                  </div>
                </div>

                {/* Badges & Semantics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-tile rounded p-2.5 border border-line/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      PROTECTION LEVEL
                    </span>
                    <div className="font-bold text-indigo mt-0.5 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo shrink-0" />
                      <span>{activeFile.strength_level || 'L3'} · {(activeFile.test_strength || 'contract').toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="bg-tile rounded p-2.5 border border-line/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      FRAMEWORK &amp; TYPE
                    </span>
                    <div className="font-semibold text-ink mt-0.5 capitalize truncate">
                      {activeFile.framework} ({activeFile.framework_archetype || 'generic'})
                    </div>
                  </div>

                  <div className="bg-tile rounded p-2.5 border border-line/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      PROTECTION CONFIDENCE
                    </span>
                    <div className="font-bold mt-0.5 flex items-center gap-1 capitalize">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          activeFile.confidence === 'high'
                            ? 'bg-teal-strong'
                            : activeFile.confidence === 'low'
                            ? 'bg-red-strong'
                            : 'bg-amber-strong'
                        }`}
                      />
                      <span className={activeFile.confidence === 'high' ? 'text-teal-strong' : activeFile.confidence === 'low' ? 'text-red-strong' : 'text-amber-text'}>
                        {activeFile.confidence || 'Medium'} Confidence
                      </span>
                    </div>
                  </div>

                  <div className="bg-tile rounded p-2.5 border border-line/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      RUNTIME STATE
                    </span>
                    <div className="font-bold mt-0.5 text-amber-text flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                      <span>Safety Locked</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. "Why This Test?" Panel & Assertions Checklist */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-line">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo" />
                    WHY WAS THIS TEST GENERATED?
                  </span>
                  <span className="text-[10px] text-ink-3 font-mono">
                    {activeFile.test_count} assertion {activeFile.test_count === 1 ? 'contract' : 'contracts'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {/* Left: Purpose and Findings */}
                  <div className="space-y-2">
                    <div>
                      <span className="font-bold text-[10px] uppercase text-ink-3 block">Analysis Finding:</span>
                      <p className="text-ink-2 mt-0.5 leading-relaxed">
                        {activeFile.why_generated?.finding ||
                          'Module exports core functions and types participating in modernization scope.'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[10px] uppercase text-ink-3 block">Protection Goal:</span>
                      <p className="text-ink-2 mt-0.5 leading-relaxed">
                        {activeFile.why_generated?.protection_goal ||
                          'Lock current callable contracts and boundary error conditions prior to refactoring.'}
                      </p>
                    </div>

                    <div>
                      <span className="font-bold text-[10px] uppercase text-ink-3 block">Detected Dependencies:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeFile.why_generated?.detected_dependencies?.length ? (
                          activeFile.why_generated.detected_dependencies.slice(0, 5).map((dep) => (
                            <span key={dep} className="px-1.5 py-0.2 rounded bg-tile border border-line font-mono text-[10px] text-ink">
                              {dep}
                            </span>
                          ))
                        ) : (
                          <span className="text-ink-3 italic text-[11px]">No external local dependencies declared</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Confidence Breakdown & Generated Assertions */}
                  <div className="space-y-2 bg-tile/40 rounded p-3 border border-line/60">
                    <span className="font-bold text-[10px] uppercase text-ink-3 block">
                      Confidence &amp; Assertion Breakdown:
                    </span>
                    <ul className="space-y-1 text-[11px]">
                      {(activeFile.confidence_reasons && activeFile.confidence_reasons.length > 0
                        ? activeFile.confidence_reasons
                        : [
                            '✓ Valid syntax verified via static AST parsing',
                            '✓ Exported callables detected and asserted',
                            '✓ Boundary and error paths tested against invalid types',
                            '⚠ Live runtime execution safety-locked on untrusted upload',
                          ]
                      ).map((reason, i) => (
                        <li key={i} className="flex items-start gap-1.5 leading-snug">
                          <span className={reason.startsWith('✓') ? 'text-teal-strong font-bold shrink-0' : 'text-amber-strong font-bold shrink-0'}>
                            {reason.startsWith('✓') ? '✓' : '⚠'}
                          </span>
                          <span className={reason.startsWith('✓') ? 'text-ink-2' : 'text-amber-text'}>
                            {reason.replace(/^[✓⚠]\s*/, '')}
                          </span>
                        </li>
                      ))}
                    </ul>

                    {activeFile.why_generated?.limitations && (
                      <p className="text-[10px] text-ink-4 pt-1.5 border-t border-line/40">
                        <strong>Limitation:</strong> {activeFile.why_generated.limitations}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Cross-Tab Connections: Hotspot & Refactor status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Related Hotspot */}
                <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-strong" />
                      Related Hotspot Risk
                    </span>
                    {relatedHotspot ? (
                      <StatusTag
                        status={
                          (relatedHotspot.overallRisk || relatedHotspot.risk_level) === 'critical'
                            ? 'critical'
                            : (relatedHotspot.overallRisk || relatedHotspot.risk_level) === 'high'
                            ? 'complexity-high'
                            : 'complexity-medium'
                        }
                        label={`RISK: ${(relatedHotspot.overallRisk || relatedHotspot.risk_level || 'LOW').toUpperCase()} (${relatedHotspot.hotspotScore ?? relatedHotspot.hotspot_score ?? 0}/100)`}
                      />
                    ) : (
                      <span className="text-[10px] text-teal-strong font-bold">Low / Clean</span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-2">
                    {relatedHotspot ? relatedHotspot.reason : 'No severe complexity or churn hotspots detected for this module.'}
                  </p>
                </div>

                {/* Related Migration Impact */}
                <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo" />
                      Downstream Blast Radius
                    </span>
                    {activeImpact ? (
                      <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wider bg-tile border border-line text-ink-2">
                        {activeImpact.blast_radius} affected modules
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink-3">Calculating…</span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-2">
                    {activeImpact
                      ? `${activeImpact.direct_dependents?.length || 0} direct callers · ${activeImpact.transitive_dependents?.length || 0} transitive modules.`
                      : 'Evaluating dependency graph blast radius.'}
                  </p>
                </div>
              </div>

              {/* Modernization Proposal Connection Card */}
              <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Wand2 className="w-4 h-4 text-teal-strong shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-ink flex items-center gap-2">
                      <span>Modernization Proposal:</span>
                      <span
                        className={`font-semibold ${
                          relatedRefactor?.changed ? 'text-amber-text' : 'text-teal-strong'
                        }`}
                      >
                        {relatedRefactor?.changed
                          ? `Available (${relatedRefactor.changes.length} deterministic update${
                              relatedRefactor.changes.length === 1 ? '' : 's'
                            })`
                          : 'Clean / Up to Date'}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-3 mt-0.5 truncate">
                      {relatedRefactor?.changed
                        ? 'Deterministic modernized code ready for review. Characterization tests protect against regressions.'
                        : 'No legacy Python 2 / JS var patterns found in this source module.'}
                    </p>
                  </div>
                </div>

                {relatedRefactor?.changed && onNavigateTab && (
                  <Button
                    variant="indigo"
                    size="sm"
                    onClick={() => {
                      onSelectFile?.(activeFile.target_relative_path);
                      onNavigateTab('refactor');
                    }}
                    icon={<Wand2 className="w-3.5 h-3.5" />}
                    className="text-xs font-bold shrink-0"
                  >
                    Preview Modernization Diff
                  </Button>
                )}
              </div>

              {/* 4. Enhanced Code Viewer (Wrap toggle, syntax highlighting, fullscreen, fixed width with independent horizontal scrolling) */}
              <CodeViewer
                filePath={activeFile.display_name || activeFile.safe_test_path}
                targetPath={activeFile.target_relative_path}
                code={activeFile.code}
                language={activeFile.language}
                syntaxStatus={activeFile.syntax_valid ? 'AST Syntax Valid' : 'Syntax Error'}
              />
            </>
          ) : (
            <div className="p-12 text-center text-ink-3 bg-surface border border-line rounded-lg">
              Select a test file from the explorer to review characterization code.
            </div>
          )}
        </div>
      </div>

      {/* 6. Download Modal Dialog */}
      {downloadModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Download Characterization Test Suites"
        >
          <div className="bg-surface border border-line rounded-xl max-w-lg w-full p-5 shadow-2 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo" />
                <h3 className="font-display font-bold text-base text-ink">Export Generated Test Suites</h3>
              </div>
              <button
                type="button"
                onClick={() => setDownloadModalOpen(false)}
                className="text-ink-3 hover:text-ink text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Manifest Summary */}
            <div className="p-3 bg-tile rounded-lg border border-line space-y-1.5 text-xs">
              <div className="font-bold text-ink flex items-center justify-between">
                <span>Archive Manifest:</span>
                <span className="font-mono text-indigo font-semibold">{totalGenFiles} files</span>
              </div>
              <p className="text-ink-3 leading-relaxed">
                Includes test suites, <code className="font-mono text-ink">manifest.json</code> metadata, and <code className="font-mono text-ink">README.md</code> execution instructions.
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px] text-ink-2 font-mono">
                <span>Frameworks: {result?.frameworks?.join(', ') || 'vitest, pytest'}</span>
                <span>Runtime: Locked</span>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => handleDownload('all')}
                className="w-full text-left p-3 rounded-lg border border-line hover:border-indigo/50 hover:bg-indigo-surface/20 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-xs text-ink group-hover:text-indigo">
                    Download All Generated Tests ({totalGenFiles} files)
                  </div>
                  <div className="text-[11px] text-ink-3 mt-0.5">
                    Complete suite containing all characterization tests and smoke imports.
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-indigo shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleDownload('protected')}
                className="w-full text-left p-3 rounded-lg border border-line hover:border-indigo/50 hover:bg-indigo-surface/20 transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="font-bold text-xs text-ink group-hover:text-indigo">
                    Download Protected Contract Set ({protectedModulesCount} files)
                  </div>
                  <div className="text-[11px] text-ink-3 mt-0.5">
                    Excludes import-only smoke tests; includes only contract assertion suites.
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-indigo shrink-0" />
              </button>

              {activeFile && (
                <button
                  type="button"
                  onClick={() => handleDownload('selected')}
                  className="w-full text-left p-3 rounded-lg border border-line hover:border-indigo/50 hover:bg-indigo-surface/20 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="font-bold text-xs text-ink group-hover:text-indigo">
                      Download Selected Test File Only
                    </div>
                    <div className="text-[11px] text-ink-3 mt-0.5 font-mono truncate max-w-sm">
                      {activeFile.display_name || activeFile.safe_test_path}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-ink-4 group-hover:text-indigo shrink-0" />
                </button>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setDownloadModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GeneratedTestsTab;

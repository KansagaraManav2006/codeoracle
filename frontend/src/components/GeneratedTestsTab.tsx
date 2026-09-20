import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  TestTube,
  Download,
  Play,
  FileText,
  FileQuestion,
  Code2,
  Target,
  Wand2,
  Flame,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import {
  JobResponse,
  ProjectTestResult,
  GeneratedTestFile,
  HotspotItem,
  ChangeImpact,
  ProjectRefactorResult,
  TabType,
} from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import Notice from './common/Notice';
import CodeViewer from './common/CodeViewer';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { StatusTag } from './common/Tags';
import { useToast } from './common/Toast';

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
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

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

    // Load hotspots
    fetch(`/api/projects/${projectId}/hotspots`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.hotspots) setHotspots(data.hotspots);
      })
      .catch(() => {});

    // Load refactor proposals
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

  // Sync selectedIdx when targetFile changes
  useEffect(() => {
    if (targetFile && result?.test_files?.length) {
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const idx = result.test_files.findIndex((t) => {
        const tNorm = t.target_relative_path.replace(/\\/g, '/').toLowerCase();
        return tNorm === norm || tNorm.endsWith(norm) || norm.endsWith(tNorm);
      });
      if (idx !== -1) {
        setSelectedIdx(idx);
        setSidebarTab('tests');
      }
    }
  }, [targetFile, result]);

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

      // Poll until finished
      for (let i = 0; i < 60; i++) {
        const pollRes = await fetch(job.polling_url);
        if (pollRes.ok) {
          const pollData: JobResponse = await pollRes.json();
          if (pollData.state === 'completed') {
            await loadResult();
            onStatusChange?.(false, null);
            onTestsUpdated?.();
            showToast('Tests regenerated successfully', 'success');
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

  const handleDownloadZip = () => {
    if (!projectId) return;
    window.location.href = `/api/projects/${projectId}/tests/download`;
    showToast('Downloading test files archive…', 'info');
  };

  const unprotectedFiles = result?.unprotected_files || [];

  const filteredFiles = useMemo(() => {
    return (result?.test_files || []).filter((f) => {
      const matchesSearch =
        f.safe_test_path.toLowerCase().includes(search.toLowerCase()) ||
        f.target_relative_path.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;

      if (categoryFilter === 'all') return true;
      if (categoryFilter === 'contract') return f.test_category.toLowerCase().includes('contract');
      if (categoryFilter === 'error') return f.test_category.toLowerCase().includes('error');
      if (categoryFilter === 'smoke')
        return f.test_category.toLowerCase().includes('smoke') || f.is_import_only;
      return true;
    });
  }, [result, search, categoryFilter]);

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
        const hFile = h.file.toLowerCase();
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

  const formatStrategy = (strategy: string) => {
    if (strategy.includes('contract')) return 'AST Contract Characterization';
    if (strategy.includes('error')) return 'AST Error-Path Boundary Testing';
    if (strategy.includes('smoke') || strategy.includes('import'))
      return 'AST Smoke Import Testing';
    if (strategy.includes('edge')) return 'AST Edge-Case Boundary Testing';
    return strategy
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

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

  const totalCases = result?.total_generated_tests || 0;
  const validFiles = result
    ? `${result.syntax_valid_count} / ${result.test_files.length}`
    : '0 / 0';
  const hasExecuted = Boolean(result?.test_files?.some((t) => t.execution_status === 'passed'));
  const hasFailed = Boolean(result?.test_files?.some((t) => t.execution_status === 'failed'));
  const testRunStatus = !trustedDemo
    ? 'Safety locked'
    : hasFailed
    ? 'Regressions Found'
    : hasExecuted
    ? 'Passed in Sandbox'
    : 'Ready in Sandbox';
  const testRunSubtext = !trustedDemo
    ? 'Execution safety locked (untrusted)'
    : hasExecuted
    ? 'Verified in disposable sandbox'
    : 'Trusted demo runner ready';
  const measuredCoverage =
    result?.overall_line_coverage != null
      ? `${Math.round(result.overall_line_coverage)}%`
      : 'Unavailable';

  const isMeasured = Boolean(result?.is_measured || result?.overall_line_coverage != null);

  return (
    <div
      className="space-y-5 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-tests"
      aria-labelledby="tab-tests"
    >
      {/* 1. Header Bar */}
      <section className="bg-surface border border-line rounded-lg p-4 sm:p-5 shadow-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-11 h-11 rounded-md bg-amber-surface text-amber-text flex items-center justify-center shrink-0 border border-amber/20"
            aria-hidden="true"
          >
            <TestTube className="w-5 h-5 text-amber-strong" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight">
              Generated Unit Tests &amp; Characterization
            </h2>
            <p className="font-sans text-xs text-ink-3 mt-0.5">
              Review-ready pytest and Vitest suites generated from AST structures to protect legacy behavior during modernization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadZip}
            icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Download ZIP
          </Button>

          <Button
            variant="indigo"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerating}
            loadingText="Regenerating…"
            icon={<Play className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Regenerate tests
          </Button>
        </div>
      </section>

      {/* 2. Four KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="TEST CASES"
          value={formatNumber(totalCases)}
          subtext="Assertion test contracts"
        />
        <KpiCard
          label="VALID TEST FILES"
          value={validFiles}
          subtext="Passed static syntax check"
        />
        <KpiCard
          label="TEST RUN"
          value={testRunStatus}
          subtext={testRunSubtext}
        />
        <KpiCard
          label="MEASURED COVERAGE"
          value={measuredCoverage}
          subtext={
            result?.overall_line_coverage != null
              ? 'Measured line coverage'
              : 'Untrusted upload unexecuted'
          }
        />
      </div>

      {/* 3. Amber Notice */}
      <Notice type="warning">
        Coverage is measured only when tests execute in the trusted built-in demo. Untrusted repository code remains execution-locked to prevent arbitrary remote execution.
      </Notice>

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 4. Master–Detail Layout: Files List (280px) + Test Details & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left: Tabbed Drawer (Tests vs Unprotected) */}
        <div
          role="listbox"
          aria-label="Generated test files"
          className="bg-surface border border-line rounded-lg p-3 shadow-1 max-h-[720px] flex flex-col"
        >
          {/* Sub-tab switcher: Protected Tests vs Unprotected Files */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-track rounded-lg mb-3">
            <button
              type="button"
              onClick={() => setSidebarTab('tests')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                sidebarTab === 'tests'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Tests ({result?.test_files.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('unprotected')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                sidebarTab === 'unprotected'
                  ? 'bg-surface text-ink shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Unprotected ({unprotectedFiles.length})
            </button>
          </div>

          <div className="px-1 pb-3 border-b border-line space-y-2">
            <SearchField
              id="tests-filter"
              value={search}
              onChange={setSearch}
              placeholder={sidebarTab === 'tests' ? 'Filter tests…' : 'Filter unprotected…'}
              className="w-full"
            />

            {sidebarTab === 'tests' && (
              <div className="flex items-center gap-1 flex-wrap pt-1">
                <FilterChip
                  label="ALL"
                  active={categoryFilter === 'all'}
                  onClick={() => setCategoryFilter('all')}
                />
                <FilterChip
                  label="CONTRACT"
                  active={categoryFilter === 'contract'}
                  onClick={() => setCategoryFilter('contract')}
                />
                <FilterChip
                  label="ERROR-PATH"
                  active={categoryFilter === 'error'}
                  onClick={() => setCategoryFilter('error')}
                />
                <FilterChip
                  label="SMOKE"
                  active={categoryFilter === 'smoke'}
                  onClick={() => setCategoryFilter('smoke')}
                />
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-line/40 mt-2 pr-1">
            {sidebarTab === 'tests' ? (
              filteredFiles.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-3">
                  No test files found.
                </div>
              ) : (
                filteredFiles.map((f, idx) => {
                  const isSelected = activeFile?.test_id === f.test_id;
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
                      <FileText
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isSelected ? 'text-indigo' : 'text-ink-3'
                        }`}
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs truncate" title={f.safe_test_path}>
                          {truncateMiddle(f.safe_test_path, 26)}
                        </div>
                        <div className="flex items-center justify-between text-[11px] font-sans font-normal text-ink-3 mt-1">
                          <span className="truncate max-w-[110px]">
                            {f.is_import_only ? 'Smoke Import' : f.test_category.replace(' test', '')}
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
            ) : unprotectedFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-teal-strong font-semibold">
                All source modules have protection tests generated!
              </div>
            ) : (
              unprotectedFiles.map((path) => (
                <div
                  key={path}
                  onClick={() => {
                    onSelectFile?.(path);
                  }}
                  className="p-2.5 rounded-md my-0.5 bg-tile/40 hover:bg-tile text-xs cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="truncate pr-2">
                    <div
                      className="flex items-center gap-1.5 font-mono text-ink-2 truncate"
                      title={path}
                    >
                      <FileQuestion className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                      <span>{truncateMiddle(path, 22)}</span>
                    </div>
                    <div className="text-[10px] text-ink-3 mt-1">
                      Unprotected source module.
                    </div>
                  </div>
                  {onInspectImpact && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFile?.(path);
                        onInspectImpact(path);
                      }}
                      icon={<Target className="w-3 h-3 text-red-strong" />}
                      title="Check blast radius for unprotected file"
                    >
                      Impact
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Comprehensive Test Details & Connections */}
        <div className="space-y-4">
          {activeFile && (
            <>
              {/* 1. Target Header & Primary Cross-Tab Actions */}
              <div className="bg-surface border border-line rounded-lg p-4 shadow-1 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
                  <div>
                    <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      TARGET SOURCE FILE
                    </span>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="font-mono text-base font-bold text-ink">
                        {activeFile.target_relative_path}
                      </span>
                      <StatusTag
                        status="analyzed"
                        label={activeFile.test_category.toUpperCase()}
                      />
                      {activeFile.is_import_only && (
                        <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold bg-amber-surface text-amber-text border border-amber-line uppercase">
                          IMPORT SMOKE ONLY
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
                          onSelectFile?.(activeFile.target_relative_path);
                          onInspectImpact(activeFile.target_relative_path);
                        }}
                        icon={<Target className="w-3.5 h-3.5" strokeWidth={2} />}
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
                          onSelectFile?.(activeFile.target_relative_path);
                          onNavigateTab('refactor');
                        }}
                        icon={<Wand2 className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Preview Modernization
                      </Button>
                    )}
                  </div>
                </div>

                {/* Test Specification & Strategy Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-tile rounded p-2.5 border border-line/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      Test Strategy
                    </span>
                    <span className="font-semibold text-ink mt-0.5 block">
                      {formatStrategy(activeFile.generation_strategy)}
                    </span>
                    <span className="text-[10px] text-ink-3 font-mono">
                      Framework: {activeFile.framework}
                    </span>
                  </div>

                  <div className="bg-tile rounded p-2.5 border border-line/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      Test File Path
                    </span>
                    <span className="font-mono font-semibold text-indigo-text mt-0.5 block truncate" title={activeFile.safe_test_path}>
                      {truncateMiddle(activeFile.safe_test_path, 28)}
                    </span>
                    <span className="text-[10px] text-ink-3">
                      {activeFile.test_count} assertion test {activeFile.test_count === 1 ? 'case' : 'cases'}
                    </span>
                  </div>

                  <div className="bg-tile rounded p-2.5 border border-line/60">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                      Target Symbols
                    </span>
                    {activeFile.covered_symbols && activeFile.covered_symbols.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activeFile.covered_symbols.slice(0, 3).map((sym) => (
                          <span
                            key={sym}
                            className="font-mono text-[10px] px-1.5 py-0.2 bg-surface border border-line rounded text-ink font-semibold"
                          >
                            {sym}
                          </span>
                        ))}
                        {activeFile.covered_symbols.length > 3 && (
                          <span className="text-[10px] text-ink-3 font-mono">
                            +{activeFile.covered_symbols.length - 3} more
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-ink-3 italic mt-0.5 block">
                        Module-level definitions &amp; imports
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Validation & Execution Status Breakdown (Static vs Real Execution strictly separated) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Static Syntax Status */}
                <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1">
                      <Code2 className="w-3.5 h-3.5 text-indigo" />
                      Static AST Syntax
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        activeFile.syntax_valid
                          ? 'bg-teal-surface text-teal-strong border border-teal/20'
                          : 'bg-red-surface text-red-text border border-red-line'
                      }`}
                    >
                      {activeFile.syntax_valid ? 'AST Valid' : 'Syntax Error'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    {activeFile.syntax_valid
                      ? 'Passed static AST parsing without syntax errors.'
                      : activeFile.syntax_error_message || 'Static syntax error in generated test.'}
                  </p>
                  <p className="text-[10px] text-ink-4 pt-1 border-t border-line/40">
                    Static grammar check only — does not evaluate runtime behavior.
                  </p>
                </div>

                {/* Real Subprocess Execution Status */}
                <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1">
                      {trustedDemo ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-teal" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-strong" />
                      )}
                      Execution Status
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                        activeFile.execution_status === 'passed'
                          ? 'bg-teal-surface text-teal-strong border border-teal/20'
                          : activeFile.execution_status === 'failed'
                          ? 'bg-red-surface text-red-text border border-red-line'
                          : 'bg-amber-surface text-amber-strong border border-amber/30'
                      }`}
                    >
                      {activeFile.execution_status === 'passed'
                        ? 'Sandbox Passed'
                        : activeFile.execution_status === 'failed'
                        ? 'Failed'
                        : trustedDemo
                        ? 'Not Run'
                        : 'Safety Locked'}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-2 leading-relaxed">
                    {trustedDemo
                      ? activeFile.execution_status === 'passed'
                        ? `All ${activeFile.test_count} tests passed in disposable sandbox runner.`
                        : 'Disposable sandbox runner ready.'
                      : 'Untrusted codebase: execution locked to prevent arbitrary server code execution.'}
                  </p>
                  <p className="text-[10px] text-ink-4 pt-1 border-t border-line/40">
                    {trustedDemo
                      ? 'Subprocess sandbox with isolated filesystem.'
                      : 'Download ZIP to execute tests in your local environment.'}
                  </p>
                </div>

                {/* Measured vs Estimated Coverage (No false behavioral claims) */}
                <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3">
                      Coverage Claim
                    </span>
                    {activeFile.is_import_only ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-surface text-amber-text border border-amber-line">
                        Smoke Only
                      </span>
                    ) : isMeasured && activeFile.line_coverage != null ? (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-surface text-teal-strong border border-teal/20">
                        {Math.round(activeFile.line_coverage)}% Line
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-surface text-indigo-text border border-indigo/20">
                        Estimated
                      </span>
                    )}
                  </div>

                  {activeFile.is_import_only ? (
                    <p className="text-[11px] text-amber-text font-medium leading-relaxed">
                      <strong>0% Behavioral Coverage Claimed:</strong> Tests module importability only; no function logic or branches are tested.
                    </p>
                  ) : isMeasured && activeFile.line_coverage != null ? (
                    <p className="text-[11px] text-teal-strong font-medium leading-relaxed">
                      <strong>Measured Line Coverage ({Math.round(activeFile.line_coverage)}%):</strong> Instrumented execution in sandbox ({activeFile.covered_lines?.length || 0} lines hit).
                    </p>
                  ) : (
                    <p className="text-[11px] text-ink-2 leading-relaxed">
                      <strong>Estimated Contract Coverage:</strong> Static AST assertion heuristic. Execution unmeasured.
                    </p>
                  )}
                  <p className="text-[10px] text-ink-4 pt-1 border-t border-line/40">
                    {activeFile.is_import_only
                      ? 'Requires human test expansion for behavior.'
                      : 'Static coverage estimate.'}
                  </p>
                </div>
              </div>

              {/* 3. Related Hotspot Risk & Migration Impact Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Related Hotspot Risk Card */}
                <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-amber-strong" />
                      Related Hotspot Risk
                    </span>
                    {relatedHotspot ? (
                      <StatusTag
                        status={
                          relatedHotspot.risk_level === 'critical'
                            ? 'critical'
                            : relatedHotspot.risk_level === 'high'
                            ? 'complexity-high'
                            : relatedHotspot.risk_level === 'medium'
                            ? 'complexity-medium'
                            : 'complexity-low'
                        }
                        label={`${relatedHotspot.risk_level.toUpperCase()} (${relatedHotspot.hotspot_score}/100)`}
                      />
                    ) : (
                      <span className="text-[10px] text-ink-3 font-semibold">Low / Clean</span>
                    )}
                  </div>

                  {relatedHotspot ? (
                    <>
                      <p className="text-[11px] text-ink-2 leading-tight">
                        {relatedHotspot.reason}
                      </p>
                      <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 pt-1 border-t border-line/60">
                        <span>
                          {relatedHotspot.lines_of_code} LOC · Complexity {relatedHotspot.complexity} · {relatedHotspot.dependency_fan_in} callers
                        </span>
                        {onNavigateTab && (
                          <button
                            type="button"
                            onClick={() => {
                              onSelectFile?.(activeFile.target_relative_path);
                              onNavigateTab('hotspots');
                            }}
                            className="text-indigo font-bold hover:underline"
                          >
                            View Hotspot →
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-[11px] text-ink-3">
                      No severe static risk hotspots flagged for this module.
                    </p>
                  )}
                </div>

                {/* Related Migration Impact Card */}
                <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[10px] uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-indigo" />
                      Related Migration Impact
                    </span>
                    {activeImpact ? (
                      <span className="px-2 py-0.5 rounded-pill text-[10px] font-bold uppercase tracking-wider bg-tile border border-line text-ink-2">
                        Wave {activeImpact.wave || 1} · {activeImpact.blast_radius} affected
                      </span>
                    ) : (
                      <span className="text-[10px] text-ink-3">Calculating…</span>
                    )}
                  </div>

                  {activeImpact ? (
                    <>
                      <div className="text-[11px] text-ink-2 space-y-0.5">
                        <div>
                          <strong>Direct Callers:</strong> {activeImpact.direct_dependents?.length || 0} modules
                        </div>
                        <div>
                          <strong>Transitive Blast Radius:</strong> {activeImpact.transitive_dependents?.length || 0} downstream modules
                        </div>
                      </div>
                      <div className="pt-1 border-t border-line/60 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => onInspectImpact?.(activeFile.target_relative_path)}
                          className="text-xs font-bold text-indigo hover:underline flex items-center gap-1"
                        >
                          What breaks if I change this? →
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onInspectImpact?.(activeFile.target_relative_path)}
                      className="text-xs font-bold text-indigo hover:underline"
                    >
                      Inspect Change Impact →
                    </button>
                  )}
                </div>
              </div>

              {/* 4. Modernization Proposal Connection Card */}
              <div className="bg-surface border border-line rounded-lg p-3.5 shadow-1 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <Wand2 className="w-4 h-4 text-teal-strong shrink-0" />
                  <div>
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
                    <p className="text-[11px] text-ink-3 mt-0.5">
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

              {/* 5. Code Viewer with Syntax Status */}
              <CodeViewer
                filePath={activeFile.safe_test_path}
                targetPath={activeFile.target_relative_path}
                code={activeFile.code}
                language={activeFile.language}
                syntaxStatus={activeFile.syntax_valid ? 'Syntax check passed' : undefined}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GeneratedTestsTab;

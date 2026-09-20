import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  TestTube,
  Download,
  Play,
  FileText,
  FileQuestion,
  Code2,
} from 'lucide-react';
import { JobResponse, ProjectTestResult, GeneratedTestFile } from '../types';
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
  onTestsUpdated?: () => void;
  onStatusChange?: (generating: boolean, error?: string | null) => void;
}

export const GeneratedTestsTab: React.FC<GeneratedTestsTabProps> = ({
  projectId,
  projectName: _projectName = 'project',
  trustedDemo = false,
  onTestsUpdated,
  onStatusChange,
}) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
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

  useEffect(() => {
    loadResult();
  }, [loadResult]);

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
      if (categoryFilter === 'smoke') return f.test_category.toLowerCase().includes('smoke') || f.is_import_only;
      return true;
    });
  }, [result, search, categoryFilter]);

  const activeFile: GeneratedTestFile | undefined =
    filteredFiles[selectedIdx] || filteredFiles[0] || result?.test_files[0];

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
  const testRunStatus = trustedDemo ? 'Passed in Sandbox' : 'Safety locked';
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
              Review-ready pytest and Vitest suites generated from AST structures to protect legacy behavior.
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
          subtext="Passed syntax check"
        />
        <KpiCard
          label="TEST RUN"
          value={testRunStatus}
          subtext={trustedDemo ? 'Disposable runner' : 'Execution unmeasured'}
        />
        <KpiCard
          label="MEASURED COVERAGE"
          value={measuredCoverage}
          subtext={
            result?.overall_line_coverage != null
              ? 'Measured line coverage'
              : 'Public repo unexecuted'
          }
        />
      </div>

      {/* 3. Amber Notice */}
      <Notice type="warning">
        Coverage is shown only when tests run in the trusted built-in demo. Public repository code remains safely unexecuted to prevent arbitrary execution.
      </Notice>

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 4. Master–Detail Layout: Files List (280px) + Dark Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left: Tabbed Drawer (Tests vs Unprotected) */}
        <div
          role="listbox"
          aria-label="Generated test files"
          className="bg-surface border border-line rounded-lg p-3 shadow-1 max-h-[620px] flex flex-col"
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
                      onClick={() => setSelectedIdx(idx)}
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
                          <span className="truncate max-w-[120px]">{f.test_category.replace(' test', '')}</span>
                          <span>{f.test_count} {f.test_count === 1 ? 'case' : 'cases'}</span>
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
                  <div key={path} className="p-2.5 rounded-md my-0.5 bg-tile/40 text-xs">
                    <div className="flex items-center gap-1.5 font-mono text-ink-2 truncate" title={path}>
                      <FileQuestion className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                      <span>{truncateMiddle(path, 26)}</span>
                    </div>
                    <div className="text-[10px] text-ink-3 mt-1">
                      Empty, barrel export, or import smoke only.
                    </div>
                  </div>
                ))
              )}
            </div>
        </div>

        {/* Right: Code Viewer + Metadata Bar */}
        <div className="space-y-3">
          {/* Metadata pill bar */}
          {activeFile && (
            <div className="bg-surface border border-line rounded-lg p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono font-bold text-indigo-text">
                  {truncateMiddle(activeFile.safe_test_path, 32)}
                </span>
                <StatusTag
                  status="analyzed"
                  label={activeFile.test_category.toUpperCase()}
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-3">
                <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                  Static: <strong className={activeFile.syntax_valid ? 'text-teal-strong' : 'text-red'}>
                    {activeFile.syntax_valid ? 'AST Valid' : 'Syntax Error'}
                  </strong>
                </span>
                <span className="px-2 py-0.5 rounded-pill bg-tile border border-line">
                  Protection: <strong className={activeFile.is_import_only ? 'text-ink-3' : 'text-indigo-text'}>
                    {activeFile.is_import_only
                      ? 'Import Smoke Only'
                      : isMeasured
                      ? 'Measured Line Coverage'
                      : 'Estimated Contract'}
                  </strong>
                </span>
              </div>
            </div>
          )}

          {/* Covered symbols list */}
          {activeFile && activeFile.covered_symbols && activeFile.covered_symbols.length > 0 && (
            <div className="bg-surface border border-line rounded-lg p-3 text-xs shadow-1 flex items-center gap-2 flex-wrap">
              <span className="font-bold text-ink-2 flex items-center gap-1">
                <Code2 className="w-3.5 h-3.5 text-indigo" />
                Target Symbols:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeFile.covered_symbols.map((sym) => (
                  <span
                    key={sym}
                    className="font-mono text-[11px] px-2 py-0.5 bg-tile border border-line rounded-pill text-ink"
                  >
                    {sym}
                  </span>
                ))}
              </div>
            </div>
          )}

          <CodeViewer
            filePath={activeFile?.safe_test_path || 'No test file selected'}
            targetPath={activeFile?.target_relative_path}
            code={activeFile?.code || ''}
            language={activeFile?.language}
            syntaxStatus={activeFile?.syntax_valid ? 'Syntax check passed' : undefined}
          />
        </div>
      </div>
    </div>
  );
};

export default GeneratedTestsTab;

import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Code2,
  Download,
  FileCode2,
  FileQuestion,
  Info,
  Layers,
  Loader2,
  Play,
  ShieldCheck,
  TestTube2,
  XCircle,
} from 'lucide-react';
import { JobResponse, ProjectTestResult } from '../types';
import EmptyState from './common/EmptyState';
import StatCard from './common/StatCard';

interface Props {
  projectId?: string | null;
  trustedDemo?: boolean;
  onTestsUpdated?: () => void;
  onStatusChange?: (generating: boolean, error?: string | null) => void;
}

const messageFrom = async (response: Response) => {
  try {
    const body = await response.json();
    return typeof body.detail === 'string'
      ? body.detail
      : body.detail?.message || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const getCategoryBadgeClass = (category: string) => {
  switch (category.toLowerCase()) {
    case 'function contract test':
      return 'border-[#C7C4F7] bg-[#EAE9FB] text-[#4340A0]';
    case 'error-path test':
      return 'border-[#E6D3A9] bg-[#FDF6E2] text-[#8C6218]';
    case 'edge-case test':
      return 'border-[#BEE0D6] bg-[#E0EFEB] text-[#245F59]';
    case 'integration test':
      return 'border-[#E2C7EB] bg-[#F7EAFB] text-[#7A368F]';
    case 'import smoke test':
    default:
      return 'border-[#D8CFC2] bg-[#F2EDE4] text-[#6B645A]';
  }
};

export const GeneratedTestsTab: React.FC<Props> = ({
  projectId,
  trustedDemo = false,
  onTestsUpdated,
  onStatusChange,
}) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'tests' | 'unprotected'>('tests');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/tests?t=${Date.now()}`);
    if (response.status === 409) return;
    if (!response.ok) throw new Error(await messageFrom(response));
    setResult(await response.json());
  }, [projectId]);

  useEffect(() => {
    setResult(null);
    setSelected(0);
    setError(null);
    loadResult().catch((err) => setError(err.message));
  }, [loadResult]);

  const generate = async () => {
    if (!projectId || loading) return;
    setLoading(true);
    setError(null);
    setProgress(5);
    onStatusChange?.(true, null);
    try {
      const response = await fetch(`/api/projects/${projectId}/tests/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, execute: trustedDemo }),
      });
      if (!response.ok) throw new Error(await messageFrom(response));
      const job: JobResponse = await response.json();
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const statusResponse = await fetch(job.polling_url);
        if (!statusResponse.ok) throw new Error(await messageFrom(statusResponse));
        const status: JobResponse = await statusResponse.json();
        setProgress(status.progress_percentage);
        if (status.state === 'completed') {
          await loadResult();
          onStatusChange?.(false, null);
          onTestsUpdated?.();
          return;
        }
        if (status.state === 'failed')
          throw new Error(status.error_message || 'Test generation failed.');
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      throw new Error('Test generation timed out.');
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Test generation failed.';
      setError(errMsg);
      onStatusChange?.(false, errMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!projectId)
    return (
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center text-sm font-medium text-[#6B645A]">
        Analyze a repository to generate tests.
      </div>
    );

  const file = result?.test_files[selected];
  const coverage = result?.overall_line_coverage;
  const isMeasured = Boolean(result?.is_measured || coverage != null);
  const protectedCount = result?.protected_files?.length ?? result?.test_files.filter(t => !t.is_import_only).length ?? 0;
  const unprotectedFiles = result?.unprotected_files ?? [];

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <section className="flex flex-col gap-4 rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 md:flex-row md:items-center md:justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F5E8CC] text-[#C7953D] rounded-2xl border border-[#E6D3A9]">
            <TestTube2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#292622]">Generated Unit Tests & Protection</h2>
            <p className="mt-0.5 text-xs text-[#6B645A]">
              Characterization contract suites, error-path tests, and boundary checks classified by behavioral protection.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {result && (
            <a
              href={`/api/projects/${projectId}/tests/download`}
              className="btn-brand-outline-pill px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Download ZIP</span>
            </a>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="btn-brand-pill px-5 py-2.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span>{result ? 'Regenerate tests' : 'Generate tests'}</span>
          </button>
        </div>
      </section>

      {/* Progress & Error indicators */}
      {loading && (
        <div className="rounded-2xl border border-[#C7C4F7] bg-[#EAE9FB]/70 p-4">
          <div className="mb-2 flex justify-between text-xs font-bold text-[#4340A0]">
            <span>Generating, classifying, and validating tests...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#FFFDFC]">
            <div
              className="h-full bg-[#4C4FD6] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#ECC7C3] bg-[#F6E5E2] p-4 text-xs font-bold text-[#8F3F3A]">
          <XCircle className="h-4 w-4 text-[#C45F58] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!result && !loading && (
        <EmptyState
          icon={ShieldCheck}
          iconVariant="signal"
          headline="Ready to generate unit tests"
          description="CodeOracle constructs generated pytest or Vitest suites, checks their syntax, and labels execution separately when a trusted runner is available."
          actionText="Generate Unit Tests"
          onAction={generate}
          trustCopy="For safety, uploaded code is not run. Generated files are checked for valid syntax and can be downloaded for review."
        />
      )}

      {/* Results View */}
      {result && (
        <>
          {/* Top Stat Cards */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Test Cases"
              value={String(result.total_generated_tests)}
              accentColor="#4C4FD6"
            />
            <StatCard
              label="Protected Files"
              value={`${protectedCount}/${result.target_source_files}`}
              accentColor="#245F59"
            />
            <StatCard
              label="Syntax Validation"
              value={`${result.syntax_valid_count}/${result.test_files.length}`}
              accentColor="#368A80"
            />
            <StatCard
              label={isMeasured ? 'Measured Line Coverage' : 'Estimated Protection'}
              value={
                isMeasured && coverage != null
                  ? `${coverage.toFixed(1)}%`
                  : 'Syntax Verified'
              }
              accentColor={isMeasured && coverage != null && coverage >= 60 ? '#368A80' : undefined}
            />
          </div>

          {/* Test Strategy & Classification Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-bold text-[#292622]">
              <Layers className="h-4 w-4 text-[#4C4FD6]" />
              <span>Test Categories:</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-[#C7C4F7] bg-[#EAE9FB] px-2.5 py-1 text-[11px] font-bold text-[#4340A0]">
                Contract: {result.category_counts?.['function contract test'] ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E6D3A9] bg-[#FDF6E2] px-2.5 py-1 text-[11px] font-bold text-[#8C6218]">
                Error-Path: {result.category_counts?.['error-path test'] ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#BEE0D6] bg-[#E0EFEB] px-2.5 py-1 text-[11px] font-bold text-[#245F59]">
                Edge-Case: {result.category_counts?.['edge-case test'] ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#E2C7EB] bg-[#F7EAFB] px-2.5 py-1 text-[11px] font-bold text-[#7A368F]">
                Integration: {result.category_counts?.['integration test'] ?? 0}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-[#D8CFC2] bg-[#F2EDE4] px-2.5 py-1 text-[11px] font-bold text-[#6B645A]">
                Import Smoke: {result.category_counts?.['import smoke test'] ?? 0}
              </span>
            </div>
          </div>

          {/* Measured vs. Estimated Protection Banner */}
          <div
            className={`rounded-2xl border p-4 text-xs font-semibold leading-5 ${
              isMeasured && coverage != null
                ? coverage >= 60
                  ? 'border-[#BEE0D6] bg-[#E0EFEB] text-[#245F59]'
                  : 'border-[#ECC7C3] bg-[#F6E5E2] text-[#8F3F3A]'
                : 'border-[#E6D3A9] bg-[#FDF6E2] text-[#76561B]'
            }`}
          >
            {isMeasured && coverage != null ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#245F59]" />
                <span>
                  <strong>Measured Coverage ({coverage.toFixed(1)}%):</strong> Tests executed inside the safe sandbox demo container.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 shrink-0 text-[#8C6218]" />
                <span>
                  <strong>Estimated Protection:</strong> Static AST contract verification. CodeOracle does not run untrusted code; import-only smoke tests do not claim behavioral protection.
                </span>
              </div>
            )}
          </div>

          {/* Sidebar & Preview Container */}
          <div className="grid min-h-[480px] gap-4 lg:grid-cols-[280px_1fr]">
            {/* Sidebar Navigation */}
            <aside className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-3 shadow-xs flex flex-col">
              {/* Tab Selector */}
              <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-[#F0EBE2] p-1 text-[11px] font-bold">
                <button
                  onClick={() => setSidebarTab('tests')}
                  className={`rounded-lg py-1.5 transition-colors ${
                    sidebarTab === 'tests'
                      ? 'bg-[#FFFDFC] text-[#292622] shadow-xs'
                      : 'text-[#6B645A] hover:text-[#292622]'
                  }`}
                >
                  Tests ({result.test_files.length})
                </button>
                <button
                  onClick={() => setSidebarTab('unprotected')}
                  className={`rounded-lg py-1.5 transition-colors ${
                    sidebarTab === 'unprotected'
                      ? 'bg-[#FFFDFC] text-[#292622] shadow-xs'
                      : 'text-[#6B645A] hover:text-[#292622]'
                  }`}
                >
                  Unprotected ({unprotectedFiles.length})
                </button>
              </div>

              {/* Sidebar Content */}
              {sidebarTab === 'tests' ? (
                <div className="space-y-1.5 overflow-y-auto max-h-[500px]">
                  {result.test_files.map((item, index) => (
                    <button
                      key={item.test_id}
                      onClick={() => setSelected(index)}
                      className={`w-full rounded-xl p-2.5 text-left transition-all border ${
                        selected === index
                          ? 'border-[#C7C4F7] bg-[#EAE9FB] text-[#4340A0] shadow-xs'
                          : 'border-transparent text-[#4D4842] hover:bg-[#F0EBE2]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 truncate text-xs font-bold">
                          <FileCode2 className="h-3.5 w-3.5 shrink-0 text-[#4C4FD6]" />
                          <span className="truncate">{item.safe_test_path.replace('tests/', '')}</span>
                        </div>
                        {item.syntax_valid ? (
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-[#368A80]" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#C45F58]" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px]">
                        <span
                          className={`rounded px-1.5 py-0.5 font-bold uppercase tracking-wider text-[9px] border ${getCategoryBadgeClass(
                            item.test_category
                          )}`}
                        >
                          {item.test_category.replace(' test', '')}
                        </span>
                        <span className="text-[#6B645A]">
                          {item.test_count} tests • {item.framework}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5 overflow-y-auto max-h-[500px]">
                  <p className="px-1 text-[10px] text-[#6B645A] font-medium leading-4 mb-2">
                    Files without verified behavioral test contracts (empty modules, barrels, type declarations, or import smoke only).
                  </p>
                  {unprotectedFiles.length === 0 ? (
                    <div className="p-4 text-center text-xs text-[#245F59] font-bold bg-[#E0EFEB] rounded-xl">
                      All source modules are protected!
                    </div>
                  ) : (
                    unprotectedFiles.map((filePath) => {
                      const matchingTest = result.test_files.find((t) => t.target_relative_path === filePath);
                      const isSmokeOnly = matchingTest?.is_import_only;
                      return (
                        <div
                          key={filePath}
                          className="rounded-xl border border-[#D8CFC2] bg-[#FFFDFC] p-2.5 text-xs text-[#4D4842]"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-[#292622] break-all">
                            <FileQuestion className="h-3.5 w-3.5 shrink-0 text-[#8C6218]" />
                            <span>{filePath}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-1.5">
                            <span className="rounded bg-[#F2EDE4] px-1.5 py-0.5 text-[9px] font-bold text-[#8C6218]">
                              {isSmokeOnly ? 'Import smoke only' : 'Skipped / non-testable module'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </aside>

            {/* Test Code Preview & Characterization Inspector */}
            <section className="overflow-hidden rounded-[20px] border-2 border-[#181715] bg-[#1C1A17] shadow-md flex flex-col">
              {file ? (
                <>
                  {/* Top Bar */}
                  <header className="border-b border-[#3B3733] bg-[#181715] p-4 text-white">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-indigo-300">{file.safe_test_path}</p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase border ${getCategoryBadgeClass(
                              file.test_category
                            )}`}
                          >
                            {file.test_category}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-[#A3998E]">
                          Targets <span className="font-mono text-amber-200">{file.target_relative_path}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => navigator.clipboard.writeText(file.code)}
                          className="px-3 py-1.5 text-[10px] font-bold rounded-full bg-[#383BA8] text-white hover:bg-[#4C4FD6] transition-colors border border-indigo-400/30 inline-flex items-center gap-1 shrink-0"
                        >
                          <Clipboard className="h-3 w-3" />
                          <span>Copy Code</span>
                        </button>
                      </div>
                    </div>

                    {/* Metadata & Status Pill Bar */}
                    <div className="mt-3 flex flex-wrap items-center gap-2 pt-2 border-t border-[#2D2A26] text-[10px]">
                      <span className="inline-flex items-center gap-1 rounded bg-[#272522] px-2 py-0.5 text-[#C4BDAF]">
                        Static check:
                        <strong className={file.syntax_valid ? 'text-[#5ECBA1]' : 'text-[#E87979]'}>
                          {file.syntax_valid
                            ? file.language === 'python' ? 'AST Valid' : 'Structural check passed'
                            : file.language === 'python' ? 'Syntax Error' : 'Structural check failed'}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-[#272522] px-2 py-0.5 text-[#C4BDAF]">
                        Execution:
                        <strong
                          className={
                            file.execution_status === 'passed'
                              ? 'text-[#5ECBA1]'
                              : file.execution_status === 'failed'
                              ? 'text-[#E87979]'
                              : 'text-amber-300'
                          }
                        >
                          {file.execution_status === 'passed'
                            ? 'Passed'
                            : file.execution_status === 'failed'
                            ? 'Failed'
                            : 'Safety Locked'}
                        </strong>
                      </span>
                      <span className="inline-flex items-center gap-1 rounded bg-[#272522] px-2 py-0.5 text-[#C4BDAF]">
                        Protection:
                        <strong className={file.is_import_only ? 'text-[#8E867C]' : 'text-indigo-300'}>
                          {file.is_import_only
                            ? 'Unprotected (Smoke)'
                            : isMeasured
                            ? 'Measured Line Coverage'
                            : 'Estimated Contract'}
                        </strong>
                      </span>
                    </div>

                    {/* Target Symbols Covered */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[#A3998E]">Covered Symbols:</span>
                      {file.covered_symbols && file.covered_symbols.length > 0 ? (
                        file.covered_symbols.map((symbol) => (
                          <span
                            key={symbol}
                            className="inline-flex items-center gap-1 rounded bg-[#282622] px-2 py-0.5 font-mono text-[10px] text-amber-200 border border-[#3E3933]"
                          >
                            <Code2 className="h-2.5 w-2.5 text-indigo-400" />
                            {symbol}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-[#8E867C] italic">
                          None (import smoke test only — does not claim behavioral coverage)
                        </span>
                      )}
                    </div>
                  </header>

                  {/* Dark Code Block */}
                  <pre className="max-h-[520px] flex-1 overflow-auto p-4 text-xs font-mono leading-6 text-[#F3F0EB] bg-[#1C1A17]">
                    <code>{file.code}</code>
                  </pre>
                </>
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center p-8 text-center text-xs text-[#8E867C]">
                  Select a test file from the sidebar to inspect its contract suite and source symbols.
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default GeneratedTestsTab;

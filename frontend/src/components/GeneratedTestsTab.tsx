import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Clipboard,
  Download,
  FileCode2,
  Loader2,
  Play,
  ShieldCheck,
  TestTube2,
  XCircle,
  CheckCircle2,
  Lock,
  RotateCcw,
  Search,
  Zap,
  Clock,
  Code2,
  Terminal,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { JobResponse, ProjectTestResult, GeneratedTestFile } from '../types';
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

export const GeneratedTestsTab: React.FC<Props> = ({
  projectId,
  trustedDemo = false,
  onTestsUpdated,
  onStatusChange,
}) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sub-view controls
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'locked'>('all');
  const [activeRightTab, setActiveRightTab] = useState<'code' | 'output' | 'coverage'>('code');

  const loadResult = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/tests?t=${Date.now()}`);
    if (response.status === 409) return;
    if (!response.ok) throw new Error(await messageFrom(response));
    const data: ProjectTestResult = await response.json();
    setResult(data);
  }, [projectId]);

  useEffect(() => {
    setResult(null);
    setSelectedIndex(0);
    setError(null);
    loadResult().catch((err) => setError(err.message));
  }, [loadResult]);

  const generate = async (executeInSandbox: boolean = false) => {
    if (!projectId || loading) return;
    setLoading(true);
    setError(null);
    setProgress(5);
    onStatusChange?.(true, null);
    try {
      const response = await fetch(`/api/projects/${projectId}/tests/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, execute: executeInSandbox || trustedDemo }),
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

  const filteredFiles = useMemo(() => {
    if (!result?.test_files) return [];
    return result.test_files.filter((tf) => {
      const matchesSearch =
        tf.safe_test_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tf.target_relative_path.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'passed') return tf.execution_status === 'passed';
      if (statusFilter === 'failed') return tf.execution_status === 'failed';
      if (statusFilter === 'locked')
        return tf.execution_status === 'not_run' || tf.execution_status === 'unavailable';

      return true;
    });
  }, [result?.test_files, searchQuery, statusFilter]);

  if (!projectId) {
    return (
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center text-sm font-medium text-[#6B645A]">
        Analyze a repository to generate unit tests.
      </div>
    );
  }

  const selectedFile: GeneratedTestFile | undefined = filteredFiles[selectedIndex] || result?.test_files[0];
  const coverage = result?.overall_line_coverage;

  const pipelineSteps = [
    { label: 'Generated Tests', done: !!result },
    { label: 'Syntax Validation', done: result ? result.syntax_valid_count > 0 : false },
    { label: 'Dependency Prep', done: !!result },
    { label: 'Isolated Sandbox', done: result ? result.execution_enabled : false },
    { label: 'Test Execution', done: result ? result.executed_test_count > 0 : false },
    { label: 'Results & Coverage', done: result ? result.overall_line_coverage != null : false },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Action Header Banner */}
      <section className="flex flex-col gap-4 rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-5 md:flex-row md:items-center md:justify-between shadow-warm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-[#EAE9FB] text-[#4340A0] rounded-2xl border border-[#C7C4F7] shadow-xs">
            <TestTube2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-black text-[#181715] sm:text-lg">
              Generated Unit Tests & Safe Execution Workspace
            </h2>
            <p className="mt-0.5 text-xs font-semibold text-[#6B645A]">
              Syntax-validated pytest & Vitest test suites with subprocess sandbox protection.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {result && (
            <a
              href={`/api/projects/${projectId}/tests/download`}
              className="btn-brand-outline-pill px-4 py-2.5 text-xs inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Download ZIP</span>
            </a>
          )}

          {result && (
            <button
              onClick={() => generate(true)}
              disabled={loading}
              className="rounded-full bg-[#4C4FD6] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#383BA8] transition-colors shadow-sm inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4 text-[#C7953D]" />}
              <span>Run Tests in Sandbox</span>
            </button>
          )}

          <button
            onClick={() => generate(false)}
            disabled={loading}
            className="btn-brand-pill px-5 py-2.5 text-xs inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            <span>{result ? 'Regenerate tests' : 'Generate unit tests'}</span>
          </button>
        </div>
      </section>

      {/* 2. Pipeline Stepper Indicator */}
      <div className="rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE] p-3 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between min-w-[700px] text-xs font-bold">
          {pipelineSteps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                    step.done
                      ? 'bg-[#248A46] text-white'
                      : 'bg-[#D8CFC2] text-[#6B645A]'
                  }`}
                >
                  {step.done ? '✓' : idx + 1}
                </div>
                <span className={step.done ? 'text-[#181715] font-extrabold' : 'text-[#8C8275]'}>
                  {step.label}
                </span>
              </div>
              {idx < pipelineSteps.length - 1 && (
                <ChevronRight className="h-4 w-4 text-[#C8BEB0] shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 3. Progress & Error indicators */}
      {loading && (
        <div className="rounded-2xl border border-[#C7C4F7] bg-[#EAE9FB]/70 p-4 shadow-xs">
          <div className="mb-2 flex justify-between text-xs font-bold text-[#4340A0]">
            <span>Running test generation & safe sandbox execution pipeline...</span>
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
        <div className="flex items-center gap-2.5 rounded-2xl border border-[#ECC7C3] bg-[#F6E5E2] p-4 text-xs font-bold text-[#8F3F3A]">
          <XCircle className="h-4 w-4 text-[#C45F58] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 4. Empty State */}
      {!result && !loading && (
        <EmptyState
          icon={ShieldCheck}
          iconVariant="signal"
          headline="Ready to generate & execute unit tests"
          description="CodeOracle constructs syntax-validated pytest or Vitest suites based on AST symbol definitions, with safe subprocess isolation."
          actionText="Generate Unit Tests"
          onAction={() => generate(false)}
          trustCopy="For safety, uploaded untrusted code is executed inside isolated subprocess sandboxes without host system access."
        />
      )}

      {/* 5. Results View */}
      {result && (
        <>
          {/* Summary Stats Grid */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Total test cases" value={String(result.total_generated_tests)} />

            <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                Passed
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-[#248A46]" />
                <span className="text-2xl font-black text-[#248A46]">
                  {result.passed_test_count}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
                {result.execution_enabled ? 'Executed in sandbox' : 'Pending run'}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                Failed / Errors
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-[#C45F58]" />
                <span className="text-2xl font-black text-[#C45F58]">
                  {result.failed_test_count}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
                Syntax valid: {result.syntax_valid_count}/{result.test_files.length}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                Execution Time
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <Clock className="h-5 w-5 text-[#C7953D]" />
                <span className="text-2xl font-black text-[#181715]">
                  {result.execution_duration_ms > 0
                    ? `${(result.execution_duration_ms / 1000).toFixed(1)}s`
                    : result.execution_enabled
                    ? '<0.1s'
                    : 'Locked'}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
                {result.execution_enabled ? 'Subprocess Sandbox' : 'Host Protection'}
              </div>
            </div>

            <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                Line Coverage
              </div>
              <div className="mt-1.5 flex items-baseline gap-1">
                <span
                  className={`text-2xl font-black ${
                    coverage != null && coverage >= 60 ? 'text-[#248A46]' : 'text-[#4C4FD6]'
                  }`}
                >
                  {coverage == null ? 'Unavailable' : `${coverage.toFixed(1)}%`}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-semibold text-[#8C8275]">
                Target: &gt;60.0%
              </div>
            </div>
          </div>

          {/* Sandbox Execution Status Warning / Policy Notice */}
          <div
            className={`rounded-2xl border p-4 text-xs font-semibold leading-5 flex items-center justify-between gap-3 ${
              result.execution_enabled
                ? 'border-[#BEE0D6] bg-[#E0EFEB] text-[#245F59]'
                : 'border-[#E6D3A9] bg-[#F5E8CC] text-[#76561B]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {result.execution_enabled ? (
                <ShieldCheck className="h-5 w-5 text-[#248A46] shrink-0" />
              ) : (
                <Lock className="h-5 w-5 text-[#C7953D] shrink-0" />
              )}
              <div>
                <span className="font-extrabold">
                  {result.execution_enabled
                    ? 'Isolated Subprocess Sandbox Active'
                    : 'Host Safety Lock Active'}
                </span>
                <p className="mt-0.5 text-[11px]">
                  {result.execution_warning ||
                    (result.execution_enabled
                      ? 'Tests executed in isolated subprocess with secrets redacted.'
                      : 'Untrusted repository code remains safely unexecuted on host machine. Click "Run Tests in Sandbox" to trigger isolated evaluation.')}
                </p>
              </div>
            </div>

            {result.failed_test_count > 0 && (
              <button
                onClick={() => generate(true)}
                disabled={loading}
                className="shrink-0 flex items-center gap-1.5 rounded-xl bg-[#8F3F3A] px-3.5 py-1.5 text-xs font-extrabold text-white hover:bg-[#A84A45] transition-colors"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Rerun Failed Tests</span>
              </button>
            )}
          </div>

          {/* 6. Filter Controls & Test File Explorer */}
          <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-4 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[#EAE3D6] pb-3">
              {/* Search input */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#6B645A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter test files by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F7F4EE] border border-[#D8CFC2] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#292622] placeholder-[#6B645A] focus:outline-none focus:border-[#4C4FD6]"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 border border-[#D8CFC2] bg-[#F7F4EE] rounded-full p-1 text-xs">
                {(['all', 'passed', 'failed', 'locked'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1 rounded-full uppercase text-[10px] font-black transition-all ${
                      statusFilter === filter
                        ? 'bg-[#181715] text-white shadow-xs'
                        : 'text-[#6B645A] hover:text-[#181715]'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Test files sidebar & Code / Output / Coverage Split Preview */}
            <div className="grid min-h-[460px] gap-4 lg:grid-cols-[280px_1fr]">
              {/* Left File List */}
              <aside className="rounded-[20px] border border-[#D8CFC2] bg-[#F7F4EE]/60 p-3 max-h-[560px] overflow-y-auto">
                <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A] flex justify-between">
                  <span>Test Files ({filteredFiles.length})</span>
                  <span>Framework</span>
                </p>
                {filteredFiles.map((item, index) => {
                  const isSelected = selectedFile?.test_id === item.test_id;
                  const isPassed = item.execution_status === 'passed';
                  const isFailed = item.execution_status === 'failed';

                  return (
                    <button
                      key={item.test_id}
                      onClick={() => setSelectedIndex(index)}
                      className={`mb-2 w-full rounded-xl p-3 text-left transition-all ${
                        isSelected
                          ? 'bg-[#FFFDFC] text-[#181715] font-bold shadow-sm ring-2 ring-[#4C4FD6]'
                          : 'text-[#4D4842] hover:bg-[#FFFDFC]/80'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                        <div className="flex items-center gap-2 truncate">
                          {isPassed ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#248A46]" />
                          ) : isFailed ? (
                            <XCircle className="h-4 w-4 shrink-0 text-[#C45F58]" />
                          ) : (
                            <FileCode2 className="h-4 w-4 shrink-0 text-[#4C4FD6]" />
                          )}
                          <span className="truncate" title={item.safe_test_path}>
                            {item.safe_test_path}
                          </span>
                        </div>
                        <span className="rounded-md bg-[#EAE9FB] px-1.5 py-0.5 font-mono text-[9px] uppercase font-bold text-[#4340A0]">
                          {item.framework}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-[#6B645A]">
                        <span>{item.test_count} test cases</span>
                        {item.line_coverage != null && (
                          <span className="font-extrabold text-[#248A46]">
                            {item.line_coverage.toFixed(0)}% cov
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </aside>

              {/* Right Code & Stack Trace Viewer */}
              <section className="overflow-hidden rounded-[20px] border-2 border-[#181715] bg-[#1C1A17] shadow-md flex flex-col justify-between">
                {selectedFile && (
                  <>
                    <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#3B3733] bg-[#181715] px-4 py-3 text-white gap-2">
                      <div>
                        <p className="text-xs font-bold text-indigo-300 font-mono">
                          {selectedFile.safe_test_path}
                        </p>
                        <p className="text-[10px] text-[#A3998E]">
                          Targets: {selectedFile.target_relative_path}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Sub-tab selection */}
                        <div className="flex items-center rounded-lg bg-[#2A2724] p-1 text-xs">
                          <button
                            onClick={() => setActiveRightTab('code')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${
                              activeRightTab === 'code' ? 'bg-[#4C4FD6] text-white' : 'text-[#A3998E]'
                            }`}
                          >
                            <Code2 className="h-3 w-3" />
                            <span>Code</span>
                          </button>

                          <button
                            onClick={() => setActiveRightTab('output')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${
                              activeRightTab === 'output' ? 'bg-[#4C4FD6] text-white' : 'text-[#A3998E]'
                            }`}
                          >
                            <Terminal className="h-3 w-3" />
                            <span>Stack Trace / Output</span>
                          </button>

                          <button
                            onClick={() => setActiveRightTab('coverage')}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-extrabold transition-colors ${
                              activeRightTab === 'coverage' ? 'bg-[#4C4FD6] text-white' : 'text-[#A3998E]'
                            }`}
                          >
                            <Activity className="h-3 w-3" />
                            <span>Coverage</span>
                          </button>
                        </div>

                        <button
                          onClick={() => navigator.clipboard.writeText(selectedFile.code)}
                          className="px-3 py-1 text-[10px] font-bold rounded-full bg-[#383BA8] text-white hover:bg-[#4C4FD6] transition-colors border border-indigo-400/30 inline-flex items-center gap-1"
                        >
                          <Clipboard className="h-3 w-3" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </header>

                    {/* Tab 1: Code View */}
                    {activeRightTab === 'code' && (
                      <pre className="max-h-[500px] overflow-auto p-4 text-xs font-mono leading-6 text-[#F3F0EB] bg-[#1C1A17] flex-1">
                        <code>{selectedFile.code}</code>
                      </pre>
                    )}

                    {/* Tab 2: Stack Trace / Output Log View */}
                    {activeRightTab === 'output' && (
                      <div className="p-4 bg-[#141311] max-h-[500px] overflow-auto font-mono text-xs text-[#E5DFD5] space-y-3 flex-1">
                        <div className="flex items-center justify-between border-b border-[#2D2A26] pb-2 text-[10px] font-bold text-[#A3998E]">
                          <span>Execution Terminal Log</span>
                          <span>Status: {selectedFile.execution_status.toUpperCase()}</span>
                        </div>
                        {selectedFile.execution_output ? (
                          <pre className="whitespace-pre-wrap text-[11px] text-[#8B8DF2] leading-5">
                            {selectedFile.execution_output}
                          </pre>
                        ) : (
                          <div className="py-12 text-center text-[#7C756B]">
                            No terminal execution output available. Click "Run Tests in Sandbox" to trigger execution.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 3: Per-file Coverage View */}
                    {activeRightTab === 'coverage' && (
                      <div className="p-5 bg-[#1C1A17] max-h-[500px] overflow-auto text-xs text-[#E5DFD5] space-y-4 flex-1">
                        <div className="flex items-center justify-between border-b border-[#3B3733] pb-3">
                          <span className="font-extrabold text-sm text-white">
                            Coverage Details for {selectedFile.target_relative_path}
                          </span>
                          <span className="font-mono font-black text-emerald-400 text-sm">
                            {selectedFile.line_coverage != null
                              ? `${selectedFile.line_coverage.toFixed(1)}%`
                              : 'N/A'}
                          </span>
                        </div>

                        {selectedFile.uncovered_lines && selectedFile.uncovered_lines.length > 0 && (
                          <div>
                            <span className="text-[10px] font-extrabold uppercase text-[#A3998E] block mb-1">
                              Uncovered Line Numbers:
                            </span>
                            <div className="flex flex-wrap gap-1 font-mono text-xs text-[#E3B0A9]">
                              {selectedFile.uncovered_lines.map((ln) => (
                                <span key={ln} className="rounded bg-[#382020] px-1.5 py-0.5 border border-[#5C2B2B]">
                                  L{ln}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default GeneratedTestsTab;

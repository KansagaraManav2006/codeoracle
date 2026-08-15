import React, { useCallback, useEffect, useState } from 'react';
import { Clipboard, Download, FileCode2, Loader2, Play, ShieldCheck, TestTube2, XCircle } from 'lucide-react';
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

export const GeneratedTestsTab: React.FC<Props> = ({
  projectId,
  trustedDemo = false,
  onTestsUpdated,
  onStatusChange,
}) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
  const [selected, setSelected] = useState(0);
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

  return (
    <div className="space-y-5">
      {/* Action Header */}
      <section className="flex flex-col gap-4 rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 md:flex-row md:items-center md:justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#F5E8CC] text-[#C7953D] rounded-2xl border border-[#E6D3A9]">
            <TestTube2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#292622]">Generated Unit Tests</h2>
            <p className="mt-0.5 text-xs text-[#6B645A]">
              Review-ready pytest and Vitest files generated from static code structure.
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
            <span>Generating and validating tests...</span>
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
          description="CodeOracle constructs syntax-validated pytest or Vitest suites based on symbol definitions and call paths."
          actionText="Generate Unit Tests"
          onAction={generate}
          trustCopy="For safety, uploaded code is not run. Generated files are checked for valid syntax and can be downloaded for review."
        />
      )}

      {/* Results View */}
      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Test cases" value={String(result.total_generated_tests)} />
            <StatCard
              label="Valid test files"
              value={`${result.syntax_valid_count}/${result.test_files.length}`}
            />
            <StatCard
              label="Test run"
              value={result.execution_enabled ? `${result.passed_test_count} passed` : 'Safety locked'}
            />
            <StatCard
              label="Measured coverage"
              value={coverage == null ? 'Unavailable' : `${coverage.toFixed(1)}%`}
              accentColor={coverage != null && coverage >= 60 ? '#368A80' : undefined}
            />
          </div>

          <div
            className={`rounded-2xl border p-4 text-xs font-semibold leading-5 ${
              coverage == null
                ? 'border-[#E6D3A9] bg-[#F5E8CC] text-[#76561B]'
                : coverage >= 60
                ? 'border-[#BEE0D6] bg-[#E0EFEB] text-[#245F59]'
                : 'border-[#ECC7C3] bg-[#F6E5E2] text-[#8F3F3A]'
            }`}
          >
            {coverage == null
              ? 'Coverage is shown only when tests run in the trusted built-in demo. Public repository code remains safely unexecuted.'
              : coverage >= 60
              ? 'Measured coverage exceeds the 60% target.'
              : 'Measured coverage is below the 60% target.'}
          </div>

          {/* Test files sidebar & Code Preview */}
          <div className="grid min-h-[430px] gap-4 lg:grid-cols-[260px_1fr]">
            <aside className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-3 shadow-xs">
              <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                Generated files
              </p>
              {result.test_files.map((item, index) => (
                <button
                  key={item.test_id}
                  onClick={() => setSelected(index)}
                  className={`mb-1.5 w-full rounded-xl p-3 text-left transition-all ${
                    selected === index
                      ? 'bg-[#EAE9FB] text-[#4340A0] font-bold shadow-xs'
                      : 'text-[#4D4842] hover:bg-[#F0EBE2]'
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <FileCode2 className="h-4 w-4 shrink-0 text-[#4C4FD6]" />
                    <span className="break-all">{item.safe_test_path}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-[#6B645A]">
                    {item.test_count} cases | {item.framework}
                  </div>
                </button>
              ))}
            </aside>

            <section className="overflow-hidden rounded-[20px] border-2 border-[#181715] bg-[#1C1A17] shadow-md">
              {file && (
                <>
                  <header className="flex items-center justify-between border-b border-[#3B3733] bg-[#181715] px-4 py-3 text-white">
                    <div>
                      <p className="text-xs font-bold text-indigo-300">{file.safe_test_path}</p>
                      <p className="text-[10px] text-[#A3998E]">Targets {file.target_relative_path}</p>
                    </div>
                    <button
                      onClick={() => navigator.clipboard.writeText(file.code)}
                      className="px-3 py-1 text-[10px] font-bold rounded-full bg-[#383BA8] text-white hover:bg-[#4C4FD6] transition-colors border border-indigo-400/30 inline-flex items-center gap-1"
                    >
                      <Clipboard className="h-3 w-3" />
                      <span>Copy Code</span>
                    </button>
                  </header>
                  <pre className="max-h-[520px] overflow-auto p-4 text-xs font-mono leading-6 text-[#F3F0EB] bg-[#1C1A17]">
                    <code>{file.code}</code>
                  </pre>
                </>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default GeneratedTestsTab;

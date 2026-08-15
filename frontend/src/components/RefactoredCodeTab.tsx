import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Download, FileDiff, Loader2, ShieldAlert, Wand2, XCircle } from 'lucide-react';
import { ProjectRefactorResult } from '../types';
import { cleanText, warningTitle } from '../utils/presentation';
import EmptyState from './common/EmptyState';
import StatCard from './common/StatCard';

interface Props {
  projectId?: string | null;
}

type ViewMode = 'diff' | 'original' | 'modernized';

const errorMessage = async (response: Response) => {
  try {
    const body = await response.json();
    return body.detail || `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export const RefactoredCodeTab: React.FC<Props> = ({ projectId }) => {
  const [result, setResult] = useState<ProjectRefactorResult | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [mode, setMode] = useState<ViewMode>('diff');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/refactor`);
    if (response.status === 409) return;
    if (!response.ok) throw new Error(await errorMessage(response));
    const data: ProjectRefactorResult = await response.json();
    setResult(data);
    setSelectedPath(
      (current) =>
        current ||
        data.files.find((file) => file.changed)?.relative_path ||
        data.files[0]?.relative_path ||
        ''
    );
  }, [projectId]);

  useEffect(() => {
    setResult(null);
    setSelectedPath('');
    setError(null);
    load().catch((reason) =>
      setError(reason instanceof Error ? reason.message : 'Unable to load proposal.')
    );
  }, [load]);

  const generate = async () => {
    if (!projectId || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const data: ProjectRefactorResult = await response.json();
      setResult(data);
      setSelectedPath(
        data.files.find((file) => file.changed)?.relative_path || data.files[0]?.relative_path || ''
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Refactor generation failed.');
    } finally {
      setLoading(false);
    }
  };

  const files = useMemo(() => result?.files.filter((file) => file.changed) || [], [result]);
  const selected = files.find((file) => file.relative_path === selectedPath) || files[0];
  const displayedCode = selected
    ? mode === 'diff'
      ? selected.unified_diff
      : mode === 'original'
      ? selected.original_code
      : selected.refactored_code
    : '';

  if (!projectId)
    return (
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center text-sm font-medium text-[#6B645A]">
        Analyze a repository to create a modernization proposal.
      </div>
    );

  return (
    <div className="space-y-5">
      {/* Header Action Strip */}
      <section className="flex flex-col gap-4 rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-5 md:flex-row md:items-center md:justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#E0EFEB] text-[#368A80] rounded-2xl border border-[#BEE0D6]">
            <Wand2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-[#292622]">Modernization Proposal</h2>
            <p className="mt-0.5 text-xs text-[#6B645A]">
              Suggested updates shown as reviewable before-and-after changes.
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {result && (
            <a
              href={`/api/projects/${projectId}/refactor/download`}
              className="btn-brand-outline-pill px-4 py-2 text-xs inline-flex items-center gap-1.5"
            >
              <Download className="h-4 w-4" />
              <span>Download proposal</span>
            </a>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="btn-brand-pill px-5 py-2.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            <span>{result ? 'Regenerate' : 'Generate proposal'}</span>
          </button>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#ECC7C3] bg-[#F6E5E2] p-4 text-xs font-bold text-[#8F3F3A]">
          <XCircle className="h-4 w-4 text-[#C45F58] shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-3 rounded-2xl border border-[#C7C4F7] bg-[#EAE9FB]/70 p-4 text-xs font-bold text-[#4340A0]">
          <Loader2 className="h-4 w-4 animate-spin text-[#4C4FD6]" />
          <span>Analyzing safe modernization opportunities...</span>
        </div>
      )}

      {/* Shared Empty State */}
      {!result && !loading && (
        <EmptyState
          icon={ShieldAlert}
          iconVariant="success"
          headline="Source code stays untouched"
          description="CodeOracle constructs a separate refactor proposal to modernize legacy patterns without mutating original files."
          actionText="Generate Refactor Proposal"
          onAction={generate}
          trustCopy="Nothing is written back to the uploaded repository. All proposed changes can be downloaded as a reviewable diff."
        />
      )}

      {/* Result Metrics & Proposal Viewer */}
      {result && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Files reviewed" value={String(result.analyzed_files)} />
            <StatCard label="Files with suggestions" value={String(result.changed_files)} />
            <StatCard label="Suggested updates" value={String(result.total_changes)} />
            <StatCard
              label="Breaking-change risks"
              value={String(result.breaking_warning_count)}
              signalAmber={result.breaking_warning_count > 0}
            />
          </div>

          <div className="rounded-2xl border border-[#E6D3A9] bg-[#F5E8CC] p-4 text-xs leading-5 text-[#76561B]">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#C7953D]" />
              <div>
                <p className="font-extrabold text-[#292622]">Human review required</p>
                <p className="mt-0.5 font-medium">{result.summary}</p>
              </div>
            </div>
          </div>

          {files.length === 0 ? (
            <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center shadow-xs">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-[#368A80]" />
              <h3 className="text-base font-bold text-[#292622]">No safe automatic updates found</h3>
              <p className="mt-1 text-xs text-[#6B645A]">
                The original code was left unchanged because no reliable modernization rule applied.
              </p>
            </div>
          ) : (
            <div className="grid min-h-[480px] gap-4 lg:grid-cols-[280px_1fr]">
              <aside className="rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-3 shadow-xs">
                <p className="mb-2 px-2 text-[10px] font-extrabold uppercase tracking-wider text-[#6B645A]">
                  Files with suggestions
                </p>
                {files.map((file) => (
                  <button
                    key={file.relative_path}
                    onClick={() => setSelectedPath(file.relative_path)}
                    className={`mb-1.5 w-full rounded-xl p-3 text-left transition-all ${
                      selected?.relative_path === file.relative_path
                        ? 'bg-[#EAE9FB] text-[#4340A0] font-bold shadow-xs'
                        : 'text-[#4D4842] hover:bg-[#F0EBE2]'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <FileDiff className="h-4 w-4 shrink-0 text-[#4C4FD6]" />
                      <span className="truncate">{file.relative_path}</span>
                    </div>
                    <div className="mt-1 text-[10px] text-[#6B645A]">
                      {file.changes.length} updates | {file.warnings.length} notes
                    </div>
                  </button>
                ))}
              </aside>

              <section className="overflow-hidden rounded-[20px] border-2 border-[#181715] bg-[#1C1A17] shadow-md">
                {selected && (
                  <>
                    <header className="flex flex-col gap-3 border-b border-[#3B3733] bg-[#181715] px-4 py-3 sm:flex-row sm:items-center sm:justify-between text-white">
                      <div>
                        <p className="break-all text-xs font-extrabold text-indigo-300">
                          {selected.relative_path}
                        </p>
                        <p
                          className={`text-[10px] font-bold ${
                            selected.syntax_valid ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {selected.syntax_valid
                            ? 'Syntax check passed'
                            : selected.syntax_error}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <div className="inline-flex rounded-full border border-[#3B3733] bg-[#2D2A26] p-0.5">
                          {(['diff', 'original', 'modernized'] as ViewMode[]).map((item) => (
                            <button
                              key={item}
                              onClick={() => setMode(item)}
                              className={`rounded-full px-3 py-1 text-[10px] capitalize font-extrabold transition-all ${
                                mode === item
                                  ? 'bg-[#4C4FD6] text-white shadow-xs'
                                  : 'text-[#A3998E] hover:text-white'
                              }`}
                            >
                              {item}
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={() => navigator.clipboard.writeText(displayedCode)}
                          className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-[#383BA8] text-white hover:bg-[#4C4FD6] transition-colors border border-indigo-400/30 inline-flex items-center gap-1"
                          title="Copy code"
                        >
                          <Clipboard className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </header>

                    {selected.warnings.length > 0 && (
                      <div className="border-b border-[#3B3733] bg-[#76561B]/40 p-3 text-amber-200">
                        {selected.warnings.map((warning, index) => (
                          <div
                            key={`${warning.code}-${index}`}
                            className="mb-1 flex gap-2 text-[10px] font-semibold text-amber-300"
                          >
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
                            <span>
                              <strong>{warningTitle(warning.code)}</strong>: {cleanText(warning.message)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    <pre className="max-h-[560px] overflow-auto p-4 text-xs font-mono leading-6 text-[#F3F0EB] bg-[#1C1A17]">
                      <code>{displayedCode}</code>
                    </pre>
                  </>
                )}
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RefactoredCodeTab;

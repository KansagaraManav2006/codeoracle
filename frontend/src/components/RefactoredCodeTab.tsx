import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clipboard, Download, FileDiff, Loader2, ShieldAlert, Wand2, XCircle } from 'lucide-react';
import { ProjectRefactorResult } from '../types';

interface Props { projectId?: string | null }
type ViewMode = 'diff' | 'original' | 'modernized';

const errorMessage = async (response: Response) => {
  try { const body = await response.json(); return body.detail || `Request failed (${response.status})`; }
  catch { return `Request failed (${response.status})`; }
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
    setSelectedPath((current) => current || data.files.find((file) => file.changed)?.relative_path || data.files[0]?.relative_path || '');
  }, [projectId]);

  useEffect(() => {
    setResult(null); setSelectedPath(''); setError(null);
    load().catch((reason) => setError(reason instanceof Error ? reason.message : 'Unable to load proposal.'));
  }, [load]);

  const generate = async () => {
    if (!projectId || loading) return;
    setLoading(true); setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ force: true }),
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const data: ProjectRefactorResult = await response.json();
      setResult(data);
      setSelectedPath(data.files.find((file) => file.changed)?.relative_path || data.files[0]?.relative_path || '');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Refactor generation failed.'); }
    finally { setLoading(false); }
  };

  const files = useMemo(() => result?.files.filter((file) => file.changed) || [], [result]);
  const selected = files.find((file) => file.relative_path === selectedPath) || files[0];
  const displayedCode = selected ? (mode === 'diff' ? selected.unified_diff : mode === 'original' ? selected.original_code : selected.refactored_code) : '';

  if (!projectId) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Analyze a repository to create a modernization proposal.</div>;

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
        <div><div className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-indigo-400"/><h2 className="font-semibold text-white">Safe modernization proposal</h2></div><p className="mt-1 text-xs text-slate-400">Reviewable transformations with syntax checks, diffs, and breaking-change warnings.</p></div>
        <div className="flex gap-2">
          {result && <a href={`/api/projects/${projectId}/refactor/download`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800"><Download className="h-4 w-4"/>Download proposal</a>}
          <button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Wand2 className="h-4 w-4"/>}{result ? 'Regenerate' : 'Generate proposal'}</button>
        </div>
      </section>

      {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300"><XCircle className="h-4 w-4"/>{error}</div>}
      {loading && <div className="flex items-center gap-3 rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 text-xs text-indigo-200"><Loader2 className="h-4 w-4 animate-spin"/>Analyzing safe modernization opportunities...</div>}
      {!result && !loading && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-12 text-center"><ShieldAlert className="mx-auto mb-3 h-9 w-9 text-amber-400"/><h3 className="font-medium text-white">Source code stays untouched</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-400">CodeOracle creates a separate proposal. Nothing is written back to the uploaded repository.</p></div>}

      {result && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Files analyzed" value={String(result.analyzed_files)}/><Metric label="Files changed" value={String(result.changed_files)}/><Metric label="Rule groups" value={String(result.total_changes)}/><Metric label="Breaking warnings" value={String(result.breaking_warning_count)} warning={result.breaking_warning_count > 0}/></div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100"><div className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/><div><p className="font-semibold">Human review required</p><p>{result.summary}</p></div></div></div>
        {files.length === 0 ? <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center"><CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-emerald-400"/><h3 className="font-medium text-white">No safe deterministic changes found</h3><p className="mt-2 text-xs text-slate-400">The engine deliberately avoided speculative rewrites.</p></div> :
        <div className="grid min-h-[480px] gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border border-slate-800 bg-slate-900 p-3"><p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Changed files</p>{files.map((file) => <button key={file.relative_path} onClick={() => setSelectedPath(file.relative_path)} className={`mb-1 w-full rounded-lg p-3 text-left ${selected?.relative_path===file.relative_path?'bg-indigo-600/20 text-indigo-200':'text-slate-400 hover:bg-slate-800'}`}><div className="flex items-center gap-2 text-xs font-medium"><FileDiff className="h-4 w-4"/><span className="truncate">{file.relative_path}</span></div><div className="mt-1 text-[10px]">{file.changes.length} rule groups · {file.warnings.length} warnings</div></button>)}</aside>
          {selected && <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"><header className="flex flex-col gap-3 border-b border-slate-800 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-medium text-white">{selected.relative_path}</p><p className={`text-[10px] ${selected.syntax_valid?'text-emerald-400':'text-red-400'}`}>{selected.syntax_valid ? 'Static syntax check passed' : selected.syntax_error}</p></div><div className="flex gap-1">{(['diff','original','modernized'] as ViewMode[]).map((item) => <button key={item} onClick={() => setMode(item)} className={`rounded px-2 py-1 text-[10px] capitalize ${mode===item?'bg-indigo-600 text-white':'border border-slate-700 text-slate-400'}`}>{item}</button>)}<button onClick={() => navigator.clipboard.writeText(displayedCode)} className="ml-1 rounded border border-slate-700 p-1.5 text-slate-300" title="Copy"><Clipboard className="h-3 w-3"/></button></div></header>
            <div className="border-b border-slate-800 bg-slate-900/60 p-3">{selected.warnings.map((warning) => <div key={warning.code} className={`mb-1 flex gap-2 text-[10px] ${warning.breaking_change?'text-amber-300':'text-slate-400'}`}><AlertTriangle className="h-3 w-3 shrink-0"/><span><strong>{warning.code}</strong>: {warning.message}</span></div>)}</div>
            <pre className="max-h-[560px] overflow-auto p-4 text-xs leading-5 text-slate-300"><code>{displayedCode}</code></pre></section>}
        </div>}
      </>}
    </div>
  );
};

const Metric: React.FC<{label:string;value:string;warning?:boolean}> = ({label,value,warning}) => <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-1 text-lg font-bold ${warning?'text-amber-400':'text-white'}`}>{value}</p></div>;

export default RefactoredCodeTab;

import React, { useCallback, useEffect, useState } from 'react';
import { Clipboard, Download, FileCode2, Loader2, Play, ShieldCheck, TestTube2, XCircle } from 'lucide-react';
import { JobResponse, ProjectTestResult } from '../types';

interface Props { projectId?: string | null; trustedDemo?: boolean }

const messageFrom = async (response: Response) => {
  try {
    const body = await response.json();
    return typeof body.detail === 'string' ? body.detail : body.detail?.message || `Request failed (${response.status})`;
  } catch { return `Request failed (${response.status})`; }
};

export const GeneratedTestsTab: React.FC<Props> = ({ projectId, trustedDemo = false }) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const loadResult = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/projects/${projectId}/tests`);
    if (response.status === 409) return;
    if (!response.ok) throw new Error(await messageFrom(response));
    setResult(await response.json());
  }, [projectId]);

  useEffect(() => {
    setResult(null); setSelected(0); setError(null);
    loadResult().catch((err) => setError(err.message));
  }, [loadResult]);

  const generate = async () => {
    if (!projectId || loading) return;
    setLoading(true); setError(null); setProgress(5);
    try {
      const response = await fetch(`/api/projects/${projectId}/tests/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true, execute: trustedDemo }),
      });
      if (!response.ok) throw new Error(await messageFrom(response));
      const job: JobResponse = await response.json();
      for (let attempt = 0; attempt < 60; attempt += 1) {
        const statusResponse = await fetch(job.polling_url);
        if (!statusResponse.ok) throw new Error(await messageFrom(statusResponse));
        const status: JobResponse = await statusResponse.json();
        setProgress(status.progress_percentage);
        if (status.state === 'completed') { await loadResult(); return; }
        if (status.state === 'failed') throw new Error(status.error_message || 'Test generation failed.');
        await new Promise((resolve) => setTimeout(resolve, 700));
      }
      throw new Error('Test generation timed out.');
    } catch (err) { setError(err instanceof Error ? err.message : 'Test generation failed.'); }
    finally { setLoading(false); }
  };

  if (!projectId) return <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center text-sm text-slate-400">Analyze a repository to generate tests.</div>;

  const file = result?.test_files[selected];
  const coverage = result?.overall_line_coverage;

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2"><TestTube2 className="h-5 w-5 text-indigo-400"/><h2 className="font-semibold text-white">Generated unit tests</h2></div>
          <p className="mt-1 text-xs text-slate-400">Deterministic pytest and Vitest suites, grounded in static analysis.</p>
        </div>
        <div className="flex gap-2">
          {result && <a href={`/api/projects/${projectId}/tests/download`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800"><Download className="h-4 w-4"/>Download ZIP</a>}
          <button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}{result ? 'Regenerate tests' : 'Generate tests'}
          </button>
        </div>
      </section>

      {loading && <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4"><div className="mb-2 flex justify-between text-xs text-indigo-200"><span>Generating and validating tests…</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-indigo-500 transition-all" style={{width:`${progress}%`}}/></div></div>}
      {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300"><XCircle className="h-4 w-4"/>{error}</div>}

      {!result && !loading && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-12 text-center"><ShieldCheck className="mx-auto mb-3 h-9 w-9 text-emerald-400"/><h3 className="font-medium text-white">Ready to generate safe test proposals</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-400">Tests are syntax-checked but uploaded code is not executed. Coverage appears only after real execution on a trusted benchmark.</p></div>}

      {result && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Test cases" value={String(result.total_generated_tests)}/>
          <Metric label="Syntax-valid files" value={`${result.syntax_valid_count}/${result.test_files.length}`}/>
          <Metric label="Execution" value={result.execution_enabled ? `${result.passed_test_count} passed` : 'Not executed'}/>
          <Metric label="Measured coverage" value={coverage == null ? 'Unavailable' : `${coverage.toFixed(1)}%`} accent={coverage != null && coverage >= 60}/>
        </div>
        <div className={`rounded-xl border p-4 text-xs ${coverage == null ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : coverage >= 60 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-orange-500/20 bg-orange-500/10 text-orange-200'}`}>
          {coverage == null ? 'Tests were generated and syntax-checked, but not executed. Coverage is unavailable.' : coverage >= 60 ? 'Measured coverage exceeds the 60% target.' : 'Measured coverage is below the 60% target.'}
        </div>
        <div className="grid min-h-[430px] gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Generated files</p>
            {result.test_files.map((item, index) => <button key={item.test_id} onClick={() => setSelected(index)} className={`mb-1 w-full rounded-lg p-3 text-left ${selected===index?'bg-indigo-600/20 text-indigo-200':'text-slate-400 hover:bg-slate-800'}`}><div className="flex items-center gap-2 text-xs font-medium"><FileCode2 className="h-4 w-4"/>{item.safe_test_path}</div><div className="mt-1 text-[10px]">{item.test_count} cases · {item.framework}</div></button>)}
          </aside>
          <section className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950">
            {file && <><header className="flex items-center justify-between border-b border-slate-800 px-4 py-3"><div><p className="text-xs font-medium text-white">{file.safe_test_path}</p><p className="text-[10px] text-slate-500">Targets {file.target_relative_path}</p></div><button onClick={() => navigator.clipboard.writeText(file.code)} className="inline-flex items-center gap-1 rounded border border-slate-700 px-2 py-1 text-[10px] text-slate-300"><Clipboard className="h-3 w-3"/>Copy</button></header><pre className="max-h-[520px] overflow-auto p-4 text-xs leading-5 text-slate-300"><code>{file.code}</code></pre></>}
          </section>
        </div>
      </>}
    </div>
  );
};

const Metric: React.FC<{label:string;value:string;accent?:boolean}> = ({label,value,accent}) => <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-1 text-lg font-bold ${accent?'text-emerald-400':'text-white'}`}>{value}</p></div>;

export default GeneratedTestsTab;

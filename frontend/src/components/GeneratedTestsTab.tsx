import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clipboard, Download, FileCode2, Loader2, Play, Search, ShieldCheck, Target, TestTube2, XCircle } from 'lucide-react';
import { JobResponse, ProjectTestResult } from '../types';

interface Props { projectId?: string | null; trustedDemo?: boolean; onGenerated?: () => void }

const messageFrom = async (response: Response) => {
  try {
    const body = await response.json();
    return typeof body.detail === 'string' ? body.detail : body.detail?.message || `Request failed (${response.status})`;
  } catch { return `Request failed (${response.status})`; }
};

export const GeneratedTestsTab: React.FC<Props> = ({ projectId, trustedDemo = false, onGenerated }) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
  const [selected, setSelected] = useState(0);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileSearch, setFileSearch] = useState('');
  const [gapsOnly, setGapsOnly] = useState(false);

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
        if (status.state === 'completed') { await loadResult(); onGenerated?.(); return; }
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
  const coverageGaps = useMemo(() => (result?.test_files || [])
    .filter((item) => item.line_coverage == null || item.line_coverage < 80 || item.uncovered_lines.length > 0)
    .sort((a, b) => (a.line_coverage ?? -1) - (b.line_coverage ?? -1)), [result]);
  const visibleFiles = useMemo(() => (result?.test_files || []).map((item, index) => ({ item, index })).filter(({ item }) => {
    const matchesSearch = item.safe_test_path.toLowerCase().includes(fileSearch.toLowerCase()) || item.target_relative_path.toLowerCase().includes(fileSearch.toLowerCase());
    const hasGap = item.line_coverage == null || item.line_coverage < 80 || item.uncovered_lines.length > 0;
    return matchesSearch && (!gapsOnly || hasGap);
  }), [result, fileSearch, gapsOnly]);

  return (
    <div className="space-y-4">
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2"><TestTube2 className="h-5 w-5 text-indigo-400"/><h2 className="font-semibold text-white">Generated unit tests</h2></div>
          <p className="mt-1 text-xs text-slate-400">Review-ready pytest and Vitest files generated from the code structure.</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {result && <a href={`/api/projects/${projectId}/tests/download`} className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-xs text-slate-200 hover:bg-slate-800"><Download className="h-4 w-4"/>Download ZIP</a>}
          <button onClick={generate} disabled={loading} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60">
            {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Play className="h-4 w-4"/>}{result ? 'Regenerate tests' : 'Generate tests'}
          </button>
        </div>
      </section>

      {loading && <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4"><div className="mb-2 flex justify-between text-xs text-indigo-200"><span>Generating and validating tests...</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded bg-slate-800"><div className="h-full bg-indigo-500 transition-all" style={{width:`${progress}%`}}/></div></div>}
      {error && <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300"><XCircle className="h-4 w-4"/>{error}</div>}

      {!result && !loading && <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-8 text-center sm:p-12"><ShieldCheck className="mx-auto mb-3 h-9 w-9 text-emerald-400"/><h3 className="font-medium text-white">Ready to generate unit tests</h3><p className="mx-auto mt-2 max-w-lg text-xs leading-5 text-slate-400">For safety, uploaded code is not run. Generated files are checked for valid syntax and can be downloaded for review.</p></div>}

      {result && <>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Test cases" value={String(result.total_generated_tests)}/>
          <Metric label="Valid test files" value={`${result.syntax_valid_count}/${result.test_files.length}`}/>
          <Metric label="Test run" value={result.execution_enabled ? `${result.passed_test_count} passed` : 'Safety locked'}/>
          <Metric label="Measured coverage" value={coverage == null ? 'Unavailable' : `${coverage.toFixed(1)}%`} accent={coverage != null && coverage >= 60}/>
        </div>
        <div className={`rounded-xl border p-4 text-xs ${coverage == null ? 'border-amber-500/20 bg-amber-500/10 text-amber-200' : coverage >= 60 ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-orange-500/20 bg-orange-500/10 text-orange-200'}`}>
          {coverage == null ? 'Coverage is shown only when tests run in the trusted built-in demo. Public repository code remains safely unexecuted.' : coverage >= 60 ? 'Measured coverage exceeds the 60% target.' : 'Measured coverage is below the 60% target.'}
        </div>
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-amber-400"/><h3 className="text-sm font-semibold text-white">Coverage Gaps & Recommended Tests</h3><span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-300">{coverageGaps.length} priorities</span></div>
          {coverageGaps.length ? <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{coverageGaps.slice(0, 6).map((gap) => <button type="button" key={gap.test_id} onClick={() => setSelected(result.test_files.findIndex((candidate) => candidate.test_id === gap.test_id))} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left hover:border-amber-500/30"><div className="flex items-start justify-between gap-2"><p className="break-all font-mono text-[10px] text-slate-200">{gap.target_relative_path}</p><span className={`shrink-0 text-[10px] font-bold ${gap.line_coverage == null ? 'text-slate-500' : gap.line_coverage >= 60 ? 'text-amber-300' : 'text-orange-400'}`}>{gap.line_coverage == null ? 'Review' : `${gap.line_coverage.toFixed(1)}%`}</span></div><p className="mt-2 text-[10px] leading-4 text-slate-500">{gap.line_coverage == null ? 'Execution unavailable: review boundary and failure-path cases.' : gap.uncovered_lines.length ? `Add tests around uncovered lines ${gap.uncovered_lines.slice(0, 6).join(', ')}${gap.uncovered_lines.length > 6 ? '…' : ''}.` : 'Add edge cases to raise this file above 80% coverage.'}</p></button>)}</div> : <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300"><ShieldCheck className="h-4 w-4"/>No high-priority coverage gaps were detected.</div>}
          {coverageGaps.length > 6 && <p className="mt-3 text-[10px] text-slate-500">Showing the six lowest-protection files first. Use “Coverage gaps” below to review all {coverageGaps.length}.</p>}
        </section>
        <div className="grid min-h-[430px] gap-4 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-xl border border-slate-800 bg-slate-900 p-3">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Generated files</p>
            <div className="relative mb-2"><Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500"/><input value={fileSearch} onChange={(event) => setFileSearch(event.target.value)} placeholder="Search tests..." className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-8 pr-2 text-[10px] text-slate-200 outline-none focus:border-indigo-500"/></div>
            <button type="button" onClick={() => setGapsOnly((value) => !value)} className={`mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[9px] font-bold uppercase ${gapsOnly ? 'border-amber-500/30 bg-amber-500/10 text-amber-300' : 'border-slate-800 text-slate-500'}`}><AlertTriangle className="h-3 w-3"/>{gapsOnly ? 'Coverage gaps shown' : 'Show coverage gaps'}</button>
            {visibleFiles.map(({item,index}) => <button key={item.test_id} onClick={() => setSelected(index)} className={`mb-1 w-full rounded-lg p-3 text-left ${selected===index?'bg-indigo-600/20 text-indigo-200':'text-slate-400 hover:bg-slate-800'}`}><div className="flex items-center gap-2 text-xs font-medium"><FileCode2 className="h-4 w-4 shrink-0"/><span className="break-all">{item.safe_test_path}</span></div><div className="mt-1 flex justify-between gap-2 text-[10px]"><span>{item.test_count} cases | {item.framework}</span><span>{item.line_coverage == null ? 'not run' : `${item.line_coverage.toFixed(0)}%`}</span></div></button>)}
            {visibleFiles.length === 0 && <p className="p-4 text-center text-[10px] text-slate-600">No generated tests match these filters.</p>}
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

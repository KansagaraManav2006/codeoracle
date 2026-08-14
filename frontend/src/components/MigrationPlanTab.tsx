import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  FileWarning,
  Gauge,
  Loader2,
  Map,
  Network,
  Search,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { ChangeImpact, MigrationPlanResponse } from '../types';

interface Props { projectId?: string | null }

const errorMessage = async (response: Response): Promise<string> => {
  try {
    const body = await response.json();
    return typeof body.detail === 'string' ? body.detail : `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const riskClass = (level: string): string => {
  if (level === 'critical') return 'border-red-500/30 bg-red-500/10 text-red-300';
  if (level === 'high') return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
  if (level === 'medium') return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
  return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
};

const scoreColor = (score: number): string => score >= 80 ? '#34d399' : score >= 60 ? '#818cf8' : score >= 40 ? '#f59e0b' : '#f87171';

export const MigrationPlanTab: React.FC<Props> = ({ projectId }) => {
  const [plan, setPlan] = useState<MigrationPlanResponse | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    setLoading(true);
    setError(null);
    fetch(`/api/projects/${projectId}/migration-plan`)
      .then(async (response) => {
        if (!response.ok) throw new Error(await errorMessage(response));
        return response.json() as Promise<MigrationPlanResponse>;
      })
      .then((data) => {
        if (!active) return;
        setPlan(data);
        setSelectedId(data.top_priorities[0]?.module_id || data.impacts[0]?.module_id || '');
      })
      .catch((reason) => active && setError(reason instanceof Error ? reason.message : 'Unable to create migration plan.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [projectId]);

  const filteredImpacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return plan?.impacts.filter((item) => !query || item.relative_path.toLowerCase().includes(query)) || [];
  }, [plan, search]);
  const selected: ChangeImpact | undefined = plan?.impacts.find((item) => item.module_id === selectedId);

  if (!projectId) return null;
  if (loading) return <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900"><div className="text-center text-sm text-slate-400"><Loader2 className="mx-auto mb-3 h-7 w-7 animate-spin text-indigo-400"/>Building the safest migration path...</div></div>;
  if (error) return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center text-sm text-red-300"><AlertTriangle className="mx-auto mb-3 h-7 w-7"/>{error}</div>;
  if (!plan) return null;

  const color = scoreColor(plan.readiness_score);
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-slate-900 to-indigo-950/30 p-5 shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-indigo-300"><Map className="h-5 w-5"/><h2 className="text-lg font-bold text-white">Modernization Intelligence</h2><span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[9px] font-bold uppercase">Decision Support</span></div>
            <p className="text-sm leading-6 text-slate-300">{plan.executive_summary}</p>
            <a href={`/api/projects/${projectId}/migration-plan/download`} className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-800"><Download className="h-4 w-4"/>Download Executive Report</a>
          </div>
          <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-700/70 bg-slate-950/70 p-4">
            <div className="grid h-28 w-28 place-items-center rounded-full" style={{background:`conic-gradient(${color} ${plan.readiness_score * 3.6}deg, #1e293b 0deg)`}}>
              <div className="grid h-20 w-20 place-items-center rounded-full bg-slate-950 text-center"><div><p className="text-2xl font-black text-white">{plan.readiness_score}</p><p className="text-[9px] uppercase text-slate-500">out of 100</p></div></div>
            </div>
            <div><p className="text-[10px] uppercase tracking-wider text-slate-500">Readiness</p><p className="mt-1 max-w-[130px] text-sm font-bold" style={{color}}>{plan.readiness_label}</p><p className="mt-1 text-[10px] text-slate-500">Explainable score</p></div>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2"><Gauge className="h-4 w-4 text-indigo-400"/><h3 className="text-sm font-semibold text-white">Readiness Breakdown</h3></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {plan.categories.map((category) => <div key={category.key} className="rounded-xl border border-slate-800 bg-slate-900 p-4"><div className="flex items-start justify-between gap-2"><p className="text-xs font-medium text-slate-200">{category.label}</p><span className="text-lg font-bold text-white">{category.score}</span></div><div className="my-3 h-1.5 overflow-hidden rounded bg-slate-800"><div className="h-full rounded" style={{width:`${category.score}%`,backgroundColor:scoreColor(category.score)}}/></div><p className="text-[10px] font-semibold" style={{color:scoreColor(category.score)}}>{category.status}</p><p className="mt-1 text-[10px] leading-4 text-slate-500">{category.reason}</p></div>)}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[340px_1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-rose-400"/><h3 className="text-sm font-semibold text-white">What Breaks If I Change This?</h3></div>
          <p className="mb-3 text-[11px] leading-5 text-slate-500">Select any file to reveal its downstream blast radius and the tests that protect it.</p>
          <div className="relative mb-3"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Search source files..." className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500"/></div>
          <div className="max-h-[420px] space-y-1 overflow-y-auto pr-1">
            {filteredImpacts.map((item) => <button key={item.module_id} onClick={()=>setSelectedId(item.module_id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId===item.module_id?'border-indigo-500/50 bg-indigo-500/10':'border-transparent hover:bg-slate-800'}`}><div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate font-mono text-[11px] text-slate-200">{item.relative_path}</span><span className={`shrink-0 rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${riskClass(item.risk_level)}`}>{item.risk_level}</span></div><p className="mt-1 text-[10px] text-slate-500">{item.blast_radius} downstream file(s)</p></button>)}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          {selected ? <div className="space-y-5"><div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="break-all font-mono text-sm font-bold text-indigo-300">{selected.relative_path}</p><p className="mt-1 text-xs text-slate-400">Change-impact assessment</p></div><div className="flex gap-2"><span className={`rounded-lg border px-3 py-1 text-[10px] font-bold uppercase ${riskClass(selected.risk_level)}`}>{selected.risk_level} risk</span><span className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1 text-[10px] text-slate-300">Blast radius: {selected.blast_radius}</span></div></div>
            <div className="grid gap-3 sm:grid-cols-2"><ImpactList icon={<Network className="h-4 w-4 text-rose-400"/>} title="Files that depend on this" items={selected.direct_dependents}/><ImpactList icon={<ArrowRight className="h-4 w-4 text-indigo-400"/>} title="Files this depends on" items={selected.direct_dependencies}/><ImpactList icon={<FileWarning className="h-4 w-4 text-amber-400"/>} title="Entry points affected" items={selected.affected_entry_points}/><ImpactList icon={<ShieldCheck className="h-4 w-4 text-emerald-400"/>} title="Tests to run" items={selected.suggested_tests}/></div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><p className="mb-2 text-xs font-semibold text-white">Why this risk level?</p><ul className="space-y-1 text-[11px] leading-5 text-slate-400">{selected.reasons.map((reason)=><li key={reason} className="flex gap-2"><CheckCircle2 className="mt-1 h-3 w-3 shrink-0 text-indigo-400"/>{reason}</li>)}</ul></div>
          </div> : <div className="grid min-h-[400px] place-items-center text-sm text-slate-500">Select a file to calculate impact.</div>}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-2"><Map className="h-4 w-4 text-indigo-400"/><h3 className="text-sm font-semibold text-white">Recommended Migration Roadmap</h3></div>
        <div className="grid gap-3 lg:grid-cols-2">
          {plan.phases.map((phase) => <article key={phase.phase} className="rounded-2xl border border-slate-800 bg-slate-900 p-5"><div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{phase.phase}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-white">{phase.title}</h4><span className={`rounded border px-2 py-0.5 text-[9px] font-bold uppercase ${riskClass(phase.risk_level)}`}>{phase.risk_level} risk</span></div><p className="mt-1 text-xs leading-5 text-slate-400">{phase.goal}</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Priority files</p><ul className="space-y-1">{phase.files.slice(0,5).map((file)=><li key={file} className="truncate font-mono text-[10px] text-indigo-300" title={file}>{file}</li>)}</ul></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Actions</p><ul className="space-y-1">{phase.actions.map((action)=><li key={action} className="flex gap-2 text-[10px] leading-4 text-slate-400"><CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400"/>{action}</li>)}</ul></div></div></article>)}
        </div>
      </section>
    </div>
  );
};

const ImpactList: React.FC<{icon:React.ReactNode;title:string;items:string[]}> = ({icon,title,items}) => <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4"><div className="mb-2 flex items-center gap-2">{icon}<p className="text-xs font-semibold text-slate-200">{title}</p></div>{items.length ? <ul className="space-y-1">{items.slice(0,8).map((item)=><li key={item} className="break-all font-mono text-[10px] leading-4 text-slate-400">{item}</li>)}</ul> : <p className="text-[10px] text-slate-600">None detected</p>}</div>;

export default MigrationPlanTab;

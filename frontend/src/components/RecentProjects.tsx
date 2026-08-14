import React from 'react';
import { ArrowRight, Clock3, Code2, FolderClock, Gauge, X } from 'lucide-react';
import { RecentProjectSummary } from '../types';
import { sourceLabel } from '../utils/presentation';

interface Props {
  projects: RecentProjectSummary[];
  disabled?: boolean;
  onOpen: (projectId: string) => void;
  onRemove: (projectId: string) => void;
}

export const RecentProjects: React.FC<Props> = ({ projects, disabled = false, onOpen, onRemove }) => {
  if (!projects.length) return null;

  return (
    <section className="mx-auto mt-5 max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6" aria-labelledby="recent-projects-heading">
      <div className="mb-4 flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-2.5 text-indigo-300"><FolderClock className="h-5 w-5"/></div>
        <div><h2 id="recent-projects-heading" className="text-sm font-semibold text-white">Recent Analyses</h2><p className="mt-0.5 text-[10px] text-slate-500">Reopen projects analyzed in this browser</p></div>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {projects.map((project) => (
          <article key={project.project_id} className="group relative rounded-xl border border-slate-800 bg-slate-950/60 p-4 hover:border-indigo-500/30">
            <button type="button" onClick={() => onRemove(project.project_id)} className="absolute right-2 top-2 rounded p-1 text-slate-600 opacity-100 hover:bg-slate-800 hover:text-red-300 sm:opacity-0 sm:group-hover:opacity-100" aria-label={`Remove ${project.display_name} from recent analyses`}><X className="h-3.5 w-3.5"/></button>
            <button type="button" disabled={disabled} onClick={() => onOpen(project.project_id)} className="w-full pr-5 text-left disabled:opacity-50">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate text-xs font-semibold text-slate-200" title={project.display_name}>{project.display_name}</h3><p className="mt-1 text-[9px] uppercase tracking-wider text-slate-600">{sourceLabel(project.source_type)}</p></div>{project.readiness_score != null && <span className="flex shrink-0 items-center gap-1 rounded border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[9px] font-bold text-emerald-300"><Gauge className="h-3 w-3"/>{project.readiness_score}</span>}</div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500"><span className="flex items-center gap-1"><Code2 className="h-3 w-3"/>{project.total_files} files · {project.total_lines.toLocaleString()} lines</span><span className="flex items-center gap-1"><Clock3 className="h-3 w-3"/>{new Date(project.created_at).toLocaleDateString()}</span></div>
              <div className="mt-3 flex items-center justify-between"><div className="flex gap-1">{project.detected_languages.map((language) => <span key={language} className="rounded border border-slate-800 px-1.5 py-0.5 text-[8px] uppercase text-slate-500">{language}</span>)}</div><span className="flex items-center gap-1 text-[9px] font-semibold text-indigo-300">Open analysis<ArrowRight className="h-3 w-3"/></span></div>
            </button>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[9px] leading-4 text-slate-600">History is stored only in this browser. Server cleanup or redeployment may make an older analysis unavailable.</p>
    </section>
  );
};

export default RecentProjects;

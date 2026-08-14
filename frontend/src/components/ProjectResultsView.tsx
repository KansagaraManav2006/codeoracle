import React, { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, CheckCircle2, ChevronDown, Code2, FileCode, GitFork, Hash, RotateCcw, ShieldCheck } from 'lucide-react';
import { MigrationPlanResponse, ProjectAnalysis, ProjectFileResponse, ProjectMetadataResponse, TabType } from '../types';
import { sourceLabel } from '../utils/presentation';

interface ProjectResultsViewProps {
  project: ProjectMetadataResponse;
  files: ProjectFileResponse[];
  onReset: () => void;
  onNavigate: (tab: TabType) => void;
  refreshKey?: number;
}

export const ProjectResultsView: React.FC<ProjectResultsViewProps> = ({
  project,
  files,
  onReset,
  onNavigate,
  refreshKey = 0,
}) => {
  const [showFiles, setShowFiles] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [plan, setPlan] = useState<MigrationPlanResponse | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch(`/api/projects/${project.project_id}/analysis`).then((response) => response.ok ? response.json() : null),
      fetch(`/api/projects/${project.project_id}/migration-plan`).then((response) => response.ok ? response.json() : null),
    ]).then(([analysisData, planData]) => {
      if (!active) return;
      setAnalysis(analysisData);
      setPlan(planData);
    }).catch(() => undefined);
    return () => { active = false; };
  }, [project.project_id, refreshKey]);
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="mx-auto mb-5 max-w-7xl space-y-4 sm:mb-8 sm:space-y-6">
      {/* Project Summary Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex min-w-0 items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-white sm:text-lg" title={project.display_name}>{project.display_name}</h2>
              <p className="text-xs text-slate-400">Source: {sourceLabel(project.source_type)}</p>
            </div>
          </div>

          <button
            onClick={onReset}
            className="flex w-full items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700 sm:w-auto sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Analyze Another Project</span>
          </button>
        </div>

        <div className="mb-3 flex items-center justify-between gap-3">
          <div><h3 className="text-sm font-semibold text-white">Project Overview</h3><p className="mt-0.5 text-[11px] text-slate-500">Repository scale, architecture and modernization posture</p></div>
          {plan && <button type="button" onClick={() => onNavigate('migration')} className="hidden items-center gap-1.5 text-[11px] font-semibold text-indigo-300 hover:text-indigo-200 sm:inline-flex">Open migration intelligence<ArrowUpRight className="h-3.5 w-3.5"/></button>}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 xl:grid-cols-6">
          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Total Files</span>
            </div>
            <p className="text-xl font-bold text-white">{project.total_files}</p>
          </div>

          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Hash className="w-4 h-4 text-emerald-400" />
              <span>Code Lines</span>
            </div>
            <p className="text-xl font-bold text-white">{project.total_lines.toLocaleString()}</p>
          </div>

          <div className="col-span-2 bg-slate-950/60 p-3 sm:col-span-1 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span>Languages</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {project.detected_languages.map((lang: string) => (
                <span
                  key={lang}
                  className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          <button type="button" onClick={() => onNavigate('graph')} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left transition-colors hover:border-indigo-500/40 sm:p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-400"><GitFork className="h-4 w-4 text-indigo-400"/><span>Connections</span></div>
            <p className="text-xl font-bold text-white">{analysis ? analysis.dependency_edges.length : '—'}</p>
          </button>

          <button type="button" onClick={() => onNavigate('migration')} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-left transition-colors hover:border-indigo-500/40 sm:p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-slate-400"><ShieldCheck className="h-4 w-4 text-emerald-400"/><span>Readiness</span></div>
            <p className="text-xl font-bold text-emerald-400">{plan ? `${plan.readiness_score}/100` : '—'}</p>
          </button>

          <button type="button" onClick={() => onNavigate('migration')} className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3 text-left transition-colors hover:border-indigo-500/50 sm:p-4">
            <div className="mb-1 flex items-center gap-2 text-xs text-indigo-200"><Activity className="h-4 w-4"/><span>Projected</span></div>
            <p className="text-xl font-bold text-indigo-200">{plan ? `${plan.projected_readiness_score}/100` : '—'}</p>
            {plan && <p className="mt-1 text-[9px] text-indigo-300">+{plan.projected_readiness_score - plan.readiness_score} roadmap gain</p>}
          </button>

        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <button type="button" onClick={() => onNavigate('explanation')} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-[11px] text-slate-400 hover:bg-slate-800"><strong className="block text-slate-200">1. Understand</strong>Read business purpose and module responsibilities.</button>
          <button type="button" onClick={() => onNavigate('tests')} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-[11px] text-slate-400 hover:bg-slate-800"><strong className="block text-slate-200">2. Protect</strong>Generate tests and identify coverage gaps.</button>
          <button type="button" onClick={() => onNavigate('migration')} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2 text-left text-[11px] text-slate-400 hover:bg-slate-800"><strong className="block text-slate-200">3. Modernize safely</strong>Review impact, refactors and roadmap.</button>
        </div>
      </div>

      {/* Discovered Source Files Inventory Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
        <button type="button" onClick={() => setShowFiles((value) => !value)} className="flex w-full items-center justify-between gap-4 text-left" aria-expanded={showFiles}>
          <span><span className="block text-sm font-semibold text-white">Source Files ({files.length})</span><span className="mt-1 block text-[11px] text-slate-500">{showFiles ? 'Hide file list' : 'Show file paths and sizes'}</span></span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${showFiles ? 'rotate-180' : ''}`} />
        </button>

        {showFiles && <div className="mt-4 hidden overflow-x-auto rounded-xl border border-slate-800 sm:block">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Relative Path</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4 text-right">Lines</th>
                <th className="py-3 px-4 text-right">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {files.map((file) => (
                <tr key={file.file_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono text-indigo-300">{file.relative_path}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${
                        file.language === 'python'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}
                    >
                      {file.language}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono">{file.line_count}</td>
                  <td className="py-3 px-4 text-right text-slate-400">{formatBytes(file.size_bytes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
        {showFiles && <div className="mt-4 space-y-2 sm:hidden">{files.map((file) => <div key={file.file_id} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-all font-mono text-xs text-indigo-300">{file.relative_path}</p><span className="shrink-0 rounded border border-slate-700 px-1.5 py-0.5 text-[9px] uppercase text-slate-300">{file.language}</span></div><div className="mt-2 text-[10px] text-slate-500">{file.line_count.toLocaleString()} lines | {formatBytes(file.size_bytes)}</div></div>)}</div>}
      </div>
    </div>
  );
};

export default ProjectResultsView;

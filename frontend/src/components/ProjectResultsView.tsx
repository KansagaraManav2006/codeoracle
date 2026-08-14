import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Code2, FileCode, Hash, Layers, RotateCcw } from 'lucide-react';
import { ProjectFileResponse, ProjectMetadataResponse } from '../types';

interface ProjectResultsViewProps {
  project: ProjectMetadataResponse;
  files: ProjectFileResponse[];
  onReset: () => void;
}

export const ProjectResultsView: React.FC<ProjectResultsViewProps> = ({
  project,
  files,
  onReset,
}) => {
  const [showFiles, setShowFiles] = useState(false);
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="mx-auto mb-5 max-w-4xl space-y-4 sm:mb-8 sm:space-y-6">
      {/* Project Summary Banner */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex min-w-0 items-center space-x-3">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-bold text-white sm:text-lg" title={project.display_name}>{project.display_name}</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Ingested
                </span>
              </div>
              <p className="text-xs text-slate-400">Source: {project.source_type.toUpperCase()}</p>
            </div>
          </div>

          <button
            onClick={onReset}
            className="flex w-full items-center justify-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700 sm:w-auto sm:self-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Ingest Another Repository</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4">
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
              <span>Total LOC</span>
            </div>
            <p className="text-xl font-bold text-white">{project.total_lines.toLocaleString()}</p>
          </div>

          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
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

          <div className="bg-slate-950/60 p-3 sm:p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Content Hash</span>
            </div>
            <p className="text-xs font-mono text-slate-300 truncate" title={project.content_hash}>
              {project.content_hash.substring(0, 12)}...
            </p>
          </div>
        </div>
      </div>

      {/* Discovered Source Files Inventory Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 shadow-xl sm:p-6">
        <button type="button" onClick={() => setShowFiles((value) => !value)} className="flex w-full items-center justify-between gap-4 text-left" aria-expanded={showFiles}>
          <span><span className="block text-sm font-semibold text-white">Discovered Source Files ({files.length})</span><span className="mt-1 block text-[11px] text-slate-500">{showFiles ? 'Hide inventory' : 'Show file paths, sizes, and hashes'}</span></span>
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
                <th className="py-3 px-4 font-mono text-right">SHA-256</th>
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
                  <td className="py-3 px-4 text-right font-mono text-slate-500 text-[10px]" title={file.sha256_hash}>
                    {file.sha256_hash.substring(0, 8)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
        {showFiles && <div className="mt-4 space-y-2 sm:hidden">{files.map((file) => <div key={file.file_id} className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/60 p-3"><div className="flex items-start justify-between gap-3"><p className="min-w-0 break-all font-mono text-xs text-indigo-300">{file.relative_path}</p><span className="shrink-0 rounded border border-slate-700 px-1.5 py-0.5 text-[9px] uppercase text-slate-300">{file.language}</span></div><div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><span>{file.line_count.toLocaleString()} lines · {formatBytes(file.size_bytes)}</span><span className="font-mono">{file.sha256_hash.substring(0, 8)}…</span></div></div>)}</div>}
      </div>
    </div>
  );
};

export default ProjectResultsView;

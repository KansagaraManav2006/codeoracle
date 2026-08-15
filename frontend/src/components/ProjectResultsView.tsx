import React, { useState } from 'react';
import { CheckCircle2, ChevronDown, Code2, FileCode, Hash, RotateCcw } from 'lucide-react';
import { ProjectFileResponse, ProjectMetadataResponse } from '../types';
import { sourceLabel } from '../utils/presentation';
import RiskBadge from './common/RiskBadge';
import StatCard from './common/StatCard';

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
    <div className="mx-auto mb-6 max-w-4xl space-y-4 sm:mb-8 sm:space-y-6">
      {/* Project Context Strip (bg-section-sand promoted beneath header) */}
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#F0EBE2] p-4 shadow-xs sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CFC2] pb-4 mb-5">
          <div className="flex min-w-0 items-center space-x-3">
            <div className="p-2.5 bg-[#E0EFEB] border border-[#BEE0D6] rounded-2xl text-[#368A80]">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h2
                className="truncate text-base font-extrabold text-[#292622] sm:text-lg"
                title={project.display_name}
              >
                {project.display_name}
              </h2>
              <p className="text-xs font-medium text-[#6B645A]">
                Source: {sourceLabel(project.source_type)}
              </p>
            </div>
          </div>

          <button
            onClick={onReset}
            className="btn-brand-outline-pill px-4 py-2 text-xs flex items-center justify-center space-x-2 sm:w-auto"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Analyze Another Project</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard
            label="Total Files"
            value={project.total_files}
            icon={FileCode}
          />
          <StatCard
            label="Code Lines"
            value={project.total_lines.toLocaleString()}
            icon={Hash}
          />
          <div className="col-span-2 sm:col-span-1 rounded-[20px] border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs">
            <div className="flex items-center space-x-2 text-[#6B645A] text-xs mb-1.5 font-semibold">
              <Code2 className="w-4 h-4 text-[#C7953D]" />
              <span>Detected Languages</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {project.detected_languages.map((lang: string) => (
                <RiskBadge key={lang} level="info" label={lang} size="sm" />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Discovered Source Files Inventory Table */}
      <div className="rounded-[24px] border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs sm:p-6">
        <button
          type="button"
          onClick={() => setShowFiles((value) => !value)}
          className="flex w-full items-center justify-between gap-4 text-left"
          aria-expanded={showFiles}
        >
          <span>
            <span className="block text-sm font-extrabold text-[#292622]">
              Source Files ({files.length})
            </span>
            <span className="mt-0.5 block text-[11px] text-[#6B645A]">
              {showFiles ? 'Hide file list' : 'Show file paths and sizes'}
            </span>
          </span>
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-[#6B645A] transition-transform duration-200 ${
              showFiles ? 'rotate-180' : ''
            }`}
          />
        </button>

        {showFiles && (
          <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-[#D8CFC2] sm:block">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F0EBE2] text-[#6B645A] uppercase font-bold text-[10px] tracking-wider border-b border-[#D8CFC2]">
                <tr>
                  <th className="py-3 px-4">Relative Path</th>
                  <th className="py-3 px-4">Language</th>
                  <th className="py-3 px-4 text-right">Lines</th>
                  <th className="py-3 px-4 text-right">Size</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8CFC2]/60 text-[#292622]">
                {files.map((file) => (
                  <tr key={file.file_id} className="hover:bg-[#F0EBE2]/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#4C4FD6]">
                      {file.relative_path}
                    </td>
                    <td className="py-3 px-4">
                      <RiskBadge level="info" label={file.language} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold">
                      {file.line_count.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-[#6B645A]">
                      {formatBytes(file.size_bytes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {showFiles && (
          <div className="mt-4 space-y-2 sm:hidden">
            {files.map((file) => (
              <div
                key={file.file_id}
                className="min-w-0 rounded-2xl border border-[#D8CFC2] bg-[#EFE9DD]/50 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 break-all font-mono text-xs font-bold text-[#4C4FD6]">
                    {file.relative_path}
                  </p>
                  <RiskBadge level="info" label={file.language} size="sm" />
                </div>
                <div className="mt-2 text-[10px] font-medium text-[#6B645A]">
                  {file.line_count.toLocaleString()} lines | {formatBytes(file.size_bytes)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectResultsView;

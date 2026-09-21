import React, { useState, useMemo } from 'react';
import {
  Eye,
  CheckCircle2,
  ChevronDown,
  RotateCcw,
  FileText,
  Hash,
} from 'lucide-react';
import { ProjectFileResponse, ProjectMetadataResponse } from '../types';
import { sourceLabel } from '../utils/presentation';
import { truncateMiddle, formatNumber, formatBytes } from '../utils/formatters';
import Button from './common/Button';
import SearchField from './common/SearchField';
import { LanguageTag } from './common/Tags';
import StatusPill from './common/StatusPill';

interface ProjectResultsViewProps {
  project: ProjectMetadataResponse;
  files: ProjectFileResponse[];
  onReset: () => void;
  onSelectFile?: (filePath: string) => void;
}

export const ProjectResultsView: React.FC<ProjectResultsViewProps> = ({
  project,
  files,
  onReset,
  onSelectFile,
}) => {
  const [showFiles, setShowFiles] = useState(false);
  const [fileSearch, setFileSearch] = useState('');

  const filteredFiles = useMemo(() => {
    if (!fileSearch.trim()) return files;
    const query = fileSearch.toLowerCase().trim();
    return files.filter(
      (f) =>
        f.relative_path.toLowerCase().includes(query) ||
        f.language.toLowerCase().includes(query)
    );
  }, [files, fileSearch]);

  return (
    <div className="w-full max-w-[1240px] mx-auto">
      {/* Cohesive Repository Context Hero */}
      <section
        className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-1 transition-all"
        aria-label="Repository Context and Summary"
      >
        {/* Row 1: Compact Context Header (Breadcrumb, Source Type, Service Status, Reset Action) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-line">
          {/* Left: Brand Breadcrumb & Repository Context */}
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <div
              className="w-7 h-7 rounded-md bg-indigo flex items-center justify-center text-white shrink-0 shadow-xs"
              aria-hidden="true"
            >
              <Eye className="w-4 h-4" strokeWidth={1.75} />
            </div>

            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 flex-wrap min-w-0 text-xs font-sans">
              <button
                type="button"
                onClick={onReset}
                className="font-bold text-ink hover:text-indigo transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo rounded-xs"
                title="Return to CodeOracle landing"
              >
                CodeOracle
              </button>
              <span className="text-ink-4 font-mono select-none" aria-hidden="true">/</span>
              <span
                className="font-mono font-bold text-ink truncate max-w-[200px] sm:max-w-[320px]"
                title={project.display_name}
              >
                {project.display_name}
              </span>
            </nav>

            <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-track text-ink-2 font-mono text-[10px] font-semibold border border-line uppercase tracking-wide">
              {sourceLabel(project.source_type)}
            </span>
          </div>

          {/* Right: Service Status Pill & "Analyze another project" */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
            <StatusPill />
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              icon={<RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />}
              className="text-xs font-semibold"
            >
              Analyze another project
            </Button>
          </div>
        </div>

        {/* Row 2: Repository Identity & Core Statistics */}
        <div className="pt-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Repository Headline & Detected Languages */}
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-3 flex-wrap">
              <h1
                className="font-display font-extrabold text-xl sm:text-2xl text-ink leading-tight truncate"
                title={project.display_name}
              >
                {project.display_name}
              </h1>

              {/* Detected Language Badges */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {project.detected_languages && project.detected_languages.length > 0 ? (
                  project.detected_languages.map((lang) => (
                    <LanguageTag key={lang} language={lang} />
                  ))
                ) : (
                  <span className="text-xs text-ink-3">None detected</span>
                )}
              </div>
            </div>

            <p className="font-sans text-xs text-ink-3">
              Deterministic AST analysis, dependency graph, and verified safety modernization loaded.
            </p>
          </div>

          {/* Repository Statistics Inline Badges */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap shrink-0">
            {/* Total Files */}
            <div className="bg-tile border border-line rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-track flex items-center justify-center text-ink-3 shrink-0">
                <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 leading-none">
                  Total Files
                </span>
                <span className="font-display font-extrabold text-base sm:text-lg text-ink leading-none mt-0.5 block num">
                  {formatNumber(project.total_files)}
                </span>
              </div>
            </div>

            {/* Code Lines */}
            <div className="bg-tile border border-line rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-track flex items-center justify-center text-ink-3 shrink-0">
                <Hash className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 leading-none">
                  Code Lines
                </span>
                <span className="font-display font-extrabold text-base sm:text-lg text-ink leading-none mt-0.5 block num">
                  {formatNumber(project.total_lines)}
                </span>
              </div>
            </div>

            {/* Analysis / Parse State */}
            <div className="bg-teal-surface border border-teal/20 rounded-lg px-3 py-1.5 sm:px-3.5 sm:py-2 flex items-center gap-2.5">
              <div className="w-6 h-6 rounded bg-teal-surface flex items-center justify-center text-teal-strong shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-teal-text leading-none">
                  Analysis
                </span>
                <span className="font-sans font-bold text-xs sm:text-sm text-teal-strong leading-none mt-0.5 block">
                  {project.source_type === 'demo_benchmark' ? 'AST Verified' : 'Static analysis'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Row 3: Compact Collapsible Source-Files Drawer */}
        <div className="mt-3.5 pt-3 border-t border-line/70">
          <button
            type="button"
            onClick={() => setShowFiles((v) => !v)}
            aria-expanded={showFiles}
            aria-controls="source-files-drawer"
            className="w-full flex items-center justify-between py-1 text-left cursor-pointer group focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo rounded-sm"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-sans text-xs font-bold text-ink group-hover:text-indigo transition-colors">
                Source Files ({formatNumber(files.length)})
              </span>
              <span className="text-[11px] text-ink-3">
                {showFiles ? '— click to collapse file inventory' : '— click to expand file inventory & inspect paths'}
              </span>
            </div>

            <ChevronDown
              className={`w-4 h-4 text-ink-3 group-hover:text-ink transition-transform duration-base ${
                showFiles ? 'rotate-180 text-ink' : ''
              }`}
              strokeWidth={1.75}
            />
          </button>

          {showFiles && (
            <div id="source-files-drawer" className="mt-3 pt-3 border-t border-line/50 space-y-2.5">
              {/* Search filter within files */}
              <SearchField
                id="source-files-search"
                value={fileSearch}
                onChange={setFileSearch}
                placeholder="Filter file path…"
                resultCount={{ current: filteredFiles.length, total: files.length, unit: 'files' }}
              />

              {/* Scrollable file list */}
              <div
                tabIndex={0}
                role="region"
                aria-label="Source files list"
                className="max-h-[280px] overflow-y-auto custom-scrollbar divide-y divide-line/60 rounded-md border border-line bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
              >
                {filteredFiles.length === 0 ? (
                  <div className="p-6 text-center text-xs text-ink-3 space-y-2">
                    <p>No files match "{fileSearch}".</p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFileSearch('')}
                      className="text-xs"
                    >
                      Clear search filter
                    </Button>
                  </div>
                ) : (
                  filteredFiles.map((file) => (
                    <div
                      key={file.file_id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectFile?.(file.relative_path)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectFile?.(file.relative_path);
                        }
                      }}
                      className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-tile/70 cursor-pointer transition-colors text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                      title={file.relative_path}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" strokeWidth={1.75} />
                        <span className="font-mono text-xs font-semibold text-indigo-text truncate">
                          {truncateMiddle(file.relative_path, 48)}
                        </span>
                        <span className="hidden sm:inline">
                          <LanguageTag language={file.language} />
                        </span>
                      </div>

                      <div className="flex items-center gap-4 shrink-0 font-mono text-[11px] text-ink-3 num">
                        <span>{formatNumber(file.line_count)} lines</span>
                        <span className="w-16 text-right font-medium text-ink-2">
                          {formatBytes(file.size_bytes)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default ProjectResultsView;

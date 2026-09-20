import React, { useState, useMemo } from 'react';
import { CheckCircle2, ChevronDown, RotateCcw, FileText, Hash, Code2 } from 'lucide-react';
import { ProjectFileResponse, ProjectMetadataResponse } from '../types';
import { sourceLabel } from '../utils/presentation';
import { truncateMiddle, formatNumber, formatBytes } from '../utils/formatters';
import Button from './common/Button';
import SearchField from './common/SearchField';
import { LanguageTag } from './common/Tags';

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
    <div className="w-full max-w-summary mx-auto mb-6 sm:mb-8 space-y-4 sm:space-y-5">
      {/* a) Project summary panel */}
      <section
        className="bg-panel rounded-xl p-5 sm:p-6 transition-all shadow-1"
        aria-label="Project Summary"
      >
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-ink/10">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-md bg-teal-surface flex items-center justify-center text-teal-strong shrink-0 border border-teal/20"
              aria-hidden="true"
            >
              <CheckCircle2 className="w-6 h-6" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <h2
                className="font-display font-bold text-lg sm:text-xl text-ink truncate"
                title={project.display_name}
              >
                {project.display_name}
              </h2>
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                Source: {sourceLabel(project.source_type)}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            icon={<RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />}
            className="self-start sm:self-auto shrink-0"
          >
            Analyze Another Project
          </Button>
        </div>

        {/* 3 Stat cards (Languages card is 1.2fr wider) */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.2fr] gap-3 sm:gap-4 mt-5">
          {/* Total Files */}
          <div className="bg-surface border border-line rounded-md p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-sans text-[11px] font-bold tracking-[0.08em] uppercase text-ink-2">
                TOTAL FILES
              </span>
              <div className="w-6 h-6 rounded-xs bg-track flex items-center justify-center text-ink-3">
                <FileText className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
            </div>
            <div className="font-display font-extrabold text-2xl text-ink num">
              {formatNumber(project.total_files)}
            </div>
          </div>

          {/* Code Lines */}
          <div className="bg-surface border border-line rounded-md p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-sans text-[11px] font-bold tracking-[0.08em] uppercase text-ink-2">
                CODE LINES
              </span>
              <div className="w-6 h-6 rounded-xs bg-track flex items-center justify-center text-ink-3">
                <Hash className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
            </div>
            <div className="font-display font-extrabold text-2xl text-ink num">
              {formatNumber(project.total_lines)}
            </div>
          </div>

          {/* Detected Languages */}
          <div className="bg-surface border border-line rounded-md p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-sans text-[11px] font-bold tracking-[0.08em] uppercase text-ink-2">
                DETECTED LANGUAGES
              </span>
              <div className="w-6 h-6 rounded-xs bg-track flex items-center justify-center text-ink-3">
                <Code2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {project.detected_languages && project.detected_languages.length > 0 ? (
                project.detected_languages.map((lang) => (
                  <LanguageTag key={lang} language={lang} />
                ))
              ) : (
                <span className="text-xs text-ink-3">None detected</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* b) Collapsible card: Source Files (126) */}
      <section className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-1 transition-all">
        <button
          type="button"
          onClick={() => setShowFiles((v) => !v)}
          aria-expanded={showFiles}
          aria-controls="source-files-content"
          className="w-full flex items-center justify-between text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo rounded-sm"
        >
          <div>
            <h3 className="font-display font-bold text-[16px] text-ink">
              Source Files ({formatNumber(files.length)})
            </h3>
            <p className="font-sans text-xs text-ink-3 mt-0.5">
              {showFiles ? 'Hide file list' : 'Show file paths and sizes'}
            </p>
          </div>

          <ChevronDown
            className={`w-5 h-5 text-ink-3 transition-transform duration-base ${
              showFiles ? 'rotate-180 text-ink' : ''
            }`}
            strokeWidth={1.75}
          />
        </button>

        {showFiles && (
          <div id="source-files-content" className="mt-4 pt-4 border-t border-line space-y-3">
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
              className="max-h-[320px] overflow-y-auto custom-scrollbar divide-y divide-line/60 rounded-md border border-line bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
            >
              {filteredFiles.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-3">
                  No files match "{fileSearch}".
                </div>
              ) : (
                filteredFiles.map((file) => (
                  <div
                    key={file.file_id}
                    onClick={() => onSelectFile?.(file.relative_path)}
                    className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-tile/70 cursor-pointer transition-colors text-xs"
                    title={file.relative_path}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-3.5 h-3.5 text-ink-3 shrink-0" strokeWidth={1.75} />
                      <span className="font-mono text-xs font-semibold text-indigo-text truncate">
                        {truncateMiddle(file.relative_path, 42)}
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
      </section>
    </div>
  );
};

export default ProjectResultsView;

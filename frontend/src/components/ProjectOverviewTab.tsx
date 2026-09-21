import React, { useState, useMemo } from 'react';
import {
  FileText,
  Hash,
  CheckCircle2,
  FolderGit2,
  RotateCcw,
  BookOpen,
  Workflow,
  Shield,
  Lock,
  Layers,
  Code2,
} from 'lucide-react';
import { ProjectFileResponse, ProjectMetadataResponse, TabType } from '../types';
import { sourceLabel } from '../utils/presentation';
import { formatNumber, formatBytes } from '../utils/formatters';
import Button from './common/Button';
import SearchField from './common/SearchField';
import { LanguageTag } from './common/Tags';

interface ProjectOverviewTabProps {
  project: ProjectMetadataResponse;
  files: ProjectFileResponse[];
  onSelectFile?: (filePath: string) => void;
  onNavigateTab: (tab: TabType) => void;
  onReset: () => void;
}

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({
  project,
  files,
  onSelectFile,
  onNavigateTab,
  onReset,
}) => {
  const [fileSearch, setFileSearch] = useState('');
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('all');

  // Compute language breakdown
  const languageStats = useMemo(() => {
    const counts: Record<string, { count: number; lines: number }> = {};
    for (const file of files) {
      const lang = file.language || 'Other';
      if (!counts[lang]) {
        counts[lang] = { count: 0, lines: 0 };
      }
      counts[lang].count += 1;
      counts[lang].lines += file.line_count || 0;
    }
    return Object.entries(counts)
      .map(([lang, stat]) => ({
        language: lang,
        files: stat.count,
        lines: stat.lines,
        percentage: files.length > 0 ? Math.round((stat.count / files.length) * 100) : 0,
      }))
      .sort((a, b) => b.lines - a.lines);
  }, [files]);

  // Filtered files list
  const filteredFiles = useMemo(() => {
    let result = files;
    if (selectedLanguageFilter !== 'all') {
      result = result.filter(
        (f) => f.language.toLowerCase() === selectedLanguageFilter.toLowerCase()
      );
    }
    if (fileSearch.trim()) {
      const q = fileSearch.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.relative_path.toLowerCase().includes(q) ||
          f.language.toLowerCase().includes(q)
      );
    }
    return result;
  }, [files, fileSearch, selectedLanguageFilter]);

  const distributionColors = ['bg-indigo', 'bg-slate', 'bg-teal', 'bg-indigo/70', 'bg-slate/70'];

  return (
    <div className="w-full space-y-5 animate-[fade-down_150ms_ease-out]">
      {/* Hero Project Card (from User's Screenshot) */}
      <section
        className="w-full bg-surface border border-line rounded-2xl p-5 sm:p-7 shadow-1 relative overflow-hidden"
        aria-label="Repository Identity and Metrics"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left Column: Repository Identity, Source & Lede */}
          <div className="space-y-3.5 max-w-3xl">
            {/* Breadcrumb & Source Badge */}
            <div className="flex items-center gap-1.5 flex-wrap text-ink-4">
              <span className="font-sans font-medium uppercase tracking-wider text-[10px] text-ink-4">CodeOracle</span>
              <span className="text-ink-4/50 font-mono text-[10px] select-none" aria-hidden="true">/</span>
              <span className="font-mono font-medium text-[10px] text-ink-4 truncate max-w-[280px]">
                {project.display_name}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-panel text-ink-4 font-mono text-[9px] font-semibold border border-line uppercase tracking-wider">
                {sourceLabel(project.source_type)}
              </span>
            </div>

            {/* Display Name Headline */}
            <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-ink tracking-tight leading-tight break-all">
              {project.display_name}
            </h1>

            {/* Detected Languages Tags */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {project.detected_languages && project.detected_languages.length > 0 ? (
                project.detected_languages.map((lang) => (
                  <LanguageTag key={lang} language={lang} />
                ))
              ) : (
                <span className="text-xs text-ink-3">No languages detected</span>
              )}
            </div>

            {/* Subtitle / Lede from image */}
            <p className="font-sans text-xs sm:text-sm text-ink-3 leading-relaxed">
              Deterministic AST analysis, dependency graph, and verified safety modernization loaded.
            </p>

            {/* Action buttons */}
            <div className="flex items-center gap-2.5 pt-2 flex-wrap">
              <Button
                variant="indigo"
                size="sm"
                onClick={() => onNavigateTab('explanation')}
                icon={<BookOpen className="w-3.5 h-3.5" />}
                className="text-xs font-bold"
              >
                Architecture Overview
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigateTab('graph')}
                icon={<Workflow className="w-3.5 h-3.5" />}
                className="text-xs font-semibold"
              >
                Dependency Map
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs font-semibold text-ink-3 hover:text-ink"
              >
                Analyze another project
              </Button>
            </div>
          </div>

          {/* Right Column: Three Key Metric Cards from User's Screenshot */}
          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3 gap-3 shrink-0">
            {/* Total Files Card */}
            <div className="bg-surface border border-line rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-panel border border-line flex items-center justify-center text-ink-3 shrink-0 shadow-xs">
                <FileText className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 leading-none">
                  TOTAL FILES
                </span>
                <span className="font-display font-black text-xl sm:text-2xl text-ink leading-tight mt-0.5 block num">
                  {formatNumber(project.total_files)}
                </span>
              </div>
            </div>

            {/* Code Lines Card */}
            <div className="bg-surface border border-line rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-panel border border-line flex items-center justify-center text-ink-3 shrink-0 shadow-xs">
                <Hash className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 leading-none">
                  CODE LINES
                </span>
                <span className="font-display font-black text-xl sm:text-2xl text-ink leading-tight mt-0.5 block num">
                  {formatNumber(project.total_lines)}
                </span>
              </div>
            </div>

            {/* Analysis Engine Card */}
            <div className="bg-surface border border-line rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-teal-surface border border-teal/30 flex items-center justify-center text-teal-strong shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div>
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-teal-text leading-none">
                  ANALYSIS
                </span>
                <span className="font-sans font-bold text-sm sm:text-base text-teal-strong leading-tight mt-0.5 block">
                  {project.source_type === 'demo_benchmark' ? 'AST Verified' : 'Static analysis'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Language Breakdown Ribbon */}
        {languageStats.length > 0 && (
          <div className="mt-6 pt-5 border-t border-line/70 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-sans font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-indigo" />
                Detected Code Distribution
              </span>
              <span className="text-[11px] text-ink-3 font-mono">
                {languageStats.length} {languageStats.length === 1 ? 'language' : 'languages'}
              </span>
            </div>

            {/* Stacked Progress Bar with generous vertical breathing room */}
            <div className="w-full h-2.5 rounded-full bg-track overflow-hidden flex border border-line/60 my-1">
              {languageStats.map((item, idx) => {
                return (
                  <div
                    key={item.language}
                    style={{ width: `${item.percentage}%` }}
                    className={`${distributionColors[idx % distributionColors.length]} h-full transition-all`}
                    title={`${item.language}: ${item.percentage}% (${formatNumber(item.lines)} lines)`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs pt-0.5">
              {languageStats.map((item, idx) => (
                <div key={item.language} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${distributionColors[idx % distributionColors.length]}`} />
                  <span className="font-semibold text-ink">{item.language}:</span>
                  <span className="font-mono text-ink-3">{formatNumber(item.lines)} lines</span>
                  <span className="text-[10px] text-ink-4">({item.percentage}%)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Source Files Inventory Section */}
      <section
        className="w-full bg-surface border border-line rounded-2xl p-5 sm:p-7 shadow-1 space-y-4"
        aria-label="Repository Source Files"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-ink flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo" />
              Source Files Inventory ({formatNumber(files.length)})
            </h2>
            <p className="font-sans text-xs text-ink-3 mt-0.5">
              Click any file to focus it across Architecture, Risk Hotspots, and Characterization Tests.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Language filter dropdown */}
            <select
              value={selectedLanguageFilter}
              onChange={(e) => setSelectedLanguageFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-line bg-tile text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-indigo cursor-pointer"
            >
              <option value="all">All Languages</option>
              {languageStats.map((l) => (
                <option key={l.language} value={l.language}>
                  {l.language} ({l.files})
                </option>
              ))}
            </select>

            {/* Search Input */}
            <div className="w-full sm:w-64">
              <SearchField
                id="overview-files-search"
                value={fileSearch}
                onChange={setFileSearch}
                placeholder="Filter files…"
                resultCount={{
                  current: filteredFiles.length,
                  total: files.length,
                  unit: 'files',
                }}
              />
            </div>
          </div>
        </div>

        {/* Files Table / List */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Source files table"
          className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-line/60 rounded-xl border border-line bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
        >
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-3 space-y-2">
              <p>No files match the current search or language filter.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFileSearch('');
                  setSelectedLanguageFilter('all');
                }}
                className="text-xs"
              >
                Clear filters
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
                className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-tile/70 cursor-pointer transition-colors text-xs group focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                title={`Click to focus ${file.relative_path}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-ink-4 group-hover:text-indigo transition-colors shrink-0" />
                  <span className="font-mono text-xs text-ink group-hover:text-indigo font-medium truncate transition-colors">
                    {file.relative_path}
                  </span>
                </div>

                <div className="grid grid-cols-[auto_5.5rem] sm:grid-cols-[6.5rem_5.5rem_4.5rem] items-center gap-x-4 shrink-0 text-right">
                  <LanguageTag language={file.language} className="justify-self-end" />
                  <span className="font-mono text-[11px] text-ink-3 tabular-nums whitespace-nowrap">
                    {formatNumber(file.line_count)} lines
                  </span>
                  <span className="font-mono text-[11px] text-ink-4 tabular-nums whitespace-nowrap hidden sm:inline">
                    {formatBytes(file.size_bytes)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Analysis Pillars & Guarantees */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Read-Only Static Analysis</h3>
            <p className="text-[11px] text-ink-3 mt-1 leading-relaxed">
              Files are parsed into Abstract Syntax Trees without arbitrary code execution.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Deterministic Graph</h3>
            <p className="text-[11px] text-ink-3 mt-1 leading-relaxed">
              Inter-module import dependencies, cycle detections, and entry points resolved mathematically.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Modernization Safety</h3>
            <p className="text-[11px] text-ink-3 mt-1 leading-relaxed">
              Characterization tests lock existing behavior before applying non-destructive syntax transforms.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectOverviewTab;

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
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { ProjectFileResponse, ProjectMetadataResponse, ProjectSummary, TabType } from '../types';
import { sourceLabel } from '../utils/presentation';
import { formatNumber, formatBytes } from '../utils/formatters';
import Button from './common/Button';
import SearchField from './common/SearchField';
import { LanguageTag } from './common/Tags';
import ProjectTitle from './common/ProjectTitle';

interface ProjectOverviewTabProps {
  project: ProjectMetadataResponse;
  summary?: ProjectSummary | null;
  files: ProjectFileResponse[];
  onSelectFile?: (filePath: string) => void;
  onNavigateTab: (tab: TabType) => void;
  onReset: () => void;
}

export const ProjectOverviewTab: React.FC<ProjectOverviewTabProps> = ({
  project,
  summary,
  files,
  onSelectFile,
  onNavigateTab,
  onReset,
}) => {
  const [fileSearch, setFileSearch] = useState('');
  const [selectedLanguageFilter, setSelectedLanguageFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);

  // Canonical language breakdown using single source of truth (summary.languages or derived)
  const languageStats = useMemo(() => {
    let rawList: { language: string; loc: number }[] = [];

    if (summary?.languages && summary.languages.length > 0) {
      rawList = summary.languages.map((l) => ({ language: l.language, loc: l.loc }));
    } else {
      const counts: Record<string, number> = {};
      for (const file of files) {
        const lang = file.language ? file.language.charAt(0).toUpperCase() + file.language.slice(1) : 'Other';
        counts[lang] = (counts[lang] || 0) + (file.line_count || 0);
      }
      rawList = Object.entries(counts)
        .map(([language, loc]) => ({ language, loc }))
        .sort((a, b) => b.loc - a.loc);
    }

    const totalLoc = rawList.reduce((sum, item) => sum + item.loc, 0);

    return rawList.map((item) => {
      const pct = totalLoc > 0 ? (item.loc / totalLoc) * 100 : 0;
      let displayPct: string;
      if (pct > 0 && pct < 0.1) {
        displayPct = '<0.1%';
      } else {
        displayPct = `${pct.toFixed(1)}%`;
      }
      return {
        language: item.language,
        loc: item.loc,
        percentage: pct,
        displayPercentage: displayPct,
      };
    });
  }, [summary, files]);

  // Filtered files list supporting language, parse status, and multi-attribute search
  const filteredFiles = useMemo(() => {
    let result = files;

    // Status filter
    if (selectedStatusFilter !== 'all') {
      if (selectedStatusFilter === 'incomplete') {
        result = result.filter((f) => (f.parse_status || 'complete') !== 'complete');
      } else if (selectedStatusFilter === 'full') {
        result = result.filter((f) => (f.parse_status || 'complete') === 'complete');
      } else {
        result = result.filter(
          (f) => (f.parse_status || 'complete').toLowerCase() === selectedStatusFilter.toLowerCase()
        );
      }
    }

    // Language filter
    if (selectedLanguageFilter !== 'all') {
      result = result.filter(
        (f) => f.language.toLowerCase() === selectedLanguageFilter.toLowerCase()
      );
    }

    // Search query
    if (fileSearch.trim()) {
      const q = fileSearch.toLowerCase().trim();

      if (q.startsWith('status:')) {
        const val = q.slice(7).trim();
        if (val === 'incomplete') {
          result = result.filter((f) => (f.parse_status || 'complete') !== 'complete');
        } else {
          result = result.filter((f) => (f.parse_status || 'complete').toLowerCase().includes(val));
        }
      } else if (q.startsWith('lang:')) {
        const val = q.slice(5).trim();
        result = result.filter((f) => f.language.toLowerCase().includes(val));
      } else {
        result = result.filter(
          (f) =>
            f.relative_path.toLowerCase().includes(q) ||
            f.language.toLowerCase().includes(q) ||
            (f.parse_badge && f.parse_badge.toLowerCase().includes(q))
        );
      }
    }

    return result;
  }, [files, fileSearch, selectedLanguageFilter, selectedStatusFilter]);

  const distributionColors = ['bg-indigo', 'bg-slate', 'bg-teal', 'bg-indigo/70', 'bg-slate/70', 'bg-teal/70'];

  // Total counts derived authoritatively
  const sourceFilesCount = summary?.totals.source_files ?? files.length;
  const totalLoc = summary?.totals.loc ?? files.reduce((s, f) => s + (f.line_count || 0), 0);
  const repositoryFilesCount = summary?.totals.repository_files ?? project.total_files;
  const fullyParsedCount = summary?.parse_coverage.fully_parsed ?? files.filter((f) => (f.parse_status || 'complete') === 'complete').length;
  const partialCount = summary?.parse_coverage.partial ?? files.filter((f) => f.parse_status === 'partial').length;
  const unsupportedCount = summary?.parse_coverage.unsupported ?? files.filter((f) => f.parse_status === 'unsupported' || f.parse_status === 'fallback').length;
  const failedCount = summary?.parse_coverage.failed ?? files.filter((f) => f.parse_status === 'failed').length;
  const fullAstPercentage = summary?.parse_coverage.full_ast_percentage ?? (sourceFilesCount > 0 ? Math.round((fullyParsedCount / sourceFilesCount) * 100) : 100);

  const isPartialAnalysis = fullyParsedCount < sourceFilesCount;

  // Status badge styling helper
  const renderParseBadge = (file: ProjectFileResponse) => {
    const status = file.parse_status || 'complete';
    const badge = file.parse_badge || (status === 'complete' ? 'FULL AST' : status.toUpperCase());

    if (status === 'complete') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-surface text-teal-strong border border-teal/20 whitespace-nowrap">
          {badge}
        </span>
      );
    }
    if (status === 'partial') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-surface text-amber-strong border border-amber/30 whitespace-nowrap">
          {badge}
        </span>
      );
    }
    if (status === 'fallback') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-surface text-slate-strong border border-slate/30 whitespace-nowrap">
          {badge}
        </span>
      );
    }
    if (status === 'unsupported') {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-track text-ink-3 border border-line whitespace-nowrap">
          {badge}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-red-surface text-red-strong border border-red-line whitespace-nowrap">
        {badge}
      </span>
    );
  };

  return (
    <div className="w-full space-y-5 animate-[fade-down_150ms_ease-out]">
      {/* Hero Project Card */}
      <section
        className="w-full bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1 relative overflow-hidden"
        aria-label="Repository Identity and Metrics"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Left Column: Repository Identity, Source & Lede */}
          <div className="space-y-3.5 max-w-3xl">
            {/* Breadcrumb & Source Badge */}
            <div className="flex items-center gap-1.5 flex-wrap text-ink-4">
              <span className="font-sans font-medium uppercase tracking-wider text-[10px] text-ink-4">CodeOracle</span>
              <span className="text-ink-4/50 font-mono text-[10px] select-none" aria-hidden="true">/</span>
              <span
                className="font-mono font-medium text-[10px] text-ink-4 whitespace-nowrap overflow-hidden text-ellipsis max-w-[280px] sm:max-w-[420px]"
                title={project.display_name}
              >
                {project.display_name}
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-panel text-ink-4 font-mono text-[9px] font-semibold border border-line uppercase tracking-wider">
                {sourceLabel(project.source_type)}
              </span>
            </div>

            {/* Controlled Wrap Display Name Headline */}
            <ProjectTitle title={project.display_name} />

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

            {/* Calibrated Accurate Lede */}
            <p className="font-sans text-xs sm:text-sm text-ink-3 leading-relaxed">
              Static AST analysis, dependency modeling, risk scoring, and modernization assessment are ready.
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

          {/* Right Column: Key Top Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-3 shrink-0 w-full lg:w-auto min-w-[280px] sm:min-w-[340px]">
            {/* Analyzed Source Files Card */}
            <div className="bg-surface border border-line rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-panel border border-line flex items-center justify-center text-ink-3 shrink-0 shadow-xs">
                <FileText className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 leading-none">
                  SOURCE FILES
                </span>
                <span className="font-display font-black text-xl sm:text-2xl text-ink leading-tight mt-0.5 block num">
                  {formatNumber(sourceFilesCount)}
                </span>
                {repositoryFilesCount > sourceFilesCount ? (
                  <span className="text-[10px] text-ink-4 block font-mono mt-0.5" title={`${repositoryFilesCount} total files discovered in repository`}>
                    Repo: {formatNumber(repositoryFilesCount)} files
                  </span>
                ) : (
                  <span className="text-[10px] text-ink-4 block font-mono mt-0.5">
                    Analyzed code files
                  </span>
                )}
              </div>
            </div>

            {/* Code Lines Card */}
            <div className="bg-surface border border-line rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-panel border border-line flex items-center justify-center text-ink-3 shrink-0 shadow-xs">
                <Hash className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 leading-none">
                  CODE LINES
                </span>
                <span className="font-display font-black text-xl sm:text-2xl text-ink leading-tight mt-0.5 block num">
                  {formatNumber(totalLoc)}
                </span>
                <span className="text-[10px] text-ink-4 block font-mono mt-0.5">
                  Lines of source
                </span>
              </div>
            </div>

            {/* Full AST Coverage Card */}
            <div className="bg-surface border border-line rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo shrink-0 shadow-xs">
                <Sparkles className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-indigo leading-none">
                  FULL AST COVERAGE
                </span>
                <span className="font-display font-black text-xl sm:text-2xl text-ink leading-tight mt-0.5 block num">
                  {fullAstPercentage}%
                </span>
                <span className="text-[10px] text-ink-4 block font-mono mt-0.5">
                  {fullyParsedCount}/{sourceFilesCount} fully parsed
                </span>
              </div>
            </div>

            {/* Analysis Engine Card */}
            <div className="bg-surface border border-line rounded-xl p-3.5 sm:p-4 flex items-center gap-3.5 shadow-xs">
              <div className="w-10 h-10 rounded-lg bg-teal-surface border border-teal/30 flex items-center justify-center text-teal-strong shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <span className="block font-sans text-[10px] font-bold uppercase tracking-wider text-teal-text leading-none">
                  ANALYSIS MODE
                </span>
                <span className="font-sans font-bold text-sm sm:text-base text-teal-strong leading-tight mt-0.5 block">
                  Static analysis
                </span>
                <span className="text-[10px] text-ink-4 block font-mono mt-0.5">
                  Deterministic AST
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
                {languageStats.length} {languageStats.length === 1 ? 'language' : 'languages'} · {formatNumber(totalLoc)} LOC
              </span>
            </div>

            {/* Stacked Progress Bar: exactly matches percentage */}
            <div className="w-full h-2.5 rounded-full bg-track overflow-hidden flex border border-line/60 my-1">
              {languageStats.map((item, idx) => (
                <div
                  key={item.language}
                  style={{ width: `${item.percentage}%` }}
                  className={`${distributionColors[idx % distributionColors.length]} h-full transition-all`}
                  title={`${item.language}: ${item.displayPercentage} (${formatNumber(item.loc)} lines)`}
                />
              ))}
            </div>

            {/* Legend: matches percentage and shows lines */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs pt-0.5">
              {languageStats.map((item, idx) => (
                <div key={item.language} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${distributionColors[idx % distributionColors.length]}`} />
                  <span className="font-semibold text-ink">{item.language}:</span>
                  <span className="font-mono text-ink-3">{formatNumber(item.loc)} lines</span>
                  <span className="text-[10px] text-ink-4 font-mono">({item.displayPercentage})</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Analysis Coverage Breakdown Card */}
      <section
        className="w-full bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
        aria-label="AST Analysis Coverage Breakdown"
      >
        <div className="space-y-1">
          <span className="font-sans font-bold text-xs uppercase tracking-wider text-ink flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-teal" />
            AST Analysis Coverage
          </span>
          <p className="text-xs text-ink-3 leading-relaxed">
            Deterministic AST parsing completeness across all source files in the repository.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <div className="text-center px-3 py-1.5 rounded-lg bg-tile border border-line min-w-[72px]">
            <span className="block text-[9px] font-bold text-ink-3 uppercase tracking-wider">Fully Parsed</span>
            <span className="font-mono font-bold text-sm text-teal-strong">{fullyParsedCount}</span>
          </div>

          <div className="text-center px-3 py-1.5 rounded-lg bg-tile border border-line min-w-[72px]">
            <span className="block text-[9px] font-bold text-ink-3 uppercase tracking-wider">Partial</span>
            <span className="font-mono font-bold text-sm text-amber-strong">{partialCount}</span>
          </div>

          <div className="text-center px-3 py-1.5 rounded-lg bg-tile border border-line min-w-[72px]">
            <span className="block text-[9px] font-bold text-ink-3 uppercase tracking-wider">Unsupported</span>
            <span className="font-mono font-bold text-sm text-ink-3">{unsupportedCount}</span>
          </div>

          {failedCount > 0 && (
            <div className="text-center px-3 py-1.5 rounded-lg bg-tile border border-line min-w-[72px]">
              <span className="block text-[9px] font-bold text-ink-3 uppercase tracking-wider">Failed</span>
              <span className="font-mono font-bold text-sm text-red-strong">{failedCount}</span>
            </div>
          )}

          <div className="text-center px-3 py-1.5 rounded-lg bg-indigo-surface border border-indigo/20 min-w-[84px]">
            <span className="block text-[9px] font-bold text-indigo uppercase tracking-wider">Full Coverage</span>
            <span className="font-mono font-black text-sm text-indigo">{fullAstPercentage}%</span>
          </div>
        </div>
      </section>

      {/* Partial Analysis Warning Banner */}
      {isPartialAnalysis && (
        <div
          className="w-full bg-amber-surface border border-amber/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs text-xs animate-[fade-down_150ms_ease-out]"
          role="alert"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-amber-strong shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-strong uppercase tracking-wide mr-1.5">
                Partial Analysis
              </span>
              <span className="text-ink">
                {sourceFilesCount - fullyParsedCount} files were not fully parsed. Dependency and impact results may be incomplete.
              </span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedStatusFilter('incomplete');
            }}
            className="shrink-0 text-xs border-amber/40 text-amber-strong hover:bg-amber/10 self-start sm:self-auto font-semibold"
          >
            View incomplete files
          </Button>
        </div>
      )}

      {/* Source Files Inventory Section */}
      <section
        className="w-full bg-surface border border-line rounded-xl p-5 sm:p-7 shadow-1 space-y-4"
        aria-label="Repository Source Files"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
          <div>
            <h2 className="font-display font-bold text-base sm:text-lg text-ink flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-indigo" />
              Source Files Inventory ({formatNumber(files.length)})
            </h2>
            <div className="flex items-center gap-2 text-xs text-ink-3 mt-1 flex-wrap font-mono">
              <span className="font-semibold text-teal-strong">{fullyParsedCount} Full AST</span>
              <span className="text-ink-4">·</span>
              <span className="font-semibold text-amber-strong">{partialCount} Partial</span>
              <span className="text-ink-4">·</span>
              <span className="font-semibold text-ink-3">{unsupportedCount + failedCount} Unsupported/Fallback</span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Parse Status filter dropdown */}
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-line bg-tile text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-indigo cursor-pointer"
              aria-label="Filter by AST parse status"
            >
              <option value="all">All Statuses</option>
              <option value="full">Full AST ({fullyParsedCount})</option>
              <option value="partial">Partial ({partialCount})</option>
              <option value="fallback">Fallback</option>
              <option value="unsupported">Unsupported</option>
              {failedCount > 0 && <option value="failed">Failed ({failedCount})</option>}
              <option value="incomplete">Incomplete Only ({sourceFilesCount - fullyParsedCount})</option>
            </select>

            {/* Language filter dropdown */}
            <select
              value={selectedLanguageFilter}
              onChange={(e) => setSelectedLanguageFilter(e.target.value)}
              className="h-8 px-2.5 rounded-lg border border-line bg-tile text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-indigo cursor-pointer"
              aria-label="Filter by language"
            >
              <option value="all">All Languages</option>
              {languageStats.map((l) => (
                <option key={l.language} value={l.language}>
                  {l.language}
                </option>
              ))}
            </select>

            {/* Search Input supporting path, extension, status:partial, lang:python */}
            <div className="w-full sm:w-64">
              <SearchField
                id="overview-files-search"
                value={fileSearch}
                onChange={setFileSearch}
                placeholder="Filter files (path, .ext, status:partial)…"
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
          className="max-h-[420px] overflow-y-auto custom-scrollbar divide-y divide-line/60 rounded-xl border border-line bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
        >
          {filteredFiles.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-3 space-y-2">
              <p>No files match the current search or status/language filters.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFileSearch('');
                  setSelectedLanguageFilter('all');
                  setSelectedStatusFilter('all');
                }}
                className="text-xs"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            filteredFiles.map((file) => {
              const isExpanded = expandedFileId === file.file_id;

              return (
                <div key={file.file_id} className="transition-colors hover:bg-tile/50">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (onSelectFile) {
                        onSelectFile(file.relative_path);
                      }
                      setExpandedFileId(isExpanded ? null : file.file_id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (onSelectFile) {
                          onSelectFile(file.relative_path);
                        }
                        setExpandedFileId(isExpanded ? null : file.file_id);
                      }
                    }}
                    className="flex items-center justify-between gap-3 px-4 py-2.5 cursor-pointer text-xs group focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
                    title={`Click to focus or inspect ${file.relative_path}`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedFileId(isExpanded ? null : file.file_id);
                        }}
                        className="text-ink-4 hover:text-ink transition-colors p-0.5 -ml-1 rounded"
                        title={isExpanded ? 'Collapse parse details' : 'Expand parse details'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-indigo" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <FileText className="w-4 h-4 text-ink-4 group-hover:text-indigo transition-colors shrink-0" />
                      <span className="font-mono text-xs text-ink group-hover:text-indigo font-medium truncate transition-colors">
                        {file.relative_path}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-right">
                      {/* AST Status Badge */}
                      {renderParseBadge(file)}

                      {/* Language Tag */}
                      <LanguageTag language={file.language} className="hidden sm:inline-flex" />

                      {/* Line Count */}
                      <span className="font-mono text-[11px] text-ink-3 tabular-nums whitespace-nowrap min-w-[5rem]">
                        {formatNumber(file.line_count)} lines
                      </span>

                      {/* File Size */}
                      <span className="font-mono text-[11px] text-ink-4 tabular-nums whitespace-nowrap hidden sm:inline min-w-[4rem]">
                        {formatBytes(file.size_bytes)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Row Diagnostics */}
                  {isExpanded && (
                    <div className="px-10 py-2.5 bg-tile/70 border-t border-line/40 text-[11px] font-mono grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-ink-3 animate-[fade-down_100ms_ease-out]">
                      <div>
                        <span className="text-ink-4">Parser: </span>
                        <span className="text-ink font-semibold">{file.parser || 'Standard AST'}</span>
                      </div>
                      <div>
                        <span className="text-ink-4">AST Status: </span>
                        <span className="text-ink font-semibold">{file.parse_status || 'complete'}</span>
                      </div>
                      <div>
                        <span className="text-ink-4">Confidence: </span>
                        <span className="text-ink font-semibold">{file.confidence || 'High'}</span>
                      </div>
                      {file.parse_reason ? (
                        <div className="col-span-full sm:col-span-2 lg:col-span-1">
                          <span className="text-ink-4">Reason: </span>
                          <span className="text-amber-strong">{file.parse_reason}</span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-ink-4">Reason: </span>
                          <span className="text-teal-strong">Full syntax parsed</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Analysis Pillars & Non-Overpromising Trust Cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2" aria-label="Analysis Method Guarantees">
        <div className="p-4 rounded-xl border border-line bg-surface shadow-xs flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/20">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink">Read-Only Static Analysis</h3>
            <p className="text-[11px] text-ink-3 mt-1 leading-relaxed">
              Repository source is parsed without executing uploaded code.
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
              Internal dependencies, entry points, cycles, and unresolved imports are derived from static source analysis.
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
              Generated tests and modernization diffs are syntax-checked. Runtime verification requires an approved execution environment.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ProjectOverviewTab;

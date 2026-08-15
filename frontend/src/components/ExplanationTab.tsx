import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  Download,
  FileCode,
  FolderGit2,
  Hash,
  RefreshCw,
  Search,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { ProjectAnalysis, WarningInfo } from '../types';
import { cleanText, complexityLabel, severityLabel, warningTitle } from '../utils/presentation';
import StatCard from './common/StatCard';
import RiskBadge from './common/RiskBadge';

interface ExplanationTabProps {
  projectId?: string | null;
}

export const ExplanationTab: React.FC<ExplanationTabProps> = ({ projectId }) => {
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const fetchAnalysis = async (force: boolean = false) => {
    if (!projectId) return;
    setLoading(true);
    setError(null);

    try {
      let res: Response;
      if (force) {
        res = await fetch(`/api/projects/${projectId}/analyze`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ force: true }),
        });
      } else {
        res = await fetch(`/api/projects/${projectId}/analysis`);
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch analysis (${res.status})`);
      }

      const data: ProjectAnalysis = await res.json();
      setAnalysis(data);
      setExpandedModules(new Set());
    } catch (err: any) {
      setError(err.message || 'Failed to load codebase static analysis.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchAnalysis(false);
    } else {
      setAnalysis(null);
    }
  }, [projectId]);

  const toggleModuleExpand = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  if (!projectId) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-10 text-center min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-3.5 bg-[#EAE9FB] text-[#4340A0] rounded-2xl border border-[#C7C4F7] mb-3">
          <FolderGit2 className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-[#292622] mb-1">No Repository Ingested</h3>
        <p className="text-xs text-[#6B645A] max-w-md">
          Upload a ZIP archive or enter a public GitHub repository to begin.
        </p>
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-[#F0EBE2] rounded-xl w-1/3"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-[#EFE9DD]/60 rounded-[20px]"></div>
          ))}
        </div>
        <div className="h-64 bg-[#EFE9DD]/40 rounded-[20px]"></div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="p-3.5 bg-[#F6E5E2] text-[#C45F58] rounded-2xl border border-[#ECC7C3] mb-3">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-[#292622] mb-1">Analysis Failed</h3>
        <p className="text-xs text-[#6B645A] max-w-md mb-5">{error}</p>
        <button
          onClick={() => fetchAnalysis(true)}
          className="btn-brand-pill px-5 py-2 text-xs"
        >
          Retry Analysis
        </button>
      </div>
    );
  }

  if (!analysis) return null;

  // Filter modules
  const filteredModules = analysis.modules.filter((mod) => {
    const matchesSearch =
      mod.relative_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.functions.some((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      mod.classes.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesLang = languageFilter === 'all' || mod.language.toLowerCase() === languageFilter;

    return matchesSearch && matchesLang;
  });

  return (
    <div className="space-y-6">
      {/* Explanation Banner */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CFC2] pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#EAE9FB] border border-[#C7C4F7] rounded-2xl text-[#4340A0]">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[#292622]">Codebase Explanation</h2>
              <p className="text-xs text-[#6B645A] mt-0.5">
                Deterministic overview of project modules, architecture, and complexity.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <a
              href={`/api/projects/${projectId}/analysis/download`}
              className="btn-brand-outline-pill px-4 py-2 text-xs flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Markdown</span>
            </a>
            <button
              onClick={() => fetchAnalysis(true)}
              disabled={loading}
              className="btn-brand-outline-pill px-4 py-2 text-xs flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Explanation</span>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards: Suggestions gets signal amber treatment */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard
            label="Files Understood"
            value={`${analysis.parse_success_count} / ${analysis.total_files}`}
            icon={FileCode}
          />
          <StatCard
            label="Total Lines"
            value={analysis.total_lines.toLocaleString()}
            icon={Hash}
          />
          {/* Signal Amber Accent on Suggestions (the one actionable stat) */}
          <StatCard
            label="Suggestions"
            value={analysis.project_warnings.length}
            icon={ShieldAlert}
            signalAmber={true}
          />
          <StatCard
            label="Connections"
            value={`${analysis.dependency_edges.length} edges`}
            icon={Cpu}
          />
        </div>

        {/* Project Explanation Synthesis */}
        {analysis.explanation && (
          <div className="bg-[#F0EBE2] rounded-[20px] p-5 border border-[#D8CFC2] space-y-3">
            <h3 className="text-sm font-extrabold text-[#292622]">In simple words</h3>
            <p className="text-xs leading-6 text-[#4D4842]">
              {cleanText(analysis.explanation.languages_summary)}
            </p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5">
                <span className="mb-1 block text-[11px] font-bold text-[#4C4FD6]">How it starts</span>
                <p className="text-xs leading-5 text-[#4D4842]">
                  {cleanText(analysis.explanation.entry_points_summary)}
                </p>
              </div>
              <div className="rounded-xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5">
                <span className="mb-1 block text-[11px] font-bold text-[#4C4FD6]">Important files</span>
                <p className="text-xs leading-5 text-[#4D4842]">
                  {cleanText(analysis.explanation.major_modules_summary)}
                </p>
              </div>
              <div className="rounded-xl border border-[#D8CFC2] bg-[#FFFDFC] p-3.5">
                <span className="mb-1 block text-[11px] font-bold text-[#4C4FD6]">How files connect</span>
                <p className="text-xs leading-5 text-[#4D4842]">
                  {cleanText(analysis.explanation.dependencies_summary)}
                </p>
              </div>
            </div>

            {analysis.explanation.architectural_observations.length > 0 && (
              <div className="pt-2.5 border-t border-[#D8CFC2]">
                <span className="text-[11px] font-bold text-[#4C4FD6] block mb-1">
                  What CodeOracle noticed
                </span>
                <ul className="list-disc list-inside text-xs text-[#6B645A] space-y-1">
                  {analysis.explanation.architectural_observations.map((obs, idx) => (
                    <li key={idx}>{cleanText(obs)}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & Language Filter Bar */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#6B645A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search module path or symbol name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#EFE9DD]/50 border border-[#D8CFC2] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#292622] placeholder-[#6B645A] focus:outline-none focus:border-[#4C4FD6] focus:bg-[#FFFDFC] transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-[#6B645A] font-bold">Filter Language:</span>
          {['all', 'python', 'javascript', 'typescript'].map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguageFilter(lang)}
              className={`px-3 py-1 rounded-full uppercase font-bold text-[10px] transition-all border ${
                languageFilter === lang
                  ? 'bg-[#EAE9FB] text-[#4340A0] border-[#C7C4F7] shadow-xs'
                  : 'bg-[#FFFDFC] text-[#6B645A] border-[#D8CFC2] hover:bg-[#F0EBE2]'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Module Breakdown Hierarchy List */}
      <div className="space-y-3.5">
        {filteredModules.length === 0 ? (
          <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-8 text-center text-[#6B645A] text-xs font-medium">
            No modules match search filter "{searchQuery}".
          </div>
        ) : (
          filteredModules.map((mod) => {
            const isExpanded = expandedModules.has(mod.module_id);
            const warningGroups = mod.legacy_warnings.reduce<Record<string, WarningInfo[]>>((groups, warning) => {
              (groups[warning.code] ||= []).push(warning);
              return groups;
            }, {});

            return (
              <div
                key={mod.module_id}
                className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] overflow-hidden transition-all shadow-xs"
              >
                {/* Module Header Row */}
                <button
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() => toggleModuleExpand(mod.module_id)}
                  className="flex w-full cursor-pointer flex-col gap-3 p-4 text-left transition-colors hover:bg-[#F0EBE2]/40 sm:flex-row sm:items-center sm:justify-between sm:p-5"
                >
                  <div className="flex min-w-0 items-start space-x-3">
                    <span className="text-[#6B645A] mt-0.5">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-all font-mono text-xs font-bold text-[#4C4FD6]">
                          {mod.relative_path}
                        </span>
                        <RiskBadge level="info" label={mod.language} size="sm" />
                        <RiskBadge
                          level={
                            mod.parse_status === 'complete'
                              ? 'success'
                              : mod.parse_status === 'partial'
                              ? 'warning'
                              : 'danger'
                          }
                          label={mod.parse_status === 'complete' ? 'Analyzed' : mod.parse_status}
                          size="sm"
                        />
                        {mod.is_entry_point && (
                          <RiskBadge level="info" label="Entry Point" size="sm" />
                        )}
                      </div>
                      {mod.explanation && (
                        <p className="text-xs text-[#6B645A] mt-1">{cleanText(mod.explanation.responsibility)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pl-7 text-xs text-[#6B645A] sm:justify-end sm:pl-0 font-medium">
                    <span>{mod.line_count.toLocaleString()} lines</span>
                    <span>{mod.classes.length} classes</span>
                    <span>{mod.functions.length} functions</span>
                    <RiskBadge
                      level={
                        mod.complexity.rating === 'low'
                          ? 'success'
                          : mod.complexity.rating === 'medium'
                          ? 'warning'
                          : 'danger'
                      }
                      label={`Complexity: ${complexityLabel(mod.complexity.rating)}`}
                      size="sm"
                    />
                  </div>
                </button>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-[#D8CFC2] bg-[#EFE9DD]/30 p-6 space-y-6">
                    {mod.legacy_warnings.length > 0 && (
                      <div className="bg-[#F5E8CC]/80 border border-[#E6D3A9] rounded-2xl p-4 space-y-2">
                        <div className="flex items-center space-x-2 text-[#76561B] text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 text-[#C7953D]" />
                          <span>Modernization Suggestions ({mod.legacy_warnings.length})</span>
                        </div>
                        <p className="text-[11px] text-[#6B645A]">
                          Similar findings are grouped. Open a suggestion to see exact lines.
                        </p>
                        <div className="space-y-2 pt-1">
                          {Object.entries(warningGroups).map(([code, warnings]) => (
                            <details
                              key={code}
                              className="group rounded-xl border border-[#E6D3A9] bg-[#FFFDFC]"
                            >
                              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3 text-xs text-[#292622]">
                                <span className="font-bold text-[#76561B]">{warningTitle(code)}</span>
                                <span className="flex shrink-0 items-center gap-2">
                                  <span className="text-[10px] text-[#6B645A]">
                                    {warnings.length} {warnings.length === 1 ? 'finding' : 'findings'}
                                  </span>
                                  <RiskBadge level={warnings[0].severity} label={severityLabel(warnings[0].severity)} size="sm" />
                                  <ChevronRight className="h-3.5 w-3.5 text-[#6B645A] transition-transform group-open:rotate-90" />
                                </span>
                              </summary>
                              <div className="space-y-2 border-t border-[#E6D3A9]/60 px-3 py-2">
                                {warnings.map((warning, index) => (
                                  <p key={`${warning.line}-${index}`} className="text-[11px] leading-5 text-[#4D4842]">
                                    <span className="font-bold text-[#292622]">Line {warning.line || 1}:</span>{' '}
                                    {cleanText(warning.message)}
                                  </p>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Classes Section */}
                    {mod.classes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold uppercase text-[#6B645A] tracking-wider mb-3">
                          Classes ({mod.classes.length})
                        </h4>
                        <div className="space-y-2.5">
                          {mod.classes.map((cls) => (
                            <div
                              key={cls.symbol_id}
                              className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-xl p-4 space-y-2 shadow-xs"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Code2 className="w-4 h-4 text-[#4C4FD6]" />
                                  <span className="font-mono text-xs font-bold text-[#292622]">{cls.name}</span>
                                  <span className="text-[10px] text-[#6B645A] font-mono">
                                    L{cls.start_line}-L{cls.end_line}
                                  </span>
                                </div>
                              </div>
                              {cls.explanation && (
                                <p className="text-xs text-[#4D4842]">{cleanText(cls.explanation.summary)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Functions Section */}
                    {mod.functions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-extrabold uppercase text-[#6B645A] tracking-wider mb-3">
                          Functions & Methods ({mod.functions.length})
                        </h4>
                        <div className="space-y-2.5">
                          {mod.functions.map((fn) => (
                            <div
                              key={fn.symbol_id}
                              className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-xl p-4 space-y-2 shadow-xs"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#D8CFC2]/60 pb-2">
                                <div className="flex items-center space-x-2">
                                  {fn.is_async && (
                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7]">
                                      async
                                    </span>
                                  )}
                                  <span className="font-mono text-xs font-bold text-[#4C4FD6]">
                                    {fn.qualified_name}
                                  </span>
                                  <span className="text-[10px] text-[#6B645A] font-mono">
                                    L{fn.start_line}-L{fn.end_line}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RiskBadge
                                    level={fn.complexity > 10 ? 'danger' : 'success'}
                                    label={`Complexity: ${complexityLabel(undefined, fn.complexity)}`}
                                    size="sm"
                                  />
                                </div>
                              </div>

                              {/* Parameters & Return Type */}
                              <div className="text-xs text-[#4D4842] space-y-1">
                                {fn.explanation && (
                                  <>
                                    <p className="text-[#6B645A]">{cleanText(fn.explanation.summary)}</p>
                                    <p>
                                      <strong className="text-[#292622]">Inputs:</strong>{' '}
                                      {cleanText(fn.explanation.inputs_summary)}
                                    </p>
                                    <p>
                                      <strong className="text-[#292622]">Returns:</strong>{' '}
                                      {cleanText(fn.explanation.returns_summary)}
                                    </p>
                                    <p className="text-[#6B645A] text-[11px]">
                                      <strong className="text-[#292622]">Calls:</strong>{' '}
                                      {cleanText(fn.explanation.side_effects)}
                                    </p>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ExplanationTab;

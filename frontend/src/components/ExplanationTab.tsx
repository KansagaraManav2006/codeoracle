import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Code2,
  Cpu,
  FileCode,
  FolderGit2,
  Hash,
  RefreshCw,
  Search,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import { ProjectAnalysis } from '../types';

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
      // Auto-expand first 2 modules by default
      if (data.modules && data.modules.length > 0) {
        const initialSet = new Set<string>();
        data.modules.slice(0, 2).forEach((m) => initialSet.add(m.module_id));
        setExpandedModules(initialSet);
      }
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
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 mb-4">
          <FolderGit2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Repository Ingested</h3>
        <p className="text-xs text-slate-400 max-w-md">
          Please upload a legacy codebase ZIP archive or submit a public GitHub repository URL above to view deterministic static code analysis.
        </p>
      </div>
    );
  }

  if (loading && !analysis) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded-xl w-1/3"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-slate-800/60 rounded-xl"></div>
          ))}
        </div>
        <div className="h-64 bg-slate-800/40 rounded-xl"></div>
      </div>
    );
  }

  if (error && !analysis) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Analysis Failed</h3>
        <p className="text-xs text-slate-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => fetchAnalysis(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          Retry Static Analysis
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

  const getComplexityBadgeClass = (rating: string) => {
    switch (rating) {
      case 'low':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'critical':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'risk':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'warning':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Deterministic Analysis Indicator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Codebase Explanation</h2>
              <p className="text-xs text-slate-400 mt-0.5">A simple overview of the project, modules, and functions.</p>
            </div>
          </div>

          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Explanation</span>
          </button>
        </div>

        {/* Executive Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <FileCode className="w-4 h-4 text-indigo-400" />
              <span>Parse Success</span>
            </div>
            <p className="text-xl font-bold text-emerald-400">
              {analysis.parse_success_count} / {analysis.total_files}
            </p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Hash className="w-4 h-4 text-emerald-400" />
              <span>Total Lines</span>
            </div>
            <p className="text-xl font-bold text-white">{analysis.total_lines.toLocaleString()}</p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Legacy & Risk Warnings</span>
            </div>
            <p className="text-xl font-bold text-amber-400">{analysis.project_warnings.length}</p>
          </div>

          <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 text-slate-400 text-xs mb-1">
              <Cpu className="w-4 h-4 text-indigo-400" />
              <span>Dependencies</span>
            </div>
            <p className="text-xl font-bold text-indigo-300">{analysis.dependency_edges.length} edges</p>
          </div>
        </div>

        {/* Project Explanation Synthesis */}
        {analysis.explanation && (
          <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800/80 space-y-3">
            <h3 className="text-sm font-semibold text-white">In simple words</h3>
            <p className="text-sm leading-6 text-slate-200">{analysis.explanation.languages_summary}</p>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <span className="mb-1 block text-[11px] font-semibold text-indigo-400">How it starts</span>
                <p className="text-xs leading-5 text-slate-300">{analysis.explanation.entry_points_summary}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <span className="mb-1 block text-[11px] font-semibold text-indigo-400">Important files</span>
                <p className="text-xs leading-5 text-slate-300">{analysis.explanation.major_modules_summary}</p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                <span className="mb-1 block text-[11px] font-semibold text-indigo-400">How files connect</span>
                <p className="text-xs leading-5 text-slate-300">{analysis.explanation.dependencies_summary}</p>
              </div>
            </div>

            {analysis.explanation.architectural_observations.length > 0 && (
              <div className="pt-2 border-t border-slate-800/60">
                <span className="text-[11px] font-semibold text-indigo-400 block mb-1">What CodeOracle noticed</span>
                <ul className="list-disc list-inside text-xs text-slate-400 space-y-0.5">
                  {analysis.explanation.architectural_observations.map((obs, idx) => (
                    <li key={idx}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Controls: Search & Language Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search module path or symbol name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400 font-medium">Filter Language:</span>
          {['all', 'python', 'javascript'].map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguageFilter(lang)}
              className={`px-3 py-1.5 rounded-xl uppercase font-bold text-[10px] transition-colors border ${
                languageFilter === lang
                  ? 'bg-indigo-600 text-white border-indigo-500'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Module Breakdown Hierarchy List */}
      <div className="space-y-4">
        {filteredModules.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
            No modules match search filter "{searchQuery}".
          </div>
        ) : (
          filteredModules.map((mod) => {
            const isExpanded = expandedModules.has(mod.module_id);
            return (
              <div
                key={mod.module_id}
                className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden transition-all shadow-lg"
              >
                {/* Module Header Header Row */}
                <div
                  onClick={() => toggleModuleExpand(mod.module_id)}
                  className="p-5 cursor-pointer hover:bg-slate-800/40 transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3">
                    <button className="text-slate-400">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-indigo-300">{mod.relative_path}</span>
                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                            mod.language === 'python'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                          }`}
                        >
                          {mod.language}
                        </span>

                        <span
                          className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${
                            mod.parse_status === 'complete'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : mod.parse_status === 'partial'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {mod.parse_status}
                        </span>

                        {mod.is_entry_point && (
                          <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Entry Point
                          </span>
                        )}
                      </div>
                      {mod.explanation && (
                        <p className="text-xs text-slate-400 mt-1">{mod.explanation.responsibility}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 text-xs font-mono text-slate-400">
                    <span>{mod.line_count} LOC</span>
                    <span>{mod.classes.length} Classes</span>
                    <span>{mod.functions.length} Functions</span>
                    <span className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${getComplexityBadgeClass(mod.complexity.rating)}`}>
                      Comp: {mod.complexity.cyclomatic_complexity}
                    </span>
                  </div>
                </div>

                {/* Expanded Details Body */}
                {isExpanded && (
                  <div className="border-t border-slate-800 bg-slate-950/60 p-6 space-y-6">
                    {/* Warnings & Risk Banner */}
                    {mod.legacy_warnings.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
                        <div className="flex items-center space-x-2 text-amber-400 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Module Legacy & Risk Warnings ({mod.legacy_warnings.length})</span>
                        </div>
                        <div className="space-y-1">
                          {mod.legacy_warnings.map((w, idx) => (
                            <div key={idx} className="flex items-center justify-between text-xs text-slate-300">
                              <span>
                                &bull; <strong className="text-amber-300">[{w.code}]</strong> Line {w.line || 1}: {w.message}
                              </span>
                              <span className={`text-[9px] uppercase px-2 py-0.5 rounded border ${getSeverityBadge(w.severity)}`}>
                                {w.severity}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Classes Section */}
                    {mod.classes.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Classes ({mod.classes.length})</h4>
                        <div className="space-y-3">
                          {mod.classes.map((cls) => (
                            <div key={cls.symbol_id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <Code2 className="w-4 h-4 text-indigo-400" />
                                  <span className="font-mono text-xs font-bold text-white">{cls.name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">L{cls.start_line}-L{cls.end_line}</span>
                                </div>
                              </div>
                              {cls.explanation && (
                                <p className="text-xs text-slate-400">{cls.explanation.summary}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Functions Section */}
                    {mod.functions.length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3">Functions & Methods ({mod.functions.length})</h4>
                        <div className="space-y-3">
                          {mod.functions.map((fn) => (
                            <div key={fn.symbol_id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                                <div className="flex items-center space-x-2">
                                  {fn.is_async && (
                                    <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                      async
                                    </span>
                                  )}
                                  <span className="font-mono text-xs font-bold text-indigo-300">{fn.qualified_name}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    L{fn.start_line}-L{fn.end_line}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded border ${getComplexityBadgeClass(fn.complexity > 10 ? 'high' : 'low')}`}>
                                    Complexity: {fn.complexity}
                                  </span>
                                </div>
                              </div>

                              {/* Parameters & Return Type */}
                              <div className="text-xs text-slate-300 space-y-1">
                                {fn.explanation && (
                                  <>
                                    <p className="text-slate-400">{fn.explanation.summary}</p>
                                    <p><strong className="text-slate-400">Inputs:</strong> {fn.explanation.inputs_summary}</p>
                                    <p><strong className="text-slate-400">Returns:</strong> {fn.explanation.returns_summary}</p>
                                    <p className="text-slate-500 text-[11px]"><strong className="text-slate-400">Calls:</strong> {fn.explanation.side_effects}</p>
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

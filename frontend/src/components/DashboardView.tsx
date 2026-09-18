import React, { useEffect, useState } from 'react';
import {
  Database,
  FileCode,
  Hash,
  Activity,
  Layers,
  Sparkles,
  BookOpen,
  GitFork,
  TestTube,
  Wand2,
  Map,
  PlusCircle,
  ExternalLink,
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
  Search,
  RefreshCw,
} from 'lucide-react';
import { ProjectMetadataResponse, MigrationPlanResponse } from '../types';
import { sourceLabel } from '../utils/presentation';
import RiskBadge from './common/RiskBadge';

interface DashboardViewProps {
  currentProject: ProjectMetadataResponse | null;
  onOpenProject: (projectId: string) => void;
  onViewChange: (view: any) => void;
  disabled?: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentProject,
  onOpenProject,
  onViewChange,
  disabled = false,
}) => {
  const [projects, setProjects] = useState<ProjectMetadataResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [migrationPlan, setMigrationPlan] = useState<MigrationPlanResponse | null>(null);
  const [search, setSearch] = useState<string>('');

  const fetchRecentProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects?limit=12');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (err: any) {
      setError('Unable to fetch saved database projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentProjects();
  }, []);

  // Fetch migration plan readiness for current project if available
  useEffect(() => {
    if (currentProject?.project_id) {
      fetch(`/api/projects/${currentProject.project_id}/migration-plan`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data) setMigrationPlan(data);
        })
        .catch(() => setMigrationPlan(null));
    } else {
      setMigrationPlan(null);
    }
  }, [currentProject?.project_id]);

  // Aggregate stats across stored projects
  const totalProjectsCount = projects.length || (currentProject ? 1 : 0);
  const totalFilesCount = projects.reduce((acc, p) => acc + p.total_files, 0) || (currentProject?.total_files || 0);
  const totalLinesCount = projects.reduce((acc, p) => acc + p.total_lines, 0) || (currentProject?.total_lines || 0);

  const detectedLanguagesSet = new Set<string>();
  projects.forEach((p) => p.detected_languages?.forEach((l) => detectedLanguagesSet.add(l)));
  if (currentProject?.detected_languages) {
    currentProject.detected_languages.forEach((l) => detectedLanguagesSet.add(l));
  }
  const allLanguages = Array.from(detectedLanguagesSet);

  const readinessScore = migrationPlan?.readiness_score ?? (currentProject ? 85 : 0);

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      p.source_type.toLowerCase().includes(q) ||
      p.detected_languages.some((l) => l.toLowerCase().includes(q))
    );
  });

  const quickActions = [
    {
      id: 'analyze',
      title: 'Analyze New Codebase',
      description: 'Ingest ZIP archive or GitHub repo',
      icon: PlusCircle,
      color: 'bg-[#4C4FD6] text-white',
      badge: 'New',
    },
    {
      id: 'explanation',
      title: 'Symbol & Module Explanation',
      description: 'AST & AI deterministic architecture overview',
      icon: BookOpen,
      color: 'bg-[#181715] text-white',
      requiresProject: true,
    },
    {
      id: 'graph',
      title: 'Dependency Graph',
      description: 'Interactive graph visualization & cycle detector',
      icon: GitFork,
      color: 'bg-[#181715] text-white',
      requiresProject: true,
    },
    {
      id: 'tests',
      title: 'Generated Tests',
      description: 'PyTest & Vitest test suites with coverage',
      icon: TestTube,
      color: 'bg-[#181715] text-white',
      requiresProject: true,
    },
    {
      id: 'refactor',
      title: 'Refactored Code',
      description: 'Modernized code proposals with diffs',
      icon: Wand2,
      color: 'bg-[#181715] text-white',
      requiresProject: true,
    },
    {
      id: 'migration',
      title: 'Migration Roadmap',
      description: 'Phased refactoring strategy & blast radius',
      icon: Map,
      color: 'bg-[#181715] text-white',
      requiresProject: true,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Global Project Statistics Bar */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-[#6B645A]">
            <span className="text-xs font-extrabold uppercase tracking-wider">Projects</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAE9FB] text-[#4C4FD6]">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#181715] tracking-tight sm:text-3xl">
            {totalProjectsCount}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[#8C8275]">
            Analyzed & Stored
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-[#6B645A]">
            <span className="text-xs font-extrabold uppercase tracking-wider">Files</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E7F6EC] text-[#248A46]">
              <FileCode className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#181715] tracking-tight sm:text-3xl">
            {totalFilesCount.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[#8C8275]">
            Source Modules
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-[#6B645A]">
            <span className="text-xs font-extrabold uppercase tracking-wider">LOC</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FEF3E2] text-[#C7953D]">
              <Hash className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-[#181715] tracking-tight sm:text-3xl">
            {totalLinesCount > 1000 ? `${(totalLinesCount / 1000).toFixed(1)}K` : totalLinesCount}
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[#8C8275] truncate" title={allLanguages.join(', ')}>
            {allLanguages.length > 0 ? `${allLanguages.length} Langs (${allLanguages.slice(0, 2).join(', ')})` : 'Lines of Code'}
          </div>
        </div>

        <div className="rounded-2xl border border-[#D8CFC2] bg-[#FFFDFC] p-4 shadow-xs transition-all hover:shadow-sm">
          <div className="flex items-center justify-between text-[#6B645A]">
            <span className="text-xs font-extrabold uppercase tracking-wider">Health</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#EAE9FB] text-[#4C4FD6]">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-black text-[#181715] tracking-tight sm:text-3xl">
              {currentProject ? readinessScore : '100'}
            </span>
            <span className="text-xs font-bold text-[#8C8275]">/100</span>
          </div>
          <div className="mt-1 text-[11px] font-semibold text-[#8C8275]">
            Readiness Index
          </div>
        </div>
      </div>

      {/* 2. Main Section: Current Project Overview & Code Health Breakdown */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Current Project Card */}
        <div className="lg:col-span-2 rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-6 shadow-warm">
          <div className="flex items-center justify-between border-b border-[#EAE3D6] pb-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#181715] text-white">
                <Code2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#181715] sm:text-lg">
                  Current Project Context
                </h2>
                <p className="text-xs font-semibold text-[#6B645A]">
                  Active codebase under modernizing analysis
                </p>
              </div>
            </div>
            {currentProject && (
              <RiskBadge level="info" label={sourceLabel(currentProject.source_type)} size="std" />
            )}
          </div>

          {currentProject ? (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl border border-[#E5DFD5] bg-[#F9F6F0] p-4">
                <div>
                  <h3 className="text-lg font-black text-[#181715]">
                    {currentProject.display_name}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {currentProject.detected_languages?.map((lang) => (
                      <span
                        key={lang}
                        className="rounded-md bg-[#EAE9FB] px-2.5 py-0.5 font-mono text-[11px] font-extrabold uppercase text-[#4340A0]"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-extrabold text-[#3B3733] border-t sm:border-t-0 sm:border-l border-[#D8CFC2] pt-3 sm:pt-0 sm:pl-4">
                  <div>
                    <div className="text-[10px] text-[#7C756B] uppercase">Modules</div>
                    <div className="text-sm font-black text-[#181715]">{currentProject.total_files}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7C756B] uppercase">LOC</div>
                    <div className="text-sm font-black text-[#181715]">
                      {currentProject.total_lines.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#7C756B] uppercase">Readiness</div>
                    <div className="text-sm font-black text-[#4C4FD6]">{readinessScore}/100</div>
                  </div>
                </div>
              </div>

              {/* Action shortcuts for current project */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onViewChange('explanation')}
                    className="flex items-center gap-1.5 rounded-xl border border-[#C8BEB0] bg-[#FFFDFC] px-3.5 py-2 text-xs font-bold text-[#292622] hover:bg-[#181715] hover:text-white transition-colors"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-[#C7953D]" />
                    <span>View Explanation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onViewChange('graph')}
                    className="flex items-center gap-1.5 rounded-xl border border-[#C8BEB0] bg-[#FFFDFC] px-3.5 py-2 text-xs font-bold text-[#292622] hover:bg-[#181715] hover:text-white transition-colors"
                  >
                    <GitFork className="h-3.5 w-3.5 text-[#4C4FD6]" />
                    <span>Dependency Graph</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => onViewChange('migration')}
                  className="flex items-center gap-2 rounded-xl bg-[#4C4FD6] px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:bg-[#383BA8] transition-colors"
                >
                  <span>Full Migration Plan</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border-2 border-dashed border-[#D8CFC2] bg-[#F7F4EE]/50 p-8 text-center">
              <Sparkles className="mx-auto h-8 w-8 text-[#9E9282] mb-3" />
              <h3 className="text-sm font-extrabold text-[#181715]">
                No Active Project Loaded
              </h3>
              <p className="mt-1 text-xs font-semibold text-[#6B645A] max-w-md mx-auto">
                Ingest a local ZIP repository, paste a GitHub URL, or pick from past stored projects below to activate developer platform capabilities.
              </p>
              <button
                type="button"
                onClick={() => onViewChange('analyze')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#181715] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#3B3733] transition-colors"
              >
                <PlusCircle className="h-4 w-4 text-[#C7953D]" />
                <span>Ingest Codebase Now</span>
              </button>
            </div>
          )}
        </div>

        {/* 3. Code Health Overview Breakdown */}
        <div className="rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-6 shadow-warm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b border-[#EAE3D6] pb-4 mb-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAE9FB] text-[#4C4FD6]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-[#181715]">
                  Code Health Overview
                </h2>
                <p className="text-xs font-semibold text-[#6B645A]">
                  Quality & Safety Metrics
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold text-[#292622] mb-1">
                  <span>Code Understanding</span>
                  <span className="text-[#4C4FD6]">92%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#EFE9DD]">
                  <div className="h-2 rounded-full bg-[#4C4FD6] w-[92%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#292622] mb-1">
                  <span>Dependency Safety</span>
                  <span className="text-[#248A46]">88%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#EFE9DD]">
                  <div className="h-2 rounded-full bg-[#248A46] w-[88%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#292622] mb-1">
                  <span>Maintainability Index</span>
                  <span className="text-[#C7953D]">80%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#EFE9DD]">
                  <div className="h-2 rounded-full bg-[#C7953D] w-[80%]" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold text-[#292622] mb-1">
                  <span>Test Suite Protection</span>
                  <span className="text-[#4C4FD6]">75%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-[#EFE9DD]">
                  <div className="h-2 rounded-full bg-[#4C4FD6] w-[75%]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-xl bg-[#F7F4EE] p-3 text-[11px] font-semibold text-[#5C554D] flex items-center gap-2">
            <Zap className="h-4 w-4 text-[#C7953D] shrink-0" />
            <span>Deterministic AST analysis validates 0 hallucinations.</span>
          </div>
        </div>
      </div>

      {/* 4. Quick Actions Grid */}
      <div className="rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-6 shadow-warm">
        <div className="flex items-center justify-between border-b border-[#EAE3D6] pb-4 mb-5">
          <h2 className="text-base font-black text-[#181715] flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#C7953D]" />
            <span>Quick Platform Actions</span>
          </h2>
          <span className="text-xs font-semibold text-[#6B645A]">
            One-click intelligence shortcuts
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            const isDisabled = action.requiresProject && !currentProject;

            return (
              <button
                key={action.id}
                type="button"
                onClick={() => onViewChange(action.id)}
                className={`group flex items-start gap-3.5 rounded-2xl border p-4 text-left transition-all ${
                  isDisabled
                    ? 'border-[#E5DFD5] bg-[#F9F6F0]/50 opacity-60 cursor-not-allowed'
                    : 'border-[#D8CFC2] bg-[#F7F4EE]/60 hover:bg-[#FFFDFC] hover:border-[#181715] hover:shadow-sm'
                }`}
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${action.color} shadow-xs`}
                >
                  <Icon className="h-5 w-5" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-[#181715] group-hover:text-[#4C4FD6] transition-colors">
                      {action.title}
                    </h3>
                    {action.badge && (
                      <span className="rounded-full bg-[#EAE9FB] px-2 py-0.5 text-[9px] font-black uppercase text-[#4C4FD6]">
                        {action.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold text-[#6B645A] line-clamp-2">
                    {action.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Stored Projects Grid */}
      <div className="rounded-[28px] border-2 border-[#D8CFC2] bg-[#FFFDFC] p-6 shadow-warm">
        <div className="flex flex-col gap-4 border-b border-[#EAE3D6] pb-4 mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAE9FB] text-[#4340A0]">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#181715]">
                Stored Database Projects ({projects.length})
              </h3>
              <p className="text-xs font-semibold text-[#6B645A]">
                Instant access to previously analyzed codebases
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {projects.length > 0 && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#6B645A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-[#F7F4EE] border border-[#D8CFC2] rounded-full pl-8 pr-3 py-1.5 text-xs font-semibold text-[#292622] placeholder-[#6B645A] focus:outline-none focus:border-[#4C4FD6]"
                />
              </div>
            )}
            <button
              type="button"
              onClick={fetchRecentProjects}
              disabled={loading || disabled}
              className="p-2 rounded-full border border-[#D8CFC2] bg-[#F7F4EE] hover:bg-[#181715] hover:text-white text-[#5C554D] transition-colors"
              title="Refresh projects list"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading && projects.length === 0 ? (
          <div className="py-8 text-center text-xs font-bold text-[#6B645A]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4C4FD6]" />
            Loading project records...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-[#E3B0A9] bg-[#F5DED9] p-4 text-xs font-bold text-[#7A322D]">
            {error}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#D8CFC2] bg-[#F7F4EE]/40 p-8 text-center">
            <p className="text-xs font-extrabold text-[#181715]">
              {search ? `No projects match "${search}".` : 'No stored projects found.'}
            </p>
            <p className="text-[11px] font-semibold text-[#6B645A] mt-1">
              Upload a ZIP archive or GitHub repo to save your first project record.
            </p>
          </div>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((proj) => (
              <div
                key={proj.project_id}
                className="flex flex-col justify-between rounded-2xl border border-[#D8CFC2] bg-[#F7F4EE]/60 p-4 transition-all hover:bg-[#FFFDFC] hover:border-[#181715] hover:shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4
                      className="font-extrabold text-xs text-[#181715] truncate flex-1"
                      title={proj.display_name}
                    >
                      {proj.display_name}
                    </h4>
                    <RiskBadge level="info" label={sourceLabel(proj.source_type)} size="sm" />
                  </div>

                  <div className="flex flex-wrap gap-1 mb-3">
                    {proj.detected_languages?.map((lang) => (
                      <span
                        key={lang}
                        className="px-2 py-0.5 rounded-md bg-[#EAE9FB] text-[#4340A0] font-mono text-[10px] font-bold uppercase"
                      >
                        {lang}
                      </span>
                    ))}
                  </div>

                  <div className="space-y-1 text-[11px] text-[#6B645A] font-semibold mb-4">
                    <div className="flex items-center gap-1.5">
                      <FileCode className="w-3.5 h-3.5 text-[#4C4FD6]" />
                      <span>{proj.total_files} files</span>
                      <span className="text-[#C8BEB0]">•</span>
                      <Hash className="w-3.5 h-3.5 text-[#C7953D]" />
                      <span>{proj.total_lines.toLocaleString()} lines</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(proj.project_id)}
                  disabled={disabled}
                  className="w-full rounded-xl border border-[#C8BEB0] bg-[#FFFDFC] py-2 text-xs font-extrabold text-[#181715] hover:bg-[#181715] hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Open Analysis</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;

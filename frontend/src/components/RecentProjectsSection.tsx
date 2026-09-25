import React, { useEffect, useState } from 'react';
import { Database, FileCode, Hash, History, RefreshCw, Search, ArrowRight, Sparkles } from 'lucide-react';
import { ProjectMetadataResponse } from '../types';
import { sourceLabel } from '../utils/presentation';
import { useAuth } from '../context/AuthContext';

interface RecentProjectsSectionProps {
  onOpenProject: (projectId: string) => void;
  disabled?: boolean;
}

export const RecentProjectsSection: React.FC<RecentProjectsSectionProps> = ({
  onOpenProject,
  disabled = false,
}) => {
  const { isAuthenticated } = useAuth();
  const [projects, setProjects] = useState<ProjectMetadataResponse[]>([]);
  const [demoProjects, setDemoProjects] = useState<ProjectMetadataResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingDemos, setLoadingDemos] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>('');

  const fetchRecentProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/projects?limit=12');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setProjects(data.projects || []);
    } catch {
      setError('Unable to fetch recent projects.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDemoProjects = async () => {
    if (!isAuthenticated) return;
    setLoadingDemos(true);
    try {
      const res = await fetch('/api/demo/projects');
      if (res.ok) {
        const data = await res.json();
        setDemoProjects(data.projects || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingDemos(false);
    }
  };

  useEffect(() => {
    fetchRecentProjects();
    if (isAuthenticated) {
      fetchDemoProjects();
    } else {
      setDemoProjects([]);
    }
  }, [isAuthenticated]);

  const formatDate = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return isoString;
    }
  };

  const filteredProjects = projects.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.display_name.toLowerCase().includes(q) ||
      p.source_type.toLowerCase().includes(q) ||
      p.detected_languages.some((l) => l.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full bg-[#FFFDFC] rounded-3xl border border-[#C8BEB0] shadow-sm p-5 sm:p-7 transition-all">
      {/* Shelf Header */}
      <div className="flex flex-col gap-3 border-b border-[#ECE5DA] pb-4 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAE9FB] text-[#4C4FD6] border border-[#4C4FD6]/20 shadow-xs">
            {isAuthenticated ? <Database className="h-4.5 w-4.5" /> : <Sparkles className="h-4.5 w-4.5 text-[#B88228]" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#181715] tracking-tight font-display">
                {isAuthenticated ? 'Your recent projects' : 'Demo projects'}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#ECE5DA] text-[#3B3733] text-xs font-mono font-bold">
                {projects.length}
              </span>
            </div>
            <p className="text-xs text-[#5C554D]">
              {isAuthenticated
                ? 'Open your previously analyzed repositories without re-ingesting'
                : 'Bundled benchmark codebases available for instant exploration without sign-in'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#5C554D] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={isAuthenticated ? "Filter your projects..." : "Filter demo projects..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#F5F1E9] border border-[#C8BEB0] rounded-full pl-8 pr-3 py-1.5 text-xs text-[#181715] placeholder-[#A39888] focus:outline-none focus:ring-2 focus:ring-[#4C4FD6]/30 focus:border-[#4C4FD6] transition-all font-sans"
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              fetchRecentProjects();
              if (isAuthenticated) fetchDemoProjects();
            }}
            disabled={loading || disabled}
            aria-label="Refresh projects"
            title="Refresh projects"
            className="p-2 rounded-full border border-[#C8BEB0] bg-[#F5F1E9] hover:bg-[#FFFDFC] text-[#3B3733] hover:text-[#181715] transition-colors shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="py-12 text-center text-xs font-medium text-[#5C554D]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4C4FD6]" />
          Loading {isAuthenticated ? 'recent projects' : 'demo projects'}…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#D9383A]/30 bg-[#FDF0F0] p-4 text-xs font-semibold text-[#D9383A] flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchRecentProjects}
            className="px-3 py-1.5 rounded-lg bg-[#FFFDFC] border border-[#C8BEB0] text-[#181715] font-bold shadow-xs hover:bg-[#F5F1E9] cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#C8BEB0] bg-[#F5F1E9]/50 p-8 text-center">
          <History className="w-7 h-7 text-[#5C554D] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#181715] font-display">
            {search
              ? `No projects match "${search}".`
              : isAuthenticated
              ? 'No recent projects found.'
              : 'No demo projects loaded yet.'}
          </p>
          <p className="text-xs text-[#5C554D] mt-1 max-w-[420px] mx-auto">
            {isAuthenticated
              ? 'Analyze a public GitHub repository or ZIP archive above to view projects here.'
              : 'Use the demo cards above to load Python, JavaScript, or Retail benchmarks.'}
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFDFC] border border-[#C8BEB0] text-[#181715] shadow-xs cursor-pointer"
            >
              Clear Filter
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((proj) => (
            <div
              key={proj.project_id}
              className="group flex flex-col justify-between rounded-2xl border border-[#C8BEB0] bg-[#F5F1E9]/70 hover:bg-[#FFFDFC] p-4 transition-all duration-200 hover:border-[#4C4FD6]/50 hover:shadow-md hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4
                    className="font-bold text-sm text-[#181715] truncate flex-1 font-display group-hover:text-[#4C4FD6] transition-colors"
                    title={proj.display_name}
                  >
                    {proj.display_name}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFFDFC] border border-[#C8BEB0] text-[#5C554D] font-semibold shrink-0">
                    {sourceLabel(proj.source_type)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {proj.detected_languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-0.5 rounded-md bg-[#EAE9FB] text-[#4C4FD6] font-mono text-[10px] font-bold uppercase border border-[#4C4FD6]/20"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C554D] font-mono pt-2 border-t border-[#ECE5DA] mb-4">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#4C4FD6]" />
                    <span>{proj.total_files} files</span>
                    <span className="text-[#C8BEB0]">•</span>
                    <Hash className="w-3.5 h-3.5 text-[#5C554D]" />
                    <span>{(proj.total_lines / 1000).toFixed(1)}k LOC</span>
                  </div>
                  <span className="text-[#A39888] text-[11px]">{formatDate(proj.created_at)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenProject(proj.project_id)}
                disabled={disabled}
                className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-[#FFFDFC] group-hover:bg-[#4C4FD6] text-[#181715] group-hover:text-[#FFFDFC] border border-[#C8BEB0] group-hover:border-[#4C4FD6] shadow-xs flex items-center justify-center gap-1.5 transition-all duration-180"
              >
                <span>Open Analysis</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* For signed-in users: Dedicated Explore Demos Shelf */}
      {isAuthenticated && demoProjects.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#ECE5DA]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#B88228]" />
              <h4 className="text-sm font-bold text-[#181715] font-display">
                Explore demos
              </h4>
              <span className="text-[10px] font-mono text-[#4C4FD6] bg-[#EAE9FB] px-2 py-0.5 rounded-full font-semibold">
                {demoProjects.length} reference benchmarks
              </span>
            </div>
            <p className="text-xs text-[#5C554D]">
              Bundled sample repositories for quick feature testing
            </p>
          </div>

          {loadingDemos ? (
            <div className="py-6 text-center text-xs font-mono text-[#5C554D]">
              Loading reference benchmarks...
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {demoProjects.map((demo) => (
              <div
                key={demo.project_id}
                className="group flex flex-col justify-between rounded-2xl border border-[#C8BEB0] bg-[#FFFDFC] p-3.5 hover:border-[#4C4FD6]/50 hover:shadow-xs transition-all"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <h5
                      className="font-bold text-xs text-[#181715] truncate font-display group-hover:text-[#4C4FD6] transition-colors"
                      title={demo.display_name}
                    >
                      {demo.display_name}
                    </h5>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#EAE9FB] text-[#4C4FD6] font-semibold shrink-0">
                      demo
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-[#5C554D] font-mono mb-3">
                    <span>{demo.total_files} files</span>
                    <span>•</span>
                    <span>{(demo.total_lines / 1000).toFixed(1)}k LOC</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onOpenProject(demo.project_id)}
                  disabled={disabled}
                  className="w-full text-xs font-semibold py-1.5 px-3 rounded-lg bg-[#F5F1E9] hover:bg-[#4C4FD6] text-[#181715] hover:text-[#FFFDFC] border border-[#C8BEB0] hover:border-[#4C4FD6] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <span>Open Demo</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentProjectsSection;

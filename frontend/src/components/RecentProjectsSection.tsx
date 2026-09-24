import React, { useEffect, useState } from 'react';
import { Database, FileCode, Hash, History, RefreshCw, Search, ArrowRight } from 'lucide-react';
import { ProjectMetadataResponse } from '../types';
import { sourceLabel } from '../utils/presentation';

interface RecentProjectsSectionProps {
  onOpenProject: (projectId: string) => void;
  disabled?: boolean;
}

export const RecentProjectsSection: React.FC<RecentProjectsSectionProps> = ({
  onOpenProject,
  disabled = false,
}) => {
  const [projects, setProjects] = useState<ProjectMetadataResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
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
      setError('Unable to fetch saved database projects.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentProjects();
  }, []);

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
    <div className="w-full bg-white rounded-3xl border border-[#E5E5EA] shadow-apple-md p-5 sm:p-7 transition-all">
      {/* Shelf Header */}
      <div className="flex flex-col gap-3 border-b border-[#E5E5EA] pb-4 mb-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#007AFF] border border-[#007AFF]/20 shadow-xs">
            <Database className="h-4.5 w-4.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#1D1D1F] tracking-tight font-geist">
                Analyzed Repositories
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#6E6E73] text-xs font-mono font-bold">
                {projects.length}
              </span>
            </div>
            <p className="text-xs text-[#86868B]">
              Instant re-inspection from local analysis cache without re-ingesting
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter repositories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#F5F5F7] border border-[#E5E5EA] rounded-full pl-8 pr-3 py-1.5 text-xs text-[#1D1D1F] placeholder-[#86868B] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 focus:border-[#007AFF] transition-all font-sans"
              />
            </div>
          )}
          <button
            type="button"
            onClick={fetchRecentProjects}
            disabled={loading || disabled}
            aria-label="Refresh database projects"
            title="Refresh database projects"
            className="p-2 rounded-full border border-[#E5E5EA] bg-[#F5F5F7] hover:bg-white text-[#6E6E73] hover:text-[#1D1D1F] transition-colors shadow-xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="py-12 text-center text-xs font-medium text-[#86868B]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#007AFF]" />
          Loading cached repository models from database…
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#FF3B30]/20 bg-[#FFF1F0] p-4 text-xs font-semibold text-[#D7261C] flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={fetchRecentProjects}
            className="px-3 py-1.5 rounded-lg bg-white border border-[#E5E5EA] text-[#1D1D1F] font-bold shadow-xs hover:bg-[#F5F5F7]"
          >
            Retry
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E5EA] bg-[#F5F5F7]/50 p-8 text-center">
          <History className="w-7 h-7 text-[#86868B] mx-auto mb-2" />
          <p className="text-xs font-bold text-[#1D1D1F] font-geist">
            {search ? `No saved projects match "${search}".` : 'No repositories stored in local cache.'}
          </p>
          <p className="text-xs text-[#86868B] mt-1 max-w-[420px] mx-auto">
            Ingest a public GitHub repository or ZIP archive above to automatically create persistent analysis records.
          </p>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="mt-3 px-3 py-1 rounded-full text-xs font-semibold bg-white border border-[#E5E5EA] text-[#1D1D1F] shadow-xs"
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
              className="group flex flex-col justify-between rounded-2xl border border-[#E5E5EA] bg-[#F5F5F7]/70 hover:bg-white p-4 transition-all duration-200 hover:border-[#007AFF]/40 hover:shadow-apple-md hover:-translate-y-0.5"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4
                    className="font-bold text-sm text-[#1D1D1F] truncate flex-1 font-geist group-hover:text-[#007AFF] transition-colors"
                    title={proj.display_name}
                  >
                    {proj.display_name}
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white border border-[#E5E5EA] text-[#6E6E73] font-semibold shrink-0">
                    {sourceLabel(proj.source_type)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 mb-3">
                  {proj.detected_languages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-0.5 rounded-md bg-[#EAF4FF] text-[#007AFF] font-mono text-[10px] font-bold uppercase border border-[#007AFF]/15"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-[#6E6E73] font-mono pt-2 border-t border-[#E5E5EA]/80 mb-4">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-[#007AFF]" />
                    <span>{proj.total_files} files</span>
                    <span className="text-[#D2D2D7]">•</span>
                    <Hash className="w-3.5 h-3.5 text-[#86868B]" />
                    <span>{(proj.total_lines / 1000).toFixed(1)}k LOC</span>
                  </div>
                  <span className="text-[#86868B] text-[11px]">{formatDate(proj.created_at)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenProject(proj.project_id)}
                disabled={disabled}
                className="w-full text-xs font-semibold py-2 px-3 rounded-xl bg-white group-hover:bg-[#007AFF] text-[#1D1D1F] group-hover:text-white border border-[#E5E5EA] group-hover:border-[#007AFF] shadow-xs flex items-center justify-center gap-1.5 transition-all duration-180"
              >
                <span>Open Analysis</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentProjectsSection;

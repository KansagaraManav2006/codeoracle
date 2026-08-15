import React, { useEffect, useState } from 'react';
import { Database, FileCode, Hash, History, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { ProjectMetadataResponse } from '../types';
import { sourceLabel } from '../utils/presentation';
import RiskBadge from './common/RiskBadge';

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
    } catch (err: any) {
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
        hour: '2-digit',
        minute: '2-digit',
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
    <div className="mx-auto max-w-4xl rounded-[32px] border-2 border-[#C8BEB0] bg-[#FFFDFC] p-6 shadow-warm sm:p-8">
      <div className="flex flex-col gap-4 border-b-2 border-[#C8BEB0] pb-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7]">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-[#181715] tracking-tight">
              Stored Database Projects ({projects.length})
            </h3>
            <p className="text-xs font-semibold text-[#5C554D] mt-0.5">
              Re-open previously ingested codebases instantly without re-analyzing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#6B645A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter saved projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-[#EFE9DD]/60 border border-[#D8CFC2] rounded-full pl-8 pr-3 py-1.5 text-xs font-semibold text-[#292622] placeholder-[#6B645A] focus:outline-none focus:border-[#4C4FD6]"
              />
            </div>
          )}
          <button
            type="button"
            onClick={fetchRecentProjects}
            disabled={loading || disabled}
            className="p-2 rounded-full border border-[#D8CFC2] bg-[#F0EBE2] hover:bg-[#181715] hover:text-white text-[#5C554D] transition-colors shadow-xs disabled:opacity-50"
            title="Refresh database projects"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="py-12 text-center text-xs font-bold text-[#6B645A]">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#4C4FD6]" />
          Loading stored project records from SQLite...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-[#E3B0A9] bg-[#F5DED9] p-4 text-xs font-bold text-[#7A322D]">
          {error}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-[#C8BEB0] bg-[#E7DFD3]/40 p-8 text-center">
          <History className="w-8 h-8 text-[#9E9282] mx-auto mb-2" />
          <p className="text-xs font-extrabold text-[#181715]">
            {search ? `No saved projects match "${search}".` : 'No stored projects found in the database.'}
          </p>
          <p className="text-[11px] font-semibold text-[#5C554D] mt-1">
            Upload a ZIP archive, connect a GitHub repository, or click "Try Demo" above to save your first project record.
          </p>
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((proj) => (
            <div
              key={proj.project_id}
              className="flex flex-col justify-between rounded-2xl border border-[#D8CFC2] bg-[#F0EBE2]/60 p-4 transition-all hover:bg-[#FFFDFC] hover:border-[#181715] hover:shadow-sm"
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
                  {proj.detected_languages.map((lang) => (
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
                  <div className="text-[10px] text-[#8C8275]">
                    Saved: {formatDate(proj.created_at)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenProject(proj.project_id)}
                disabled={disabled}
                className="w-full btn-brand-outline-pill py-2 text-xs font-extrabold flex items-center justify-center space-x-1.5"
              >
                <span>Open Saved Analysis</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentProjectsSection;

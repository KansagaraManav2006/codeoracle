import React, { useEffect, useState } from 'react';
import { Database, FileCode, Hash, History, ExternalLink, RefreshCw, Search } from 'lucide-react';
import { ProjectMetadataResponse } from '../types';
import { sourceLabel } from '../utils/presentation';
import RiskBadge from './common/RiskBadge';
import Button from './common/Button';
import Card from './common/Card';

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
    <Card variant="primary" padding="lg" className="w-full">
      <div className="flex flex-col gap-4 border-b border-line pb-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-surface text-indigo border border-indigo/20">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-ink tracking-tight font-display">
              Stored Database Projects ({projects.length})
            </h3>
            <p className="text-xs text-ink-3 mt-0.5">
              Re-open previously ingested codebases instantly without re-analyzing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {projects.length > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-ink-3 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter saved projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-tile border border-line rounded-pill pl-8 pr-3 py-1.5 text-xs font-semibold text-ink placeholder-ink-4 focus:outline-none focus:ring-2 focus:ring-indigo"
              />
            </div>
          )}
          <button
            type="button"
            onClick={fetchRecentProjects}
            disabled={loading || disabled}
            aria-label="Refresh database projects"
            title="Refresh database projects"
            className="p-2 rounded-full border border-line bg-tile hover:bg-ink hover:text-white text-ink-2 transition-colors shadow-xs disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="py-12 text-center text-xs font-bold text-ink-3">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo" />
          Loading stored project records from SQLite...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-line bg-red-surface p-4 text-xs font-semibold text-red-text flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={fetchRecentProjects} className="bg-surface text-ink shrink-0">
            Retry
          </Button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-tile/40 p-8 text-center">
          <History className="w-8 h-8 text-ink-4 mx-auto mb-2" />
          <p className="text-xs font-bold text-ink">
            {search ? `No saved projects match "${search}".` : 'No stored projects found in the database.'}
          </p>
          <p className="text-[11px] text-ink-3 mt-1">
            Upload a ZIP archive, connect a GitHub repository, or load a demo above to save your first project record.
          </p>
          {search && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearch('')}
              className="mt-3 text-xs"
            >
              Clear Filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((proj) => (
            <div
              key={proj.project_id}
              className="flex flex-col justify-between rounded-xl border border-line bg-tile/40 p-4 transition-all hover:bg-surface hover:border-line-strong hover:shadow-1"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4
                    className="font-bold text-xs text-ink truncate flex-1 font-mono"
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
                      className="px-2 py-0.5 rounded-md bg-indigo-surface text-indigo-text font-mono text-[10px] font-bold uppercase border border-indigo/20"
                    >
                      {lang}
                    </span>
                  ))}
                </div>

                <div className="space-y-1 text-[11px] text-ink-3 font-semibold mb-4">
                  <div className="flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo" />
                    <span>{proj.total_files} files</span>
                    <span className="text-line-strong">•</span>
                    <Hash className="w-3.5 h-3.5 text-amber" />
                    <span>{proj.total_lines.toLocaleString()} lines</span>
                  </div>
                  <div className="text-[10px] text-ink-4">
                    Saved: {formatDate(proj.created_at)}
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onOpenProject(proj.project_id)}
                disabled={disabled}
                className="w-full text-xs font-bold flex items-center justify-center gap-1.5"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
              >
                Open Saved Analysis
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default RecentProjectsSection;


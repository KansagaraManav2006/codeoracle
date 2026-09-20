import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Wand2,
  Download,
  FileText,
} from 'lucide-react';
import { ProjectRefactorResult, RefactoredFile } from '../types';
import { truncateMiddle, formatNumber } from '../utils/formatters';
import Button from './common/Button';
import KpiCard from './common/KpiCard';
import Notice from './common/Notice';
import DiffViewer, { DiffMode } from './common/DiffViewer';
import SearchField from './common/SearchField';
import { useToast } from './common/Toast';

interface RefactoredCodeTabProps {
  projectId?: string | null;
  projectName?: string;
  trustedDemo?: boolean;
}

export const RefactoredCodeTab: React.FC<RefactoredCodeTabProps> = ({
  projectId,
  projectName: _projectName = 'project',
  trustedDemo: _trustedDemo = false,
}) => {
  const [result, setResult] = useState<ProjectRefactorResult | null>(null);
  const [selectedPath, setSelectedPath] = useState('');
  const [mode, setMode] = useState<DiffMode>('diff');
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const { showToast } = useToast();

  const loadProposal = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor`);
      if (response.status === 409) return;
      if (!response.ok) throw new Error(`Failed to load proposal (${response.status})`);
      const data: ProjectRefactorResult = await response.json();
      setResult(data);

      const firstChanged = data.files.find((f) => f.changed)?.relative_path || data.files[0]?.relative_path || '';
      setSelectedPath((curr) => curr || firstChanged);
    } catch (err: any) {
      setError(err.message || 'Unable to load modernization proposal.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  const handleRegenerate = async () => {
    if (!projectId || regenerating) return;
    setRegenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/refactor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force: true }),
      });
      if (!response.ok) throw new Error('Refactor regeneration failed');
      const data: ProjectRefactorResult = await response.json();
      setResult(data);
      const firstChanged = data.files.find((f) => f.changed)?.relative_path || data.files[0]?.relative_path || '';
      setSelectedPath(firstChanged);
      showToast('Modernization proposal regenerated', 'success');
    } catch (err: any) {
      const msg = err.message || 'Failed to regenerate refactoring proposal';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownloadProposal = () => {
    if (!projectId) return;
    window.location.href = `/api/projects/${projectId}/refactor/download`;
    showToast('Downloading modernization patch proposal…', 'info');
  };

  const changedFiles = useMemo(() => {
    return (result?.files || []).filter((f) => f.changed);
  }, [result]);

  const filteredFiles = useMemo(() => {
    return changedFiles.filter((f) =>
      f.relative_path.toLowerCase().includes(search.toLowerCase())
    );
  }, [changedFiles, search]);

  const selectedFile: RefactoredFile | undefined =
    changedFiles.find((f) => f.relative_path === selectedPath) || changedFiles[0];

  const ruleWarning = useMemo(() => {
    if (!selectedFile || !selectedFile.warnings || selectedFile.warnings.length === 0) {
      return null;
    }
    const firstWarn = selectedFile.warnings[0];
    return {
      name: firstWarn.code,
      description: firstWarn.message,
    };
  }, [selectedFile]);

  if (!projectId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-28 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
          <div className="skeleton h-24" />
        </div>
        <div className="skeleton h-[420px] w-full" />
      </div>
    );
  }

  const filesReviewed = result?.analyzed_files || 0;
  const filesWithSuggestions = result?.changed_files || changedFiles.length;
  const suggestedUpdates = result?.total_changes || 0;
  const breakingRisks = result?.breaking_warning_count || 0;

  return (
    <div
      className="space-y-5 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-refactor"
      aria-labelledby="tab-refactor"
    >
      {/* 1. Header Bar per DESIGN.md §8.5 */}
      <section className="bg-surface border border-line rounded-lg p-4 sm:p-5 shadow-1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-11 h-11 rounded-md bg-teal-surface text-teal-strong flex items-center justify-center shrink-0 border border-teal/20"
            aria-hidden="true"
          >
            <Wand2 className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight">
              Modernization Proposal
            </h2>
            <p className="font-sans text-xs text-ink-3 mt-0.5">
              Suggested updates shown as reviewable before-and-after changes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadProposal}
            icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Download proposal
          </Button>

          <Button
            variant="indigo"
            size="sm"
            onClick={handleRegenerate}
            loading={regenerating}
            loadingText="Regenerating…"
            icon={<Wand2 className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            Regenerate
          </Button>
        </div>
      </section>

      {/* 2. Four KPI Cards per DESIGN.md §8.5 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <KpiCard
          label="FILES REVIEWED"
          value={formatNumber(filesReviewed)}
          subtext="Audited for modernization"
        />
        <KpiCard
          label="FILES WITH SUGGESTIONS"
          value={formatNumber(filesWithSuggestions)}
          variant="selected"
          subtext="Ready for human review"
        />
        <KpiCard
          label="SUGGESTED UPDATES"
          value={formatNumber(suggestedUpdates)}
          subtext="Deterministic rule diffs"
        />
        <KpiCard
          label="BREAKING-CHANGE RISKS"
          value={formatNumber(breakingRisks)}
          variant={breakingRisks > 0 ? 'highlight' : 'default'}
          subtext="Requires runtime audit"
        />
      </div>

      {/* 3. Amber Notice per DESIGN.md §8.5 */}
      <Notice type="warning">
        Human review required — Prepared {suggestedUpdates} modernization rule {suggestedUpdates === 1 ? 'group' : 'groups'} across {filesWithSuggestions} {filesWithSuggestions === 1 ? 'file' : 'files'}. Review every diff and run the generated tests before merging.
      </Notice>

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 4. Master–Detail Layout: Files with suggestions list (280px) + Dark Diff Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
        {/* Left: Files with suggestions */}
        <div
          role="listbox"
          aria-label="Files with suggestions"
          className="bg-surface border border-line rounded-lg p-3 shadow-1 max-h-[580px] flex flex-col"
        >
          <div className="px-2 pt-1 pb-3 border-b border-line">
            <span className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2 block mb-2">
              FILES WITH SUGGESTIONS ({changedFiles.length})
            </span>
            <SearchField
              id="refactor-filter"
              value={search}
              onChange={setSearch}
              placeholder="Filter files…"
              className="w-full"
            />
          </div>

          <div className="overflow-y-auto custom-scrollbar divide-y divide-line/40 mt-2 pr-1">
            {filteredFiles.length === 0 ? (
              <div className="p-6 text-center text-xs text-ink-3">
                No files with suggestions match your filter.
              </div>
            ) : (
              filteredFiles.map((f) => {
                const isSelected = selectedFile?.relative_path === f.relative_path;
                return (
                  <button
                    key={f.relative_path}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedPath(f.relative_path)}
                    className={`w-full text-left p-2.5 rounded-md transition-colors my-0.5 flex items-start gap-2.5 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                      isSelected
                        ? 'bg-indigo-surface text-indigo-text font-bold shadow-xs'
                        : 'hover:bg-tile text-ink'
                    }`}
                  >
                    <FileText
                      className={`w-4 h-4 mt-0.5 shrink-0 ${
                        isSelected ? 'text-indigo' : 'text-ink-3'
                      }`}
                      strokeWidth={1.75}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-xs truncate" title={f.relative_path}>
                        {truncateMiddle(f.relative_path, 26)}
                      </div>
                      <div className="text-[11px] font-sans font-normal text-ink-3 mt-0.5">
                        {f.changes?.length || 1} update · {f.warnings?.length || 0} notes
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Dark Diff Viewer per DESIGN.md §7.9 */}
        <div>
          <DiffViewer
            filePath={selectedFile?.relative_path || 'No file selected'}
            diffCode={selectedFile?.unified_diff || ''}
            originalCode={selectedFile?.original_code || ''}
            modernizedCode={selectedFile?.refactored_code || ''}
            mode={mode}
            onModeChange={setMode}
            syntaxCheckPassed={selectedFile?.syntax_valid}
            ruleWarning={ruleWarning}
          />
        </div>
      </div>
    </div>
  );
};

export default RefactoredCodeTab;

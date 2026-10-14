import React, { useCallback, useEffect, useState, useMemo } from 'react';
import {
  TestTube,
  Download,
  Play,
  FileQuestion,
  Layers,
  AlertTriangle,
  FileCode2,
} from 'lucide-react';
import {
  JobResponse,
  ProjectTestResult,
  GeneratedTestFile,
  HotspotItem,
  ChangeImpact,
  ProjectRefactorResult,
  TabType,
  UnprotectedModuleDetail,
} from '../types';
import { truncateMiddle } from '../utils/formatters';
import Button from './common/Button';
import SearchField from './common/SearchField';
import { FilterChip } from './common/Chips';
import { useToast } from './common/Toast';
import LoadingState from './common/LoadingState';
import Card from './common/Card';
import PageHeroHeader from './common/PageHeroHeader';
import { testService, analysisService, refactorService } from '../services';
import { TestCoverageSummaryCard, SelectedTestPanel, TestDownloadModal } from './tests';

interface GeneratedTestsTabProps {
  projectId?: string | null;
  projectName?: string;
  trustedDemo?: boolean;
  targetFile?: string | null;
  onSelectFile?: (filePath: string) => void;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onTestsUpdated?: () => void;
  onStatusChange?: (generating: boolean, error?: string | null) => void;
}

export const GeneratedTestsTab: React.FC<GeneratedTestsTabProps> = ({
  projectId,
  projectName: _projectName = 'project',
  trustedDemo = false,
  targetFile = null,
  onSelectFile,
  onInspectImpact,
  onNavigateTab,
  onTestsUpdated,
  onStatusChange,
}) => {
  const [result, setResult] = useState<ProjectTestResult | null>(null);
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [refactorResult, setRefactorResult] = useState<ProjectRefactorResult | null>(null);
  const [activeImpact, setActiveImpact] = useState<ChangeImpact | null>(null);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [sidebarTab, setSidebarTab] = useState<'tests' | 'unprotected'>('tests');
  const [explorerMode, setExplorerMode] = useState<'grouped' | 'flat'>('grouped');

  // Filters
  const [search, setSearch] = useState('');
  const [archetypeFilter, setArchetypeFilter] = useState<string>('all');
  const [strengthFilter, setStrengthFilter] = useState<string>('all');
  const [confidenceFilter, setConfidenceFilter] = useState<string>('all');
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);
  const [showTaxonomyDetails, setShowTaxonomyDetails] = useState(false);

  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { showToast } = useToast();

  const loadResult = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await testService.getProjectTests(projectId);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch generated tests.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load complementary cross-tab data (Hotspots & Refactor proposal)
  useEffect(() => {
    if (!projectId) return;

    analysisService
      .getHotspots(projectId)
      .then((data) => {
        if (data?.hotspots) setHotspots(data.hotspots);
      })
      .catch(() => {});

    refactorService
      .getProjectRefactor(projectId)
      .then((data) => {
        if (data?.files) setRefactorResult(data);
      })
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  // Filtered files calculation
  const filteredFiles = useMemo(() => {
    return (result?.test_files || []).filter((f) => {
      const matchesSearch =
        f.safe_test_path.toLowerCase().includes(search.toLowerCase()) ||
        f.target_relative_path.toLowerCase().includes(search.toLowerCase()) ||
        (f.display_name && f.display_name.toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;

      // Archetype filter
      if (archetypeFilter !== 'all') {
        const arch = f.framework_archetype || 'generic';
        if (archetypeFilter === 'react' && arch !== 'react') return false;
        if (archetypeFilter === 'fastapi' && arch !== 'fastapi') return false;
        if (archetypeFilter === 'service' && arch !== 'service') return false;
        if (archetypeFilter === 'ml' && arch !== 'ml') return false;
        if (archetypeFilter === 'vitest' && f.framework !== 'vitest') return false;
        if (archetypeFilter === 'pytest' && f.framework !== 'pytest') return false;
      }

      // Strength filter
      if (strengthFilter !== 'all') {
        const str = (f.strength_level || 'L3').toUpperCase();
        if (strengthFilter !== str) return false;
      }

      // Confidence filter
      if (confidenceFilter !== 'all') {
        const conf = (f.confidence || 'medium').toLowerCase();
        if (confidenceFilter !== conf) return false;
      }

      return true;
    });
  }, [result, search, archetypeFilter, strengthFilter, confidenceFilter]);

  // Sync selectedIdx when targetFile changes
  useEffect(() => {
    if (targetFile && filteredFiles.length) {
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const idx = filteredFiles.findIndex((t) => {
        const tNorm = t.target_relative_path.replace(/\\/g, '/').toLowerCase();
        return tNorm === norm || tNorm.endsWith(norm) || norm.endsWith(tNorm);
      });
      if (idx !== -1) {
        setSelectedIdx(idx);
        setSidebarTab('tests');
      }
    }
  }, [targetFile, filteredFiles]);

  const activeFile: GeneratedTestFile | undefined =
    filteredFiles[selectedIdx] || filteredFiles[0] || result?.test_files[0];

  // Fetch change impact for the active file's target
  useEffect(() => {
    if (!projectId || !activeFile?.target_relative_path) {
      setActiveImpact(null);
      return;
    }

    let isMounted = true;
    analysisService
      .getImpact(projectId, activeFile.target_relative_path)
      .then((data) => {
        if (isMounted) setActiveImpact(data);
      })
      .catch(() => {
        if (isMounted) setActiveImpact(null);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, activeFile?.target_relative_path]);

  // Match related hotspot
  const relatedHotspot = useMemo(() => {
    if (!activeFile?.target_relative_path || !hotspots.length) return null;
    const target = activeFile.target_relative_path.toLowerCase();
    return (
      hotspots.find((h) => {
        const hFile = (h.filePath || h.file || '').toLowerCase();
        return hFile === target || hFile.endsWith(target) || target.endsWith(hFile);
      }) || null
    );
  }, [activeFile, hotspots]);

  // Match related refactor proposal
  const relatedRefactor = useMemo(() => {
    if (!activeFile?.target_relative_path || !refactorResult?.files) return null;
    const target = activeFile.target_relative_path.toLowerCase();
    return (
      refactorResult.files.find((f) => {
        const fPath = f.relative_path.toLowerCase();
        return fPath === target || fPath.endsWith(target) || target.endsWith(fPath);
      }) || null
    );
  }, [activeFile, refactorResult]);

  // Grouped tests map (by source module)
  const groupedBySource = useMemo(() => {
    const map = new Map<string, GeneratedTestFile[]>();
    for (const file of filteredFiles) {
      const src = file.target_relative_path;
      if (!map.has(src)) map.set(src, []);
      map.get(src)!.push(file);
    }
    return Array.from(map.entries()).map(([sourcePath, tests]) => ({
      sourcePath,
      tests,
    }));
  }, [filteredFiles]);

  const handleRegenerate = async () => {
    if (!projectId || regenerating) return;
    setRegenerating(true);
    setError(null);
    onStatusChange?.(true, null);

    try {
      const job: JobResponse = await testService.generateTests(projectId, trustedDemo, true);

      for (let i = 0; i < 60; i++) {
        const pollRes = await fetch(job.polling_url);
        if (pollRes.ok) {
          const pollData: JobResponse = await pollRes.json();
          if (pollData.state === 'completed') {
            await loadResult();
            onStatusChange?.(false, null);
            onTestsUpdated?.();
            showToast('Characterization test suites refreshed', 'success');
            return;
          }
          if (pollData.state === 'failed') {
            throw new Error(pollData.error_message || 'Regeneration failed');
          }
        }
        await new Promise((r) => setTimeout(r, 750));
      }
      throw new Error('Test generation timed out');
    } catch (err: any) {
      const msg = err.message || 'Failed to regenerate tests';
      setError(msg);
      onStatusChange?.(false, msg);
      showToast(msg, 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDownload = (scope: 'all' | 'protected' | 'selected') => {
    if (!projectId) return;
    const url = testService.getTestDownloadUrl(
      projectId,
      scope,
      scope === 'selected' ? activeFile?.test_id : undefined,
      scope === 'selected' ? activeFile?.target_relative_path : undefined
    );
    window.location.href = url;
    setDownloadModalOpen(false);
    showToast(`Downloading ${scope} tests archive…`, 'info');
  };

  if (!projectId) return null;

  if (loading && !result) {
    return <LoadingState label="Loading generated characterization tests…" />;
  }

  const totalCases = result?.total_generated_tests || 0;
  const totalGenFiles = result?.test_files?.length || 0;
  const syntaxValidCount = result?.syntax_valid_count || 0;
  const totalSourceModules =
    result?.target_source_files ||
    Math.max(1, (result?.protected_files?.length || 0) + (result?.unprotected_files?.length || 0));
  const protectedModulesCount = result?.protected_files?.length || 0;
  const unprotectedModulesList: UnprotectedModuleDetail[] =
    result?.unprotected_modules_detail ||
    (result?.unprotected_files || []).map((path) => ({
      path,
      reason: 'Module marked for characterization test expansion',
      risk_score: 20,
      risk_level: 'medium' as const,
      blast_radius: 1,
      is_modernization_candidate: false,
      has_planned_changes: false,
      priority: 'P2' as const,
      priority_label: 'P2 — Optional / low risk',
      caller_count: 1,
    }));

  const protectionPercentage =
    totalSourceModules > 0 ? Math.round((protectedModulesCount / totalSourceModules) * 100) : 0;
  const strengthCounts = result?.strength_counts || {
    syntax: 0,
    import: result?.test_files?.filter((t) => t.is_import_only).length || 0,
    contract: result?.test_files?.filter((t) => !t.is_import_only).length || 0,
    behavior: 0,
    integration: 0,
  };

  return (
    <div
      className="space-y-4 animate-[fade-up_200ms_ease-out_both] w-full max-w-full min-w-0"
      role="tabpanel"
      id="tabpanel-tests"
      aria-labelledby="tab-tests"
    >
      <PageHeroHeader
        icon={TestTube}
        title="GENERATED TESTS"
        eyebrow="Characterization"
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Static Verified
          </span>
        }
        description="Review generated characterization suites that preserve existing contracts before modernization."
        actions={[
          {
            label: 'Download Tests',
            variant: 'secondary' as const,
            onClick: () => setDownloadModalOpen(true),
            icon: <Download className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
          {
            label: 'Regenerate Safety Tests',
            variant: 'primary' as const,
            onClick: handleRegenerate,
            loading: regenerating,
            loadingText: 'Regenerating…',
            icon: <Play className="w-3.5 h-3.5 fill-current" strokeWidth={1.75} />,
          },
        ]}
      />

      {/* 2. State & Safety Clarity Banner + KPIs + Taxonomy */}
      <TestCoverageSummaryCard
        totalGenFiles={totalGenFiles}
        syntaxValidCount={syntaxValidCount}
        trustedDemo={trustedDemo}
        totalCases={totalCases}
        protectedModulesCount={protectedModulesCount}
        totalSourceModules={totalSourceModules}
        protectionPercentage={protectionPercentage}
        unprotectedModulesList={unprotectedModulesList}
        strengthCounts={strengthCounts}
        frameworkCoverage={result?.framework_coverage}
        showTaxonomyDetails={showTaxonomyDetails}
        onToggleTaxonomyDetails={() => setShowTaxonomyDetails((prev) => !prev)}
      />

      {error && (
        <div className="p-4 bg-red-surface border border-red-line rounded-md text-red-text text-xs">
          {error}
        </div>
      )}

      {/* 3. Master–Detail Layout: Test Explorer + Selected Test Header & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 items-start w-full max-w-full min-w-0">
        {/* Left Column: Explorer Drawer */}
        <Card
          variant="secondary"
          padding="sm"
          className="flex flex-col max-h-[820px] w-full min-w-0"
        >
          {/* Sub-tab switcher: Tests vs Unprotected Queue */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-track rounded-lg mb-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSidebarTab('tests')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                sidebarTab === 'tests'
                  ? 'bg-surface text-ink shadow-xs font-bold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              Tests ({result?.test_files?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setSidebarTab('unprotected')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1 ${
                sidebarTab === 'unprotected'
                  ? 'bg-surface text-ink shadow-xs font-bold'
                  : 'text-ink-3 hover:text-ink'
              }`}
            >
              <span>Unprotected</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  unprotectedModulesList.length > 0
                    ? 'bg-amber-surface text-amber-strong font-bold'
                    : 'bg-tile text-ink-3'
                }`}
              >
                {unprotectedModulesList.length}
              </span>
            </button>
          </div>

          {/* Search & Filters */}
          <div className="space-y-2 pb-2.5 border-b border-line shrink-0">
            <SearchField
              id="tests-filter"
              value={search}
              onChange={setSearch}
              placeholder={sidebarTab === 'tests' ? 'Search test or source path…' : 'Search unprotected module…'}
              className="w-full"
            />

            {sidebarTab === 'tests' && (
              <div className="space-y-1.5 pt-0.5">
                {/* Mode toggle: Group by Source vs Flat list */}
                <div className="flex items-center justify-between text-[11px] px-1">
                  <span className="text-ink-3 font-medium">Layout</span>
                  <div className="flex items-center gap-1 bg-tile p-0.5 rounded border border-line">
                    <button
                      type="button"
                      onClick={() => setExplorerMode('grouped')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        explorerMode === 'grouped'
                          ? 'bg-surface text-indigo font-bold shadow-2xs'
                          : 'text-ink-3'
                      }`}
                    >
                      By Source
                    </button>
                    <button
                      type="button"
                      onClick={() => setExplorerMode('flat')}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                        explorerMode === 'flat'
                          ? 'bg-surface text-indigo font-bold shadow-2xs'
                          : 'text-ink-3'
                      }`}
                    >
                      Flat List
                    </button>
                  </div>
                </div>

                {/* Archetype filter chips */}
                <div className="flex items-center gap-1 flex-wrap pt-0.5">
                  <FilterChip
                    label="ALL"
                    active={archetypeFilter === 'all'}
                    onClick={() => setArchetypeFilter('all')}
                  />
                  <FilterChip
                    label="REACT"
                    active={archetypeFilter === 'react'}
                    onClick={() => setArchetypeFilter('react')}
                  />
                  <FilterChip
                    label="FASTAPI"
                    active={archetypeFilter === 'fastapi'}
                    onClick={() => setArchetypeFilter('fastapi')}
                  />
                  <FilterChip
                    label="SERVICE"
                    active={archetypeFilter === 'service'}
                    onClick={() => setArchetypeFilter('service')}
                  />
                  <FilterChip
                    label="ML"
                    active={archetypeFilter === 'ml'}
                    onClick={() => setArchetypeFilter('ml')}
                  />
                </div>

                {/* Strength filters */}
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-[10px] font-bold text-ink-4 mr-1">LEVEL:</span>
                  {['all', 'L2', 'L3', 'L4'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setStrengthFilter(lvl)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono uppercase transition-colors ${
                        strengthFilter === lvl
                          ? 'bg-indigo-surface text-indigo font-bold border border-indigo/30'
                          : 'text-ink-3 hover:text-ink'
                      }`}
                    >
                      {lvl.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* List Content */}
          <div className="overflow-y-auto custom-scrollbar divide-y divide-line/40 mt-2 pr-1 flex-1 min-h-[360px]">
            {sidebarTab === 'tests' ? (
              filteredFiles.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink-3 space-y-2">
                  <p>No characterization test files match filter.</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setArchetypeFilter('all');
                      setStrengthFilter('all');
                      setConfidenceFilter('all');
                    }}
                    className="text-xs"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : explorerMode === 'grouped' ? (
                // Grouped by Source File
                <div className="space-y-2 divide-y-0">
                  {groupedBySource.map((group) => {
                    const isGroupActive = group.tests.some((t) => t.test_id === activeFile?.test_id);
                    return (
                      <div
                        key={group.sourcePath}
                        className={`rounded-md border p-1.5 space-y-1 transition-colors ${
                          isGroupActive
                            ? 'border-indigo/50 bg-indigo-surface/10'
                            : 'border-line/60 bg-tile/30'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 px-1 py-0.5 text-ink font-mono text-[11px] font-bold truncate">
                          <Layers className="w-3.5 h-3.5 text-indigo shrink-0" />
                          <span className="truncate" title={group.sourcePath}>
                            {truncateMiddle(group.sourcePath, 28)}
                          </span>
                        </div>
                        <div className="space-y-0.5 pl-3 border-l-2 border-indigo/30 ml-2">
                          {group.tests.map((tf) => {
                            const isSelected = tf.test_id === activeFile?.test_id;
                            const displayName = tf.display_name || truncateMiddle(tf.safe_test_path, 24);
                            return (
                              <button
                                key={tf.test_id}
                                type="button"
                                onClick={() => {
                                  const idx = filteredFiles.findIndex((f) => f.test_id === tf.test_id);
                                  if (idx !== -1) setSelectedIdx(idx);
                                  onSelectFile?.(tf.target_relative_path);
                                }}
                                className={`w-full text-left p-1.5 rounded transition-colors text-[11px] flex items-center justify-between gap-1.5 ${
                                  isSelected
                                    ? 'bg-indigo-surface text-indigo-text font-bold shadow-xs'
                                    : 'hover:bg-tile text-ink-2'
                                }`}
                              >
                                <span className="font-mono truncate">{displayName}</span>
                                <span className="text-[9px] px-1 py-0.2 rounded font-mono font-bold uppercase bg-surface border border-line shrink-0">
                                  {tf.strength_level || 'L3'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Flat List with Human-Readable Display Names
                filteredFiles.map((f, idx) => {
                  const isSelected = activeFile?.test_id === f.test_id;
                  const displayName = f.display_name || truncateMiddle(f.safe_test_path, 26);
                  return (
                    <button
                      key={f.test_id || idx}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedIdx(idx);
                        onSelectFile?.(f.target_relative_path);
                      }}
                      className={`w-full text-left p-2.5 rounded-md transition-colors my-0.5 flex items-start gap-2.5 select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                        isSelected
                          ? 'bg-indigo-surface text-indigo-text font-bold shadow-xs'
                          : 'hover:bg-tile text-ink'
                      }`}
                    >
                      <FileCode2
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isSelected ? 'text-indigo' : 'text-ink-3'
                        }`}
                        strokeWidth={1.75}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-mono text-xs font-semibold truncate" title={displayName}>
                          {displayName}
                        </div>
                        <div className="text-[11px] text-ink-3 font-sans truncate mt-0.5">
                          Target: {truncateMiddle(f.target_relative_path, 22)}
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-sans text-ink-3 mt-1 pt-1 border-t border-line/40">
                          <span className="font-bold text-indigo font-mono">
                            {f.strength_level || 'L3'} · {f.framework.toUpperCase()}
                          </span>
                          <span>
                            {f.test_count} {f.test_count === 1 ? 'case' : 'cases'}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : unprotectedModulesList.length === 0 ? (
              <div className="p-6 text-center text-xs text-teal-strong font-semibold">
                All repository source modules have characterization suites attached!
              </div>
            ) : (
              // Unprotected Queue Prioritized by P0, P1, P2
              <div className="space-y-1">
                {unprotectedModulesList.map((item) => (
                  <div
                    key={item.path}
                    className="p-2.5 rounded-md bg-tile/40 hover:bg-tile text-xs transition-colors border border-line/60 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div
                          className="flex items-center gap-1.5 font-mono text-ink truncate font-bold text-[11px]"
                          title={item.path}
                        >
                          <FileQuestion className="w-3.5 h-3.5 text-amber-strong shrink-0" />
                          <span className="truncate">{truncateMiddle(item.path, 22)}</span>
                        </div>
                        <div className="text-[10px] text-ink-3 leading-tight mt-0.5">
                          {item.reason}
                        </div>
                      </div>

                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 uppercase font-mono ${
                          item.priority === 'P0'
                            ? 'bg-red-surface text-red-text border border-red-line'
                            : item.priority === 'P1'
                            ? 'bg-amber-surface text-amber-strong border border-amber/30'
                            : 'bg-tile text-ink-3 border border-line'
                        }`}
                      >
                        {item.priority}
                      </span>
                    </div>

                    {/* Neutral semantics if no proposed change, alert only if changes proposed */}
                    {item.has_planned_changes ? (
                      <div className="p-1 px-1.5 rounded bg-amber-surface/70 border border-amber/30 text-[10px] text-amber-text font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-strong shrink-0" />
                        <span>Planned modernization change proposed without tests!</span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-ink-3 italic">
                        No characterization test attached. File is currently unchanged.
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-line/40">
                      <span className="text-[10px] text-ink-3 font-mono">
                        Risk: {item.risk_score}/100 · {item.caller_count} callers
                      </span>
                      {onInspectImpact && (
                        <button
                          type="button"
                          onClick={() => {
                            onSelectFile?.(item.path);
                            onInspectImpact(item.path);
                          }}
                          className="text-[11px] font-bold text-indigo hover:underline flex items-center gap-0.5"
                        >
                          Check Blast Radius →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Right Column: Selected Test Header, Metadata, Why Generated, and Code Viewer */}
        <SelectedTestPanel
          activeFile={activeFile}
          relatedHotspot={relatedHotspot}
          activeImpact={activeImpact}
          relatedRefactor={relatedRefactor}
          onInspectImpact={onInspectImpact}
          onNavigateTab={onNavigateTab}
          onSelectFile={onSelectFile}
        />
      </div>

      {/* 4. Download Modal Dialog */}
      <TestDownloadModal
        open={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        totalGenFiles={totalGenFiles}
        protectedModulesCount={protectedModulesCount}
        frameworks={result?.frameworks}
        activeFile={activeFile}
        onDownload={handleDownload}
      />
    </div>
  );
};

export default GeneratedTestsTab;

import React, { useEffect, useState, useCallback, lazy, Suspense, useRef } from 'react';
import AppSidebar from './components/AppSidebar';
import ProjectContextBar from './components/ProjectContextBar';
import WorkspaceShell from './components/WorkspaceShell';
import LandingPage from './components/landing/LandingPage';
import JobProgressView from './components/JobProgressView';
import ProjectOverviewTab from './components/ProjectOverviewTab';
import ExplanationTab from './components/ExplanationTab';
import HotspotsTab from './components/HotspotsTab';
import DependencyGraphTab from './components/DependencyGraphTab';
import GeneratedTestsTab from './components/GeneratedTestsTab';
import RefactoredCodeTab from './components/RefactoredCodeTab';
import MigrationPlanTab from './components/MigrationPlanTab';
import SystemPulseTab from './components/pulse/SystemPulseTab';
import InputSection from './components/InputSection';
import RecentProjectsSection from './components/RecentProjectsSection';
import { ToastProvider } from './components/common/Toast';
import PipelineStrip from './components/common/PipelineStrip';
import ShortcutsModal from './components/common/ShortcutsModal';
import ChangeImpactModal from './components/common/ChangeImpactModal';
import { NotFoundPage } from './components/common/NotFoundPage';
import { SignInPage } from './components/auth/SignInPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useCurrentRoute, navigateTo } from './utils/navigation';
import { useJobPoller } from './hooks/useJobPoller';
import EmptyState from './components/common/EmptyState';
import {
  FolderGit2,
  Activity,
  BookOpen,
  Flame,
  Workflow,
  Network,
  TestTube,
  Wand2,
  Map,
  LucideIcon,
} from 'lucide-react';
import { TabType } from './types';

interface EmptyFeatureConfig {
  icon: LucideIcon;
  headline: string;
  description: string;
}

const TAB_TITLES: Record<TabType, string> = {
  overview: 'Project Details',
  pulse: 'System Pulse',
  explanation: 'Explanation',
  hotspots: 'Risk Hotspots',
  graph: 'Dependency Graph',
  'neural-map': 'Neural Map',
  tests: 'Generated Tests',
  refactor: 'Refactor Proposals',
  migration: 'Migration Plan',
};

const EMPTY_FEATURE_CONFIGS: Record<TabType, EmptyFeatureConfig> = {
  overview: {
    icon: FolderGit2,
    headline: 'Project Details requires an active codebase',
    description:
      'Select a recent project or analyze a codebase to view file hierarchy, language metrics, and project metadata.',
  },
  pulse: {
    icon: Activity,
    headline: 'System Pulse requires an analyzed codebase',
    description:
      'Analyze a codebase or explore the demo dataset to view system health scores, subsystem status, and real-time reliability signals.',
  },
  explanation: {
    icon: BookOpen,
    headline: 'Codebase Explanation requires an analyzed codebase',
    description:
      'Inspect comprehensive module explanations, domain boundaries, and data flow summaries by analyzing a codebase or loading the demo.',
  },
  hotspots: {
    icon: Flame,
    headline: 'Risk Hotspots require an analyzed codebase',
    description:
      'Analyze a codebase or load the demo dataset to identify high-cyclomatic complexity files, architectural debt, and high-risk modification zones.',
  },
  graph: {
    icon: Workflow,
    headline: 'Dependency Graph requires an analyzed codebase',
    description:
      'Visualize circular dependencies, module fan-in/fan-out, and architectural hierarchies by analyzing a codebase or loading the demo.',
  },
  'neural-map': {
    icon: Network,
    headline: 'Neural Map requires an analyzed codebase',
    description:
      'Explore interactive 2D semantic force-directed cluster embeddings of modules and files once a codebase has been analyzed.',
  },
  tests: {
    icon: TestTube,
    headline: 'Generated Tests require an analyzed codebase',
    description:
      'Automated regression suites, safety nets, and boundary test cases are generated against parsed functions in an active project.',
  },
  refactor: {
    icon: Wand2,
    headline: 'Refactor Proposals require an analyzed codebase',
    description:
      'Review AI-driven architectural modernization diffs and decoupling proposals once codebase analysis has completed.',
  },
  migration: {
    icon: Map,
    headline: 'Migration Plan requires an analyzed codebase',
    description:
      'View phased step-by-step migration plans, breaking changes, and risk mitigations for an analyzed project.',
  },
};

const NeuralMapPage = lazy(() => import('./components/NeuralMap/NeuralMapPage'));

const WorkspaceContent: React.FC = () => {
  const currentRoute = useCurrentRoute();
  const { isAuthenticated, user } = useAuth();

  const {
    job,
    project,
    projectSummary,
    files,
    loading,
    error,
    errorCode,
    repoFetchError,
    fetchStage,
    submitZip,
    submitGithub,
    loadDemo,
    openProject,
    retry,
    editUrl,
    reset,
  } = useJobPoller();

  // Reset project data if user logs out or switches accounts
  const prevUserIdRef = useRef<string | undefined>(user?.id);
  useEffect(() => {
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== user?.id) {
      reset();
      setTargetFile(null);
      setTestGenError(null);
      setIsGeneratingTests(false);
      setImpactModalOpen(false);
      setImpactModalTarget(null);
      setActiveTab('overview');
      const params = new URLSearchParams(window.location.search);
      params.delete('project');
      params.delete('file');
      params.delete('tab');
      const cleanUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
    }
    prevUserIdRef.current = user?.id;
  }, [user?.id, reset]);

  const getInitialTab = (): TabType => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as TabType;
    if (
      t === 'overview' ||
      t === 'pulse' ||
      t === 'explanation' ||
      t === 'hotspots' ||
      t === 'graph' ||
      t === 'neural-map' ||
      t === 'tests' ||
      t === 'refactor' ||
      t === 'migration'
    ) {
      return t;
    }
    return 'overview';
  };

  const getInitialFile = (): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get('file') || null;
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);
  const [targetFile, setTargetFile] = useState<string | null>(getInitialFile);
  const [isIngestView, setIsIngestView] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'ingest') return true;
    if (tabParam) return false;
    const urlProj = params.get('project');
    let storedProj: string | null = null;
    try {
      storedProj = localStorage.getItem('codeoracle_active_project_id');
    } catch {
      // ignore
    }
    return !(urlProj || storedProj);
  });
  const [testRevision, setTestRevision] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [testGenError, setTestGenError] = useState<string | null>(null);
  const [hasDependencyLoops, setHasDependencyLoops] = useState(false);
  const [hasHumanReviewRequired, setHasHumanReviewRequired] = useState(false);
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactModalTarget, setImpactModalTarget] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('codeoracle_sidebar_collapsed');
      if (stored !== null) return stored === 'true';
    } catch {
      // ignore
    }
    return false;
  });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('codeoracle_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleOpenImpactModal = (filePath: string) => {
    setImpactModalTarget(filePath);
    setImpactModalOpen(true);
  };

  // If a ?project= URL param or stored project ID is available on mount, open it
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlProjId = params.get('project');
    let storedProjId: string | null = null;
    try {
      storedProjId = localStorage.getItem('codeoracle_active_project_id');
    } catch {
      // ignore
    }
    const projId = urlProjId || storedProjId;
    if (projId && (!project || project.project_id !== projId)) {
      openProject(projId).catch(() => {
        try {
          localStorage.removeItem('codeoracle_active_project_id');
        } catch {
          // ignore
        }
      });
    }
  }, [openProject]);

  // When project loads, persist ID to localStorage and update URL
  useEffect(() => {
    if (project?.project_id) {
      try {
        localStorage.setItem('codeoracle_active_project_id', project.project_id);
      } catch {
        // ignore
      }
      const params = new URLSearchParams(window.location.search);
      if (params.get('project') !== project.project_id) {
        params.set('project', project.project_id);
        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.replaceState({}, '', newUrl);
      }
    }
  }, [project?.project_id]);

  // Clear active project ID if user signs out
  useEffect(() => {
    if (!isAuthenticated) {
      try {
        localStorage.removeItem('codeoracle_active_project_id');
      } catch {
        // ignore
      }
    }
  }, [isAuthenticated]);

  // Check background summary metrics for status dots on tabs
  useEffect(() => {
    if (!project?.project_id) {
      setHasDependencyLoops(false);
      setHasHumanReviewRequired(false);
      return;
    }

    // Check cycles
    fetch(`/api/projects/${project.project_id}/graph?level=module`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.cycles && data.cycles.length > 0) {
          setHasDependencyLoops(true);
        } else {
          setHasDependencyLoops(false);
        }
      })
      .catch(() => setHasDependencyLoops(false));

    // Check human review needed
    fetch(`/api/projects/${project.project_id}/refactor`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && (data.breaking_warning_count > 0 || data.changed_files > 0)) {
          setHasHumanReviewRequired(true);
        } else {
          setHasHumanReviewRequired(false);
        }
      })
      .catch(() => setHasHumanReviewRequired(false));
  }, [project?.project_id]);

  // Update URL search parameters when tab, file, or project changes
  const updateUrlParams = useCallback((newTab: TabType | 'ingest', newFile: string | null) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    if (newFile) {
      params.set('file', newFile);
    } else {
      params.delete('file');
    }
    if (project?.project_id) {
      params.set('project', project.project_id);
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [project?.project_id]);

  const handleTabChange = useCallback((tab: TabType) => {
    setIsIngestView(false);
    setActiveTab(tab);
    updateUrlParams(tab, targetFile);
  }, [targetFile, updateUrlParams]);

  const handleIngest = useCallback(() => {
    setIsIngestView(true);
    updateUrlParams('ingest', null);
  }, [updateUrlParams]);

  const handleReset = useCallback(() => {
    reset();
    setIsIngestView(true);
    try {
      localStorage.removeItem('codeoracle_active_project_id');
    } catch {
      // ignore
    }
    const params = new URLSearchParams(window.location.search);
    params.delete('project');
    params.set('tab', 'ingest');
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [reset]);

  const handleSelectFile = useCallback((filePath: string) => {
    setTargetFile(filePath);
    updateUrlParams(activeTab, filePath);
  }, [activeTab, updateUrlParams]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'ingest') {
        setIsIngestView(true);
      } else {
        setIsIngestView(false);
        const t = (tabParam as TabType) || 'overview';
        setActiveTab(t);
      }
      const f = params.get('file') || null;
      setTargetFile(f);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Clear target file and test errors when repository changes
  useEffect(() => {
    setTargetFile(null);
    setTestGenError(null);
  }, [project?.project_id]);

  // Global keyboard shortcuts (1-9 for tabs, / for search, ? for shortcuts)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'SELECT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key === '1') {
        handleTabChange('overview');
      } else if (e.key === '2') {
        handleTabChange('pulse');
      } else if (e.key === '3') {
        handleTabChange('explanation');
      } else if (e.key === '4') {
        handleTabChange('hotspots');
      } else if (e.key === '5') {
        handleTabChange('graph');
      } else if (e.key === '6') {
        handleTabChange('neural-map');
      } else if (e.key === '7') {
        handleTabChange('tests');
      } else if (e.key === '8') {
        handleTabChange('refactor');
      } else if (e.key === '9') {
        handleTabChange('migration');
      } else if (e.key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="Filter"]'
        );
        searchInput?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleTabChange]);

  const handleTestsUpdated = () => {
    setTestRevision((prev) => prev + 1);
  };

  const handleInspectImpact = (filePath: string) => {
    handleSelectFile(filePath);
    handleTabChange('migration');
  };

  const handleFocusInGraph = (filePath: string) => {
    handleSelectFile(filePath);
    handleTabChange('graph');
  };

  const handleAnalyzeGithubFromLanding = (url: string) => {
    navigateTo('/workspace');
    submitGithub(url);
  };

  const handleAnalyzeZipFromLanding = (file: File) => {
    navigateTo('/workspace');
    submitZip(file);
  };

  const handleLoadDemoFromLanding = (benchmarkName?: string) => {
    navigateTo('/workspace');
    loadDemo(benchmarkName);
  };

  const handleOpenProjectFromLanding = (projectId: string) => {
    navigateTo('/workspace');
    openProject(projectId);
  };

  // Route Dispatcher
  if (currentRoute === '/') {
    return (
      <LandingPage
        onAnalyzeGithub={handleAnalyzeGithubFromLanding}
        onAnalyzeZip={handleAnalyzeZipFromLanding}
        onLoadDemo={handleLoadDemoFromLanding}
        onOpenProject={handleOpenProjectFromLanding}
        isLoading={loading}
      />
    );
  }

  if (currentRoute === '/signin') {
    if (isAuthenticated) {
      navigateTo('/workspace', { replace: true });
    }
    return <SignInPage />;
  }

  if (currentRoute === '/register') {
    if (isAuthenticated) {
      navigateTo('/workspace', { replace: true });
    }
    return <RegisterPage />;
  }

  if (currentRoute === '*') {
    return <NotFoundPage />;
  }

  // Current route is '/workspace'
  return (
    <div className="min-h-screen bg-canvas text-ink-2 flex font-sans antialiased">
      {/* Skip to Content for Accessibility per DESIGN.md §12 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-toast focus:px-4 focus:py-2 focus:bg-ink focus:text-white focus:rounded-pill focus:shadow-3 focus:outline-none"
      >
        Skip to content
      </a>

      <AppSidebar
        hasProject={Boolean(project)}
        activeTab={activeTab}
        isIngestActive={isIngestView}
        onTabChange={handleTabChange}
        onIngest={handleIngest}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={handleToggleSidebar}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
        hasDependencyLoops={hasDependencyLoops}
        hasHumanReviewRequired={hasHumanReviewRequired}
        project={project}
        onLoadDemo={loadDemo}
        loading={loading}
      />

      <div
        className={`flex-1 min-w-0 min-h-screen flex flex-col transition-[padding] duration-base ${
          sidebarCollapsed ? 'lg:pl-[72px]' : 'lg:pl-[260px]'
        }`}
      >
        <ProjectContextBar
          project={project}
          targetFile={targetFile}
          onSelectFile={handleSelectFile}
          onReset={handleReset}
          onOpenImpactModal={handleOpenImpactModal}
          onOpenSidebar={() => setMobileNavOpen(true)}
          onToggleSidebar={handleToggleSidebar}
          sidebarCollapsed={sidebarCollapsed}
          onViewLanding={() => navigateTo('/')}
          featureTitle={isIngestView ? 'Analyze a codebase' : TAB_TITLES[activeTab]}
          featureSubtitle={
            isIngestView
              ? 'ZIP or public GitHub · Python / JS · 100k lines · 200MB'
              : 'Requires an analyzed codebase or active project'
          }
        />

        {/* Main Page Content */}
        <main
          id="main-content"
          className={`flex-1 w-full ${
            !isIngestView && (activeTab === 'graph' || activeTab === 'neural-map') && project
              ? 'px-3 sm:px-4 py-3'
              : 'px-4 sm:px-6 py-5'
          }`}
        >
          {isIngestView ? (
            <WorkspaceShell>
              <div className="w-full max-w-[1020px] mx-auto space-y-8 py-4">
                <InputSection
                  onAnalyzeGithub={submitGithub}
                  onAnalyzeZip={submitZip}
                  onLoadDemo={loadDemo}
                  disabled={loading}
                />
                <RecentProjectsSection onOpenProject={openProject} disabled={loading} />
              </div>
            </WorkspaceShell>
          ) : project ? (
            <>
              {!(activeTab === 'graph' || activeTab === 'neural-map') && (
                <PipelineStrip
                  stage={
                    activeTab === 'tests' || activeTab === 'refactor' || activeTab === 'migration'
                      ? 'output'
                      : 'analyze'
                  }
                  hasProject={Boolean(project)}
                  onIngest={handleIngest}
                  onAnalyze={() => handleTabChange('explanation')}
                  onOutput={() => handleTabChange('tests')}
                />
              )}
              <WorkspaceShell>
                <div className="w-full">
                  {activeTab === 'overview' && (
                    <ProjectOverviewTab
                      project={project}
                      summary={projectSummary}
                      files={files}
                      onSelectFile={handleSelectFile}
                      onNavigateTab={handleTabChange}
                      onReset={handleReset}
                    />
                  )}
                  {activeTab === 'pulse' && (
                    <SystemPulseTab
                      projectId={project.project_id}
                      projectName={project.display_name}
                      targetFile={targetFile}
                      onNavigateTab={handleTabChange}
                      onSelectFile={handleSelectFile}
                    />
                  )}
                  {activeTab === 'explanation' && (
                    <ExplanationTab
                      projectId={project.project_id}
                      projectName={project.display_name}
                      onNavigateTab={handleTabChange}
                      onSelectFile={handleSelectFile}
                      onFocusInGraph={handleFocusInGraph}
                      onInspectImpact={handleInspectImpact}
                    />
                  )}
                  {activeTab === 'hotspots' && (
                    <HotspotsTab
                      projectId={project.project_id}
                      targetFile={targetFile}
                      onNavigateTab={handleTabChange}
                      onSelectFile={handleSelectFile}
                      onFocusInGraph={handleFocusInGraph}
                      onInspectImpact={handleInspectImpact}
                    />
                  )}
                  {activeTab === 'graph' && (
                    <DependencyGraphTab
                      projectId={project.project_id}
                      projectName={project.display_name}
                      targetFile={targetFile}
                      onInspectImpact={handleInspectImpact}
                      onNavigateTab={handleTabChange}
                      onSelectFile={handleSelectFile}
                    />
                  )}
                  {activeTab === 'neural-map' && (
                    <Suspense fallback={<p role="status">Loading Neural Map…</p>}>
                      <NeuralMapPage
                        key={project.project_id}
                        projectId={project.project_id}
                        targetFile={targetFile}
                        onNavigate={(tab, file) => {
                          setTargetFile(file);
                          setActiveTab(tab);
                          updateUrlParams(tab, file);
                        }}
                      />
                    </Suspense>
                  )}
                  {activeTab === 'tests' && (
                    <GeneratedTestsTab
                      projectId={project.project_id}
                      projectName={project.display_name}
                      trustedDemo={project.source_type === 'demo_benchmark'}
                      targetFile={targetFile}
                      onSelectFile={handleSelectFile}
                      onInspectImpact={handleInspectImpact}
                      onNavigateTab={handleTabChange}
                      onTestsUpdated={handleTestsUpdated}
                      onStatusChange={(generating, err) => {
                        setIsGeneratingTests(generating);
                        setTestGenError(err || null);
                      }}
                    />
                  )}
                  {activeTab === 'refactor' && (
                    <RefactoredCodeTab
                      projectId={project.project_id}
                      projectName={project.display_name}
                      trustedDemo={project.source_type === 'demo_benchmark'}
                      targetFile={targetFile}
                      onSelectFile={handleSelectFile}
                      onInspectImpact={handleInspectImpact}
                      onNavigateTab={handleTabChange}
                    />
                  )}
                  {activeTab === 'migration' && (
                    <MigrationPlanTab
                      projectId={project.project_id}
                      projectName={project.display_name}
                      refreshKey={testRevision}
                      isGeneratingTests={isGeneratingTests}
                      testGenError={testGenError}
                      targetFile={targetFile}
                      onNavigateTab={handleTabChange}
                      onSelectFile={handleSelectFile}
                      onFocusInGraph={handleFocusInGraph}
                      onNavigateToTests={() => handleTabChange('tests')}
                    />
                  )}
                </div>
              </WorkspaceShell>
            </>
          ) : (
            <>
              {!(activeTab === 'graph' || activeTab === 'neural-map') && (
                <PipelineStrip
                  stage={
                    activeTab === 'tests' || activeTab === 'refactor' || activeTab === 'migration'
                      ? 'output'
                      : 'analyze'
                  }
                  hasProject={false}
                  onIngest={handleIngest}
                  onAnalyze={() => handleTabChange('explanation')}
                  onOutput={() => handleTabChange('tests')}
                />
              )}
              <WorkspaceShell>
                <div className="w-full max-w-[1020px] mx-auto py-12">
                  <EmptyState
                    icon={EMPTY_FEATURE_CONFIGS[activeTab].icon}
                    headline={EMPTY_FEATURE_CONFIGS[activeTab].headline}
                    description={EMPTY_FEATURE_CONFIGS[activeTab].description}
                    actionText="Analyze a codebase"
                    onAction={handleIngest}
                    secondaryActionText="Load demo dataset"
                    onSecondaryAction={() => loadDemo()}
                    trustCopy="No external code execution required. Analysis runs in isolated, read-only sandboxes."
                  />
                </div>
              </WorkspaceShell>
            </>
          )}
        </main>

        {/* Global Loading / Job Progress Modal */}
        {((loading && !project) || (job && job.state !== 'completed') || error || repoFetchError) && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Repository Analysis Progress"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            onKeyDown={(e) => {
              if (e.key === 'Escape') reset();
            }}
          >
            <div className="w-full max-w-lg bg-surface rounded-3xl border border-line shadow-2xl p-6">
              <JobProgressView
                job={job}
                loading={loading}
                error={error}
                errorCode={errorCode}
                fetchError={repoFetchError}
                fetchStage={fetchStage}
                onRetry={retry}
                onEditUrl={editUrl}
                onCancel={reset}
              />
            </div>
          </div>
        )}

        {/* Shortcuts Modal */}
        <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

        {/* Change Impact Modal */}
        <ChangeImpactModal
          isOpen={impactModalOpen}
          onClose={() => setImpactModalOpen(false)}
          projectId={project?.project_id}
          targetFile={impactModalTarget || targetFile}
          onSelectFile={handleSelectFile}
          onFocusInGraph={handleFocusInGraph}
          onNavigateTab={handleTabChange}
        />

        {/* Clean Footer without unsupported Pro Engine claim */}
        <footer className="border-t border-line px-4 py-3 text-center text-xs text-ink-3 bg-surface/60">
          CodeOracle &copy; 2026 — Legacy Codebase Intelligence &amp; Modernization Engine
        </footer>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <WorkspaceContent />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;

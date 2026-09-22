import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import Header from './components/Header';
import WorkspaceShell from './components/WorkspaceShell';
import ProjectNavBar from './components/ProjectNavBar';
import InputSection from './components/InputSection';
import JobProgressView from './components/JobProgressView';
import RecentProjectsSection from './components/RecentProjectsSection';
import ProjectOverviewTab from './components/ProjectOverviewTab';
import ExplanationTab from './components/ExplanationTab';
import HotspotsTab from './components/HotspotsTab';
import DependencyGraphTab from './components/DependencyGraphTab';
import GeneratedTestsTab from './components/GeneratedTestsTab';
import RefactoredCodeTab from './components/RefactoredCodeTab';
import MigrationPlanTab from './components/MigrationPlanTab';
import SystemPulseTab from './components/pulse/SystemPulseTab';
import { ToastProvider } from './components/common/Toast';
import ShortcutsModal from './components/common/ShortcutsModal';
import ChangeImpactModal from './components/common/ChangeImpactModal';
import { useJobPoller } from './hooks/useJobPoller';
import { TabType } from './types';

const NeuralMapPage = lazy(() => import('./components/NeuralMap/NeuralMapPage'));

const AppContent: React.FC = () => {
  // Sync tab with URL query param '?tab=' per DESIGN.md §11.3
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
  const [testRevision, setTestRevision] = useState(0);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [testGenError, setTestGenError] = useState<string | null>(null);
  const [hasDependencyLoops, setHasDependencyLoops] = useState(false);
  const [hasHumanReviewRequired, setHasHumanReviewRequired] = useState(false);
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactModalTarget, setImpactModalTarget] = useState<string | null>(null);

  const handleOpenImpactModal = (filePath: string) => {
    setImpactModalTarget(filePath);
    setImpactModalOpen(true);
  };

  const {
    job,
    project,
    projectSummary,
    files,
    loading,
    error,
    errorCode,
    repoFetchError,
    lastGithubUrl,
    fetchStage,
    submitZip,
    submitGithub,
    loadDemo,
    openProject,
    retry,
    editUrl,
    reset,
  } = useJobPoller();

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

  // Update URL search parameters when tab or file changes
  const updateUrlParams = useCallback((newTab: TabType, newFile: string | null) => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', newTab);
    if (newFile) {
      params.set('file', newFile);
    } else {
      params.delete('file');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, []);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    updateUrlParams(tab, targetFile);
  }, [targetFile, updateUrlParams]);

  const handleSelectFile = useCallback((filePath: string) => {
    setTargetFile(filePath);
    updateUrlParams(activeTab, filePath);
  }, [activeTab, updateUrlParams]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const t = (params.get('tab') as TabType) || 'explanation';
      const f = params.get('file') || null;
      setActiveTab(t);
      setTargetFile(f);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Clear target file when repository changes
  useEffect(() => {
    setTargetFile(null);
  }, [project?.project_id]);

  // Global keyboard shortcuts per DESIGN.md §11.3:
  // 1-8: switch tabs, /: focus search, c: copy code, ?: shortcuts modal
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

  return (
    <div className="min-h-screen bg-canvas text-ink-2 flex flex-col font-sans antialiased">
      {/* Skip to Content for Accessibility per DESIGN.md §12 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-toast focus:px-4 focus:py-2 focus:bg-ink focus:text-white focus:rounded-pill focus:shadow-3 focus:outline-none"
      >
        Skip to content
      </a>

      {/* Navigation & Brand Header */}
      {!project ? (
        <Header />
      ) : (
        <ProjectNavBar
          project={project}
          files={files}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          targetFile={targetFile}
          onSelectFile={handleSelectFile}
          onReset={reset}
          onOpenImpactModal={handleOpenImpactModal}
          hasDependencyLoops={hasDependencyLoops}
          hasHumanReviewRequired={hasHumanReviewRequired}
        />
      )}

      {/* Main Page Content without restrictive side margins */}
      <main
        id="main-content"
        className={`flex-1 w-full ${
          !project
            ? 'max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8'
            : 'px-3 sm:px-5 lg:px-6 py-3 sm:py-4'
        }`}
      >
        {!project ? (
          <div className="space-y-6 sm:space-y-8">
            <InputSection
              onAnalyzeZip={submitZip}
              onAnalyzeGithub={submitGithub}
              onLoadDemo={loadDemo}
              disabled={loading}
              initialGithubUrl={lastGithubUrl}
            />

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

            {!loading && (
              <RecentProjectsSection
                onOpenProject={openProject}
                disabled={loading}
              />
            )}
          </div>
        ) : (
          <WorkspaceShell>
            <div className="w-full">
                {activeTab === 'overview' && (
                  <ProjectOverviewTab
                    project={project}
                    summary={projectSummary}
                    files={files}
                    onSelectFile={handleSelectFile}
                    onNavigateTab={handleTabChange}
                    onReset={reset}
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
                    <NeuralMapPage key={project.project_id} projectId={project.project_id} targetFile={targetFile}
                      onNavigate={(tab, file) => {
                        setTargetFile(file);
                        setActiveTab(tab);
                        updateUrlParams(tab, file);
                      }} />
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
        )}
      </main>

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

      {/* Footer */}
      <footer className="border-t border-line px-4 py-4 text-center text-xs text-ink-3 bg-surface/60">
        CodeOracle Pro Engine &copy; 2026 — Legacy Codebase Intelligence &amp; Refactoring Engine
      </footer>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;

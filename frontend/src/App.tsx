import React, { useEffect, useState, useCallback } from 'react';
import Header from './components/Header';
import WorkspaceShell from './components/WorkspaceShell';
import TabNavigation from './components/TabNavigation';
import ProjectResultsView from './components/ProjectResultsView';
import InputSection from './components/InputSection';
import JobProgressView from './components/JobProgressView';
import RecentProjectsSection from './components/RecentProjectsSection';
import ExplanationTab from './components/ExplanationTab';
import HotspotsTab from './components/HotspotsTab';
import DependencyGraphTab from './components/DependencyGraphTab';
import GeneratedTestsTab from './components/GeneratedTestsTab';
import RefactoredCodeTab from './components/RefactoredCodeTab';
import MigrationPlanTab from './components/MigrationPlanTab';
import { ToastProvider } from './components/common/Toast';
import ShortcutsModal from './components/common/ShortcutsModal';
import { useJobPoller } from './hooks/useJobPoller';
import { TabType } from './types';

const AppContent: React.FC = () => {
  // Sync tab with URL query param '?tab=' per DESIGN.md §11.3
  const getInitialTab = (): TabType => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('tab') as TabType;
    if (
      t === 'hotspots' ||
      t === 'graph' ||
      t === 'tests' ||
      t === 'refactor' ||
      t === 'migration'
    ) {
      return t;
    }
    return 'explanation';
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

  const { job, project, files, loading, error, errorCode, submitZip, submitGithub, loadDemo, openProject, reset } =
    useJobPoller();

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
  // 1-6: switch tabs, /: focus search, c: copy code, ?: shortcuts modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      } else if (e.key === '1') {
        handleTabChange('explanation');
      } else if (e.key === '2') {
        handleTabChange('hotspots');
      } else if (e.key === '3') {
        handleTabChange('graph');
      } else if (e.key === '4') {
        handleTabChange('tests');
      } else if (e.key === '5') {
        handleTabChange('refactor');
      } else if (e.key === '6') {
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

      {/* 68px Dark Sticky Application Header */}
      <Header />

      {/* Main Page Canvas with Warm Cream Background per DESIGN.md §4.1 */}
      <main
        id="main-content"
        className="flex-1 w-full max-w-[1200px] mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8"
      >
        {!project ? (
          <div className="space-y-6 sm:space-y-8">
            <InputSection
              onAnalyzeZip={submitZip}
              onAnalyzeGithub={submitGithub}
              onLoadDemo={loadDemo}
              disabled={loading}
            />

            <JobProgressView
              job={job}
              loading={loading}
              error={error}
              errorCode={errorCode}
              onRetry={reset}
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
          <div className="space-y-6 sm:space-y-8">
            {/* Project Summary Panel & Source Files Card per DESIGN.md §8.1 */}
            <ProjectResultsView
              project={project}
              files={files}
              onReset={reset}
              onSelectFile={handleSelectFile}
            />

            {/* Centered Workspace Shell holding the 6 tabs */}
            <WorkspaceShell>
              <TabNavigation
                activeTab={activeTab}
                onTabChange={handleTabChange}
                targetFile={targetFile}
                hasDependencyLoops={hasDependencyLoops}
                hasHumanReviewRequired={hasHumanReviewRequired}
              />

              <div className="mt-4">
                {activeTab === 'explanation' && (
                  <ExplanationTab
                    projectId={project.project_id}
                    projectName={project.display_name}
                    onNavigateTab={handleTabChange}
                    onSelectFile={handleSelectFile}
                  />
                )}
                {activeTab === 'hotspots' && (
                  <HotspotsTab
                    projectId={project.project_id}
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
                {activeTab === 'tests' && (
                  <GeneratedTestsTab
                    projectId={project.project_id}
                    projectName={project.display_name}
                    trustedDemo={project.source_type === 'demo_benchmark'}
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
                    onFocusInGraph={handleFocusInGraph}
                    onNavigateToTests={() => handleTabChange('tests')}
                  />
                )}
              </div>
            </WorkspaceShell>
          </div>
        )}
      </main>

      {/* Shortcuts Modal */}
      <ShortcutsModal isOpen={showShortcuts} onClose={() => setShowShortcuts(false)} />

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

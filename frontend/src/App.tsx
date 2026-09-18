import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import InputSection from './components/InputSection';
import JobProgressView from './components/JobProgressView';
import ProjectResultsView from './components/ProjectResultsView';
import TabNavigation from './components/TabNavigation';
import ExplanationTab from './components/ExplanationTab';
import DependencyGraphTab from './components/DependencyGraphTab';
import DependencyHealthTab from './components/DependencyHealthTab';
import GeneratedTestsTab from './components/GeneratedTestsTab';
import RefactoredCodeTab from './components/RefactoredCodeTab';
import MigrationPlanTab from './components/MigrationPlanTab';
import ArchitectureEvolutionTab from './components/ArchitectureEvolutionTab';
import { KnowledgeGraphTab } from './components/KnowledgeGraphTab';
import RecentProjectsSection from './components/RecentProjectsSection';
import { useJobPoller } from './hooks/useJobPoller';
import { ViewMode, TabType } from './types';

export const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewMode>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [testRevision, setTestRevision] = useState<number>(0);
  const [isGeneratingTests, setIsGeneratingTests] = useState<boolean>(false);
  const [testGenError, setTestGenError] = useState<string | null>(null);

  const {
    job,
    project,
    files,
    loading,
    error,
    errorCode,
    submitZip,
    submitGithub,
    loadDemo,
    openProject,
    reset,
  } = useJobPoller();

  // If a project is loaded while user is in 'analyze' view, automatically show project analysis
  useEffect(() => {
    if (project && activeView === 'analyze') {
      setActiveView('explanation');
    }
  }, [project?.project_id]);

  const handleTestsUpdated = () => {
    setTestRevision((prev) => prev + 1);
  };

  const handleOpenProject = (projectId: string) => {
    openProject(projectId);
    setActiveView('dashboard');
  };

  const handleReset = () => {
    reset();
    setActiveView('dashboard');
  };

  const isDetailTab = ['explanation', 'graph', 'health', 'architecture', 'tests', 'refactor', 'migration'].includes(activeView);

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#292622] flex flex-col font-sans antialiased">
      {/* Top Application Header */}
      <Header
        onToggleMobileSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        activeProjectName={project?.display_name}
        onViewChange={setActiveView}
      />

      <div className="flex flex-1">
        {/* Persistent Sidebar Navigation */}
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          hasActiveProject={!!project}
          activeProjectName={project?.display_name}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8 min-w-0">
          {/* VIEW 1: Dashboard */}
          {activeView === 'dashboard' && (
            <DashboardView
              currentProject={project}
              onOpenProject={handleOpenProject}
              onViewChange={setActiveView}
              disabled={loading}
            />
          )}

          {/* VIEW 2: Ingest & Analyze New Codebase */}
          {activeView === 'analyze' && (
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
              />
              {!loading && (
                <RecentProjectsSection
                  onOpenProject={handleOpenProject}
                  disabled={loading}
                />
              )}
            </div>
          )}

          {/* VIEW 3: Deep Analysis Tabs (Explanation, Dependencies, Tests, Refactoring, Migration) */}
          {isDetailTab && (
            <div className="space-y-6">
              {project ? (
                <>
                  <ProjectResultsView project={project} files={files} onReset={handleReset} />

                  <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-3 shadow-warm sm:p-4 lg:p-6 transition-all duration-150">
                    <TabNavigation
                      activeTab={activeView as TabType}
                      onTabChange={(tab) => setActiveView(tab)}
                    />

                    <div className="mt-4">
                      {activeView === 'explanation' && (
                        <ExplanationTab projectId={project.project_id} />
                      )}
                      {activeView === 'knowledge_graph' && (
                        <KnowledgeGraphTab projectId={project.project_id} />
                      )}
                      {activeView === 'graph' && (
                        <DependencyGraphTab projectId={project.project_id} />
                      )}
                      {activeView === 'health' && (
                        <DependencyHealthTab projectId={project.project_id} />
                      )}
                      {activeView === 'tests' && (
                        <GeneratedTestsTab
                          projectId={project.project_id}
                          trustedDemo={project.source_type === 'demo_benchmark'}
                          onTestsUpdated={handleTestsUpdated}
                          onStatusChange={(generating, err) => {
                            setIsGeneratingTests(generating);
                            setTestGenError(err || null);
                          }}
                        />
                      )}
                      {activeView === 'refactor' && (
                        <RefactoredCodeTab projectId={project.project_id} />
                      )}
                      {activeView === 'migration' && (
                        <MigrationPlanTab
                          projectId={project.project_id}
                          refreshKey={testRevision}
                          isGeneratingTests={isGeneratingTests}
                          testGenError={testGenError}
                          onNavigateToTests={() => setActiveView('tests')}
                        />
                      )}
                      {activeView === 'architecture' && (
                        <ArchitectureEvolutionTab projectId={project.project_id} />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="rounded-[28px] border-2 border-dashed border-[#D8CFC2] bg-[#FFFDFC] p-10 text-center shadow-warm">
                  <h3 className="text-base font-black text-[#181715]">
                    No Active Project Selected
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#6B645A] max-w-md mx-auto">
                    Please upload a codebase or select a stored project from the Dashboard to access this analysis view.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView('analyze')}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#4C4FD6] px-5 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#383BA8] transition-colors"
                  >
                    Ingest Codebase
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Global Application Footer */}
      <footer className="border-t border-[#D8CFC2] px-4 py-4 text-center text-[11px] text-[#6B645A] sm:text-xs bg-[#FFFDFC]/50 z-30">
        CodeOracle &copy; 2026 — Legacy Codebase Intelligence Engine
      </footer>
    </div>
  );
};

export default App;

import React, { useState } from 'react';
import Header from './components/Header';
import InputSection from './components/InputSection';
import JobProgressView from './components/JobProgressView';
import ProjectResultsView from './components/ProjectResultsView';
import TabNavigation from './components/TabNavigation';
import ExplanationTab from './components/ExplanationTab';
import DependencyGraphTab from './components/DependencyGraphTab';
import GeneratedTestsTab from './components/GeneratedTestsTab';
import RefactoredCodeTab from './components/RefactoredCodeTab';
import MigrationPlanTab from './components/MigrationPlanTab';
import { useJobPoller } from './hooks/useJobPoller';
import { TabType } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('explanation');
  const [testRevision, setTestRevision] = useState(0);
  const [isGeneratingTests, setIsGeneratingTests] = useState(false);
  const [testGenError, setTestGenError] = useState<string | null>(null);

  const { job, project, files, loading, error, errorCode, submitZip, submitGithub, loadDemo, reset } =
    useJobPoller();

  const handleTestsUpdated = () => {
    setTestRevision((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#F7F4EE] text-[#292622] flex flex-col font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 py-4 sm:px-4 sm:py-6 lg:px-6 lg:py-8">
        {!project ? (
          <>
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
          </>
        ) : (
          <ProjectResultsView project={project} files={files} onReset={reset} />
        )}

        {project && (
          <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-3 shadow-warm sm:p-4 lg:p-6 transition-all duration-150">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="mt-4">
              {activeTab === 'explanation' && <ExplanationTab projectId={project.project_id} />}
              {activeTab === 'graph' && <DependencyGraphTab projectId={project.project_id} />}
              {activeTab === 'tests' && (
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
              {activeTab === 'refactor' && <RefactoredCodeTab projectId={project.project_id} />}
              {activeTab === 'migration' && (
                <MigrationPlanTab
                  projectId={project.project_id}
                  refreshKey={testRevision}
                  isGeneratingTests={isGeneratingTests}
                  testGenError={testGenError}
                  onNavigateToTests={() => setActiveTab('tests')}
                />
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#D8CFC2] px-4 py-4 text-center text-[11px] text-[#6B645A] sm:text-xs bg-[#FFFDFC]/50">
        CodeOracle &copy; 2026 — Legacy Codebase Intelligence Engine
      </footer>
    </div>
  );
};

export default App;

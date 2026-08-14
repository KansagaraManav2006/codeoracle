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
  const { job, project, files, loading, error, errorCode, submitZip, submitGithub, loadDemo, reset } =
    useJobPoller();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
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
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 shadow-xl sm:p-4 lg:p-6">
            <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="mt-4">
              {activeTab === 'explanation' && <ExplanationTab projectId={project.project_id} />}
              {activeTab === 'graph' && <DependencyGraphTab projectId={project.project_id} />}
              {activeTab === 'tests' && <GeneratedTestsTab projectId={project.project_id} trustedDemo={project.source_type === 'demo_benchmark'} />}
              {activeTab === 'refactor' && <RefactoredCodeTab projectId={project.project_id} />}
              {activeTab === 'migration' && <MigrationPlanTab projectId={project.project_id} />}
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-800/80 px-4 py-4 text-center text-[11px] text-slate-500 sm:text-xs">
        CodeOracle &copy; 2026
      </footer>
    </div>
  );
};

export default App;

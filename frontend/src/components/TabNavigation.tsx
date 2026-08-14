import React from 'react';
import { BookOpen, GitFork, Map, TestTube, Wand2 } from 'lucide-react';
import { TabType } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'explanation' as TabType, label: 'Explanation', icon: BookOpen },
    { id: 'graph' as TabType, label: 'Dependency Graph', icon: GitFork },
    { id: 'tests' as TabType, label: 'Generated Tests', icon: TestTube },
    { id: 'refactor' as TabType, label: 'Refactored Code', icon: Wand2 },
    { id: 'migration' as TabType, label: 'Migration Plan', icon: Map },
  ];

  return (
    <div role="tablist" aria-label="Analysis results" className="sticky top-[61px] z-40 -mx-3 mb-4 flex snap-x snap-mandatory overflow-x-auto border-b border-slate-800 bg-slate-900/95 px-2 shadow-sm backdrop-blur sm:top-[65px] sm:mx-0 sm:mb-6 sm:space-x-1 sm:px-0 lg:top-[77px]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={`flex min-h-11 shrink-0 snap-start touch-manipulation items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-all sm:gap-2 sm:px-4 sm:text-sm lg:px-5 ${
              isActive
                ? 'border-indigo-500 text-indigo-400 bg-indigo-500/5 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default TabNavigation;

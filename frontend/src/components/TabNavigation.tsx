import React from 'react';
import { BookOpen, GitFork, TestTube, Wand2 } from 'lucide-react';
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
  ];

  return (
    <div className="flex border-b border-slate-800 space-x-2 mb-6">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center space-x-2 px-5 py-3 text-sm font-medium border-b-2 transition-all ${
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

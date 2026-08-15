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
    <div className="sticky top-[57px] z-40 -mx-3 mb-5 overflow-x-auto border-b-2 border-[#C8BEB0] bg-[#ECE5DA]/90 px-3 py-2 shadow-xs backdrop-blur sm:top-[61px] sm:mx-0 sm:mb-6 sm:px-2 rounded-2xl">
      <div className="flex space-x-1.5 sm:space-x-2 min-w-max">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all duration-150 sm:px-5 sm:text-sm ${
                isActive
                  ? 'bg-[#181715] text-white shadow-md ring-1 ring-black/10'
                  : 'bg-[#FFFDFC] text-[#3B3733] border border-[#C8BEB0] hover:bg-[#181715] hover:text-white hover:border-[#181715]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#C7953D]' : 'text-[#5C554D]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;

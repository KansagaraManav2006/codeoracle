import React from 'react';
import { BookOpen, Flame, GitFork, Map, TestTube, Wand2 } from 'lucide-react';
import { TabType } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  targetFile?: string | null;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange, targetFile }) => {
  const tabs = [
    { id: 'explanation' as TabType, label: 'Architecture Overview', icon: BookOpen },
    { id: 'hotspots' as TabType, label: 'Risk Hotspots', icon: Flame },
    { id: 'graph' as TabType, label: 'Dependency Map', icon: GitFork },
    { id: 'tests' as TabType, label: 'Safety Tests', icon: TestTube },
    { id: 'refactor' as TabType, label: 'Modernization', icon: Wand2 },
    { id: 'migration' as TabType, label: 'Impact & Plan', icon: Map },
  ];

  return (
    <div className="sticky top-[57px] z-40 -mx-3 mb-5 overflow-x-auto border-b-2 border-[#C8BEB0] bg-[#ECE5DA]/95 px-3 py-2 shadow-xs backdrop-blur sm:top-[61px] sm:mx-0 sm:mb-6 sm:px-2 rounded-2xl">
      <div className="mb-2 flex min-w-max items-center gap-2 px-1 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#6B645A]">
        <span className="text-[#292622]">Guided modernization workflow</span>
        <span className="text-[#A3998E]">Audit → risk → impact → protect → modernize → plan</span>
        {targetFile && (
          <span className="max-w-[260px] truncate rounded-full border border-[#C7C4F7] bg-[#EAE9FB] px-2 py-0.5 font-mono normal-case tracking-normal text-[#4340A0]" title={targetFile}>
            Target: {targetFile}
          </span>
        )}
      </div>
      <div className="flex min-w-max space-x-1.5 sm:space-x-2">
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

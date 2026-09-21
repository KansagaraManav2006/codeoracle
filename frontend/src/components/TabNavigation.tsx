import React, { useRef, useEffect } from 'react';
import { BookOpen, Flame, Network, Workflow, TestTube, Wand2, Map, LucideIcon, FolderGit2 } from 'lucide-react';
import { TabType } from '../types';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  targetFile?: string | null;
  hasDependencyLoops?: boolean;
  hasHumanReviewRequired?: boolean;
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: LucideIcon;
  statusDot?: 'red' | 'amber';
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  targetFile,
  hasDependencyLoops = false,
  hasHumanReviewRequired = false,
}) => {
  const tabsListRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const tabs: TabConfig[] = [
    { id: 'overview', label: 'Project Details', icon: FolderGit2 },
    { id: 'explanation', label: 'Architecture Overview', icon: BookOpen },
    { id: 'hotspots', label: 'Risk Hotspots', icon: Flame },
    {
      id: 'graph',
      label: 'Dependency Map',
      icon: Workflow,
      statusDot: hasDependencyLoops ? 'red' : undefined,
    },
    { id: 'neural-map', label: 'Neural Map', icon: Network },
    { id: 'tests', label: 'Safety Tests', icon: TestTube },
    { id: 'refactor', label: 'Modernization', icon: Wand2 },
    {
      id: 'migration',
      label: 'Impact & Plan',
      icon: Map,
      statusDot: hasHumanReviewRequired ? 'amber' : undefined,
    },
  ];

  // Scroll active tab into view on smaller screens
  useEffect(() => {
    const activeBtn = tabButtonRefs.current[activeTab];
    if (activeBtn && tabsListRef.current) {
      const container = tabsListRef.current;
      const left = activeBtn.offsetLeft - container.offsetLeft - 8;
      container.scrollTo({ left, behavior: 'smooth' });
    }
  }, [activeTab]);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const tabKeys = tabs.map((t) => t.id);
    let targetIndex = -1;

    if (e.key === 'ArrowRight') {
      targetIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      targetIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = tabs.length - 1;
    }

    if (targetIndex !== -1) {
      e.preventDefault();
      const targetTab = tabKeys[targetIndex];
      onTabChange(targetTab);
      tabButtonRefs.current[targetTab]?.focus();
    }
  };

  return (
    <div className="w-full mb-3.5">
      {/* Guided modernization workflow subtitle banner */}
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] font-sans">
        <div className="flex items-center gap-2">
          <span className="font-bold text-ink uppercase tracking-wider text-[10px]">
            Guided workflow:
          </span>
          <span className="text-ink-3 hidden sm:inline">
            Architecture Overview → Risk Hotspots → Dependency Map → Neural Map → Safety Tests → Modernization → Impact &amp; Plan
          </span>
        </div>
        {targetFile && (
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">
              Focused Target:
            </span>
            <span
              className="max-w-[280px] truncate rounded-pill bg-indigo-surface px-2.5 py-0.5 font-mono text-xs font-semibold text-indigo-text border border-indigo/20"
              title={targetFile}
            >
              {targetFile}
            </span>
          </div>
        )}
      </div>

      {/* Tab bar track */}
      <div
        ref={tabsListRef}
        role="tablist"
        aria-label="Workspace Tabs"
        className="w-full flex items-center gap-2 p-1.5 sm:p-2 bg-track rounded-xl overflow-x-auto custom-scrollbar scroll-smooth snap-x select-none"
      >
        {tabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabButtonRefs.current[tab.id] = el;
              }}
              id={`tab-${tab.id}`}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`relative flex items-center gap-2 h-9 sm:h-10 px-3.5 sm:px-4 rounded-pill font-sans text-xs sm:text-sm font-semibold whitespace-nowrap snap-start transition-[background-color,border-color,transform,box-shadow] duration-fast ${
                isActive
                  ? 'bg-ink text-white shadow-xs border border-transparent'
                  : 'bg-surface text-ink-2 hover:text-ink border border-line shadow-xs hover:border-line-strong hover:shadow-1 hover:-translate-y-[1px]'
              } focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo focus-visible:outline-offset-2`}
            >
              <Icon
                className={`w-4 h-4 sm:w-[18px] sm:h-[18px] shrink-0 ${
                  isActive ? 'text-white' : 'text-ink-3'
                }`}
                strokeWidth={1.75}
              />
              <span>{tab.label}</span>

              {/* Status dot if present */}
              {tab.statusDot === 'red' && (
                <span
                  className="w-2 h-2 rounded-full bg-red shrink-0"
                  aria-label="Dependency cycles detected"
                  title="Dependency cycles detected"
                />
              )}
              {tab.statusDot === 'amber' && (
                <span
                  className="w-2 h-2 rounded-full bg-amber shrink-0"
                  aria-label="Human review required"
                  title="Human review required"
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabNavigation;

import React, { useRef, useEffect } from 'react';
import {
  Eye,
  RotateCcw,
  BookOpen,
  Flame,
  Network,
  Workflow,
  TestTube,
  Wand2,
  Map,
  Target,
  X,
  LucideIcon,
  FolderGit2,
} from 'lucide-react';
import { ProjectFileResponse, ProjectMetadataResponse, TabType } from '../types';
import { sourceLabel } from '../utils/presentation';
import { truncateMiddle } from '../utils/formatters';
import Button from './common/Button';
import StatusPill from './common/StatusPill';

interface ProjectNavBarProps {
  project: ProjectMetadataResponse;
  files: ProjectFileResponse[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  targetFile: string | null;
  onSelectFile: (filePath: string) => void;
  onReset: () => void;
  onOpenImpactModal?: (filePath: string) => void;
  hasDependencyLoops?: boolean;
  hasHumanReviewRequired?: boolean;
}

interface TabConfig {
  id: TabType;
  label: string;
  icon: LucideIcon;
  statusDot?: 'red' | 'amber';
}

export const ProjectNavBar: React.FC<ProjectNavBarProps> = ({
  project,
  activeTab,
  onTabChange,
  targetFile,
  onSelectFile,
  onReset,
  onOpenImpactModal,
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
      const target = tabKeys[targetIndex];
      onTabChange(target);
      tabButtonRefs.current[target]?.focus();
    }
  };

  return (
    <header className="w-full bg-surface border-b border-line shadow-xs select-none sticky top-0 z-30 backdrop-blur-md bg-surface/95">
      {/* Top Bar: Clean Identity & Global Actions */}
      <div className="w-full px-3 sm:px-5 lg:px-6 py-2.5 flex items-center justify-between gap-3 border-b border-line/60">
        {/* Left: CodeOracle Brand + Project Breadcrumb & Source Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 group cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo rounded-md"
            title="Return to home / upload new project"
          >
            <div className="w-7 h-7 rounded-md bg-indigo flex items-center justify-center text-white shrink-0 shadow-xs group-hover:bg-indigo-strong transition-colors">
              <Eye className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <span className="font-display font-extrabold text-sm sm:text-base text-ink group-hover:text-indigo transition-colors hidden sm:inline">
              CodeOracle
            </span>
          </button>

          <span className="text-ink-4 font-mono select-none" aria-hidden="true">
            /
          </span>

          <div className="flex items-center gap-2 min-w-0">
            <span
              className="font-display font-bold text-sm sm:text-base text-ink truncate max-w-[240px] sm:max-w-[420px] lg:max-w-[600px]"
              title={project.display_name}
            >
              {project.display_name}
            </span>

            <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-track text-ink-2 font-mono text-[10px] font-bold border border-line uppercase tracking-wider shrink-0">
              {sourceLabel(project.source_type)}
            </span>
          </div>
        </div>

        {/* Right: Service Status & Analyze Another Action */}
        <div className="flex items-center gap-2.5 shrink-0 ml-auto">
          <StatusPill />

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            icon={<RotateCcw className="w-3.5 h-3.5" strokeWidth={1.75} />}
            className="text-xs font-semibold h-8"
            title="Upload or analyze another repository"
          >
            <span className="hidden sm:inline">Analyze another</span>
            <span className="sm:hidden">Reset</span>
          </Button>
        </div>
      </div>

      {/* Bottom Bar: Tab Navigation and Active Target File Bar */}
      <div className="w-full px-3 sm:px-5 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-2.5 bg-canvas/60">
        {/* Navigation Tabs */}
        <div
          ref={tabsListRef}
          role="tablist"
          aria-label="Workspace Tabs"
          className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto custom-scrollbar scroll-smooth snap-x select-none py-0.5"
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
                className={`relative flex items-center gap-2 h-8 sm:h-9 px-3 sm:px-3.5 rounded-pill font-sans text-xs font-semibold whitespace-nowrap snap-start transition-[background-color,border-color,transform,box-shadow] duration-fast ${
                  isActive
                    ? 'bg-ink text-white shadow-xs border border-transparent'
                    : 'bg-surface text-ink-2 hover:text-ink border border-line shadow-xs hover:border-line-strong hover:shadow-1 hover:-translate-y-[1px]'
                } focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo`}
              >
                <Icon
                  className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${
                    isActive ? 'text-white' : 'text-ink-3'
                  }`}
                  strokeWidth={1.75}
                />
                <span>{tab.label}</span>

                {/* Status Dot */}
                {tab.statusDot === 'red' && (
                  <span
                    className="w-2 h-2 rounded-full bg-red shrink-0 animate-pulse"
                    aria-label="Dependency cycles detected"
                    title="Circular dependencies detected"
                  />
                )}
                {tab.statusDot === 'amber' && (
                  <span
                    className="w-2 h-2 rounded-full bg-amber shrink-0 animate-pulse"
                    aria-label="Review required"
                    title="Breaking changes or modernizations pending review"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Target File Indicator & Quick Action */}
        {targetFile ? (
          <div className="flex items-center gap-2 animate-[fade-down_120ms_ease-out] ml-auto">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface border border-line text-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 hidden sm:inline">
                Selected:
              </span>
              <span
                className="font-mono text-xs font-bold text-ink truncate max-w-[180px] sm:max-w-[280px]"
                title={targetFile}
              >
                {truncateMiddle(targetFile, 32)}
              </span>
              <button
                type="button"
                onClick={() => onSelectFile('')}
                className="text-ink-4 hover:text-ink ml-1 p-0.5 rounded cursor-pointer transition-colors"
                title="Clear selected target file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>

            {onOpenImpactModal && (
              <Button
                variant="indigo"
                size="sm"
                onClick={() => onOpenImpactModal(targetFile)}
                icon={<Target className="w-3.5 h-3.5" />}
                className="text-xs font-bold shadow-xs h-8"
              >
                <span className="hidden md:inline">What breaks if I change this?</span>
                <span className="md:hidden">Impact</span>
              </Button>
            )}
          </div>
        ) : (
          <div className="hidden lg:flex items-center gap-2 text-[11px] text-ink-4 font-sans ml-auto">
            <span>Shortcuts:</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-line font-mono text-[10px] text-ink-3">
              1-8
            </kbd>
            <span>Tabs</span>
            <span className="text-ink-4">·</span>
            <kbd className="px-1.5 py-0.5 rounded bg-surface border border-line font-mono text-[10px] text-ink-3">
              /
            </kbd>
            <span>Search</span>
          </div>
        )}
      </div>
    </header>
  );
};

export default ProjectNavBar;

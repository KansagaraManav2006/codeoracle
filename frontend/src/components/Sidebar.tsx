import React from 'react';
import {
  LayoutDashboard,
  FolderPlus,
  BookOpen,
  GitFork,
  TestTube,
  ShieldCheck,
  Wand2,
  Map,
  Layers,
  ChevronRight,
  Database,
  Network,
  X,
} from 'lucide-react';
import { ViewMode } from '../types';

interface SidebarProps {
  activeView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  hasActiveProject: boolean;
  activeProjectName?: string;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

interface NavItem {
  id: ViewMode;
  label: string;
  icon: any;
  requiresProject?: boolean;
  badge?: string | null;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  hasActiveProject,
  activeProjectName,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const handleNavClick = (view: ViewMode, requiresProject = false) => {
    if (requiresProject && !hasActiveProject) {
      // If user clicks a detail tab without an active project, switch to analyze/projects first
      onViewChange('analyze');
    } else {
      onViewChange(view);
    }
    if (onCloseMobile) onCloseMobile();
  };

  const navGroups: NavGroup[] = [
    {
      title: 'MAIN',
      items: [
        { id: 'dashboard' as ViewMode, label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'analyze' as ViewMode, label: 'Projects & Ingest', icon: FolderPlus, badge: null },
      ],
    },
    {
      title: 'ANALYSIS',
      items: [
        { id: 'explanation' as ViewMode, label: 'Explanation', icon: BookOpen, requiresProject: true },
        { id: 'knowledge_graph' as ViewMode, label: 'Knowledge Graph', icon: Network, requiresProject: true },
        { id: 'graph' as ViewMode, label: 'Dependencies', icon: GitFork, requiresProject: true },
      ],
    },
    {
      title: 'QUALITY',
      items: [
        { id: 'health' as ViewMode, label: 'Dependency Health', icon: ShieldCheck, requiresProject: true },
        { id: 'tests' as ViewMode, label: 'Tests', icon: TestTube, requiresProject: true },
      ],
    },
    {
      title: 'MODERNIZE',
      items: [
        { id: 'refactor' as ViewMode, label: 'Refactoring', icon: Wand2, requiresProject: true },
        { id: 'migration' as ViewMode, label: 'Migration Plan', icon: Map, requiresProject: true },
      ],
    },
    {
      title: 'ARCHITECTURE',
      items: [
        { id: 'architecture' as ViewMode, label: 'Architecture Evolution', icon: Layers, requiresProject: true },
      ],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#141312] text-[#E5DFD5] border-r border-[#2A2724] shadow-xl transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar Header (Mobile close button & Branding) */}
        <div className="flex h-16 items-center justify-between border-b border-[#2A2724] px-5 lg:h-14">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#4C4FD6] text-white shadow-xs">
              <Layers className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-sm tracking-wide text-white font-sans uppercase">
              Platform Shell
            </span>
          </div>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="rounded-lg p-1.5 text-[#A3998E] hover:bg-[#252320] hover:text-white lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Current Active Project Context */}
        <div className="mx-3 my-3.5 rounded-xl border border-[#2F2C28] bg-[#1C1A18] p-3">
          <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-[#A3998E]">
            <span>Active Project</span>
            <span className={`inline-block h-2 w-2 rounded-full ${hasActiveProject ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </div>
          <div className="mt-1.5 flex items-center gap-2 truncate">
            <Database className="h-3.5 w-3.5 shrink-0 text-[#8B8DF2]" />
            <span className="truncate text-xs font-bold text-white">
              {hasActiveProject ? activeProjectName || 'Loaded Project' : 'No Project Selected'}
            </span>
          </div>
          {!hasActiveProject && (
            <button
              onClick={() => handleNavClick('analyze')}
              className="mt-2 w-full rounded-lg bg-[#4C4FD6]/20 border border-[#4C4FD6]/40 py-1 text-[11px] font-bold text-[#8B8DF2] hover:bg-[#4C4FD6]/30 transition-colors"
            >
              + Ingest Codebase
            </button>
          )}
        </div>

        {/* Navigation Group Items */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-2 scrollbar-thin scrollbar-thumb-[#2F2C28]">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-widest text-[#7C756B]">
                {group.title}
              </div>
              <div className="mt-1 space-y-0.5">
                {group.items.map((item, idx) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  const isDisabled = item.requiresProject && !hasActiveProject;

                  return (
                    <button
                      key={`${group.title}-${item.id}-${idx}`}
                      onClick={() => handleNavClick(item.id, item.requiresProject)}
                      className={`group flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                        isActive
                          ? 'bg-[#4C4FD6] text-white shadow-md'
                          : isDisabled
                          ? 'text-[#615A52] hover:bg-[#1E1C1A] hover:text-[#999084]'
                          : 'text-[#C9C1B5] hover:bg-[#23211E] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-white'
                              : isDisabled
                              ? 'text-[#4A453F]'
                              : 'text-[#A3998E] group-hover:text-white'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {isDisabled && (
                        <span className="text-[9px] font-semibold text-[#544E47] bg-[#1C1A18] px-1.5 py-0.5 rounded">
                          lock
                        </span>
                      )}
                      {isActive && <ChevronRight className="h-3.5 w-3.5 text-white/80" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-[#2A2724] p-3.5 text-center text-[11px] font-medium text-[#7C756B]">
          <div>CodeOracle Shell v2.5</div>
          <div className="text-[9px] text-[#544E47] mt-0.5">Deterministic Analysis Engine</div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

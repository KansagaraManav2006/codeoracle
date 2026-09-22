import React, { useEffect } from 'react';
import {
  Activity,
  BookOpen,
  Eye,
  Flame,
  FolderGit2,
  Map,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  TestTube,
  Upload,
  Wand2,
  Workflow,
  X,
  LucideIcon,
} from 'lucide-react';
import { ProjectMetadataResponse, TabType } from '../types';
import StatusPill from './common/StatusPill';
import Badge from './common/Badge';
import { sourceLabel } from '../utils/presentation';

type NavId = TabType | 'ingest';

interface NavItem {
  id: NavId;
  label: string;
  icon: LucideIcon;
  statusDot?: 'red' | 'amber';
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

interface AppSidebarProps {
  hasProject: boolean;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onIngest: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  hasDependencyLoops?: boolean;
  hasHumanReviewRequired?: boolean;
  project?: ProjectMetadataResponse | null;
  onLoadDemo?: (benchmarkName?: string) => void;
  loading?: boolean;
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  hasProject,
  activeTab,
  onTabChange,
  onIngest,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onMobileClose,
  hasDependencyLoops = false,
  hasHumanReviewRequired = false,
  project,
  onLoadDemo,
  loading = false,
}) => {
  const groups: NavGroup[] = [
    {
      label: 'Ingest',
      items: [{ id: 'ingest', label: 'Codebase Ingestion', icon: Upload }],
    },
    {
      label: 'Analyze',
      items: [
        { id: 'overview', label: 'Project Details', icon: FolderGit2 },
        { id: 'pulse', label: 'System Pulse', icon: Activity },
        { id: 'explanation', label: 'Explanation', icon: BookOpen },
        { id: 'hotspots', label: 'Risk Hotspots', icon: Flame },
        {
          id: 'graph',
          label: 'Dependency Graph',
          icon: Workflow,
          statusDot: hasDependencyLoops ? 'red' : undefined,
        },
        { id: 'neural-map', label: 'Neural Map', icon: Network },
      ],
    },
    {
      label: 'Output',
      items: [
        { id: 'tests', label: 'Generated Tests', icon: TestTube },
        { id: 'refactor', label: 'Refactored Code', icon: Wand2 },
        {
          id: 'migration',
          label: 'Migration Plan',
          icon: Map,
          statusDot: hasHumanReviewRequired ? 'amber' : undefined,
        },
      ],
    },
  ];

  const isIngestActive = !hasProject;
  const analysisLocked = !hasProject;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onMobileClose]);

  const handleNav = (id: NavId) => {
    if (id === 'ingest') {
      onIngest();
      onMobileClose();
      return;
    }
    if (analysisLocked) return;
    onTabChange(id);
    onMobileClose();
  };

  const navBody = (
    <div className="flex flex-col h-full">
      <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center px-2 py-4' : 'px-4 py-4'}`}>
        <button
          type="button"
          onClick={onIngest}
          className="flex items-center gap-2.5 min-w-0 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo rounded-md"
          title="CodeOracle home"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo flex items-center justify-center text-white shrink-0 shadow-xs">
            <Eye className="w-4 h-4" strokeWidth={1.75} />
          </div>
          {!collapsed && (
            <div className="min-w-0 text-left">
              <div className="font-display font-extrabold text-sm text-ink tracking-tight leading-none">
                CodeOracle
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-4 mt-0.5">
                Pro Engine
              </div>
            </div>
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-3 space-y-4" aria-label="Workspace">
        {groups.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-4">
                {group.label}
              </p>
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === 'ingest' ? isIngestActive : hasProject && activeTab === item.id;
                const locked = item.id !== 'ingest' && analysisLocked;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNav(item.id)}
                      disabled={locked}
                      title={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center gap-2.5 rounded-lg text-left transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                        collapsed ? 'justify-center h-10 px-0' : 'h-9 px-2.5'
                      } ${
                        isActive
                          ? 'bg-indigo-surface text-indigo-text font-semibold'
                          : locked
                          ? 'text-ink-4 cursor-not-allowed'
                          : 'text-ink-2 hover:bg-tile hover:text-ink'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo' : 'text-ink-3'}`}
                        strokeWidth={1.75}
                      />
                      {!collapsed && <span className="text-[13px] truncate flex-1">{item.label}</span>}
                      {!collapsed && item.statusDot === 'red' && (
                        <span className="w-2 h-2 rounded-full bg-red shrink-0" title="Cycles detected" />
                      )}
                      {!collapsed && item.statusDot === 'amber' && (
                        <Badge tone="amber" size="sm">
                          Review
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className={`border-t border-sidebar-line ${collapsed ? 'p-2' : 'p-3'} space-y-2.5`}>
        {collapsed && onLoadDemo && !hasProject && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onLoadDemo()}
            className="w-full h-10 inline-flex items-center justify-center rounded-lg border border-line bg-tile/70 hover:border-indigo/30 hover:bg-indigo-surface/50 transition-colors disabled:opacity-50"
            title="Load demo dataset"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber" />
          </button>
        )}
        {!collapsed && onLoadDemo && !hasProject && (
          <button
            type="button"
            disabled={loading}
            onClick={() => onLoadDemo()}
            className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg border border-line bg-tile/70 text-left hover:border-indigo/30 hover:bg-indigo-surface/50 transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber shrink-0" />
            <span className="text-[12px] font-semibold text-ink">Load demo dataset</span>
          </button>
        )}
        {!collapsed && project && (
          <div className="px-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink-4 mb-1">Project</p>
            <p className="text-[12px] font-semibold text-ink truncate" title={project.display_name}>
              {project.display_name}
            </p>
            <Badge tone="neutral" size="sm" className="mt-1.5">
              {sourceLabel(project.source_type)}
            </Badge>
          </div>
        )}
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2`}>
          {!collapsed && <StatusPill />}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className="hidden lg:inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-tile"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[280] bg-ink/30 backdrop-blur-[2px] lg:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[290] bg-sidebar border-r border-sidebar-line flex flex-col transition-[transform,width] duration-base ease-out lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[72px] w-[240px]' : 'w-[240px]'}`}
        aria-label="Application sidebar"
      >
        <div className="lg:hidden flex justify-end px-2 pt-2">
          <button
            type="button"
            onClick={onMobileClose}
            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-tile"
            aria-label="Close navigation"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {navBody}
      </aside>
    </>
  );
};

export default AppSidebar;

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
  User,
  LogOut,
  Home,
  LucideIcon,
} from 'lucide-react';
import { ProjectMetadataResponse, TabType } from '../types';
import StatusPill from './common/StatusPill';
import Badge from './common/Badge';
import { sourceLabel } from '../utils/presentation';
import { useAuth } from '../context/AuthContext';
import { navigateTo } from '../utils/navigation';

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
  isIngestActive?: boolean;
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
  isIngestActive,
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
  const { user, isAuthenticated, logout } = useAuth();
  const groups: NavGroup[] = [
    {
      label: 'Ingest',
      items: [{ id: 'ingest', label: 'Analyze a codebase', icon: Upload }],
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
        { id: 'refactor', label: 'Refactor Proposals', icon: Wand2 },
        {
          id: 'migration',
          label: 'Migration Plan',
          icon: Map,
          statusDot: hasHumanReviewRequired ? 'amber' : undefined,
        },
      ],
    },
  ];

  const isIngestSelected = isIngestActive ?? (!hasProject && activeTab === 'overview');

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
    onTabChange(id);
    onMobileClose();
  };

  const navBody = (
    <div className="flex flex-col h-full">
      {/* Header with Logo + Sidebar Toggle */}
      <div
        className={`flex items-center ${
          collapsed ? 'flex-col gap-2 px-2 py-3.5' : 'justify-between px-4 py-3.5'
        } border-b border-sidebar-line`}
      >
        <button
          type="button"
          onClick={onIngest}
          className="flex items-center gap-2.5 min-w-0 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo rounded-md"
          title="CodeOracle home"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo flex items-center justify-center text-white shrink-0 shadow-xs group-hover:scale-105 transition-transform">
            <Eye className="w-4 h-4" strokeWidth={1.75} />
          </div>
          {!collapsed && (
            <div className="min-w-0 text-left">
              <div className="font-display font-extrabold text-sm text-ink tracking-tight leading-none">
                CodeOracle
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-ink-4 mt-0.5 font-mono">
                Architecture
              </div>
            </div>
          )}
        </button>

        {/* Desktop Sidebar Toggle Button in Header */}
        <button
          type="button"
          onClick={onToggleCollapsed}
          className={`hidden lg:inline-flex items-center justify-center rounded-md text-ink-3 hover:text-ink hover:bg-tile border border-transparent hover:border-line transition-all ${
            collapsed
              ? 'w-8 h-8 bg-tile/70 text-indigo hover:text-indigo hover:bg-indigo-surface border-line'
              : 'w-7 h-7'
          }`}
          title={collapsed ? 'Open sidebar (show feature names)' : 'Close sidebar (icon rail)'}
          aria-label={collapsed ? 'Open sidebar (show feature names)' : 'Close sidebar (icon rail)'}
        >
          {collapsed ? (
            <PanelLeftOpen className="w-4 h-4 text-indigo" />
          ) : (
            <PanelLeftClose className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Feature Navigation List */}
      <nav className="flex-1 overflow-y-auto custom-scrollbar px-2.5 pb-3 space-y-3.5 mt-2" aria-label="Workspace">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed ? (
              <p className="px-2.5 pt-1.5 text-[10px] font-bold uppercase tracking-[0.08em] text-ink-4 font-mono">
                {group.label}
              </p>
            ) : (
              <div className="h-px bg-sidebar-line/60 my-1.5 mx-1" />
            )}
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = item.id === 'ingest' ? isIngestSelected : (!isIngestSelected && activeTab === item.id);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => handleNav(item.id)}
                      title={item.label}
                      aria-current={isActive ? 'page' : undefined}
                      className={`w-full flex items-center gap-3 rounded-lg text-left transition-colors duration-fast focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
                        collapsed ? 'justify-center h-10 px-0' : 'h-9 px-3'
                      } ${
                        isActive
                          ? 'bg-indigo-surface text-indigo font-bold border border-indigo/20 shadow-xs'
                          : 'text-ink-2 hover:bg-tile hover:text-ink font-medium'
                      }`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-transform ${
                          isActive ? 'text-indigo scale-110' : 'text-ink-3'
                        }`}
                        strokeWidth={isActive ? 2 : 1.75}
                      />
                      {!collapsed && (
                        <span className="text-[13px] truncate flex-1 tracking-tight">
                          {item.label}
                        </span>
                      )}
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

      {/* Footer Controls & Secondary Actions */}
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
        {/* Home Link */}
        <button
          type="button"
          onClick={() => navigateTo('/')}
          className={`w-full flex items-center ${
            collapsed ? 'justify-center p-2' : 'gap-2 px-2.5 py-1.5'
          } rounded-lg text-ink-3 hover:text-ink hover:bg-tile transition-colors text-xs font-medium`}
          title="Return to home landing page"
        >
          <Home className="w-4 h-4 shrink-0 text-indigo" />
          {!collapsed && <span>Home overview</span>}
        </button>

        {/* Auth status */}
        {isAuthenticated ? (
          <div className={`pt-2 border-t border-sidebar-line ${collapsed ? 'flex flex-col items-center gap-1.5' : 'space-y-1.5'}`}>
            {!collapsed ? (
              <div className="flex items-center justify-between gap-1.5 px-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-5 h-5 rounded-full bg-indigo/15 text-indigo flex items-center justify-center shrink-0">
                    <User className="w-3 h-3" />
                  </div>
                  <span className="text-[11px] font-mono text-ink truncate" title={user?.email}>
                    {user?.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => logout()}
                  title="Sign out"
                  className="p-1 rounded text-ink-4 hover:text-red-text transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => logout()}
                title={`Sign out (${user?.email})`}
                className="p-1.5 rounded-lg text-ink-4 hover:text-red-text hover:bg-tile"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className={`pt-2 border-t border-sidebar-line ${collapsed ? 'flex justify-center' : 'space-y-1'}`}>
            {!collapsed ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigateTo('/signin')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-tile hover:bg-surface border border-line text-[11px] font-semibold text-ink text-center transition-colors"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo('/register')}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-indigo text-white text-[11px] font-semibold text-center hover:bg-indigo-hover transition-colors"
                >
                  Register
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigateTo('/signin')}
                title="Sign in"
                className="p-2 rounded-lg text-indigo hover:bg-indigo-surface"
              >
                <User className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <div className={`flex items-center ${collapsed ? 'justify-center' : 'justify-between'} gap-2 pt-1`}>
          {!collapsed && <StatusPill />}
          <button
            type="button"
            onClick={onToggleCollapsed}
            className={`hidden lg:inline-flex items-center gap-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-tile transition-colors border border-transparent hover:border-line ${
              collapsed ? 'h-8 w-8 justify-center' : 'px-2.5 py-1 text-xs font-medium'
            }`}
            title={collapsed ? 'Open sidebar (show feature names)' : 'Close sidebar (icon rail)'}
            aria-label={collapsed ? 'Open sidebar (show feature names)' : 'Close sidebar (icon rail)'}
          >
            {collapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <>
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span className="text-[11px]">Collapse</span>
              </>
            )}
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
        className={`fixed inset-y-0 left-0 z-[290] bg-sidebar border-r border-sidebar-line flex flex-col transition-[transform,width] duration-base ease-out lg:translate-x-0 shadow-sm ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${collapsed ? 'lg:w-[72px] w-[260px]' : 'w-[260px]'}`}
        aria-label="Application sidebar"
      >
        <div className="lg:hidden flex items-center justify-between px-3 pt-3 pb-1 border-b border-sidebar-line">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-indigo flex items-center justify-center text-white shrink-0">
              <Eye className="w-3.5 h-3.5" />
            </div>
            <span className="font-display font-bold text-xs text-ink">CodeOracle</span>
          </div>
          <button
            type="button"
            onClick={onMobileClose}
            className="h-7 w-7 inline-flex items-center justify-center rounded-md text-ink-3 hover:bg-tile"
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

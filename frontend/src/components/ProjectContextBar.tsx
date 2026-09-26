import React from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, RotateCcw, Target, X } from 'lucide-react';
import { ProjectMetadataResponse } from '../types';
import { truncateMiddle } from '../utils/formatters';
import Button from './common/Button';
import StatusPill from './common/StatusPill';

interface ProjectContextBarProps {
  project: ProjectMetadataResponse | null;
  targetFile: string | null;
  onSelectFile: (filePath: string) => void;
  onReset: () => void;
  onOpenImpactModal?: (filePath: string) => void;
  onOpenSidebar: () => void;
  onToggleSidebar?: () => void;
  sidebarCollapsed?: boolean;
  onViewLanding?: () => void;
  featureTitle?: string;
  featureSubtitle?: string;
}

export const ProjectContextBar: React.FC<ProjectContextBarProps> = ({
  project,
  targetFile,
  onSelectFile,
  onReset,
  onOpenImpactModal,
  onOpenSidebar,
  onToggleSidebar,
  sidebarCollapsed = false,
  onViewLanding,
  featureTitle,
  featureSubtitle,
}) => {
  return (
    <div className="sticky top-0 z-sticky bg-surface/90 backdrop-blur-md border-b border-line">
      <div className="h-12 px-3 sm:px-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="lg:hidden h-8 w-8 inline-flex items-center justify-center rounded-md text-ink-2 hover:bg-tile"
            aria-label="Open navigation"
            title="Open navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="hidden lg:inline-flex h-8 px-2.5 items-center gap-1.5 rounded-md text-ink-2 hover:text-ink hover:bg-tile border border-line text-xs font-medium transition-colors shadow-xs"
              aria-label={sidebarCollapsed ? 'Open sidebar (show feature names)' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Open sidebar (show feature names)' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? (
                <>
                  <PanelLeftOpen className="w-3.5 h-3.5 text-indigo" />
                  <span className="text-[11px] font-semibold text-ink">Features</span>
                </>
              ) : (
                <>
                  <PanelLeftClose className="w-3.5 h-3.5 text-ink-3" />
                  <span className="text-[11px] font-medium text-ink-3">Hide</span>
                </>
              )}
            </button>
          )}
          {project ? (
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-4 leading-none mb-0.5">
                Active codebase
              </p>
              <p className="font-display font-bold text-sm text-ink truncate" title={project.display_name}>
                {project.display_name}
              </p>
            </div>
          ) : (
            <div className="min-w-0">
              <p className="font-display font-bold text-sm text-ink">{featureTitle || 'Analyze a codebase'}</p>
              <p className="text-[10px] text-ink-3 hidden sm:block">
                {featureSubtitle || 'ZIP or public GitHub · Python / JS · 100k lines · 200MB'}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {targetFile && (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-tile border border-line text-xs">
              <span className="font-mono font-semibold text-ink truncate max-w-[200px]" title={targetFile}>
                {truncateMiddle(targetFile, 28)}
              </span>
              <button
                type="button"
                onClick={() => onSelectFile('')}
                className="text-ink-4 hover:text-ink p-0.5"
                title="Clear selected file"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          {targetFile && onOpenImpactModal && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenImpactModal(targetFile)}
              icon={<Target className="w-3.5 h-3.5 text-amber" />}
              className="hidden md:inline-flex text-xs h-8"
            >
              Impact
            </Button>
          )}
          <div className="hidden sm:block lg:hidden">
            <StatusPill />
          </div>
          {project && (
            <>
              {onViewLanding && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewLanding}
                  className="text-xs h-8 hidden sm:inline-flex"
                >
                  Landing
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={onReset}
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                className="text-xs h-8"
              >
                <span className="hidden sm:inline">Analyze another</span>
                <span className="sm:hidden">Reset</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectContextBar;

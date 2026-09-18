import React from 'react';
import { ChevronRight, Home, Folder } from 'lucide-react';
import { ViewMode } from '../../types';

interface BreadcrumbsProps {
  activeView: ViewMode;
  activeProjectName?: string;
  onNavigate: (view: ViewMode) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  activeView,
  activeProjectName,
  onNavigate,
}) => {
  const getViewLabel = (view: ViewMode) => {
    switch (view) {
      case 'dashboard':
        return 'Dashboard';
      case 'analyze':
        return 'Projects & Ingestion';
      case 'explanation':
        return 'Explanation';
      case 'knowledge_graph':
        return 'Codebase Knowledge Graph';
      case 'graph':
        return 'Dependency Graph';
      case 'health':
        return 'Dependency Health';
      case 'architecture':
        return 'Architecture Evolution';
      case 'tests':
        return 'Generated Tests';
      case 'refactor':
        return 'Refactored Code';
      case 'migration':
        return 'Migration Plan';
      default:
        return view;
    }
  };

  return (
    <nav className="flex items-center gap-1.5 text-xs text-[#6B645A] font-medium py-2 px-1">
      <button
        onClick={() => onNavigate('dashboard')}
        className="flex items-center gap-1 hover:text-[#181715] transition-colors"
      >
        <Home className="w-3.5 h-3.5 text-[#C7953D]" />
        <span>CodeOracle</span>
      </button>

      <ChevronRight className="w-3 h-3 text-[#B0A79C]" />

      {activeProjectName && activeView !== 'dashboard' && activeView !== 'analyze' ? (
        <>
          <button
            onClick={() => onNavigate('analyze')}
            className="flex items-center gap-1 hover:text-[#181715] transition-colors truncate max-w-[140px]"
          >
            <Folder className="w-3.5 h-3.5 text-[#4C4FD6]" />
            <span className="truncate">{activeProjectName}</span>
          </button>
          <ChevronRight className="w-3 h-3 text-[#B0A79C]" />
        </>
      ) : null}

      <span className="font-bold text-[#181715] bg-[#ECE5DA] px-2 py-0.5 rounded-md">
        {getViewLabel(activeView)}
      </span>
    </nav>
  );
};

export default Breadcrumbs;

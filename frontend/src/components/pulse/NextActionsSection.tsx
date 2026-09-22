import React from 'react';
import { Target, ArrowUpRight } from 'lucide-react';
import { NextAction, TabType } from '../../types';

interface NextActionsSectionProps {
  actions: NextAction[];
  onNavigateTab: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

export const NextActionsSection: React.FC<NextActionsSectionProps> = ({
  actions,
  onNavigateTab,
  onSelectFile,
}) => {
  if (!actions || actions.length === 0) {
    return null;
  }

  const handleActionClick = (action: NextAction) => {
    if (action.targetFile && onSelectFile) {
      onSelectFile(action.targetFile);
    }
    onNavigateTab(action.destinationPage);
  };

  const getDestinationLabel = (tab: TabType) => {
    switch (tab) {
      case 'overview':
        return 'Project Details';
      case 'explanation':
        return 'Architecture Overview';
      case 'hotspots':
        return 'Risk Hotspots';
      case 'graph':
        return 'Dependency Map';
      case 'neural-map':
        return 'Neural Map';
      case 'tests':
        return 'Safety Tests';
      case 'refactor':
        return 'Modernization';
      case 'migration':
        return 'Impact & Plan';
      default:
        return 'Target View';
    }
  };

  return (
    <div className="bg-surface border border-line rounded-card shadow-1 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h3 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
            <Target className="w-4 h-4 text-interactive" />
            Recommended Next Actions
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Ranked tactical steps grounded in current codebase evidence. Jump directly into workflow tools.
          </p>
        </div>
        <span className="text-[11px] font-mono text-ink-3">
          {actions.length} Actionable Recommendations
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {actions.map((action, idx) => {
          return (
            <div
              key={action.id || idx}
              className="p-4 rounded-xl bg-panel/30 border border-line hover:border-interactive/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              {/* Left: Number, Title & Details */}
              <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-interactive-surface text-interactive flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                  {idx + 1}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-ink">{action.title}</h4>
                    {action.targetFile && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-3 truncate max-w-[200px]" title={action.targetFile}>
                        {action.targetFile}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-ink-2">
                    <strong className="text-ink font-medium">Reason: </strong>
                    {action.reason}
                  </p>

                  <p className="text-xs text-teal-strong">
                    <strong className="font-medium">Expected Effect: </strong>
                    {action.expectedEffect}
                  </p>
                </div>
              </div>

              {/* Right: Action Button */}
              <div className="shrink-0 self-end md:self-center">
                <button
                  onClick={() => handleActionClick(action)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-interactive text-white hover:bg-interactive-press shadow-sm transition-all flex items-center gap-1.5"
                >
                  <span>Open in {getDestinationLabel(action.destinationPage)}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NextActionsSection;

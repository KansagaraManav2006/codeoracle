import React from 'react';
import { Target, ArrowRight } from 'lucide-react';
import { NextAction, TabType } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

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
    <Card variant="primary" padding="lg" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink font-display tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo">
              <Target className="w-4 h-4" />
            </div>
            <span>Recommended Next Actions</span>
          </h3>
          <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
            Ranked tactical steps grounded in current codebase evidence. Jump directly into workflow tools.
          </p>
        </div>
        <Badge tone="neutral" size="sm">
          {actions.length} Actionable Recommendations
        </Badge>
      </div>

      {/* 2-Column Ranked Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {actions.map((action, idx) => {
          const rankFormatted = String(idx + 1).padStart(2, '0');

          return (
            <div
              key={action.id || idx}
              className="p-4 sm:p-5 rounded-xl bg-surface border border-line hover:border-line-strong hover:shadow-1 transition-all flex flex-col justify-between shadow-xs"
            >
              <div>
                {/* Header: Rank + Title + Target File */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-indigo-surface text-indigo border border-indigo/20 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5">
                    {rankFormatted}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-ink font-display tracking-tight leading-snug">
                      {action.title}
                    </h4>

                    {action.targetFile && (
                      <span
                        className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-tile border border-line text-indigo truncate max-w-full"
                        title={action.targetFile}
                      >
                        {action.targetFile}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description / Reason */}
                <p className="text-xs text-ink-2 mt-2 leading-relaxed pl-10">
                  {action.reason}
                </p>

                {/* Expected Effect */}
                {action.expectedEffect && (
                  <div className="mt-2.5 ml-10 p-2.5 rounded-lg bg-tile border border-line text-[11px] text-ink-3">
                    <span className="font-bold text-ink">Expected Effect: </span>
                    <span>{action.expectedEffect}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between ml-10">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-ink-4">
                  Target: {getDestinationLabel(action.destinationPage)}
                </span>

                <Button
                  variant="indigo"
                  size="sm"
                  onClick={() => handleActionClick(action)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Open {getDestinationLabel(action.destinationPage)}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default NextActionsSection;

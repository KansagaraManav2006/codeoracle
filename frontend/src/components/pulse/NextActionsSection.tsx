import React from 'react';
import { Target, ArrowRight } from 'lucide-react';
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
    <section
      className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7 transition-all"
      aria-label="Recommended Next Actions"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D7EAF5]">
        <div>
          <h3 className="text-lg font-bold text-[#102536] tracking-tight font-display flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
              <Target className="w-4 h-4" />
            </div>
            <span>Recommended Next Actions</span>
          </h3>
          <p className="text-xs text-[#52697A] mt-1">
            Ranked tactical steps grounded in current codebase evidence. Jump directly into workflow tools.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F7FBFF] border border-[#D7EAF5] text-[#52697A] self-start sm:self-auto">
          {actions.length} Actionable Recommendations
        </span>
      </div>

      {/* 2-Column Ranked Grid (Section 29) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        {actions.map((action, idx) => {
          const rankFormatted = String(idx + 1).padStart(2, '0');

          return (
            <div
              key={action.id || idx}
              className="p-5 rounded-xl bg-white border border-[#D7EAF5] hover:border-[#3BA7F2]/50 hover:shadow-[0_8px_24px_rgba(11,61,145,0.08)] transition-all flex flex-col justify-between shadow-xs group"
            >
              <div>
                {/* Header: Rank + Title + Target File */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30 flex items-center justify-center font-mono font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                    {rankFormatted}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-bold text-[#102536] font-display tracking-tight leading-snug">
                      {action.title}
                    </h4>

                    {action.targetFile && (
                      <span
                        className="inline-block mt-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#F7FBFF] border border-[#D7EAF5] text-[#0B3D91] truncate max-w-full"
                        title={action.targetFile}
                      >
                        {action.targetFile}
                      </span>
                    )}
                  </div>
                </div>

                {/* Reason */}
                <p className="text-xs text-[#52697A] font-sans mt-3 leading-relaxed">
                  <strong className="text-[#102536] font-semibold">Reason: </strong>
                  {action.reason}
                </p>

                {/* Expected Impact */}
                <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-[#E6F8F3]/60 border border-[#7FE7D6]/40 text-xs text-[#167C69] font-sans">
                  <strong className="font-semibold">Expected Effect: </strong>
                  <span>{action.expectedEffect}</span>
                </div>
              </div>

              {/* Action Button: Ocean Blue Primary CTA (Section 30) */}
              <div className="mt-4 pt-3.5 border-t border-[#D7EAF5]">
                <button
                  type="button"
                  onClick={() => handleActionClick(action)}
                  className="w-full py-2 px-3.5 rounded-xl text-xs font-bold bg-[#0B3D91] text-white hover:bg-[#1E40AF] shadow-xs transition-all flex items-center justify-center gap-1.5"
                >
                  <span>Open in {getDestinationLabel(action.destinationPage)}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default NextActionsSection;

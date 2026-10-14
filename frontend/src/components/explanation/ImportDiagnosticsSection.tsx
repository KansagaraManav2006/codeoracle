import React from 'react';
import { GitBranch } from 'lucide-react';
import Card from '../common/Card';

interface ImportDiagnosticsSectionProps {
  unresolvedDiagnostics?: any;
  showDiagnosticsDetails: boolean;
  onToggleDiagnosticsDetails: () => void;
}

export const ImportDiagnosticsSection: React.FC<ImportDiagnosticsSectionProps> = ({
  unresolvedDiagnostics,
  showDiagnosticsDetails,
  onToggleDiagnosticsDetails,
}) => {
  if (!unresolvedDiagnostics) return null;

  return (
    <Card variant="primary" padding="lg" className="space-y-4 animate-[fade-up_200ms_ease-out_both]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20">
            <GitBranch className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div>
            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo border border-indigo/20 uppercase tracking-wide inline-block mb-0.5">
              Diagnostics · Parser &amp; Import Resolution
            </span>
            <h3 className="font-display font-bold text-base sm:text-lg text-ink">
              Unresolved Dependency Diagnostics
            </h3>
          </div>
        </div>
        <span className="font-mono text-xs font-bold text-amber-strong px-2.5 py-1 rounded bg-amber-surface border border-amber/30">
          {unresolvedDiagnostics.total_unresolved} Relationships Need Review
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {unresolvedDiagnostics.groups?.map((group: any) => (
          <div key={group.key} className="bg-tile border border-line rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-base font-black text-ink">{group.count}</span>
              <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-surface border border-line text-ink-3">
                {group.key}
              </span>
            </div>
            <h4 className="font-sans text-xs font-bold text-ink">{group.label}</h4>
            <p className="text-[11px] text-ink-3 leading-snug">{group.description}</p>
          </div>
        ))}
      </div>

      <div className="pt-2 border-t border-line/60">
        <button
          type="button"
          onClick={onToggleDiagnosticsDetails}
          className="text-xs font-mono font-bold text-indigo hover:underline flex items-center gap-1 cursor-pointer"
        >
          {showDiagnosticsDetails ? 'Hide sample unresolved import paths' : 'Inspect sample unresolved import paths →'}
        </button>

        {showDiagnosticsDetails && (
          <div className="mt-3 p-3.5 bg-panel rounded-lg border border-line space-y-3 animate-[fade-down_150ms_ease-out]">
            {unresolvedDiagnostics.groups
              ?.filter((g: any) => g.examples && g.examples.length > 0)
              .map((g: any) => (
                <div key={g.key} className="space-y-1">
                  <span className="text-[11px] font-bold text-ink uppercase font-mono block">
                    {g.label} ({g.count}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                    {g.examples.map((ex: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-surface border border-line text-ink-2">
                        {ex}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default ImportDiagnosticsSection;

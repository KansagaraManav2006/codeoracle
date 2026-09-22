import React from 'react';
import {
  HelpCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { CandidateDisposition } from '../../types';

export interface DispositionCount {
  disposition: CandidateDisposition;
  label: string;
  count: number;
  description: string;
}

interface CandidateDispositionPanelProps {
  candidatesCount: number;
  autofixEligibleCount: number;
  generatedDiffsCount: number;
  dispositions: DispositionCount[];
  selectedDisposition?: CandidateDisposition | null;
  onSelectDisposition?: (disposition: CandidateDisposition | null) => void;
  onOpenRulesRegistry?: () => void;
}

export const CandidateDispositionPanel: React.FC<CandidateDispositionPanelProps> = ({
  candidatesCount,
  autofixEligibleCount,
  generatedDiffsCount,
  dispositions,
  selectedDisposition,
  onSelectDisposition,
  onOpenRulesRegistry,
}) => {
  return (
    <section
      className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-1 space-y-4"
      aria-label="Candidate disposition breakdown"
    >
      {/* High-trust Explanation Banner */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 p-4 rounded-lg bg-indigo-surface/40 border border-indigo/20">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-md bg-indigo text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-display font-bold text-sm sm:text-base text-ink">
                {candidatesCount} modernization candidates detected
              </h4>
              <span className="px-2 py-0.5 rounded-pill bg-indigo-surface text-indigo-text font-mono text-[10px] font-bold uppercase border border-indigo/30">
                Deterministic Audit
              </span>
            </div>
            <p className="font-sans text-xs text-ink-2 leading-relaxed">
              <strong className="text-ink">
                {candidatesCount} require manual review · {autofixEligibleCount} match deterministic autofix rules · {generatedDiffsCount} safe diffs generated
              </strong>
            </p>
            <p className="font-sans text-xs text-ink-3 leading-relaxed mt-0.5">
              CodeOracle adheres to a strict safety threshold: zero automatic code mutations without 100% deterministic AST preservation. Structural, high-complexity, or dependency issues are categorized as <em>Refactor Recommendations</em> requiring human review, not automated rule substitution.
            </p>
          </div>
        </div>

        {onOpenRulesRegistry && (
          <button
            type="button"
            onClick={onOpenRulesRegistry}
            className="shrink-0 text-xs font-semibold text-indigo flex items-center gap-1.5 hover:underline py-1 px-2.5 rounded bg-surface border border-indigo/25 shadow-xs self-start"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo" />
            <span>Inspect Rule Registry</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dispositions Breakdown Grid */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2">
            Candidate Disposition Reasons
          </span>
          {selectedDisposition && (
            <button
              type="button"
              onClick={() => onSelectDisposition?.(null)}
              className="text-[11px] text-indigo hover:underline font-medium"
            >
              Reset disposition filter
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {dispositions.map((item) => {
            const isSelected = selectedDisposition === item.disposition;
            const isZero = item.count === 0;

            return (
              <button
                key={item.disposition}
                type="button"
                disabled={isZero}
                onClick={() =>
                  onSelectDisposition?.(
                    isSelected ? null : item.disposition
                  )
                }
                className={`text-left p-3 rounded-lg border transition-all flex flex-col justify-between select-none ${
                  isSelected
                    ? 'bg-indigo-surface border-indigo text-indigo-text shadow-xs ring-1 ring-indigo/40'
                    : isZero
                    ? 'opacity-50 border-line/60 bg-tile/40 cursor-default text-ink-4'
                    : 'bg-tile border-line hover:border-indigo/40 hover:bg-surface text-ink'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-display font-bold text-base sm:text-lg leading-none num">
                      {item.count}
                    </span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        item.count > 0 ? 'bg-indigo' : 'bg-ink-4'
                      }`}
                    />
                  </div>
                  <div className="text-[11px] font-bold leading-snug">
                    {item.label}
                  </div>
                </div>
                <p className="text-[10px] text-ink-3 mt-1.5 leading-tight">
                  {item.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CandidateDispositionPanel;

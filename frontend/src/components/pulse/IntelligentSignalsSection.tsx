import React from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Workflow,
  Wand2,
  Shield,
  Lightbulb,
} from 'lucide-react';
import { HealthSignal } from '../../types';

interface IntelligentSignalsSectionProps {
  signals: HealthSignal[];
}

export const IntelligentSignalsSection: React.FC<IntelligentSignalsSectionProps> = ({
  signals,
}) => {
  if (!signals || signals.length === 0) {
    return null;
  }

  const getSignalBadge = (type: string) => {
    switch (type) {
      case 'most_important':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-surface text-red-text border border-red/30 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-strong" />
            Most Important Signal
          </span>
        );
      case 'dependency':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-interactive-surface text-interactive border border-interactive/30 flex items-center gap-1">
            <Workflow className="w-3 h-3 text-interactive" />
            Dependency Signal
          </span>
        );
      case 'modernization':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-panel text-ink-2 border border-line flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-ink-3" />
            Modernization Signal
          </span>
        );
      case 'protection':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-surface text-amber-text border border-amber/30 flex items-center gap-1">
            <Shield className="w-3 h-3 text-amber-strong" />
            Protection Signal
          </span>
        );
      case 'positive':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-surface text-teal-text border border-teal/30 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal" />
            Positive Signal
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-panel text-ink-3 border border-line flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Analysis Signal
          </span>
        );
    }
  };

  const getCardBorder = (severity: string) => {
    switch (severity) {
      case 'risk':
        return 'border-l-4 border-l-red-strong border-line';
      case 'warning':
        return 'border-l-4 border-l-amber-strong border-line';
      case 'positive':
        return 'border-l-4 border-l-teal-strong border-line';
      default:
        return 'border-l-4 border-l-interactive border-line';
    }
  };

  return (
    <div className="bg-surface border border-line rounded-card shadow-1 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h3 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-interactive" />
            Intelligent Signals
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Evidence-backed architectural insights and verified codebase conditions.
          </p>
        </div>
        <span className="text-[11px] font-mono text-ink-3">
          {signals.length} Verified Findings
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {signals.map((signal) => {
          return (
            <div
              key={signal.id}
              className={`p-4 rounded-xl bg-panel/30 border ${getCardBorder(
                signal.severity
              )} flex flex-col justify-between hover:shadow-1 transition-all`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  {getSignalBadge(signal.type)}
                </div>

                <h4 className="text-sm font-bold text-ink tracking-tight mb-1.5">
                  {signal.title}
                </h4>

                <p className="text-xs text-ink-2 leading-relaxed mb-3">
                  {signal.narrative}
                </p>
              </div>

              {signal.evidence && signal.evidence.length > 0 && (
                <div className="pt-2.5 border-t border-line/60">
                  <span className="text-[10px] font-mono uppercase text-ink-3 font-semibold block mb-1">
                    Verified Evidence:
                  </span>
                  <ul className="space-y-1">
                    {signal.evidence.map((ev, idx) => (
                      <li
                        key={idx}
                        className="text-[11px] font-mono text-ink-3 bg-surface/70 border border-line/60 px-2 py-0.5 rounded truncate"
                        title={ev}
                      >
                        &bull; {ev}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntelligentSignalsSection;

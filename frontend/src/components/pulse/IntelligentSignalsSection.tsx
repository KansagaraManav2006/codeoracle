import React from 'react';
import {
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Workflow,
  Wand2,
  Shield,
  Lightbulb,
  ArrowRight,
} from 'lucide-react';
import { HealthSignal, TabType } from '../../types';

interface IntelligentSignalsSectionProps {
  signals: HealthSignal[];
  onNavigateTab?: (tab: TabType) => void;
}

export const IntelligentSignalsSection: React.FC<IntelligentSignalsSectionProps> = ({
  signals,
  onNavigateTab,
}) => {
  if (!signals || signals.length === 0) {
    return null;
  }

  // Find the featured signal (most_important or highest severity)
  const featuredSignal = signals.find((s) => s.type === 'most_important') || signals[0];
  const secondarySignals = signals.filter((s) => s.id !== featuredSignal?.id);

  const getSignalIcon = (type: string) => {
    switch (type) {
      case 'most_important':
        return AlertCircle;
      case 'protection':
        return Shield;
      case 'dependency':
        return Workflow;
      case 'modernization':
        return Wand2;
      case 'positive':
        return CheckCircle2;
      default:
        return Lightbulb;
    }
  };

  const getSignalBadge = (type: string) => {
    switch (type) {
      case 'most_important':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-[#DC2626]" />
            Most Important Signal
          </span>
        );
      case 'dependency':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30 flex items-center gap-1">
            <Workflow className="w-3 h-3 text-[#0B3D91]" />
            Dependency Signal
          </span>
        );
      case 'modernization':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F7FBFF] text-[#0D9488] border border-[#7FE7D6]/50 flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-[#0D9488]" />
            Modernization Signal
          </span>
        );
      case 'protection':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#B45309]" />
            Protection Signal
          </span>
        );
      case 'positive':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E6F8F3] text-[#167C69] border border-[#7FE7D6]/40 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-[#167C69]" />
            Positive Signal
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#F7FBFF] text-[#52697A] border border-[#D7EAF5] flex items-center gap-1">
            <Lightbulb className="w-3 h-3" />
            Analysis Signal
          </span>
        );
    }
  };

  const getCardBorder = (severity: string) => {
    switch (severity) {
      case 'risk':
        return 'border-l-4 border-l-[#DC2626] border-[#D7EAF5]';
      case 'warning':
        return 'border-l-4 border-l-[#D97706] border-[#D7EAF5]';
      case 'positive':
        return 'border-l-4 border-l-[#167C69] border-[#D7EAF5]';
      default:
        return 'border-l-4 border-l-[#0B3D91] border-[#D7EAF5]';
    }
  };

  return (
    <section
      className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7 transition-all"
      aria-label="Intelligent Signals"
    >
      {/* Header with Evidence-Backed Signals wording (Section 28) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D7EAF5]">
        <div>
          <h3 className="text-lg font-bold text-[#102536] tracking-tight font-display flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Intelligent Signals</span>
          </h3>
          <p className="text-xs text-[#52697A] mt-1">
            Evidence-backed architectural insights and static repository conditions.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F7FBFF] border border-[#D7EAF5] text-[#52697A] self-start sm:self-auto">
          {signals.length} Evidence-Backed Signals
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {/* Featured Signal Card (Section 26) */}
        {featuredSignal && (
          <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#FFFBEB] via-white to-[#F7FBFF] border border-[#FCD34D] shadow-[0_4px_20px_rgba(217,119,6,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-[#DC2626]" />
                  Most Important Signal
                </span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-white border border-[#D7EAF5] text-[#52697A] capitalize">
                  {featuredSignal.type.replace('_', ' ')}
                </span>
              </div>

              {onNavigateTab && (
                <button
                  type="button"
                  onClick={() => onNavigateTab(featuredSignal.type === 'protection' ? 'tests' : 'hotspots')}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-white text-[#92400E] hover:bg-[#FEF3C7] border border-[#FCD34D] shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>{featuredSignal.type === 'protection' ? 'Review Safety Tests' : 'Investigate Signal'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <h4 className="text-base sm:text-lg font-bold text-[#102536] tracking-tight font-display">
              {featuredSignal.title}
            </h4>

            <p className="text-xs sm:text-sm text-[#52697A] leading-relaxed mt-1.5 max-w-3xl">
              {featuredSignal.narrative}
            </p>

            {featuredSignal.evidence && featuredSignal.evidence.length > 0 && (
              <div className="mt-4 pt-3 border-t border-[#FCD34D]/50">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#92400E] block mb-2">
                  Static Grounding Evidence:
                </span>
                <div className="flex flex-wrap gap-2">
                  {featuredSignal.evidence.map((ev, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-mono bg-white border border-[#FCD34D] px-3 py-1 rounded-lg text-[#102536] shadow-2xs"
                    >
                      &bull; {ev}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Secondary Signals Grid (Section 26) */}
        {secondarySignals.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {secondarySignals.map((signal) => {
              const Icon = getSignalIcon(signal.type);

              return (
                <div
                  key={signal.id}
                  className={`p-4.5 rounded-xl bg-white border ${getCardBorder(
                    signal.severity
                  )} shadow-xs flex flex-col justify-between hover:shadow-[0_6px_20px_rgba(11,61,145,0.08)] hover:border-[#3BA7F2]/50 transition-all`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2.5">
                      {getSignalBadge(signal.type)}
                      <Icon className="w-4 h-4 text-[#52697A]" />
                    </div>

                    <h4 className="text-sm font-bold text-[#102536] tracking-tight font-display mb-1.5 leading-snug">
                      {signal.title}
                    </h4>

                    <p className="text-xs text-[#52697A] leading-relaxed mb-3">
                      {signal.narrative}
                    </p>
                  </div>

                  {signal.evidence && signal.evidence.length > 0 && (
                    <div className="pt-2.5 border-t border-[#D7EAF5]">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#52697A] block mb-1">
                        Grounding Evidence:
                      </span>
                      <ul className="space-y-1">
                        {signal.evidence.map((ev, idx) => (
                          <li
                            key={idx}
                            className="text-[11px] font-mono text-[#52697A] bg-[#F7FBFF] border border-[#D7EAF5] px-2.5 py-1 rounded-md truncate"
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
        )}
      </div>
    </section>
  );
};

export default IntelligentSignalsSection;

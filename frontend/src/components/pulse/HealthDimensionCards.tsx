import React from 'react';
import {
  FileCode2,
  Workflow,
  Flame,
  Shield,
  Wand2,
  ArrowUpRight,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { HealthDimensionCard, TabType } from '../../types';

interface HealthDimensionCardsProps {
  dimensions: Record<string, HealthDimensionCard>;
  lensMode: 'health' | 'confidence';
  onNavigateTab?: (tab: TabType) => void;
}

export const HealthDimensionCards: React.FC<HealthDimensionCardsProps> = ({
  dimensions,
  lensMode,
  onNavigateTab,
}) => {
  const dimensionConfigs = [
    {
      key: 'parsing',
      label: 'Parsing',
      icon: FileCode2,
      destinationTab: 'overview' as TabType,
      actionText: 'View AST Coverage',
    },
    {
      key: 'dependencies',
      label: 'Dependencies',
      icon: Workflow,
      destinationTab: 'graph' as TabType,
      actionText: 'Inspect Graph',
    },
    {
      key: 'complexity',
      label: 'Complexity',
      icon: Flame,
      destinationTab: 'hotspots' as TabType,
      actionText: 'Explore Hotspots',
    },
    {
      key: 'protection',
      label: 'Protection',
      icon: Shield,
      destinationTab: 'tests' as TabType,
      actionText: 'Review Safety Tests',
    },
    {
      key: 'modernization',
      label: 'Modernization',
      icon: Wand2,
      destinationTab: 'refactor' as TabType,
      actionText: 'Examine Diffs',
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#167C69]';
    if (score >= 70) return 'text-[#0B3D91]';
    if (score >= 50) return 'text-[#D97706]';
    return 'text-[#DC2626]';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-[#167C69]';
    if (score >= 70) return 'bg-[#0B3D91]';
    if (score >= 50) return 'bg-[#D97706]';
    return 'bg-[#DC2626]';
  };

  const getStatusBadge = (status: string, score: number) => {
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#167C69] bg-[#E6F8F3] px-2.5 py-0.5 rounded-full border border-[#7FE7D6]/40">
          <CheckCircle2 className="w-3 h-3 text-[#167C69]" />
          {status || 'Healthy'}
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#92400E] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FCD34D]">
          <AlertCircle className="w-3 h-3 text-[#B45309]" />
          {status || 'Needs Attention'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#991B1B] bg-[#FEE2E2] px-2.5 py-0.5 rounded-full border border-[#FCA5A5]">
        <AlertCircle className="w-3 h-3 text-[#DC2626]" />
        {status || 'High Risk'}
      </span>
    );
  };

  const renderCardSpecificContent = (card: HealthDimensionCard) => {
    const m = card.metrics || {};

    switch (card.key) {
      case 'parsing':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-[#D7EAF5]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Full AST Coverage</div>
                <div className="text-sm font-bold font-mono text-[#102536] mt-0.5">
                  {m.fullAstPercentage ?? 100}%
                </div>
              </div>
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Parser Readiness</div>
                <div className="text-sm font-bold font-mono text-[#0B3D91] mt-0.5">
                  {m.parserReadinessScore ?? card.score}/100
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#52697A] px-1 font-sans">
              <span>Parsed: <strong className="font-mono text-[#102536]">{m.fullyParsed ?? 0}</strong></span>
              <span>Partial: <strong className="font-mono text-[#102536]">{m.partial ?? 0}</strong></span>
              <span>Fallback: <strong className="font-mono text-[#102536]">{m.fallbackOrUnsupported ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'dependencies':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-[#D7EAF5]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Resolved Edges</div>
                <div className="text-sm font-bold font-mono text-[#102536] mt-0.5">
                  {m.resolvedEdges ?? 0}
                </div>
              </div>
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Unresolved Imports</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${m.unresolvedImports > 0 ? 'text-[#D97706]' : 'text-[#167C69]'}`}>
                  {m.unresolvedImports ?? 0}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#52697A] px-1 font-sans">
              <span>Cycles: <strong className="font-mono text-[#102536]">{m.cycleCount ?? 0}</strong></span>
              <span>Graph Density: <strong className="font-mono text-[#102536]">{m.density ?? '0.04'}</strong></span>
              <span>External: <strong className="font-mono text-[#102536]">{m.externalPackages ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'complexity':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-[#D7EAF5]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Hotspots Found</div>
                <div className="text-sm font-bold font-mono text-[#102536] mt-0.5">
                  {m.hotspotCount ?? 0}
                </div>
              </div>
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Max Complexity</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${m.maxComplexity > 20 ? 'text-[#DC2626]' : 'text-[#0B3D91]'}`}>
                  {m.maxComplexity ?? 0} CC
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#52697A] px-1 font-sans">
              <span>Avg CC: <strong className="font-mono text-[#102536]">{m.avgComplexity ?? 0}</strong></span>
              <span>Critical: <strong className="font-mono text-[#102536]">{m.criticalFiles ?? 0}</strong></span>
              <span>Hotspot Index: <strong className="font-mono text-[#102536]">{m.hotspotRatio ?? '0%'}</strong></span>
            </div>
          </div>
        );

      case 'protection':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-[#D7EAF5]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Protected Modules</div>
                <div className="text-sm font-bold font-mono text-[#167C69] mt-0.5">
                  {m.protectedModules ?? 0}
                </div>
              </div>
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Unprotected Modules</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${m.unprotectedModules > 0 ? 'text-[#DC2626]' : 'text-[#167C69]'}`}>
                  {m.unprotectedModules ?? 0}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#52697A] px-1 font-sans">
              <span>Test Files: <strong className="font-mono text-[#102536]">{m.testFiles ?? 0}</strong></span>
              <span>Coverage Ratio: <strong className="font-mono text-[#102536]">{m.coverageRatio ?? '0%'}</strong></span>
              <span>Syntax Valid: <strong className="font-mono text-[#102536]">{m.syntaxValidTests ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'modernization':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-[#D7EAF5]">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Candidates</div>
                <div className="text-sm font-bold font-mono text-[#0B3D91] mt-0.5">
                  {m.modernizationCandidates ?? 0}
                </div>
              </div>
              <div className="bg-[#F7FBFF] border border-[#D7EAF5] p-2.5 rounded-xl">
                <div className="text-[10px] font-bold text-[#52697A] uppercase tracking-wider">Autofixable Diffs</div>
                <div className="text-sm font-bold font-mono text-[#167C69] mt-0.5">
                  {m.autofixableDiffs ?? 0}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#52697A] px-1 font-sans">
              <span>Legacy Warnings: <strong className="font-mono text-[#102536]">{m.legacyWarnings ?? 0}</strong></span>
              <span>Diff Coverage: <strong className="font-mono text-[#102536]">{m.diffRatio ?? '100%'}</strong></span>
              <span>Verified: <strong className="font-mono text-[#102536]">{m.verifiedDiffs ?? 0}</strong></span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <section
      className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7 transition-all"
      aria-label="Health Dimension Observatory"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D7EAF5]">
        <div>
          <h3 className="text-lg font-bold text-[#102536] tracking-tight font-display flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
              <Sliders className="w-4 h-4" />
            </div>
            <span>Health Dimension Observatory</span>
          </h3>
          <p className="text-xs text-[#52697A] mt-1">
            Deterministic diagnostic breakdown across parsing, dependencies, complexity, protection, and modernization.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F7FBFF] border border-[#D7EAF5] text-[#52697A] self-start sm:self-auto">
          5 Core Dimensions Analyzed
        </span>
      </div>

      {/* Responsive 3+2 Grid on Desktop (Section 18, 20) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-5">
        {dimensionConfigs.map((cfg) => {
          const card = dimensions[cfg.key];
          if (!card) return null;
          const Icon = cfg.icon;

          return (
            <div
              key={cfg.key}
              className="bg-white border border-[#D7EAF5] rounded-[18px] shadow-[0_4px_20px_rgba(11,61,145,0.04)] p-5 flex flex-col justify-between hover:shadow-[0_8px_28px_rgba(11,61,145,0.09)] hover:border-[#3BA7F2]/50 transition-all duration-250 group"
            >
              <div>
                {/* Header: Icon, Label, Status Pill */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91] group-hover:bg-[#0B3D91] group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-base font-bold text-[#102536] font-display">
                      {cfg.label}
                    </span>
                  </div>
                  {getStatusBadge(card.status, card.score)}
                </div>

                {/* Score & Progress Bar */}
                <div className="mt-3.5 flex items-baseline justify-between">
                  <div>
                    {lensMode === 'health' ? (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-black font-display tracking-tight ${getScoreColor(card.score)}`}>
                          {card.score}
                        </span>
                        <span className="text-xs font-bold text-[#94A3B8]">/100</span>
                      </div>
                    ) : (
                      <div className="text-xl font-bold font-mono uppercase text-[#102536]">
                        {card.confidence}
                      </div>
                    )}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#52697A] font-sans">
                      {lensMode === 'health' ? 'Dimension Score' : 'Confidence Level'}
                    </span>
                  </div>

                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F7FBFF] text-[#52697A] border border-[#D7EAF5] capitalize">
                    {card.confidence} confidence
                  </span>
                </div>

                {/* Progress bar line */}
                <div className="w-full h-1.5 bg-[#E8F6FF] rounded-full overflow-hidden mt-2">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${getProgressBarColor(card.score)}`}
                    style={{ width: `${Math.max(6, card.score)}%` }}
                  />
                </div>

                {/* Main Pressure */}
                <div className="mt-3.5 p-3 rounded-xl bg-[#F7FBFF] border border-[#D7EAF5]">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#52697A]">
                    Main Pressure
                  </div>
                  <p className="text-xs text-[#102536] font-medium mt-1 leading-snug line-clamp-2" title={card.mainPressure}>
                    {card.mainPressure}
                  </p>
                </div>

                {/* Card-Specific Strict Metrics */}
                {renderCardSpecificContent(card)}

                {/* Grounding Evidence List */}
                {card.evidence && card.evidence.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#D7EAF5]">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-[#52697A] mb-1.5">
                      Grounding Evidence
                    </div>
                    <ul className="space-y-1">
                      {card.evidence.slice(0, 2).map((ev, idx) => (
                        <li key={idx} className="text-[11px] text-[#52697A] font-mono truncate" title={ev}>
                          &bull; {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Navigation Action Button Aligned at Bottom */}
              {onNavigateTab && (
                <div className="mt-5 pt-3.5 border-t border-[#D7EAF5]">
                  <button
                    type="button"
                    onClick={() => onNavigateTab(cfg.destinationTab)}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold text-[#0B3D91] bg-[#E8F6FF] hover:bg-[#0B3D91] hover:text-white border border-[#3BA7F2]/30 transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>{cfg.actionText}</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default HealthDimensionCards;

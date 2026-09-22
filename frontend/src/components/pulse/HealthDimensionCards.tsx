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
    if (score >= 80) return 'text-teal-strong';
    if (score >= 70) return 'text-interactive';
    if (score >= 50) return 'text-amber-strong';
    return 'text-red-strong';
  };

  const getStatusBadge = (status: string, score: number) => {
    if (score >= 80) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-text bg-teal-surface px-2 py-0.5 rounded border border-teal/20">
          <CheckCircle2 className="w-3 h-3 text-teal" />
          {status || 'Healthy'}
        </span>
      );
    }
    if (score >= 50) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-text bg-amber-surface px-2 py-0.5 rounded border border-amber/30">
          <AlertCircle className="w-3 h-3 text-amber-strong" />
          {status || 'Needs Attention'}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-text bg-red-surface px-2 py-0.5 rounded border border-red/30">
        <AlertCircle className="w-3 h-3 text-red-strong" />
        {status || 'High Risk'}
      </span>
    );
  };

  const renderCardSpecificContent = (card: HealthDimensionCard) => {
    const m = card.metrics || {};

    switch (card.key) {
      case 'parsing':
        return (
          <div className="space-y-2 mt-2 pt-2 border-t border-line/60">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Full AST Coverage</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.fullAstPercentage ?? 100}%
                </div>
              </div>
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Parser Readiness</div>
                <div className="text-sm font-bold font-mono text-interactive mt-0.5">
                  {m.parserReadinessScore ?? card.score}/100
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 px-1">
              <span>Fully Parsed: <strong className="text-ink-2">{m.fullyParsed ?? 0}</strong></span>
              <span>Partial: <strong className="text-ink-2">{m.partial ?? 0}</strong></span>
              <span>Fallback: <strong className="text-ink-2">{m.fallbackOrUnsupported ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'dependencies':
        return (
          <div className="space-y-2 mt-2 pt-2 border-t border-line/60">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Resolved Edges</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.resolvedEdges ?? 0}
                </div>
              </div>
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Unresolved Imports</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${m.unresolvedImports > 0 ? 'text-amber-strong' : 'text-teal-strong'}`}>
                  {m.unresolvedImports ?? 0}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 px-1">
              <span>Detected Cycles: <strong className={m.detectedCycles > 0 ? 'text-red-strong' : 'text-teal-strong'}>{m.detectedCycles ?? 0}</strong></span>
              <span>Graph Conf: <strong className="text-ink-2">{m.graphConfidence || 'High'}</strong></span>
            </div>
          </div>
        );

      case 'complexity':
        return (
          <div className="space-y-2 mt-2 pt-2 border-t border-line/60">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Complexity Health</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.overallComplexityHealth ?? 'Manageable'}
                </div>
              </div>
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Highest Cyclomatic</div>
                <div className="text-sm font-bold font-mono text-ink-2 mt-0.5">
                  {m.highestCyclomaticComplexity ?? 1}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 px-1">
              <span>High-Risk Files: <strong className="text-amber-strong">{m.highRiskFiles ?? 0}</strong></span>
              <span>Critical Files: <strong className="text-red-strong">{m.criticalOverallRiskFiles ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'protection':
        return (
          <div className="space-y-2 mt-2 pt-2 border-t border-line/60">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Protected Modules</div>
                <div className="text-sm font-bold font-mono text-teal-strong mt-0.5">
                  {m.protectedSourceModules ?? 0}
                </div>
              </div>
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Unprotected Modules</div>
                <div className="text-sm font-bold font-mono text-amber-strong mt-0.5">
                  {m.unprotectedModules ?? 0}
                </div>
              </div>
            </div>
            <div className="text-[10px] font-mono text-ink-3 px-1 space-y-0.5">
              <div className="flex justify-between">
                <span>Syntax-Valid Tests: <strong className="text-ink-2">{m.syntaxValidTests ?? 0}</strong></span>
                <span>Generated Files: <strong className="text-ink-2">{m.generatedTests ?? 0}</strong></span>
              </div>
              <div className="text-ink-4 text-[9px] italic">
                * Syntax-valid tests never implied as runtime verified.
              </div>
            </div>
          </div>
        );

      case 'modernization':
        return (
          <div className="space-y-2 mt-2 pt-2 border-t border-line/60">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Modernization Candidates</div>
                <div className="text-sm font-bold font-mono text-interactive mt-0.5">
                  {m.modernizationCandidates ?? 0}
                </div>
              </div>
              <div className="bg-panel/50 p-2 rounded">
                <div className="text-[10px] font-mono text-ink-3 uppercase">Autofix Eligible</div>
                <div className="text-sm font-bold font-mono text-teal-strong mt-0.5">
                  {m.autofixEligible ?? 0}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 px-1">
              <span>Static Findings: <strong className="text-ink-2">{m.staticFindings ?? 0}</strong></span>
              <span>Generated Diffs: <strong className="text-ink-2">{m.generatedDiffs ?? 0}</strong></span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-bold text-ink tracking-tight">
          Health Dimension Observatory
        </h3>
        <p className="text-xs text-ink-3 mt-0.5">
          Granular metrics across the 5 primary dimensions of repository health.
        </p>
      </div>

      {/* 5 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {dimensionConfigs.map((cfg) => {
          const card = dimensions[cfg.key];
          if (!card) return null;
          const Icon = cfg.icon;

          return (
            <div
              key={cfg.key}
              className="bg-surface border border-line rounded-card shadow-1 p-4.5 flex flex-col justify-between hover:shadow-2 hover:border-line-strong/70 transition-all duration-200"
            >
              <div>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-panel flex items-center justify-center text-ink-2">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-ink">{cfg.label}</span>
                  </div>
                  {getStatusBadge(card.status, card.score)}
                </div>

                {/* Score & Confidence */}
                <div className="mt-3 flex items-baseline justify-between">
                  <div>
                    {lensMode === 'health' ? (
                      <div className="flex items-baseline gap-1">
                        <span className={`text-3xl font-extrabold font-mono ${getScoreColor(card.score)}`}>
                          {card.score}
                        </span>
                        <span className="text-xs text-ink-4">/100</span>
                      </div>
                    ) : (
                      <div className="text-xl font-bold font-mono uppercase text-ink">
                        {card.confidence}
                      </div>
                    )}
                    <span className="text-[10px] font-mono uppercase text-ink-3 font-medium">
                      {lensMode === 'health' ? 'Dimension Score' : 'Confidence'}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-panel text-ink-2 border border-line uppercase">
                    {card.confidence} conf
                  </span>
                </div>

                {/* Main Pressure */}
                <div className="mt-3 p-2 rounded-lg bg-panel/40 border border-line/60">
                  <div className="text-[10px] font-mono uppercase text-ink-3 font-semibold">
                    Main Pressure
                  </div>
                  <p className="text-xs text-ink-2 font-medium mt-0.5 line-clamp-2" title={card.mainPressure}>
                    {card.mainPressure}
                  </p>
                </div>

                {/* Card-Specific Strict Metrics */}
                {renderCardSpecificContent(card)}

                {/* Grounding Evidence List */}
                {card.evidence && card.evidence.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-line/60">
                    <div className="text-[10px] font-mono uppercase text-ink-3 font-semibold mb-1">
                      Evidence
                    </div>
                    <ul className="space-y-1">
                      {card.evidence.slice(0, 2).map((ev, idx) => (
                        <li key={idx} className="text-[11px] text-ink-3 font-mono truncate" title={ev}>
                          &bull; {ev}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Navigation Button */}
              {onNavigateTab && (
                <div className="mt-4 pt-3 border-t border-line">
                  <button
                    onClick={() => onNavigateTab(cfg.destinationTab)}
                    className="w-full py-1.5 px-2.5 rounded-lg text-xs font-semibold text-interactive hover:bg-interactive-surface/80 border border-interactive/20 flex items-center justify-center gap-1.5 transition-colors"
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
    </div>
  );
};

export default HealthDimensionCards;

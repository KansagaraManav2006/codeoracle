import React from 'react';
import {
  FileCode2,
  Workflow,
  Flame,
  Shield,
  Wand2,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { HealthDimensionCard, TabType } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface HealthDimensionCardsProps {
  dimensions: Record<string, HealthDimensionCard>;
  lensMode: 'health' | 'confidence';
  onNavigateTab?: (tab: TabType) => void;
}

export const HealthDimensionCards: React.FC<HealthDimensionCardsProps> = ({
  dimensions,
  lensMode: _lensMode,
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

  const getStatusTone = (score: number): 'green' | 'indigo' | 'amber' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'indigo';
    if (score >= 45) return 'amber';
    return 'red';
  };

  const getProgressBarColor = (score: number) => {
    if (score >= 80) return 'bg-teal';
    if (score >= 60) return 'bg-indigo';
    if (score >= 45) return 'bg-amber';
    return 'bg-red';
  };

  const renderCardSpecificContent = (card: HealthDimensionCard) => {
    const m = card.metrics || {};

    switch (card.key) {
      case 'parsing':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-line">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Full AST Coverage</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.fullAstPercentage ?? 100}%
                </div>
              </div>
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Parser Readiness</div>
                <div className="text-sm font-bold font-mono text-indigo mt-0.5">
                  {m.parserReadinessScore ?? card.score}/100
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-3 px-1">
              <span>Parsed: <strong className="font-mono text-ink">{m.fullyParsed ?? 0}</strong></span>
              <span>Partial: <strong className="font-mono text-ink">{m.partial ?? 0}</strong></span>
              <span>Fallback: <strong className="font-mono text-ink">{m.fallbackOrUnsupported ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'dependencies':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-line">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Resolved Edges</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.resolvedEdges ?? 0}
                </div>
              </div>
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Unresolved Imports</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${(m.unresolvedImports ?? 0) > 0 ? 'text-amber-strong' : 'text-ink'}`}>
                  {m.unresolvedImports ?? 0}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-3 px-1">
              <span>Cycles: <strong className="font-mono text-ink">{m.cyclesDetected ?? 0}</strong></span>
              <span>Graph Density: <strong className="font-mono text-ink">{m.graphDensity ?? 0.04}</strong></span>
              <span>External: <strong className="font-mono text-ink">{m.externalPackagesCount ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'complexity':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-line">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Hotspots Found</div>
                <div className={`text-sm font-bold font-mono mt-0.5 ${(m.hotspotCount ?? 0) > 0 ? 'text-amber-strong' : 'text-ink'}`}>
                  {m.hotspotCount ?? 0}
                </div>
              </div>
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Max Complexity</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.maxComplexity ?? 0} CC
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-3 px-1">
              <span>Avg CC: <strong className="font-mono text-ink">{m.avgComplexity ?? 0}</strong></span>
              <span>Critical: <strong className="font-mono text-ink">{m.criticalHotspots ?? 0}</strong></span>
              <span>Hotspot Index: <strong className="font-mono text-ink">{m.hotspotIndexPct ?? 0}%</strong></span>
            </div>
          </div>
        );

      case 'protection':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-line">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Generated Tests</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.generatedSuites ?? 0} Suites
                </div>
              </div>
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Protected Modules</div>
                <div className="text-sm font-bold font-mono text-indigo mt-0.5">
                  {m.protectedModules ?? 0} / {m.totalModules ?? 0}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-3 px-1">
              <span>Syntax Valid: <strong className="font-mono text-ink">{m.syntaxValidSuites ?? 0}</strong></span>
              <span>Coverage: <strong className="font-mono text-ink">{m.lineCoveragePercentage ?? 0}%</strong></span>
              <span>Unprotected: <strong className="font-mono text-amber-strong">{m.unprotectedCount ?? 0}</strong></span>
            </div>
          </div>
        );

      case 'modernization':
        return (
          <div className="space-y-2 mt-3 pt-3 border-t border-line">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Candidates</div>
                <div className="text-sm font-bold font-mono text-indigo mt-0.5">
                  {m.modernizationCandidates ?? 0} Files
                </div>
              </div>
              <div className="bg-tile border border-line p-2.5 rounded-lg">
                <div className="text-[10px] font-bold text-ink-3 uppercase tracking-wider">Generated Diffs</div>
                <div className="text-sm font-bold font-mono text-ink mt-0.5">
                  {m.generatedDiffs ?? 0} Diffs
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-[11px] text-ink-3 px-1">
              <span>Rules: <strong className="font-mono text-ink">{m.appliedRulesCount ?? 0}</strong></span>
              <span>Breaking Alerts: <strong className="font-mono text-ink">{m.breakingChangesCount ?? 0}</strong></span>
              <span>Verified: <strong className="font-mono text-teal-strong">{m.verifiedProposals ?? 0}</strong></span>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card variant="primary" padding="lg" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink font-display tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo">
              <Sliders className="w-4 h-4" />
            </div>
            <span>Health Dimension Observatory</span>
          </h3>
          <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
            Deterministic diagnostic breakdown across parsing, dependencies, complexity, protection, and modernization.
          </p>
        </div>
        <Badge tone="neutral" size="sm">
          5 Core Dimensions Analyzed
        </Badge>
      </div>

      {/* Grid of Dimension Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dimensionConfigs.map((cfg) => {
          const card = dimensions[cfg.key];
          if (!card) return null;

          const Icon = cfg.icon;
          const tone = getStatusTone(card.score);
          const barColor = getProgressBarColor(card.score);

          return (
            <div
              key={cfg.key}
              className="bg-surface border border-line rounded-xl p-4 shadow-xs flex flex-col justify-between hover:border-line-strong hover:shadow-1 transition-all"
            >
              <div>
                {/* Header: Icon + Title + Status Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-sm text-ink font-display">
                      {cfg.label}
                    </span>
                  </div>

                  <Badge tone={tone} size="sm">
                    {card.status || (card.score >= 80 ? 'Healthy' : card.score >= 60 ? 'Attention' : 'Pressure')}
                  </Badge>
                </div>

                {/* Score & Progress */}
                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <div className="flex items-baseline gap-1">
                      <span className="font-mono text-2xl font-extrabold text-ink">
                        {card.score}
                      </span>
                      <span className="text-xs font-semibold text-ink-4">/100</span>
                    </div>

                    <span className="text-[11px] font-mono text-ink-3">
                      {card.confidence?.toUpperCase() || 'HIGH'} CONFIDENCE
                    </span>
                  </div>

                  {/* Horizontal Bar */}
                  <div className="h-1.5 w-full bg-track rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, card.score))}%` }}
                    />
                  </div>
                </div>

                {/* Main Pressure / Observation */}
                <div className="mt-3 p-2.5 rounded-lg bg-tile border border-line text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3 block">
                    Main Pressure
                  </span>
                  <p className="text-xs text-ink-2 mt-0.5 leading-snug">
                    {card.mainPressure || 'No pressure anomalies detected across AST analyzers.'}
                  </p>
                </div>

                {/* Specific Metric Breakdown */}
                {renderCardSpecificContent(card)}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-line flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab?.(cfg.destinationTab)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-xs w-full sm:w-auto"
                >
                  {cfg.actionText}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default HealthDimensionCards;

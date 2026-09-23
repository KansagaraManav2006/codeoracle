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
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

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

  const getSignalTone = (type: string): 'red' | 'indigo' | 'green' | 'amber' => {
    switch (type) {
      case 'most_important':
        return 'amber';
      case 'dependency':
      case 'modernization':
        return 'indigo';
      case 'positive':
        return 'green';
      default:
        return 'amber';
    }
  };

  const getDestinationTab = (type: string): TabType => {
    switch (type) {
      case 'most_important':
        return 'hotspots';
      case 'dependency':
        return 'graph';
      case 'modernization':
        return 'refactor';
      case 'protection':
        return 'tests';
      case 'positive':
        return 'overview';
      default:
        return 'explanation';
    }
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
      case 'tests':
        return 'Safety Tests';
      case 'refactor':
        return 'Modernization';
      case 'migration':
        return 'Impact & Plan';
      default:
        return 'Inspect View';
    }
  };

  return (
    <Card variant="primary" padding="lg" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink font-display tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo">
              <Sparkles className="w-4 h-4" />
            </div>
            <span>Intelligent Signals</span>
          </h3>
          <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
            Evidence-backed architectural insights and static repository conditions.
          </p>
        </div>
        <Badge tone="neutral" size="sm">
          {signals.length} Evidence-Backed Signals
        </Badge>
      </div>

      {/* Featured Primary Signal Card */}
      {featuredSignal && (
        <div className="p-5 rounded-xl bg-amber-surface/30 border border-amber/30 shadow-xs space-y-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Badge tone="amber" size="sm">
                Most Important Signal
              </Badge>
              <span className="text-[10px] font-mono text-ink-3 uppercase">
                {featuredSignal.type.replace('_', ' ')}
              </span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateTab?.(getDestinationTab(featuredSignal.type))}
              icon={<ArrowRight className="w-3.5 h-3.5" />}
              className="text-xs bg-surface"
            >
              Go to {getDestinationLabel(getDestinationTab(featuredSignal.type))}
            </Button>
          </div>

          <div>
            <h4 className="text-sm sm:text-base font-bold text-ink font-display">
              {featuredSignal.title}
            </h4>
            <p className="text-xs text-ink-2 mt-1 leading-relaxed">
              {featuredSignal.narrative}
            </p>
          </div>

          {featuredSignal.evidence && featuredSignal.evidence.length > 0 && (
            <div className="pt-2 border-t border-amber/20 flex items-center gap-1.5 text-[11px] text-ink-3 font-mono">
              <span className="font-bold text-amber-strong uppercase">Evidence:</span>
              <span>{featuredSignal.evidence.join(' · ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Secondary Signals Grid */}
      {secondarySignals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {secondarySignals.map((signal) => {
            const Icon = getSignalIcon(signal.type);
            const tone = getSignalTone(signal.type);
            const destTab = getDestinationTab(signal.type);

            return (
              <div
                key={signal.id}
                className="p-4 rounded-xl bg-surface border border-line hover:border-line-strong hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-tile border border-line flex items-center justify-center text-indigo">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <Badge tone={tone} size="sm">
                        {signal.type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <span className="text-[10px] font-mono text-ink-4 uppercase">
                      {signal.severity}
                    </span>
                  </div>

                  <h5 className="font-bold text-xs sm:text-sm text-ink leading-snug">
                    {signal.title}
                  </h5>

                  <p className="text-xs text-ink-3 mt-1 leading-relaxed">
                    {signal.narrative}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between">
                  <span className="text-[10px] text-ink-4 font-mono truncate max-w-[180px]">
                    {signal.evidence?.[0] || 'AST verified'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onNavigateTab?.(destTab)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-indigo hover:text-indigo-press transition-colors"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default IntelligentSignalsSection;

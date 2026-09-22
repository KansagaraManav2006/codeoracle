import React from 'react';
import { FolderGit2, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
import { PressureZone, TabType } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface PressureZonesSectionProps {
  pressureZones: PressureZone[];
  onNavigateTab?: (tab: TabType) => void;
}

export const PressureZonesSection: React.FC<PressureZonesSectionProps> = ({
  pressureZones,
  onNavigateTab,
}) => {
  if (!pressureZones || pressureZones.length === 0) {
    return (
      <Card variant="primary" padding="lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-surface border border-teal/20 flex items-center justify-center text-teal-strong">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink font-display">No High Pressure Zones Detected</h3>
            <p className="text-xs text-ink-3 mt-0.5">
              The codebase distribution of risk and dependencies is uniformly balanced without hazardous friction clusters.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  const getLevelTone = (level: string): 'red' | 'amber' | 'indigo' | 'green' => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'red';
      case 'high':
        return 'amber';
      case 'moderate':
        return 'indigo';
      default:
        return 'green';
    }
  };

  const getPressureBarColor = (score: number) => {
    if (score >= 70) return 'bg-red';
    if (score >= 45) return 'bg-amber';
    if (score >= 25) return 'bg-indigo';
    return 'bg-teal';
  };

  return (
    <Card variant="primary" padding="lg" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-line">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink font-display tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-surface border border-amber/30 flex items-center justify-center text-amber-strong">
              <Flame className="w-4 h-4" />
            </div>
            <span>Pressure Zones</span>
          </h3>
          <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
            Normalized concentration ranking for directories and modules exhibiting clustered complexity, unverified behavior, or unresolved imports.
          </p>
        </div>
        <Badge tone="neutral" size="sm">
          Top {pressureZones.length} Friction Clusters
        </Badge>
      </div>

      {/* 2-Column Diagnostic Card Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pressureZones.map((zone) => {
          const tone = getLevelTone(zone.level);
          const barColor = getPressureBarColor(zone.pressureScore);

          return (
            <div
              key={zone.id}
              className="bg-surface border border-line rounded-xl p-4 sm:p-5 shadow-xs flex flex-col justify-between hover:shadow-1 hover:border-line-strong transition-all"
            >
              <div>
                {/* Header: Path, Subsystem & Severity Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderGit2 className="w-4 h-4 text-indigo shrink-0" />
                    <span className="font-mono text-xs sm:text-sm font-bold text-ink truncate" title={zone.path}>
                      {zone.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {zone.subsystem && (
                      <Badge tone="indigo" size="sm">
                        {zone.subsystem.toUpperCase()}
                      </Badge>
                    )}
                    <Badge tone={tone} size="sm">
                      {zone.level}
                    </Badge>
                  </div>
                </div>

                {/* Primary Pressure description */}
                <p className="text-xs text-ink-2 mb-3 leading-snug">
                  <strong className="text-ink">Primary Pressure:</strong> {zone.mainReason || 'Friction cluster detected'}
                </p>

                {/* Pressure Score & Meter */}
                <div className="space-y-1.5 mb-3.5">
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-3">
                      Pressure Index
                    </span>
                    <span className="font-mono font-bold text-ink">
                      {zone.pressureScore} <span className="text-[10px] text-ink-4">/100</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-track rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${Math.min(100, Math.max(0, zone.pressureScore))}%` }}
                    />
                  </div>
                </div>

                {/* Contributors / Reasons List */}
                <div className="p-3 rounded-lg bg-tile border border-line space-y-1.5 text-xs">
                  {zone.reasons && zone.reasons.length > 0 ? (
                    zone.reasons.map((reason: string, idx: number) => (
                      <div key={idx} className="flex items-start gap-1.5 text-ink-2 text-[11px]">
                        <span className="text-amber-strong font-bold">&bull;</span>
                        <span>{reason}</span>
                      </div>
                    ))
                  ) : (
                    <span className="text-ink-3 text-[11px]">No critical contributors identified in directory.</span>
                  )}
                </div>
              </div>

              {/* Card Footer: Metadata & Inspect Button */}
              <div className="mt-4 pt-3 border-t border-line flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-ink-3 font-mono">
                  <span>Unprotected: <strong className="text-ink">{zone.unprotectedCount} files</strong></span>
                  <span>&bull;</span>
                  <span>Conf: <strong className="text-ink capitalize">{zone.confidence}</strong></span>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab?.('hotspots')}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="text-xs"
                >
                  Inspect
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default PressureZonesSection;

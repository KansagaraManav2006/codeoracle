import React from 'react';
import { AlertTriangle, FolderGit2, ArrowRight, ShieldCheck } from 'lucide-react';
import { PressureZone, TabType } from '../../types';

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
      <div className="bg-surface border border-line rounded-card shadow-1 p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-teal" />
          <span className="text-sm font-bold text-ink">No High Pressure Zones Detected</span>
        </div>
        <p className="text-xs text-ink-3 mt-1">
          The codebase distribution of risk and dependencies is uniformly balanced without hazardous friction clusters.
        </p>
      </div>
    );
  }

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-red-surface text-red-text border border-red/30">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-surface text-amber-text border border-amber/30">
            High Pressure
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-interactive-surface text-interactive border border-interactive/30">
            Moderate
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-teal-surface text-teal-text border border-teal/30">
            Low
          </span>
        );
    }
  };

  const getPressureBarColor = (score: number) => {
    if (score >= 70) return 'bg-red-strong';
    if (score >= 45) return 'bg-amber-strong';
    if (score >= 25) return 'bg-interactive';
    return 'bg-teal';
  };

  return (
    <div className="bg-surface border border-line rounded-card shadow-1 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h3 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-strong" />
            Pressure Zones
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Normalized concentration ranking for directories and modules exhibiting clustered complexity, unverified behavior, or unresolved imports.
          </p>
        </div>
        <span className="text-[11px] font-mono text-ink-3 self-start sm:self-auto">
          Top {pressureZones.length} Friction Clusters
        </span>
      </div>

      {/* Horizontal Cards List */}
      <div className="mt-4 space-y-3">
        {pressureZones.map((zone) => {
          return (
            <div
              key={zone.id}
              className="p-4 rounded-xl bg-panel/30 border border-line hover:border-line-strong/60 transition-all"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                {/* Left: Path, Subsystem & Level */}
                <div className="space-y-1 md:max-w-[45%]">
                  <div className="flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-ink-3 shrink-0" />
                    <span className="text-xs font-mono font-bold text-ink truncate" title={zone.path}>
                      {zone.path}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-line text-ink-3">
                      {zone.subsystem}
                    </span>
                    {getLevelBadge(zone.level)}
                  </div>
                  <p className="text-xs text-ink-2 font-medium">
                    {zone.mainReason}
                  </p>
                </div>

                {/* Center: Pressure Bar & Score */}
                <div className="flex-1 md:max-w-xs space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-ink-3">
                    <span>Pressure Index</span>
                    <strong className="text-ink font-bold">{zone.pressureScore}/100</strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-track overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getPressureBarColor(
                        zone.pressureScore
                      )}`}
                      style={{ width: `${zone.pressureScore}%` }}
                    />
                  </div>
                </div>

                {/* Right: Metrics & Actions */}
                <div className="flex items-center justify-between md:justify-end gap-4 text-xs font-mono shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] text-ink-3 uppercase">Unprotected</div>
                    <div className="font-bold text-ink-2">{zone.unprotectedCount} files</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-ink-3 uppercase">Confidence</div>
                    <div className="font-bold text-ink-2 uppercase">{zone.confidence}</div>
                  </div>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('hotspots')}
                      className="px-2.5 py-1 text-xs font-semibold text-interactive hover:bg-interactive-surface rounded border border-interactive/20 transition-colors flex items-center gap-1"
                    >
                      <span>Inspect</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {/* Reasons pill badges */}
              {zone.reasons && zone.reasons.length > 1 && (
                <div className="mt-3 pt-2.5 border-t border-line/60 flex flex-wrap gap-1.5">
                  {zone.reasons.map((reason, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-line text-ink-3"
                    >
                      &bull; {reason}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PressureZonesSection;

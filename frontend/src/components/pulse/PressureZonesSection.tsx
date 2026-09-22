import React from 'react';
import { FolderGit2, ArrowRight, ShieldCheck, Flame } from 'lucide-react';
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
      <section className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#E6F8F3] flex items-center justify-center text-[#167C69]">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#102536]">No High Pressure Zones Detected</h3>
            <p className="text-xs text-[#52697A] mt-0.5">
              The codebase distribution of risk and dependencies is uniformly balanced without hazardous friction clusters.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const getLevelBadge = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
            Critical
          </span>
        );
      case 'high':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
            High Pressure
          </span>
        );
      case 'moderate':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30">
            Moderate
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[#E6F8F3] text-[#167C69] border border-[#7FE7D6]/40">
            Low
          </span>
        );
    }
  };

  const getPressureBarColor = (score: number) => {
    if (score >= 70) return 'bg-[#DC2626]';
    if (score >= 45) return 'bg-[#D97706]';
    if (score >= 25) return 'bg-[#0B3D91]';
    return 'bg-[#167C69]';
  };

  return (
    <section
      className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7 transition-all"
      aria-label="Pressure Zones"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#D7EAF5]">
        <div>
          <h3 className="text-lg font-bold text-[#102536] tracking-tight font-display flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
              <Flame className="w-4 h-4" />
            </div>
            <span>Pressure Zones</span>
          </h3>
          <p className="text-xs text-[#52697A] mt-1">
            Normalized concentration ranking for directories and modules exhibiting clustered complexity, unverified behavior, or unresolved imports.
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#F7FBFF] border border-[#D7EAF5] text-[#52697A] self-start sm:self-auto">
          Top {pressureZones.length} Friction Clusters
        </span>
      </div>

      {/* 2-Column Diagnostic Card Grid on Desktop (Section 21, 22) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
        {pressureZones.map((zone) => {
          return (
            <div
              key={zone.id}
              className="bg-white border border-[#D7EAF5] rounded-xl p-5 shadow-xs flex flex-col justify-between hover:shadow-[0_8px_24px_rgba(11,61,145,0.08)] hover:border-[#3BA7F2]/50 transition-all group"
            >
              <div>
                {/* Header: Path, Subsystem & Severity Badge */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <FolderGit2 className="w-4 h-4 text-[#0B3D91] shrink-0" />
                    <span className="text-xs font-mono font-bold text-[#102536] truncate" title={zone.path}>
                      {zone.path}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30 uppercase font-sans">
                      {zone.subsystem}
                    </span>
                    {getLevelBadge(zone.level)}
                  </div>
                </div>

                {/* Main Reason in Normal UI Font (No Monospace Overuse) */}
                <p className="text-xs text-[#52697A] font-sans mt-2.5 leading-relaxed">
                  <strong className="text-[#102536] font-semibold">Primary Pressure: </strong>
                  {zone.mainReason}
                </p>

                {/* Pressure Score Bar */}
                <div className="mt-3.5 space-y-1.5">
                  <div className="flex justify-between text-xs font-sans">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#52697A]">
                      Pressure Index
                    </span>
                    <strong className="text-sm font-bold font-mono text-[#102536]">
                      {zone.pressureScore}/100
                    </strong>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#E8F6FF] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${getPressureBarColor(
                        zone.pressureScore
                      )}`}
                      style={{ width: `${Math.max(8, zone.pressureScore)}%` }}
                    />
                  </div>
                </div>

                {/* Evidence Chips / Reasons (Deduplicated) */}
                {zone.reasons && zone.reasons.length > 0 && (
                  <div className="mt-3.5 pt-3 border-t border-[#D7EAF5] flex flex-wrap gap-1.5">
                    {zone.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#F7FBFF] border border-[#D7EAF5] text-[#52697A] truncate max-w-full"
                        title={reason}
                      >
                        &bull; {reason}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer: Metrics & Inspect CTA */}
              <div className="mt-4 pt-3.5 border-t border-[#D7EAF5] flex items-center justify-between gap-3">
                <div className="flex items-center gap-4 text-xs font-sans">
                  <div>
                    <span className="text-[10px] text-[#52697A] block font-semibold uppercase">Unprotected</span>
                    <span className="font-mono font-bold text-[#102536] text-xs">{zone.unprotectedCount} files</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#52697A] block font-semibold uppercase">Confidence</span>
                    <span className="font-semibold text-[#102536] capitalize text-xs">{zone.confidence}</span>
                  </div>
                </div>

                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => onNavigateTab('hotspots')}
                    className="px-3 py-1.5 text-xs font-bold text-[#0B3D91] bg-[#E8F6FF] hover:bg-[#0B3D91] hover:text-white rounded-lg border border-[#3BA7F2]/30 transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PressureZonesSection;

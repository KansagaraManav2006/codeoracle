import React from 'react';
import { Zap, Network, Target, TestTube, Wand2 } from 'lucide-react';
import { RiskAssessment } from '../../types';
import Button from '../common/Button';
import { RiskBadge, ComplexityBadge, ParseBadge } from './HotspotBadges';
import {
  getFilePath,
  getOverallRisk,
  getComplexitySev,
  getComplexityVal,
  getParseStatus,
  getParseConfidence,
  getHotspotScore,
  getFanIn,
  getBlastRadius,
  getLoc,
} from '../../utils/hotspotUtils';
import { formatNumber } from '../../utils/formatters';

export interface TopHotspotShowcaseProps {
  topHotspot: RiskAssessment;
  onInspectInGraph: (file: string) => void;
  onWhatBreaks: (file: string) => void;
  onGenerateTests: (file: string) => void;
  onReviewModernization: (file: string) => void;
}

export const TopHotspotShowcase: React.FC<TopHotspotShowcaseProps> = ({
  topHotspot,
  onInspectInGraph,
  onWhatBreaks,
  onGenerateTests,
  onReviewModernization,
}) => {
  const filePath = getFilePath(topHotspot);
  const score = getHotspotScore(topHotspot);
  const compVal = getComplexityVal(topHotspot);
  const compSev = getComplexitySev(topHotspot);
  const fanIn = getFanIn(topHotspot);
  const blast = getBlastRadius(topHotspot);
  const loc = getLoc(topHotspot);
  const risk = getOverallRisk(topHotspot);
  const pStatus = getParseStatus(topHotspot);
  const pConf = getParseConfidence(topHotspot);

  return (
    <section className="bg-gradient-to-br from-[#1C1A17] to-[#2B2823] rounded-xl p-5 sm:p-7 text-white border border-[#3E3A34] shadow-2 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 text-[11px] font-bold rounded-pill bg-amber-on-dark text-ink uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 fill-current" />
            #1 Highest-Priority Target
          </span>
          <span className="text-xs text-white/70 font-mono">Highest Static Refactoring Priority</span>
        </div>

        {/* Explicit Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <RiskBadge risk={risk} size="sm" />
          <ComplexityBadge severity={compSev} size="sm" />
          <ParseBadge
            status={pStatus}
            confidence={pConf}
            size="sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h3 className="font-mono text-lg sm:text-xl font-bold text-white break-all tracking-tight">
            {filePath}
          </h3>
          <div className="flex items-center gap-1.5 font-mono text-sm bg-white/10 px-3 py-1 rounded-md border border-white/15">
            <span className="text-amber-on-dark font-bold text-base">{score}</span>
            <span className="text-white/60 text-xs">/ 100</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-[#D5CEBF] leading-relaxed max-w-3xl">
          {topHotspot.reason}
        </p>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 border-t border-white/10 text-xs font-mono">
        <div className="p-2.5 rounded bg-white/5 border border-white/10">
          <span className="text-white/60 text-[10px] uppercase tracking-wider block">Complexity</span>
          <span className="text-sm font-bold text-white">{compVal} CC</span>
        </div>
        <div className="p-2.5 rounded bg-white/5 border border-white/10">
          <span className="text-white/60 text-[10px] uppercase tracking-wider block">Lines of Code</span>
          <span className="text-sm font-bold text-white">{formatNumber(loc)}</span>
        </div>
        <div className="p-2.5 rounded bg-white/5 border border-white/10">
          <span className="text-white/60 text-[10px] uppercase tracking-wider block">Direct Callers</span>
          <span className="text-sm font-bold text-white">{fanIn} fan-in</span>
        </div>
        <div className="p-2.5 rounded bg-white/5 border border-white/10">
          <span className="text-white/60 text-[10px] uppercase tracking-wider block">Blast Radius</span>
          <span className="text-sm font-bold text-amber-on-dark">{blast} downstream</span>
        </div>
      </div>

      {/* 4 Focused Action Buttons */}
      <div className="pt-2 flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          className="!bg-white/10 hover:!bg-white/20 active:!bg-white/25 !text-white !border-white/25 shadow-none"
          onClick={() => onInspectInGraph(filePath)}
          icon={<Network className="w-3.5 h-3.5 text-amber-on-dark" />}
          title="Inspect coupling in interactive Dependency Map"
        >
          Inspect in Map
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="!bg-white/15 hover:!bg-white/25 active:!bg-white/30 !text-white !border-white/30 shadow-none font-semibold"
          onClick={() => onWhatBreaks(filePath)}
          icon={<Target className="w-3.5 h-3.5 text-amber-on-dark" />}
          title="Simulate downstream blast radius and affected entry points"
        >
          Analyze Impact
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="!bg-white/10 hover:!bg-white/20 active:!bg-white/25 !text-white !border-white/25 shadow-none"
          onClick={() => onGenerateTests(filePath)}
          icon={<TestTube className="w-3.5 h-3.5 text-amber-on-dark" />}
          title="Generate characterization pinning tests for this file"
        >
          Generate Tests
        </Button>
        <Button
          variant="indigo"
          size="sm"
          onClick={() => onReviewModernization(filePath)}
          icon={<Wand2 className="w-3.5 h-3.5" />}
          title="Preview automated modernization proposals"
        >
          Modernize Code
        </Button>
      </div>
    </section>
  );
};

export default TopHotspotShowcase;

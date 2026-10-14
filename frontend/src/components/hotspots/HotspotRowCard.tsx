import React from 'react';
import {
  Flame,
  ChevronDown,
  ChevronUp,
  FileCode,
  Layers,
  Activity,
  Network,
  Target,
  TestTube,
  Wand2,
  Map,
} from 'lucide-react';
import { RiskAssessment } from '../../types';
import Button from '../common/Button';
import { RiskBadge, ComplexityBadge, ParseBadge } from './HotspotBadges';
import {
  getFilePath,
  getHotspotScore,
  getOverallRisk,
  getComplexityVal,
  getComplexitySev,
  getFanIn,
  getBlastRadius,
  getUnresolved,
  getWarnings,
  getLoc,
  getParseStatus,
  getParseConfidence,
} from '../../utils/hotspotUtils';
import { truncateMiddle, formatNumber } from '../../utils/formatters';

export interface HotspotRowCardProps {
  item: RiskAssessment;
  index: number;
  isExpanded: boolean;
  isTarget: boolean;
  onToggleExpand: () => void;
  onSelectFile?: (file: string) => void;
  onInspectInGraph: (file: string) => void;
  onWhatBreaks: (file: string) => void;
  onGenerateTests: (file: string) => void;
  onReviewModernization: (file: string) => void;
  onOpenImpactPlan: (file: string) => void;
}

export const HotspotRowCard: React.FC<HotspotRowCardProps> = ({
  item,
  index,
  isExpanded,
  isTarget,
  onToggleExpand,
  onSelectFile,
  onInspectInGraph,
  onWhatBreaks,
  onGenerateTests,
  onReviewModernization,
  onOpenImpactPlan,
}) => {
  const filePath = getFilePath(item);
  const score = getHotspotScore(item);
  const risk = getOverallRisk(item);
  const compVal = getComplexityVal(item);
  const compSev = getComplexitySev(item);
  const fanIn = getFanIn(item);
  const blast = getBlastRadius(item);
  const unresolved = getUnresolved(item);
  const warnings = getWarnings(item);
  const loc = getLoc(item);
  const pStatus = getParseStatus(item);
  const pConf = getParseConfidence(item);

  const factors = item.scoreFactors || {
    complexity: Math.min(35, Math.round(compVal)),
    warnings: Math.min(20, warnings * 3),
    fanIn: Math.min(15, fanIn * 3),
    blastRadius: Math.min(20, blast * 2),
    loc: Math.min(10, Math.round(loc / 50)),
  };

  return (
    <React.Fragment>
      <tr
        role="button"
        tabIndex={0}
        onClick={() => {
          onToggleExpand();
          onSelectFile?.(filePath);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleExpand();
            onSelectFile?.(filePath);
          }
        }}
        className={`cursor-pointer transition-colors hover:bg-track/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${
          isTarget
            ? 'bg-indigo-surface/60 border-l-4 border-indigo font-medium'
            : isExpanded
            ? 'bg-tile'
            : ''
        }`}
      >
        {/* Rank */}
        <td className="py-3.5 px-4 font-mono font-bold text-center text-ink-2">
          #{index + 1}
        </td>

        {/* File & Structured Summary */}
        <td className="py-3.5 px-4 min-w-[240px]">
          <div className="font-mono font-semibold text-ink truncate" title={filePath}>
            {truncateMiddle(filePath, 36)}
          </div>
          {/* Structured Row Summary */}
          <div className="text-[11px] text-ink-3 font-mono mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>CC {compVal}</span>
            <span>·</span>
            <span>{warnings} finding{warnings === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>{fanIn} caller{fanIn === 1 ? '' : 's'}</span>
            <span>·</span>
            <span>{blast} downstream</span>
            {unresolved > 0 && (
              <>
                <span>·</span>
                <span className="text-amber-strong">{unresolved} unresolved</span>
              </>
            )}
          </div>
        </td>

        {/* Explicit Overall Risk Badge */}
        <td className="py-3.5 px-3">
          <RiskBadge risk={risk} size="sm" />
        </td>

        {/* Explicit Complexity Severity Badge */}
        <td className="py-3.5 px-3">
          <ComplexityBadge severity={compSev} value={compVal} size="sm" />
        </td>

        {/* Parse & Confidence Badge */}
        <td className="py-3.5 px-3">
          <ParseBadge status={pStatus} confidence={pConf} size="sm" />
        </td>

        {/* Hotspot Score */}
        <td className="py-3.5 px-3 text-center">
          <span className="inline-flex items-center gap-1 font-mono font-bold px-2 py-0.5 rounded-md bg-indigo-surface text-indigo-text border border-indigo/25 text-xs">
            <Flame className="w-3 h-3 text-indigo fill-current" />
            {score}
          </span>
        </td>

        {/* LOC */}
        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
          {formatNumber(loc)}
        </td>

        {/* Fan-in */}
        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
          {fanIn}
        </td>

        {/* Blast Radius */}
        <td className="py-3.5 px-3 text-right font-mono text-ink-2">
          {blast}
        </td>

        {/* Toggle Factor Breakdown */}
        <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onToggleExpand}
            className="px-2 py-1 text-[11px] font-semibold rounded border border-line bg-tile hover:bg-track text-ink-2 inline-flex items-center gap-1 transition-colors"
            title="Toggle score factor breakdown"
          >
            <span>Factors</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </td>
      </tr>

      {/* Expandable Factor Breakdown & Row Actions */}
      {isExpanded && (
        <tr className="bg-tile/70 border-b border-line">
          <td colSpan={10} className="p-4 sm:p-5">
            <div className="space-y-4 animate-[fade-up_150ms_ease-out_both]">
              {/* Header & Formula Callout */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-ink-2 block">
                    Evidence &amp; Score Decomposition:
                  </span>
                  <p className="text-xs text-ink mt-0.5 max-w-3xl">
                    {item.reason}
                  </p>
                </div>
                <span className="text-[11px] text-ink-3 font-mono shrink-0">
                  Score: 35% CC + 20% Blast + 20% Warn + 15% FanIn + 10% LOC
                </span>
              </div>

              {/* Categorized Factors Decomposition Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Group 1: Static Code Risk */}
                <div className="p-3 bg-surface border border-line rounded-lg space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-1.5">
                    <FileCode className="w-3.5 h-3.5 text-indigo" />
                    <span>Static Code Risk</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Cyclomatic Complexity</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{compVal} CC</span>{' '}
                        <span className="text-teal-strong font-semibold">+{factors.complexity} pts</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Modernization Findings</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{warnings} findings</span>{' '}
                        <span className="text-teal-strong font-semibold">+{factors.warnings} pts</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Lines of Code</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{loc} LOC</span>{' '}
                        <span className="text-teal-strong font-semibold">+{factors.loc} pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 2: Graph Coupling Risk */}
                <div className="p-3 bg-surface border border-line rounded-lg space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-strong" />
                    <span>Graph Coupling Risk</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Fan-In (Direct Callers)</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{fanIn} callers</span>{' '}
                        <span className="text-teal-strong font-semibold">+{factors.fanIn} pts</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Blast Radius (Transitive)</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{blast} files</span>{' '}
                        <span className="text-teal-strong font-semibold">+{factors.blastRadius} pts</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Unresolved Relations</span>
                      <div className="text-right font-mono">
                        <span className="font-bold text-ink">{unresolved} edge(s)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Group 3: Parse Status & Confidence */}
                <div className="p-3 bg-surface border border-line rounded-lg space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-ink uppercase tracking-wider border-b border-line pb-1.5">
                    <Activity className="w-3.5 h-3.5 text-teal" />
                    <span>Parse &amp; Evidence Confidence</span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">AST Parse Status</span>
                      <span className="font-mono font-bold text-ink uppercase">{pStatus}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Confidence Level</span>
                      <span className="font-mono font-bold text-teal-strong uppercase">{pConf}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-ink-2">Overall Risk Category</span>
                      <span className="font-mono font-bold text-ink uppercase">{risk}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remediation Hint */}
              <div className="p-3 bg-surface border border-line rounded-md text-xs">
                <strong className="text-ink font-semibold">Recommended Action: </strong>
                <span className="text-ink-2">{item.recommendedAction || item.recommended_action}</span>
              </div>

              {/* All 5 Actions on Row */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-line/60">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onInspectInGraph(filePath)}
                  icon={<Network className="w-3.5 h-3.5" />}
                  title="Inspect coupling in Dependency Map"
                >
                  Inspect in Dependency Map
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onWhatBreaks(filePath)}
                  icon={<Target className="w-3.5 h-3.5 text-red-strong" />}
                  title="Check downstream ripple and affected entry points"
                >
                  What breaks if I change this?
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGenerateTests(filePath)}
                  icon={<TestTube className="w-3.5 h-3.5" />}
                  title="Generate pinning safety tests"
                >
                  Generate Safety Tests
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReviewModernization(filePath)}
                  icon={<Wand2 className="w-3.5 h-3.5" />}
                  title="Review automated modernization diffs"
                >
                  Review Modernization Proposals
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenImpactPlan(filePath)}
                  icon={<Map className="w-3.5 h-3.5" />}
                  title="Open Impact & Plan roadmap"
                >
                  Open Impact &amp; Plan
                </Button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </React.Fragment>
  );
};

export default HotspotRowCard;

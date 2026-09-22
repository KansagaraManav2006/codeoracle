import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';
import { RepositoryHealth, TabType } from '../../types';

interface RepositoryHealthHeroProps {
  health: RepositoryHealth;
  lensMode: 'health' | 'confidence';
  onNavigateTab?: (tab: TabType) => void;
}

export const RepositoryHealthHero: React.FC<RepositoryHealthHeroProps> = ({
  health,
  lensMode,
  onNavigateTab,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  // Single-run smooth score animation on mount or score change
  useEffect(() => {
    const target = health.score;
    const duration = 900;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [health.score]);

  // Dimension keys and display order for the radial segmented rings
  const ringDimensions = [
    { key: 'parsing', label: 'Parsing', angleOffset: 0 },
    { key: 'dependencies', label: 'Dependencies', angleOffset: 72 },
    { key: 'complexity', label: 'Complexity', angleOffset: 144 },
    { key: 'protection', label: 'Protection', angleOffset: 216 },
    { key: 'modernization', label: 'Modernization', angleOffset: 288 },
  ];

  // Helper color for health score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-teal-strong';
    if (score >= 70) return 'text-interactive';
    if (score >= 50) return 'text-amber-strong';
    return 'text-red-strong';
  };

  const getScoreStroke = (score: number) => {
    if (score >= 80) return '#0D9488'; // teal
    if (score >= 70) return '#1D4ED8'; // interactive blue
    if (score >= 50) return '#D97706'; // amber
    return '#DC2626'; // red
  };

  const getLabelBadge = (label: string) => {
    switch (label) {
      case 'Stable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-surface text-teal-text border border-teal/20">
            <ShieldCheck className="w-3.5 h-3.5 text-teal" />
            Stable
          </span>
        );
      case 'Stable with pressure points':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-interactive-surface text-interactive border border-interactive/20">
            <ShieldCheck className="w-3.5 h-3.5 text-interactive" />
            Stable with pressure points
          </span>
        );
      case 'Needs attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-surface text-amber-text border border-amber/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-strong" />
            Needs attention
          </span>
        );
      case 'High risk':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-surface text-red-text border border-red/30">
            <AlertOctagon className="w-3.5 h-3.5 text-red-strong" />
            High risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            {label || 'Analysis incomplete'}
          </span>
        );
    }
  };

  const getConfidenceBadge = (conf: string) => {
    const uppercaseConf = conf.toUpperCase();
    if (uppercaseConf === 'HIGH') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface text-ink-2 border border-line">
          CONFIDENCE: <strong className="ml-1 text-teal-strong">HIGH</strong>
        </span>
      );
    }
    if (uppercaseConf === 'MEDIUM') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface text-ink-2 border border-line">
          CONFIDENCE: <strong className="ml-1 text-amber-strong">MEDIUM</strong>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface text-ink-2 border border-line">
        CONFIDENCE: <strong className="ml-1 text-red-strong">LOW</strong>
      </span>
    );
  };

  // Ring geometry constants
  const size = 260;
  const center = size / 2;
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  // 5 segments with gaps
  const gapAngle = 8; // degrees gap between segments
  const segAngle = (360 - 5 * gapAngle) / 5; // ~64 degrees per segment
  const segLength = (segAngle / 360) * circumference;

  return (
    <div className="bg-surface border border-line rounded-card shadow-1 p-6 transition-all duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Central Radial Visualization */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-[260px] h-[260px] flex items-center justify-center">
            {/* Background SVG Track & Segments */}
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox={`0 0 ${size} ${size}`}
            >
              {/* Background Track Circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="var(--gauge-track, rgba(15, 23, 42, 0.08))"
                strokeWidth="12"
              />

              {/* 5 Segmented Radial Rings for Parsing, Dependencies, Complexity, Protection, Modernization */}
              {ringDimensions.map((dim, idx) => {
                const card = health.dimensions[dim.key];
                const dimScore = card ? card.score : 50;
                // Calculate dasharray and dashoffset for this segment
                const segmentStartAngle = idx * (segAngle + gapAngle);
                const segmentStartOffset = (segmentStartAngle / 360) * circumference;
                
                // Proportion filled based on dimension score
                const activeFillLength = (dimScore / 100) * segLength;
                const strokeColor = getScoreStroke(dimScore);

                return (
                  <g key={dim.key}>
                    {/* Segment track background */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke="rgba(15, 23, 42, 0.06)"
                      strokeWidth="12"
                      strokeDasharray={`${segLength} ${circumference - segLength}`}
                      strokeDashoffset={-segmentStartOffset}
                      strokeLinecap="round"
                    />
                    {/* Segment active fill */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth="12"
                      strokeDasharray={`${activeFillLength} ${circumference - activeFillLength}`}
                      strokeDashoffset={-segmentStartOffset}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Center Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              <span className="text-[11px] font-mono tracking-widest text-ink-3 uppercase font-medium">
                {lensMode === 'health' ? 'Codebase Health' : 'Confidence Level'}
              </span>
              <div className="flex items-baseline justify-center gap-1 my-0.5">
                <span className={`text-5xl font-extrabold tracking-tight font-mono ${getScoreColor(health.score)}`}>
                  {animatedScore}
                </span>
                <span className="text-sm font-semibold text-ink-4">/100</span>
              </div>
              <div className="mt-1 flex flex-col items-center gap-1">
                {getLabelBadge(health.label)}
              </div>
            </div>
          </div>

          {/* Segment Legend */}
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 mt-2 text-[11px] text-ink-3 font-medium">
            {ringDimensions.map((dim) => {
              const card = health.dimensions[dim.key];
              const score = card?.score ?? 0;
              return (
                <div key={dim.key} className="flex items-center gap-1">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: getScoreStroke(score) }}
                  />
                  <span>{dim.label}:</span>
                  <span className="font-mono text-ink-2 font-semibold">{score}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Overview Context & Expandable Why This Score */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
              <div>
                <h2 className="text-xl font-bold text-ink tracking-tight flex items-center gap-2">
                  Repository Health Observatory
                  {health.isPartial && (
                    <span className="text-xs px-2 py-0.5 rounded font-mono bg-amber-surface text-amber-text border border-amber/30">
                      PARTIAL DATA
                    </span>
                  )}
                </h2>
                <p className="text-xs text-ink-3 mt-0.5">
                  Unified assessment synthesized from AST semantics, dependency graph topology, and test harnesses.
                </p>
              </div>
              <div>{getConfidenceBadge(health.confidence)}</div>
            </div>

            {/* Quick Dimension Summary Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4">
              {ringDimensions.map((dim) => {
                const card = health.dimensions[dim.key];
                const score = card ? card.score : 0;
                return (
                  <div
                    key={dim.key}
                    className="bg-panel/70 border border-line rounded-lg p-2.5 flex flex-col justify-between"
                  >
                    <span className="text-[10px] font-mono uppercase text-ink-3 font-medium">
                      {dim.label}
                    </span>
                    <div className="flex items-baseline justify-between mt-1">
                      <span className={`text-base font-bold font-mono ${getScoreColor(score)}`}>
                        {score}
                      </span>
                      <span className="text-[10px] text-ink-4 uppercase">{card?.confidence || 'high'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expandable "Why This Score" section */}
          <div className="border border-line rounded-lg overflow-hidden bg-panel/30">
            <button
              onClick={() => setIsWhyExpanded(!isWhyExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs font-semibold text-ink-2 hover:bg-panel/70 transition-colors"
              aria-expanded={isWhyExpanded}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-interactive" />
                <span>Why this score? (Strengths, pressure points &amp; evidence)</span>
              </span>
              <span className="flex items-center gap-1 text-[11px] text-ink-3">
                {isWhyExpanded ? 'Collapse' : 'Expand analysis'}
                {isWhyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {isWhyExpanded && (
              <div className="p-4 border-t border-line space-y-3 text-xs bg-surface animate-fadeIn">
                {/* Strengths */}
                {health.whyScore.strengths && health.whyScore.strengths.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-teal-strong uppercase font-mono tracking-wider">
                      + Codebase Strengths
                    </span>
                    <ul className="mt-1 space-y-1">
                      {health.whyScore.strengths.map((str, i) => (
                        <li key={i} className="flex items-start gap-2 text-ink-2">
                          <span className="text-teal font-bold select-none">+</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pressure Points */}
                {health.whyScore.pressurePoints && health.whyScore.pressurePoints.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-amber-strong uppercase font-mono tracking-wider">
                      - Pressure Points &amp; Friction
                    </span>
                    <ul className="mt-1 space-y-1">
                      {health.whyScore.pressurePoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-ink-2">
                          <span className="text-amber-strong font-bold select-none">-</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidence */}
                {health.whyScore.evidence && health.whyScore.evidence.length > 0 && (
                  <div className="pt-2 border-t border-line/60">
                    <span className="text-[10px] font-mono text-ink-3 uppercase font-medium">
                      Analysis Grounding Evidence:
                    </span>
                    <div className="mt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {health.whyScore.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="text-[11px] font-mono bg-panel/60 border border-line/80 px-2 py-1 rounded text-ink-3 truncate"
                          title={ev}
                        >
                          &bull; {ev}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Link to Impact & Plan for full breakdown */}
                {onNavigateTab && (
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => onNavigateTab('migration')}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-interactive hover:text-interactive-press transition-colors"
                    >
                      <span>Explore full modernization readiness in Impact &amp; Plan</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepositoryHealthHero;

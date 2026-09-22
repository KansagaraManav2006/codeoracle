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
  FileCode2,
  Workflow,
  Flame,
  Shield,
  Wand2,
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
  const [hoveredDimKey, setHoveredDimKey] = useState<string | null>(null);

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

  // Dimension keys, display order, icons, and curated Ocean Breeze ring colors
  const ringDimensions = [
    { key: 'parsing', label: 'Parsing', icon: FileCode2, baseColor: '#0B3D91' },
    { key: 'dependencies', label: 'Dependencies', icon: Workflow, baseColor: '#3BA7F2' },
    { key: 'complexity', label: 'Complexity', icon: Flame, baseColor: '#1E40AF' },
    { key: 'protection', label: 'Protection', icon: Shield, baseColor: '#7FE7D6' },
    { key: 'modernization', label: 'Modernization', icon: Wand2, baseColor: '#10B981' },
  ];

  // Helper color for health score
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#167C69]';
    if (score >= 70) return 'text-[#0B3D91]';
    if (score >= 50) return 'text-[#D97706]';
    return 'text-[#DC2626]';
  };

  const getDimensionStroke = (key: string, score: number) => {
    // Semantic warning override if protection or any dimension is critical
    if (score < 50) return '#DC2626';
    if (score < 65) return '#D97706';
    switch (key) {
      case 'parsing':
        return '#0B3D91'; // Primary Ocean Blue
      case 'dependencies':
        return '#3BA7F2'; // Secondary Ocean Light Blue
      case 'complexity':
        return '#1D4ED8'; // Deep Royal
      case 'protection':
        return '#0D9488'; // Teal
      case 'modernization':
        return '#10B981'; // Mint Green
      default:
        return '#3BA7F2';
    }
  };

  const getLabelBadge = (label: string) => {
    switch (label) {
      case 'Stable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E6F8F3] text-[#167C69] border border-[#7FE7D6]/40">
            <ShieldCheck className="w-3.5 h-3.5 text-[#167C69]" />
            Stable
          </span>
        );
      case 'Stable with pressure points':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0B3D91]" />
            Stable with pressure points
          </span>
        );
      case 'Needs attention':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
            <AlertTriangle className="w-3.5 h-3.5 text-[#B45309]" />
            Needs attention
          </span>
        );
      case 'High risk':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
            <AlertOctagon className="w-3.5 h-3.5 text-[#DC2626]" />
            High risk
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569] border border-[#CBD5E1]">
            <HelpCircle className="w-3.5 h-3.5 text-[#64748B]" />
            {label || 'Analysis incomplete'}
          </span>
        );
    }
  };

  const getConfidenceBadge = (conf: string) => {
    const uppercaseConf = conf.toUpperCase();
    if (uppercaseConf === 'HIGH') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#E6F8F3] text-[#167C69] border border-[#7FE7D6]/40">
          Confidence: <strong className="ml-1 font-bold">High</strong>
        </span>
      );
    }
    if (uppercaseConf === 'MEDIUM') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
          Confidence: <strong className="ml-1 font-bold">Medium</strong>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]">
        Confidence: <strong className="ml-1 font-bold">Low</strong>
      </span>
    );
  };

  // Ring geometry constants: balanced proportions
  const size = 270;
  const center = size / 2;
  const radius = 98;
  const circumference = 2 * Math.PI * radius;
  // 5 segments with small gaps
  const gapAngle = 7; // 7 deg gap
  const segAngle = (360 - 5 * gapAngle) / 5; // 65 deg per segment
  const segLength = (segAngle / 360) * circumference;

  const activeHoveredCard = hoveredDimKey ? health.dimensions[hoveredDimKey] : null;
  const activeHoveredDim = hoveredDimKey ? ringDimensions.find(d => d.key === hoveredDimKey) : null;

  return (
    <section
      className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7 transition-all"
      aria-label="Repository Health Overview"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        {/* Left: Central Radial Visualization (approx 35-40% column) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
          <div className="relative w-[270px] h-[270px] flex items-center justify-center">
            {/* Background SVG Track & Segments */}
            <svg
              className="w-full h-full transform -rotate-90 drop-shadow-[0_4px_16px_rgba(11,61,145,0.08)]"
              viewBox={`0 0 ${size} ${size}`}
              aria-hidden="true"
            >
              {/* Background Track Circle */}
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#E8F6FF"
                strokeWidth="13"
              />

              {/* 5 Segmented Radial Rings */}
              {ringDimensions.map((dim, idx) => {
                const card = health.dimensions[dim.key];
                const dimScore = card ? card.score : 50;
                const segmentStartAngle = idx * (segAngle + gapAngle);
                const segmentStartOffset = (segmentStartAngle / 360) * circumference;
                
                const activeFillLength = Math.max(8, (dimScore / 100) * segLength);
                const strokeColor = getDimensionStroke(dim.key, dimScore);
                const isHovered = hoveredDimKey === dim.key;

                return (
                  <g
                    key={dim.key}
                    onMouseEnter={() => setHoveredDimKey(dim.key)}
                    onMouseLeave={() => setHoveredDimKey(null)}
                    className="cursor-pointer transition-opacity"
                    style={{ opacity: hoveredDimKey && !isHovered ? 0.45 : 1 }}
                  >
                    {/* Segment track background */}
                    <circle
                      cx={center}
                      cy={center}
                      r={radius}
                      fill="none"
                      stroke="#F0F7FD"
                      strokeWidth={isHovered ? 15 : 13}
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
                      strokeWidth={isHovered ? 15 : 13}
                      strokeDasharray={`${activeFillLength} ${circumference - activeFillLength}`}
                      strokeDashoffset={-segmentStartOffset}
                      strokeLinecap="round"
                      className="transition-all duration-700 ease-out"
                    />
                  </g>
                );
              })}
            </svg>

            {/* Center Content: Perfectly Aligned */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 select-none pointer-events-none">
              <span className="text-[11px] font-bold tracking-wider text-[#52697A] uppercase font-sans">
                {lensMode === 'health' ? 'Codebase Health' : 'Confidence Level'}
              </span>

              <div className="flex items-baseline justify-center gap-1 my-0.5">
                <span className={`text-5xl font-black tracking-tight font-display ${getScoreColor(health.score)}`}>
                  {animatedScore}
                </span>
                <span className="text-xs font-bold text-[#94A3B8]">/100</span>
              </div>

              <div className="mt-1 flex flex-col items-center gap-1">
                {getLabelBadge(health.label)}
                <span className="text-[10px] text-[#52697A] mt-0.5">
                  Confidence: <strong className="text-[#102536] capitalize">{health.confidence}</strong>
                  {health.isPartial ? ' • Partial analysis' : ' • Verified'}
                </span>
              </div>
            </div>
          </div>

          {/* Hover Segment Context Pill or Default Legend */}
          {activeHoveredCard && activeHoveredDim ? (
            <div className="mt-3.5 px-4 py-2 rounded-xl bg-[#F7FBFF] border border-[#D7EAF5] shadow-xs text-xs text-center max-w-[280px] animate-[fade-up_150ms_ease-out_both]">
              <div className="flex items-center justify-center gap-1.5 font-bold text-[#102536]">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: getDimensionStroke(activeHoveredDim.key, activeHoveredCard.score) }}
                />
                <span>{activeHoveredDim.label}:</span>
                <span className="font-mono text-sm">{activeHoveredCard.score}/100</span>
                <span className="text-[10px] text-[#52697A] font-normal uppercase">({activeHoveredCard.confidence} conf)</span>
              </div>
              <p className="text-[11px] text-[#52697A] mt-0.5 truncate" title={activeHoveredCard.mainPressure}>
                {activeHoveredCard.mainPressure}
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1.5 mt-3.5 text-xs text-[#52697A] font-medium">
              {ringDimensions.map((dim) => {
                const card = health.dimensions[dim.key];
                const score = card?.score ?? 0;
                return (
                  <button
                    key={dim.key}
                    type="button"
                    onMouseEnter={() => setHoveredDimKey(dim.key)}
                    onMouseLeave={() => setHoveredDimKey(null)}
                    className="flex items-center gap-1.5 hover:text-[#102536] transition-colors focus:outline-none"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getDimensionStroke(dim.key, score) }}
                    />
                    <span className="font-sans">{dim.label}</span>
                    <span className="font-mono text-[#102536] font-semibold text-[11px]">{score}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Overview Context & Dimension Mini-Cards & Why This Score (approx 60-65% column) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#D7EAF5]">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#102536] tracking-tight font-display flex items-center gap-2.5">
                  Repository Health Observatory
                  {health.isPartial && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D]">
                      Partial Analysis
                    </span>
                  )}
                </h2>
                <p className="text-xs sm:text-sm text-[#52697A] mt-1 leading-relaxed">
                  Unified assessment synthesized from AST semantics, dependency graph topology, and test harness execution.
                </p>
              </div>
              <div className="shrink-0">{getConfidenceBadge(health.confidence)}</div>
            </div>

            {/* Dimension Mini-Cards in Hero (Section 6) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 mt-4">
              {ringDimensions.map((dim) => {
                const card = health.dimensions[dim.key];
                const score = card ? card.score : 0;
                const Icon = dim.icon;
                const isHovered = hoveredDimKey === dim.key;

                return (
                  <div
                    key={dim.key}
                    onMouseEnter={() => setHoveredDimKey(dim.key)}
                    onMouseLeave={() => setHoveredDimKey(null)}
                    className={`bg-[#F7FBFF] border rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer ${
                      isHovered
                        ? 'border-[#3BA7F2] shadow-sm ring-1 ring-[#3BA7F2]/30 bg-white'
                        : 'border-[#D7EAF5] hover:border-[#3BA7F2]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 text-[#52697A]">
                      <span className="text-[11px] font-bold uppercase tracking-wider font-sans truncate">
                        {dim.label}
                      </span>
                      <Icon className="w-3.5 h-3.5 shrink-0 text-[#0B3D91]" />
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <span className={`text-xl font-extrabold font-display ${getScoreColor(score)}`}>
                        {score}
                      </span>
                      <span className="text-[10px] font-medium text-[#52697A] capitalize">
                        {card?.confidence || 'high'} conf
                      </span>
                    </div>

                    <div className="mt-1 pt-1.5 border-t border-[#D7EAF5]/70 text-[10px] text-[#52697A] truncate font-sans">
                      {card?.status || (score >= 80 ? 'Healthy' : score >= 60 ? 'Needs Attention' : 'High Risk')}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Expandable "Why This Score" Section */}
          <div className="border border-[#D7EAF5] rounded-xl overflow-hidden bg-[#F7FBFF]">
            <button
              type="button"
              onClick={() => setIsWhyExpanded(!isWhyExpanded)}
              className="w-full px-4 py-3 flex items-center justify-between text-left text-xs sm:text-sm font-semibold text-[#102536] hover:bg-[#F0F7FD] transition-colors"
              aria-expanded={isWhyExpanded}
            >
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0B3D91]" />
                <span>Why this score? (Strengths, pressure points &amp; evidence)</span>
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[#52697A] font-normal">
                {isWhyExpanded ? 'Collapse' : 'Expand analysis'}
                {isWhyExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </span>
            </button>

            {isWhyExpanded && (
              <div className="p-4 sm:p-5 border-t border-[#D7EAF5] space-y-4 text-xs bg-white animate-[fade-up_180ms_ease-out_both]">
                {/* Strengths */}
                {health.whyScore.strengths && health.whyScore.strengths.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-[#167C69] uppercase tracking-wider block mb-1.5">
                      + Codebase Strengths
                    </span>
                    <ul className="space-y-1.5">
                      {health.whyScore.strengths.map((str, i) => (
                        <li key={i} className="flex items-start gap-2 text-[#102536] leading-relaxed">
                          <span className="text-[#167C69] font-bold select-none">&bull;</span>
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pressure Points */}
                {health.whyScore.pressurePoints && health.whyScore.pressurePoints.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-[#B45309] uppercase tracking-wider block mb-1.5">
                      - Pressure Points &amp; Friction
                    </span>
                    <ul className="space-y-1.5">
                      {health.whyScore.pressurePoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-2 text-[#102536] leading-relaxed">
                          <span className="text-[#B45309] font-bold select-none">&bull;</span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Evidence */}
                {health.whyScore.evidence && health.whyScore.evidence.length > 0 && (
                  <div className="pt-3 border-t border-[#D7EAF5]">
                    <span className="text-[11px] font-semibold text-[#52697A] uppercase tracking-wider block mb-2">
                      Analysis Grounding Evidence:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {health.whyScore.evidence.map((ev, i) => (
                        <div
                          key={i}
                          className="text-[11px] font-mono bg-[#F7FBFF] border border-[#D7EAF5] px-3 py-1.5 rounded-lg text-[#102536] truncate"
                          title={ev}
                        >
                          &bull; {ev}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Link to Impact & Plan */}
                {onNavigateTab && (
                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => onNavigateTab('migration')}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0B3D91] hover:text-[#1E40AF] transition-colors"
                    >
                      <span>Explore full modernization readiness in Impact &amp; Plan</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default RepositoryHealthHero;

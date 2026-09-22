import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileCode2,
  Workflow,
  Flame,
  Shield,
  Wand2,
  ArrowRight,
  Info,
} from 'lucide-react';
import { RepositoryHealth, TabType } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

interface RepositoryHealthHeroProps {
  health: RepositoryHealth;
  lensMode: 'health' | 'confidence';
  onNavigateTab?: (tab: TabType) => void;
}

export const RepositoryHealthHero: React.FC<RepositoryHealthHeroProps> = ({
  health,
  lensMode: _lensMode,
  onNavigateTab,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);
  const [selectedDimKey, setSelectedDimKey] = useState<string | null>(null);

  // Smooth score animation
  useEffect(() => {
    const target = health.score;
    const duration = 800;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * target));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [health.score]);

  // Dimension definitions
  const dimensions = [
    { key: 'parsing', label: 'Parsing', icon: FileCode2, tab: 'overview' as TabType },
    { key: 'dependencies', label: 'Dependencies', icon: Workflow, tab: 'graph' as TabType },
    { key: 'complexity', label: 'Complexity', icon: Flame, tab: 'hotspots' as TabType },
    { key: 'protection', label: 'Protection', icon: Shield, tab: 'tests' as TabType },
    { key: 'modernization', label: 'Modernization', icon: Wand2, tab: 'refactor' as TabType },
  ];

  // Harmonious health gauge color
  const getGaugeColor = (score: number) => {
    if (score >= 80) return '#15803D'; // Forest Green
    if (score >= 60) return '#4C4FD6'; // Brand Indigo
    if (score >= 40) return '#D97706'; // Capped Amber
    return '#DC2626'; // Red
  };

  const getHealthBadgeTone = (score: number): 'green' | 'indigo' | 'amber' | 'red' => {
    if (score >= 80) return 'green';
    if (score >= 60) return 'indigo';
    if (score >= 40) return 'amber';
    return 'red';
  };

  // Circular gauge geometry: proportional & spacious
  const size = 180;
  const strokeWidth = 11;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const fillPercentage = Math.min(Math.max(animatedScore, 0), 100);
  const strokeDashoffset = circumference - (fillPercentage / 100) * circumference;
  const gaugeColor = getGaugeColor(health.score);

  const activeDim = selectedDimKey ? health.dimensions[selectedDimKey] : null;
  const activeDimConfig = selectedDimKey ? dimensions.find((d) => d.key === selectedDimKey) : null;

  return (
    <Card variant="primary" padding="lg" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Left: Clean Health Gauge (Single Harmonious Arc with Zero Text Overlap) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
          {/* SVG Ring with ONLY score number & OUT OF 100 inside */}
          <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            <svg
              className="w-full h-full transform -rotate-90"
              viewBox={`0 0 ${size} ${size}`}
              aria-hidden="true"
            >
              {/* Clean Background Track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--line)"
                strokeWidth={strokeWidth}
              />

              {/* Single Cohesive Foreground Arc */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={gaugeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Inner Content: Strictly score and small label only to guarantee ZERO overlap */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
              <span className="font-display font-extrabold text-5xl leading-none text-ink tracking-tight">
                {animatedScore}
              </span>
              <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-ink-3 mt-1">
                OUT OF 100
              </span>
            </div>
          </div>

          {/* Subtitle & Status Badge safely OUTSIDE the circle */}
          <div className="flex flex-col items-center text-center mt-3 space-y-1">
            <Badge tone={getHealthBadgeTone(health.score)} size="md">
              {health.label}
            </Badge>

            <span className="text-[11px] text-ink-3 font-medium">
              Confidence: <strong className="text-ink capitalize">{health.confidence}</strong>
              {health.isPartial ? ' · Partial analysis' : ' · Verified'}
            </span>

            <p className="text-[11px] text-ink-3 max-w-[260px] leading-relaxed pt-1">
              Synthesized across 5 AST dimensions and test harness coverage.
            </p>
          </div>
        </div>

        {/* Right: Overview Title, 5 Structured Dimension Tiles & Why This Score */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-line flex-wrap">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-ink font-display tracking-tight flex items-center gap-2">
                  <span>Repository Health Observatory</span>
                  {health.isPartial && (
                    <Badge tone="amber" size="sm">
                      Partial Analysis
                    </Badge>
                  )}
                </h2>
                <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
                  Unified assessment synthesized from AST semantics, dependency graph topology, and test harness execution.
                </p>
              </div>

              <Badge tone={health.score >= 80 ? 'green' : 'amber'} size="sm">
                Score: {health.score}/100
              </Badge>
            </div>

            {/* 5 Well-Structured Dimension Tiles (Un-truncated, clean wrapping) */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-4">
              {dimensions.map((dim) => {
                const card = health.dimensions[dim.key];
                const score = card?.score ?? 0;
                const Icon = dim.icon;
                const isSelected = selectedDimKey === dim.key;
                const isLowScore = score < 50;

                return (
                  <button
                    key={dim.key}
                    type="button"
                    onClick={() => {
                      setSelectedDimKey(isSelected ? null : dim.key);
                    }}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between min-h-[92px] ${
                      isSelected
                        ? 'bg-surface border-indigo ring-1 ring-indigo shadow-xs'
                        : isLowScore
                        ? 'bg-amber-surface/40 border-amber/35 hover:bg-surface'
                        : 'bg-tile/70 border-line hover:bg-surface hover:border-line-strong hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[11px] font-bold text-ink-2 leading-tight" title={dim.label}>
                          {dim.label}
                        </span>
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${isLowScore ? 'text-amber-strong' : 'text-indigo'}`} />
                      </div>

                      <div className="text-base font-extrabold font-mono text-ink mt-0.5">
                        {score}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-ink-3 mt-1 pt-1 border-t border-line/60">
                      <span className={score >= 80 ? 'text-teal-strong font-semibold' : isLowScore ? 'text-amber-strong font-semibold' : 'text-ink-2'}>
                        {score >= 80 ? 'Healthy' : isLowScore ? 'High Risk' : 'Moderate'}
                      </span>
                      <span className="font-mono text-ink-4">
                        {card?.confidence === 'high' ? 'High' : 'Med'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Dimension Detail Drawer (If one is clicked) */}
            {activeDim && activeDimConfig && (
              <div className="mt-3 p-3.5 rounded-lg bg-indigo-surface/40 border border-indigo/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-[fade-in_150ms_ease-out_both]">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink font-sans uppercase tracking-wider text-[11px]">
                      {activeDimConfig.label} Dimension Detail:
                    </span>
                    <Badge tone={activeDim.score >= 80 ? 'green' : activeDim.score < 50 ? 'amber' : 'indigo'} size="sm">
                      {activeDim.score} / 100
                    </Badge>
                  </div>
                  <p className="text-xs text-ink-2 mt-1 leading-snug">
                    {activeDim.mainPressure || 'Operational health within expected baseline thresholds.'}
                  </p>
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigateTab?.(activeDimConfig.tab)}
                  icon={<ArrowRight className="w-3.5 h-3.5" />}
                  className="bg-surface text-ink text-xs shrink-0"
                >
                  Inspect {activeDimConfig.label}
                </Button>
              </div>
            )}
          </div>

          {/* "Why This Score?" Collapsible Drawer */}
          <div className="pt-2 border-t border-line/70">
            <button
              type="button"
              onClick={() => setIsWhyExpanded((prev) => !prev)}
              className="w-full flex items-center justify-between py-1 text-xs font-semibold text-ink-2 hover:text-ink transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-indigo" />
                <span>Why this score? (Strengths, pressure points &amp; evidence)</span>
              </span>
              <span className="flex items-center gap-1 text-ink-3 text-[11px]">
                {isWhyExpanded ? 'Collapse analysis' : 'Expand analysis'}
                {isWhyExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </span>
            </button>

            {isWhyExpanded && (
              <div className="mt-3 p-4 rounded-lg bg-tile border border-line grid grid-cols-1 md:grid-cols-2 gap-4 text-xs animate-[fade-in_200ms_ease-out_both]">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-teal-strong uppercase tracking-wider block">
                    Grounded Strengths:
                  </span>
                  <ul className="space-y-1 text-ink-2">
                    {health.whyScore?.strengths && health.whyScore.strengths.length > 0 ? (
                      health.whyScore.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-teal-strong font-bold">&check;</span>
                          <span>{s}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-ink-3">Complete AST grammar extraction across valid syntax files.</li>
                    )}
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-amber-strong uppercase tracking-wider block">
                    Primary Pressure Points:
                  </span>
                  <ul className="space-y-1 text-ink-2">
                    {health.whyScore?.pressurePoints && health.whyScore.pressurePoints.length > 0 ? (
                      health.whyScore.pressurePoints.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-strong font-bold">&bull;</span>
                          <span>{p}</span>
                        </li>
                      ))
                    ) : (
                      <li className="text-ink-3">Check characterization test suite coverage for unverified callable exports.</li>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default RepositoryHealthHero;

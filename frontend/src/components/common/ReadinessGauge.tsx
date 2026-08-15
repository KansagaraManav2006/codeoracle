import React, { useEffect, useState } from 'react';

interface ReadinessGaugeProps {
  score: number;
  label?: string;
  size?: 'hero' | 'standard' | 'small';
}

export const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({
  score,
  label = 'out of 100',
  size = 'hero',
}) => {
  const [displayedScore, setDisplayedScore] = useState(0);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setDisplayedScore(score);
      return;
    }

    const duration = 600; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.round(score * easeProgress));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [score]);

  // Size configurations
  const dimensions =
    size === 'hero'
      ? { outer: 120, stroke: 10, fontVal: 'text-3xl', fontSub: 'text-[10px]' }
      : size === 'standard'
      ? { outer: 88, stroke: 8, fontVal: 'text-xl', fontSub: 'text-[9px]' }
      : { outer: 64, stroke: 6, fontVal: 'text-base', fontSub: 'text-[8px]' };

  const radius = (dimensions.outer - dimensions.stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg
        width={dimensions.outer}
        height={dimensions.outer}
        className="transform -rotate-90"
        aria-label={`Readiness score ${score} ${label}`}
      >
        {/* Background Track */}
        <circle
          cx={dimensions.outer / 2}
          cy={dimensions.outer / 2}
          r={radius}
          stroke="#EFE9DD"
          strokeWidth={dimensions.stroke}
          fill="transparent"
        />
        {/* Signal Amber Arc */}
        <circle
          cx={dimensions.outer / 2}
          cy={dimensions.outer / 2}
          r={radius}
          stroke="#C7953D"
          strokeWidth={dimensions.stroke}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-75 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`${dimensions.fontVal} font-extrabold text-[#292622] leading-none`}>
          {displayedScore}
        </span>
        {label && (
          <span className={`${dimensions.fontSub} uppercase tracking-wider font-semibold text-[#6B645A] mt-0.5`}>
            {label}
          </span>
        )}
      </div>
    </div>
  );
};

export default ReadinessGauge;

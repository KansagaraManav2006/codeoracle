import React, { useEffect, useState } from 'react';
import { getScoreBand } from '../../utils/formatters';

interface ReadinessGaugeProps {
  score: number;
  onExplainClick?: () => void;
  className?: string;
}

export const ReadinessGauge: React.FC<ReadinessGaugeProps> = ({
  score,
  onExplainClick,
  className = '',
}) => {
  const [displayedScore, setDisplayedScore] = useState(0);
  const band = getScoreBand(score);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplayedScore(score);
      return;
    }

    const duration = 800;
    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayedScore(Math.round(score * eased));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    requestAnimationFrame(frame);
  }, [score]);

  const size = 112;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayedScore / 100) * circumference;

  return (
    <div
      className={`bg-well rounded-xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 ${className}`}
    >
      {/* SVG Ring with role="img" and accessible aria-label */}
      <div
        role="img"
        aria-label={`Readiness score ${score} out of 100, ${band.label}`}
        className="relative shrink-0 flex items-center justify-center"
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="var(--gauge-track)"
            strokeWidth={stroke}
            fill="transparent"
          />
          {/* Band-colored Stroke */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={band.strokeColor}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-[stroke-dashoffset] duration-draw ease-out"
          />
        </svg>

        {/* Center score & label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-display font-extrabold text-[40px] sm:text-[48px] leading-none text-ink num">
            {displayedScore}
          </span>
          <span className="font-sans text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-3 mt-0.5">
            OUT OF 100
          </span>
        </div>
      </div>

      {/* Right details */}
      <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
        <span className="font-sans text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">
          READINESS RATING
        </span>
        <span
          className="font-display font-extrabold text-[18px] sm:text-[20px] leading-snug mt-0.5"
          style={{ color: band.textColor }}
        >
          {band.label}
        </span>
        {onExplainClick && (
          <button
            type="button"
            onClick={onExplainClick}
            className="mt-2 text-[12px] text-ink-3 underline hover:text-ink font-sans cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo"
          >
            Explainable score
          </button>
        )}
      </div>
    </div>
  );
};

export default ReadinessGauge;

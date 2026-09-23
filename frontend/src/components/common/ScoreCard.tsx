import React from 'react';
import { getScoreBand } from '../../utils/formatters';
import ProgressBar from './ProgressBar';

interface ScoreCardProps {
  title: string;
  score: number;
  description: string;
  index?: number;
  className?: string;
}

export const ScoreCard: React.FC<ScoreCardProps> = ({
  title,
  score,
  description,
  index = 0,
  className = '',
}) => {
  const band = getScoreBand(score);

  return (
    <div
      className={`rounded-lg p-4 flex flex-col justify-between transition-all duration-fast ${
        band.isRisk
          ? 'bg-red-wash border border-red-line'
          : 'bg-surface border border-line'
      } ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="font-sans text-[13px] font-semibold text-ink leading-snug">
            {title}
          </span>
          <span
            className="font-display font-extrabold text-[20px] leading-none num"
            style={{ color: band.textColor }}
          >
            {score}
          </span>
        </div>

        <div className="my-2.5">
          <ProgressBar value={score} color={band.barFill} delayIndex={index} />
        </div>

        <div
          className="font-sans text-[12px] font-bold uppercase tracking-wider mb-1.5"
          style={{ color: band.textColor }}
        >
          {band.label}
        </div>
      </div>

      <p className="text-[12px] leading-[1.5] text-ink-3 font-sans line-clamp-3">
        {description}
      </p>
    </div>
  );
};

export default ScoreCard;

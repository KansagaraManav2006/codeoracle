import React from 'react';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  className?: string;
  delayIndex?: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color,
  className = '',
  delayIndex = 0,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      className={`w-full h-1.5 bg-track rounded-pill overflow-hidden ${className}`}
    >
      <div
        className="h-full rounded-pill bar__fill transition-[width] duration-slow ease-out"
        style={{
          width: `${percentage}%`,
          backgroundColor: color || 'var(--indigo)',
          // @ts-ignore
          '--i': delayIndex,
        }}
      />
    </div>
  );
};

export default ProgressBar;

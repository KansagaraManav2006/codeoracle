import React from 'react';

export type StatTileColor = 'ink' | 'indigo' | 'red' | 'amber' | 'teal';

interface StatTileProps {
  label: string;
  value: string | number;
  color?: StatTileColor;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  color = 'ink',
  className = '',
}) => {
  const colorClasses = {
    ink: 'text-ink',
    indigo: 'text-indigo-text',
    red: 'text-red-text',
    amber: 'text-amber-strong',
    teal: 'text-teal-strong',
  }[color];

  return (
    <div
      className={`bg-tile border border-line rounded-md p-3 sm:py-3 sm:px-4 flex flex-col justify-between ${className}`}
    >
      <span className="text-[12px] leading-[1.3] text-ink-3 font-sans font-normal truncate">
        {label}
      </span>
      <span
        className={`font-display font-extrabold text-[20px] sm:text-[22px] leading-tight num mt-1 ${colorClasses}`}
      >
        {value}
      </span>
    </div>
  );
};

export default StatTile;

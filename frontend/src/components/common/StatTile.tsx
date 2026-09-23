import React from 'react';

export type StatTileColor = 'ink' | 'indigo' | 'red' | 'amber' | 'teal';

interface StatTileProps {
  label: string;
  value: string | number;
  color?: StatTileColor;
  className?: string;
  onClick?: () => void;
  title?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  color = 'ink',
  className = '',
  onClick,
  title,
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
      onClick={onClick}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
      className={`bg-tile border border-line rounded-lg p-3 sm:py-3 sm:px-4 flex flex-col justify-between ${
        onClick ? 'cursor-pointer hover:border-indigo/40 hover:bg-surface transition-all select-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo' : ''
      } ${className}`}
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

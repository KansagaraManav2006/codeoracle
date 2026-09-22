import React from 'react';

export type BadgeTone = 'indigo' | 'amber' | 'green' | 'red' | 'neutral';
export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  children: React.ReactNode;
  tone?: BadgeTone;
  size?: BadgeSize;
  className?: string;
  title?: string;
}

const toneClasses: Record<BadgeTone, string> = {
  indigo: 'bg-indigo-surface text-indigo-text border-indigo/25',
  amber: 'bg-amber-surface text-amber-text border-amber/35',
  green: 'bg-teal-surface text-teal-text border-teal/30',
  red: 'bg-red-surface text-red-text border-red-line',
  neutral: 'bg-tile text-ink-2 border-line',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'h-5 px-1.5 text-[10px] gap-1',
  md: 'h-[22px] px-2 text-[11px] gap-1.5',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  tone = 'indigo',
  size = 'md',
  className = '',
  title,
}) => {
  return (
    <span
      title={title}
      className={`badge font-sans border ${toneClasses[tone]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;

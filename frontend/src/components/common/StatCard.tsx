import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: LucideIcon;
  signalAmber?: boolean;
  accentColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  signalAmber = false,
  accentColor,
}) => {
  return (
    <div
      className={`rounded-lg border p-4 transition-all duration-fast ${
        signalAmber
          ? 'bg-surface border-amber/40 shadow-none'
          : 'bg-surface border-line shadow-none hover:border-line-strong'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ink-2">{label}</span>
        {signalAmber ? (
          <span className="flex h-2.5 w-2.5 rounded-full bg-amber" />
        ) : Icon ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-tile text-ink-3">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      <p
        className={`text-2xl sm:text-[28px] font-display font-extrabold tracking-tight num ${
          signalAmber ? 'text-amber' : 'text-ink'
        }`}
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </p>

      {subtext && <p className="mt-1 text-[11px] text-ink-3">{subtext}</p>}
    </div>
  );
};

export default StatCard;

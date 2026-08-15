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
      className={`rounded-2xl border-2 p-4 transition-all duration-150 ${
        signalAmber
          ? 'bg-[#FFFDFC] border-[#B88228] shadow-[0_4px_16px_rgba(184,130,40,0.18)] ring-1 ring-[#B88228]/30'
          : 'bg-[#FFFDFC] border-[#C8BEB0] shadow-xs hover:border-[#181715]'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-xs font-extrabold uppercase tracking-wider text-[#5C554D]">
          {label}
        </span>
        {signalAmber ? (
          <span className="flex h-3 w-3 rounded-full bg-[#B88228] ring-4 ring-[#F5E8CC]" />
        ) : Icon ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ECE5DA] text-[#181715]">
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>

      <div className="flex items-baseline gap-2">
        <p
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight ${
            signalAmber ? 'text-[#B88228]' : 'text-[#181715]'
          }`}
          style={accentColor ? { color: accentColor } : undefined}
        >
          {value}
        </p>
      </div>

      {subtext && <p className="mt-1 text-[11px] text-[#5C554D] font-bold">{subtext}</p>}
    </div>
  );
};

export default StatCard;

import React from 'react';
import { Check, AlertTriangle, LucideIcon } from 'lucide-react';

export type KpiVariant = 'default' | 'highlight' | 'selected' | 'risk';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  variant?: KpiVariant;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  variant = 'default',
  icon: Icon,
  onClick,
  className = '',
}) => {
  const isClickable = Boolean(onClick);

  const getVariantStyles = () => {
    switch (variant) {
      case 'highlight':
        return {
          card: 'bg-surface border-[1.5px] border-amber-line',
          valueColor: 'text-amber',
          marker: (
            <span
              className="w-2.5 h-2.5 rounded-full bg-amber shrink-0"
              aria-hidden="true"
            />
          ),
        };
      case 'selected':
        return {
          card: 'bg-surface border-[1.5px] border-ink',
          valueColor: 'text-ink',
          marker: (
            <div
              className="w-6 h-6 rounded-full bg-ink text-white flex items-center justify-center shrink-0"
              aria-hidden="true"
            >
              <Check className="w-3.5 h-3.5" strokeWidth={2} />
            </div>
          ),
        };
      case 'risk':
        return {
          card: 'bg-red-wash border border-red-line',
          valueColor: 'text-red-text',
          marker: (
            <AlertTriangle className="w-4 h-4 text-red-text shrink-0" strokeWidth={1.75} />
          ),
        };
      case 'default':
      default:
        return {
          card: 'bg-surface border border-line',
          valueColor: 'text-ink',
          marker: Icon ? (
            <div className="w-7 h-7 rounded-sm bg-track flex items-center justify-center text-ink-3 shrink-0">
              <Icon className="w-4 h-4" strokeWidth={1.75} />
            </div>
          ) : null,
        };
    }
  };

  const style = getVariantStyles();
  const Tag = isClickable ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      aria-pressed={variant === 'selected' ? true : undefined}
      className={`relative flex flex-col justify-between p-4 sm:p-5 rounded-xl text-left transition-all duration-fast ${
        style.card
      } ${
        isClickable
          ? 'cursor-pointer hover:border-line-strong hover:shadow-2 active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo'
          : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2 w-full">
        <span className="font-sans text-[11px] font-bold tracking-[0.08em] uppercase text-ink-2 truncate">
          {label}
        </span>
        {style.marker}
      </div>

      <div className="mt-1">
        <div
          className={`font-display font-extrabold text-[26px] sm:text-[30px] leading-[1.1] tracking-[-0.02em] num break-words ${style.valueColor}`}
        >
          {value}
        </div>
        {subtext && (
          <p className="mt-1 text-[12px] leading-[1.4] text-ink-3 font-sans font-normal">
            {subtext}
          </p>
        )}
      </div>
    </Tag>
  );
};

export default KpiCard;

import React from 'react';

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active,
  onClick,
  icon,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-pill text-[11px] font-bold uppercase tracking-[0.04em] transition-all duration-fast select-none border focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo focus-visible:outline-offset-2 ${
        active
          ? 'bg-indigo-surface text-indigo-text border-indigo/30 shadow-xs'
          : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:bg-tile'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

interface ToggleChipProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  tone?: 'indigo' | 'red' | 'slate' | 'amber';
  icon?: React.ReactNode;
  disabled?: boolean;
}

export const ToggleChip: React.FC<ToggleChipProps> = ({
  label,
  active,
  onToggle,
  tone = 'indigo',
  icon,
  disabled = false,
}) => {
  const getActiveClasses = () => {
    switch (tone) {
      case 'red':
        return 'bg-red-surface text-red-text border-red-line shadow-xs';
      case 'slate':
        return 'bg-slate-surface text-slate-text border-slate/30 shadow-xs';
      case 'amber':
        return 'bg-amber-surface text-amber-text border-amber-line shadow-xs';
      case 'indigo':
      default:
        return 'bg-indigo-surface text-indigo-text border-indigo/30 shadow-xs';
    }
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 h-7 px-3 rounded-pill text-[11px] font-bold uppercase tracking-[0.04em] transition-all duration-fast select-none border focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo focus-visible:outline-offset-2 ${
        active
          ? getActiveClasses()
          : 'bg-surface text-ink-2 border-line hover:border-line-strong hover:bg-tile'
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

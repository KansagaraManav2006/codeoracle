import { LucideIcon } from 'lucide-react';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  name?: string;
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  name = 'segmented-control',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`inline-flex items-center p-[3px] bg-panel rounded-pill border border-line select-none ${className}`}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-pill transition-[background-color,color,box-shadow] duration-fast ${
              isActive
                ? 'bg-indigo-surface text-indigo-text shadow-1'
                : 'text-ink-2 hover:text-ink hover:bg-tile/70'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function DarkSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  name = 'dark-segmented-control',
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={`inline-flex items-center p-[3px] bg-code-track rounded-pill border border-code-line select-none ${className}`}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-1 text-[11px] font-bold uppercase tracking-wider rounded-pill transition-[background-color,color] duration-fast ${
              isActive
                ? 'bg-indigo text-white shadow-sm'
                : 'text-code-muted hover:text-code-text'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {Icon && <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={1.75} />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;

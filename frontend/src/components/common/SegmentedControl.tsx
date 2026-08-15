import { LucideIcon } from 'lucide-react';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  icon?: LucideIcon;
  amberAccent?: boolean;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
  size?: 'sm' | 'std';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  disabled = false,
  size = 'std',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex items-center gap-1 bg-[#F0EBE2] border border-[#D8CFC2] rounded-full p-1 ${
        size === 'sm' ? 'text-xs' : 'text-sm'
      }`}
    >
      {options.map((opt) => {
        const isActive = value === opt.id;
        const Icon = opt.icon;

        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 font-medium rounded-full transition-all duration-150 ${
              isActive
                ? opt.amberAccent
                  ? 'bg-[#F5E8CC] text-[#76561B] shadow-sm font-semibold'
                  : 'bg-[#EAE9FB] text-[#4340A0] shadow-sm font-semibold'
                : 'text-[#4D4842] hover:text-[#292622] hover:bg-[#EFE9DD]/60'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedControl;

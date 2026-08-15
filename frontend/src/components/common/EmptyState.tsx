import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  headline: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  trustCopy?: string;
  iconVariant?: 'brand' | 'signal' | 'success' | 'muted';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  headline,
  description,
  actionText,
  onAction,
  trustCopy,
  iconVariant = 'brand',
}) => {
  const iconBgMap = {
    brand: 'bg-[#EAE9FB] text-[#4340A0] border-[#C7C4F7]',
    signal: 'bg-[#F5E8CC] text-[#C7953D] border-[#E6D3A9]',
    success: 'bg-[#E0EFEB] text-[#368A80] border-[#BEE0D6]',
    muted: 'bg-[#F0EBE2] text-[#6B645A] border-[#D8CFC2]',
  };

  return (
    <div className="rounded-[24px] border border-dashed border-[#D8CFC2] bg-[#EFE9DD]/50 p-8 text-center sm:p-12 max-w-2xl mx-auto">
      <div
        className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border shadow-sm ${iconBgMap[iconVariant]}`}
      >
        <Icon className="h-6 w-6" />
      </div>

      <h3 className="text-lg font-bold text-[#292622] tracking-tight">{headline}</h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-[#4D4842]">{description}</p>

      {actionText && onAction && (
        <div className="mt-6">
          <button
            type="button"
            onClick={onAction}
            className="btn-brand-pill px-6 py-2.5 text-xs inline-flex items-center gap-2"
          >
            <span>{actionText}</span>
          </button>
        </div>
      )}

      {trustCopy && (
        <p className="mt-4 text-[11px] italic text-[#6B645A] border-t border-[#D8CFC2]/60 pt-3 max-w-md mx-auto">
          {trustCopy}
        </p>
      )}
    </div>
  );
};

export default EmptyState;

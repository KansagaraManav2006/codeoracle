import React from 'react';
import { LucideIcon } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon: LucideIcon;
  headline: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  secondaryActionText?: string;
  onSecondaryAction?: () => void;
  trustCopy?: string;
  iconVariant?: 'brand' | 'signal' | 'success' | 'muted';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  headline,
  description,
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  trustCopy,
  iconVariant = 'brand',
}) => {
  const iconBgMap = {
    brand: 'bg-indigo-surface text-indigo border-indigo/20',
    signal: 'bg-amber-surface text-amber-strong border-amber/30',
    success: 'bg-teal-surface text-teal-strong border-teal/20',
    muted: 'bg-tile text-ink-3 border-line',
  };

  return (
    <div className="rounded-2xl border border-dashed border-line bg-tile/40 p-8 text-center sm:p-10 max-w-xl mx-auto shadow-xs">
      <div
        className={`mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-xl border shadow-xs ${iconBgMap[iconVariant]}`}
      >
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>

      <h3 className="text-base font-bold text-ink tracking-tight font-display">{headline}</h3>

      <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-ink-3">{description}</p>

      {((actionText && onAction) || (secondaryActionText && onSecondaryAction)) && (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          {actionText && onAction && (
            <Button
              variant="indigo"
              size="sm"
              onClick={onAction}
              className="shadow-xs font-semibold"
            >
              {actionText}
            </Button>
          )}
          {secondaryActionText && onSecondaryAction && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              className="shadow-xs font-semibold"
            >
              {secondaryActionText}
            </Button>
          )}
        </div>
      )}

      {trustCopy && (
        <p className="mt-4 text-[11px] italic text-ink-3 border-t border-line/60 pt-3 max-w-md mx-auto">
          {trustCopy}
        </p>
      )}
    </div>
  );
};

export default EmptyState;


import React from 'react';
import { LucideIcon } from 'lucide-react';
import PageHeroHeader, { PageHeaderActionItem } from './PageHeroHeader';

export interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  eyebrow?: string | React.ReactNode;
  confidence?: string;
  confidenceReason?: string;
  contextLabel?: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode | PageHeaderActionItem[];
  variant?: 'default' | 'card' | 'dark' | 'light';
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon,
  title,
  eyebrow,
  confidence,
  confidenceReason,
  contextLabel,
  description,
  badge,
  actions,
  variant = 'default',
  className = '',
}) => {
  if (variant === 'card' || variant === 'dark') {
    return (
      <PageHeroHeader
        icon={icon}
        title={title}
        eyebrow={eyebrow}
        confidence={confidence}
        confidenceReason={confidenceReason}
        contextLabel={contextLabel}
        description={description}
        badge={badge}
        actions={actions}
        variant="dark"
        className={className}
      />
    );
  }

  if (variant === 'light') {
    return (
      <PageHeroHeader
        icon={icon}
        title={title}
        eyebrow={eyebrow}
        confidence={confidence}
        confidenceReason={confidenceReason}
        contextLabel={contextLabel}
        description={description}
        badge={badge}
        actions={actions}
        variant="light"
        className={className}
      />
    );
  }

  // Classic default header for backwards compatibility
  const Icon = icon;
  return (
    <header className={`flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${className}`}>
      <div className="flex items-start gap-3.5 min-w-0">
        {Icon && (
          <div
            className="w-10 h-10 rounded-lg bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20"
            aria-hidden="true"
          >
            <Icon className="w-5 h-5" strokeWidth={1.75} />
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display font-bold text-lg sm:text-xl text-ink leading-tight tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="font-sans text-xs sm:text-sm text-ink-3 mt-1 leading-relaxed max-w-2xl">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          {Array.isArray(actions)
            ? actions.map((act, i) => (
                <button
                  key={act.id || i}
                  type="button"
                  onClick={act.onClick}
                  disabled={act.disabled || act.loading}
                  title={act.title || act.label}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-line text-ink"
                >
                  {act.icon}
                  <span>{act.label}</span>
                </button>
              ))
            : actions}
        </div>
      )}
    </header>
  );
};

export { PageHeroHeader };
export default PageHeader;

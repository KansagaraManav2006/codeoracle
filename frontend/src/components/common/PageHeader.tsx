import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  title,
  description,
  badge,
  actions,
}) => {
  return (
    <header className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
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
      {actions && <div className="flex items-center gap-2.5 shrink-0 flex-wrap">{actions}</div>}
    </header>
  );
};

export default PageHeader;

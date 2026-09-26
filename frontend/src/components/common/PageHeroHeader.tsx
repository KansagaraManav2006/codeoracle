import React from 'react';
import { LucideIcon, Loader2 } from 'lucide-react';

export interface PageHeaderActionItem {
  label: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'warning' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  title?: string;
  className?: string;
  id?: string;
}

export interface PageHeroHeaderProps {
  icon?: LucideIcon;
  title: string;
  eyebrow?: string | React.ReactNode;
  confidence?: string;
  confidenceReason?: string;
  contextLabel?: string;
  description?: string;
  badge?: React.ReactNode;
  actions?: React.ReactNode | PageHeaderActionItem[];
  variant?: 'dark' | 'light';
  className?: string;
}

export const PageHeroHeader: React.FC<PageHeroHeaderProps> = ({
  icon: Icon,
  title,
  eyebrow,
  confidence,
  confidenceReason,
  contextLabel,
  description,
  badge,
  actions,
  variant = 'dark',
  className = '',
}) => {
  const isDark = variant === 'dark';

  // Helper for confidence badge
  const renderConfidenceBadge = () => {
    if (!confidence) return null;
    const norm = confidence.toLowerCase();
    const isHigh = norm === 'high' || norm === 'full';
    const isMedium = norm === 'medium' || norm === 'partial';
    const isLow = norm === 'low' || norm === 'failed' || norm === 'fallback';

    if (isDark) {
      const colorClasses = isHigh
        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
        : isMedium
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
        : isLow
        ? 'bg-red-500/15 text-red-400 border-red-500/30'
        : 'bg-white/[0.08] text-white/[0.8] border-white/10';

      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono ${colorClasses}`}
          title={confidenceReason || `Confidence: ${confidence}`}
        >
          Confidence: {confidence}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border font-mono ${
          isHigh
            ? 'bg-teal-surface text-teal-text border-teal-line'
            : isMedium
            ? 'bg-amber-surface text-amber-text border-amber-line'
            : 'bg-red-surface text-red-text border-red-line'
        }`}
        title={confidenceReason || `Confidence: ${confidence}`}
      >
        Confidence: {confidence}
      </span>
    );
  };

  // Helper to render actions array or node
  const renderActions = () => {
    if (!actions) return null;

    if (Array.isArray(actions)) {
      return (
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
          {actions.map((act, idx) => {
            const variantType = act.variant || 'secondary';
            let btnStyle = '';

            if (variantType === 'primary') {
              btnStyle =
                'bg-indigo hover:bg-indigo-hover text-white shadow-indigo border-transparent font-bold';
            } else if (variantType === 'warning') {
              btnStyle =
                'bg-amber-surface text-amber-strong border-amber-line hover:bg-amber-surface/80 font-semibold';
            } else if (variantType === 'danger') {
              btnStyle =
                'bg-red-surface text-red-strong border-red-line hover:bg-red-surface/80 font-semibold';
            } else {
              // secondary
              btnStyle = isDark
                ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/10'
                : 'bg-surface hover:bg-tile text-ink border-line';
            }

            return (
              <button
                key={act.id || idx}
                type="button"
                onClick={act.onClick}
                disabled={act.disabled || act.loading}
                title={act.title || act.label}
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-[0.98] hover:-translate-y-px disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo ${btnStyle} ${act.className || ''}`}
              >
                {act.loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  act.icon
                )}
                <span>{act.loading && act.loadingText ? act.loadingText : act.label}</span>
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 flex-wrap sm:flex-nowrap">
        {actions}
      </div>
    );
  };

  return (
    <header
      className={`w-full rounded-2xl p-5 sm:p-6 transition-all animate-[fade-down_200ms_ease-out] ${
        isDark
          ? 'text-white border border-white/[0.10] shadow-2'
          : 'bg-surface text-ink border border-line shadow-1'
      } ${className}`}
      style={
        isDark
          ? {
              background:
                'radial-gradient(circle at 0% 50%, rgba(76, 79, 214, 0.16), transparent 45%), #181715',
              borderColor: 'rgba(200, 190, 176, 0.16)',
            }
          : undefined
      }
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left Area: Icon + Metadata/Title/Badges/Description */}
        <div className="flex items-start gap-3.5 sm:gap-4 min-w-0">
          {Icon && (
            <div
              className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0 shadow-xs mt-0.5 ${
                isDark
                  ? 'bg-indigo/20 border border-indigo/35 text-indigo-on-dark shadow-indigo'
                  : 'bg-indigo-surface border border-indigo/25 text-indigo'
              }`}
              aria-hidden="true"
            >
              <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.85} />
            </div>
          )}

          <div className="min-w-0 flex-1">
            {/* Context line */}
            {contextLabel && (
              <div
                className={`text-[10px] sm:text-[11px] font-mono font-semibold tracking-wider uppercase mb-1 truncate ${
                  isDark ? 'text-white/60' : 'text-ink-4'
                }`}
              >
                {contextLabel}
              </div>
            )}

            {/* Single Semantic H1 Title & Badges */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1
                className={`font-display font-bold text-xl sm:text-2xl lg:text-[26px] tracking-tight leading-tight ${
                  isDark ? 'text-white' : 'text-ink'
                }`}
              >
                {title}
              </h1>

              {/* Eyebrow primary product badge */}
              {eyebrow && (
                typeof eyebrow === 'string' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo/20 text-indigo-on-dark border border-indigo/35 shadow-xs">
                    {eyebrow}
                  </span>
                ) : (
                  eyebrow
                )
              )}

              {/* Confidence badge */}
              {renderConfidenceBadge()}

              {/* Additional custom badges */}
              {badge && (
                <div className="flex items-center gap-2 flex-wrap">
                  {badge}
                </div>
              )}
            </div>

            {/* Description */}
            {description && (
              <p
                className={`text-xs sm:text-sm leading-relaxed max-w-3xl font-sans mt-1.5 ${
                  isDark ? 'text-white/70' : 'text-ink-3'
                }`}
              >
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Right Area: Controls / Actions */}
        {actions && (
          <div className="pt-3 lg:pt-0 border-t border-white/[0.08] lg:border-t-0 justify-start lg:justify-end">
            {renderActions()}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeroHeader;

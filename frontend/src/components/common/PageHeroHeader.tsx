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
        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
        : isMedium
        ? 'bg-amber-500/15 text-amber-300 border-amber-500/25'
        : isLow
        ? 'bg-red-500/15 text-red-400 border-red-500/25'
        : 'bg-white/[0.08] text-white/[0.78] border-white/10';

      return (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${colorClasses}`}
          title={confidenceReason || `Confidence: ${confidence}`}
        >
          Confidence: {confidence}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
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
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
          {actions.map((act, idx) => {
            const variantType = act.variant || 'secondary';
            let btnStyle = '';

            if (variantType === 'primary') {
              btnStyle =
                'bg-[#007AFF] hover:bg-[#0066D6] text-white shadow-[0_2px_10px_rgba(0,122,255,0.35)] border-transparent';
            } else if (variantType === 'warning') {
              btnStyle =
                'bg-[rgba(255,159,10,0.12)] text-[#FFB340] border-[rgba(255,159,10,0.25)] hover:bg-[rgba(255,159,10,0.20)]';
            } else if (variantType === 'danger') {
              btnStyle =
                'bg-red-500/15 text-red-400 border-red-500/25 hover:bg-red-500/25';
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
                className={`inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-200 active:scale-[0.98] hover:-translate-y-px disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] ${btnStyle} ${act.className || ''}`}
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
      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 flex-wrap sm:flex-nowrap">
        {actions}
      </div>
    );
  };

  return (
    <header
      className={`w-full rounded-[22px] p-5 sm:p-[22px_26px] transition-all animate-[header-card-enter_300ms_cubic-bezier(0.16,1,0.3,1)_both] ${
        isDark
          ? 'text-white border border-white/[0.08] shadow-[0_12px_34px_rgba(0,0,0,0.10)]'
          : 'bg-surface text-ink border border-line shadow-1'
      } ${className}`}
      style={
        isDark
          ? {
              background:
                'radial-gradient(circle at 0% 50%, rgba(0, 122, 255, 0.10), transparent 35%), #1D1D1F',
              borderColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '22px',
              boxShadow: '0 12px 34px rgba(0, 0, 0, 0.10)',
            }
          : undefined
      }
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-5">
        {/* Left Area: Icon + Metadata/Title/Badges/Description */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 sm:gap-4.5 min-w-0">
          <div className="flex items-center gap-3 shrink-0">
            {Icon && (
              <div
                className="w-[46px] h-[46px] rounded-[14px] bg-[#007AFF]/14 border border-[#007AFF]/22 flex items-center justify-center shrink-0 text-[#2997FF] shadow-[0_0_16px_rgba(0,122,255,0.14)] animate-[icon-pop_300ms_cubic-bezier(0.16,1,0.3,1)_both]"
                aria-hidden="true"
              >
                <Icon className="w-5 h-5 text-[#2997FF]" strokeWidth={2.1} />
              </div>
            )}
            {/* Mobile Title (visible next to icon on narrow screens) */}
            <div className="min-w-0 sm:hidden">
              {contextLabel && (
                <div className="text-[10px] font-mono font-semibold tracking-wider text-white/50 uppercase truncate max-w-[200px]">
                  {contextLabel}
                </div>
              )}
              <h1 className="text-white font-bold text-2xl tracking-[-0.025em] leading-[1.15] font-display">
                {title}
              </h1>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            {/* Context line for tablet/desktop */}
            {contextLabel && (
              <div className="hidden sm:block text-[11px] font-mono font-semibold tracking-wider text-white/50 uppercase mb-1">
                {contextLabel}
              </div>
            )}

            {/* Title & Badges on tablet and desktop */}
            <div className="hidden sm:flex flex-wrap items-center gap-2.5 sm:gap-3">
              <h1 className="text-white font-bold text-2xl sm:text-[28px] tracking-[-0.025em] leading-[1.15] font-display">
                {title}
              </h1>

              {/* Eyebrow primary product badge */}
              {eyebrow && (
                typeof eyebrow === 'string' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#007AFF]/15 text-[#5AC8FA] border border-[#007AFF]/20 shadow-[0_0_10px_rgba(0,122,255,0.12)]">
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
                className={`text-sm sm:text-[15px] leading-relaxed max-w-2xl font-sans mt-1 sm:mt-1.5 ${
                  isDark ? 'text-white/[0.66]' : 'text-ink-3'
                }`}
              >
                {description}
              </p>
            )}

            {/* Badges on mobile (displayed below description) */}
            <div className="flex sm:hidden items-center gap-2 flex-wrap mt-2.5">
              {eyebrow && (
                typeof eyebrow === 'string' ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#007AFF]/15 text-[#5AC8FA] border border-[#007AFF]/20">
                    {eyebrow}
                  </span>
                ) : (
                  eyebrow
                )
              )}
              {renderConfidenceBadge()}
              {badge}
            </div>
          </div>
        </div>

        {/* Right Area: Controls / Actions */}
        {actions && (
          <div className="pt-3 lg:pt-0 border-t border-white/[0.06] lg:border-t-0 justify-start lg:justify-end">
            {renderActions()}
          </div>
        )}
      </div>
    </header>
  );
};

export default PageHeroHeader;

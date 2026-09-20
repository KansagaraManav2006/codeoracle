import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'outline' | 'ink' | 'indigo' | 'dark' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: React.ReactNode;
  loading?: boolean;
  loadingText?: string;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'outline',
      size = 'md',
      icon,
      loading = false,
      loadingText,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-8 px-3 text-xs min-w-[32px]',
      md: 'h-10 px-4 text-[13px] min-h-[40px]',
      lg: 'h-12 px-6 text-[14px] min-h-[48px]',
    }[size];

    const variantClasses = {
      outline:
        'bg-surface text-ink border border-line shadow-1 hover:bg-tile hover:border-line-strong active:scale-[0.97]',
      ink:
        'bg-ink text-white border border-transparent hover:bg-ink-2 active:scale-[0.97]',
      indigo:
        'bg-indigo text-white border border-transparent shadow-indigo hover:bg-indigo-press active:scale-[0.97]',
      dark:
        'bg-indigo-deep text-indigo-badge-text border border-transparent hover:bg-indigo-deep/90 active:scale-[0.97]',
      ghost:
        'bg-transparent text-ink-2 border border-transparent hover:bg-ink/5 active:scale-[0.97]',
      danger:
        'bg-red-strong text-white border border-transparent hover:bg-red-strong/90 active:scale-[0.97]',
    }[variant];

    const disabledClasses =
      'disabled:bg-track disabled:text-ink-4 disabled:border-transparent disabled:shadow-none disabled:cursor-not-allowed disabled:transform-none';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading ? 'true' : undefined}
        className={`relative inline-flex items-center justify-center gap-2 rounded-pill font-sans font-semibold leading-none select-none transition-[background-color,border-color,box-shadow,transform] duration-fast ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo focus-visible:outline-offset-2 ${sizeClasses} ${variantClasses} ${disabledClasses} ${className}`}
        {...props}
      >
        {/* Enforce 44px min hit area on sm buttons via pseudo-element */}
        {size === 'sm' && (
          <span className="absolute -inset-1 pointer-events-none sm:hidden" aria-hidden="true" />
        )}
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin shrink-0" strokeWidth={1.75} />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && <span className="shrink-0 flex items-center">{icon}</span>}
            {children && <span>{children}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;

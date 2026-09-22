import React from 'react';

export type CardVariant = 'primary' | 'secondary' | 'muted';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  className?: string;
  interactive?: boolean;
  as?: 'div' | 'section' | 'article';
}

const variantClasses: Record<CardVariant, string> = {
  primary: 'bg-surface border border-line shadow-1 rounded-xl',
  secondary: 'bg-surface border border-line rounded-lg shadow-none',
  muted: 'bg-tile/70 border border-line rounded-lg shadow-none',
};

const paddingClasses: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-3.5 sm:p-4',
  md: 'p-4 sm:p-5',
  lg: 'p-5 sm:p-6',
};

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'primary',
  padding = 'md',
  className = '',
  interactive = false,
  as: Tag = 'div',
}) => {
  return (
    <Tag
      className={`${variantClasses[variant]} ${paddingClasses[padding]} ${
        interactive ? 'card-interactive transition-all duration-fast' : ''
      } ${className}`}
    >
      {children}
    </Tag>
  );
};

export default Card;

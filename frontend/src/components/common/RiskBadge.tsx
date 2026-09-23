import React from 'react';

export type SemanticState = 'success' | 'warning' | 'danger' | 'info' | 'critical' | 'high' | 'medium' | 'low';

interface RiskBadgeProps {
  level: SemanticState | string;
  label?: string;
  size?: 'sm' | 'std';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, label, size = 'std' }) => {
  const normLevel = level.toLowerCase();

  let styleClasses = 'bg-indigo-surface text-indigo-text border-indigo/25';

  if (
    normLevel === 'success' ||
    normLevel === 'low' ||
    normLevel === 'ready' ||
    normLevel === 'analyzed' ||
    normLevel === 'complete'
  ) {
    styleClasses = 'bg-teal-surface text-teal-text border-teal/30';
  } else if (normLevel === 'warning' || normLevel === 'medium' || normLevel === 'partial') {
    styleClasses = 'bg-amber-surface text-amber-text border-amber/35';
  } else if (
    normLevel === 'danger' ||
    normLevel === 'high' ||
    normLevel === 'critical' ||
    normLevel === 'risk' ||
    normLevel === 'failed'
  ) {
    styleClasses = 'bg-red-surface text-red-text border-red-line';
  }

  const paddingClasses = size === 'sm' ? 'h-5 px-1.5 text-[10px]' : 'h-[22px] px-2 text-[11px]';

  return (
    <span
      className={`inline-flex items-center font-sans font-bold tracking-[0.04em] uppercase rounded-pill border ${paddingClasses} ${styleClasses}`}
    >
      {label || level}
    </span>
  );
};

export default RiskBadge;

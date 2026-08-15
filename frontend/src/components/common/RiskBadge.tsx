import React from 'react';

export type SemanticState = 'success' | 'warning' | 'danger' | 'info' | 'critical' | 'high' | 'medium' | 'low';

interface RiskBadgeProps {
  level: SemanticState | string;
  label?: string;
  size?: 'sm' | 'std';
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, label, size = 'std' }) => {
  const normLevel = level.toLowerCase();

  let styleClasses = 'bg-[#E6EFF2] text-[#3D657A] border-[#C8DCE4]'; // default info

  if (normLevel === 'success' || normLevel === 'low' || normLevel === 'ready' || normLevel === 'analyzed' || normLevel === 'complete') {
    styleClasses = 'bg-[#E0EFEB] text-[#245F59] border-[#BEE0D6]';
  } else if (normLevel === 'warning' || normLevel === 'medium' || normLevel === 'partial') {
    styleClasses = 'bg-[#F5E8CC] text-[#76561B] border-[#E6D3A9]';
  } else if (normLevel === 'danger' || normLevel === 'high' || normLevel === 'critical' || normLevel === 'risk' || normLevel === 'failed') {
    styleClasses = 'bg-[#F6E5E2] text-[#8F3F3A] border-[#ECC7C3]';
  } else if (normLevel === 'info' || normLevel === 'module' || normLevel === 'external') {
    styleClasses = 'bg-[#E6EFF2] text-[#3D657A] border-[#C8DCE4]';
  }

  const paddingClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-bold tracking-tight uppercase rounded-full border ${paddingClasses} ${styleClasses}`}
    >
      {label || level}
    </span>
  );
};

export default RiskBadge;

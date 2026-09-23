import React from 'react';
import { AlertTriangle, Info, CheckCircle2, AlertOctagon } from 'lucide-react';

export type NoticeType = 'warning' | 'info' | 'success' | 'danger';

interface NoticeProps {
  type?: NoticeType;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export const Notice: React.FC<NoticeProps> = ({
  type = 'warning',
  title,
  children,
  icon,
  className = '',
}) => {
  const getStyles = () => {
    switch (type) {
      case 'danger':
        return {
          container: 'bg-red-surface border border-red-line text-red-text',
          icon: <AlertOctagon className="w-[18px] h-[18px] text-red-text shrink-0" strokeWidth={1.75} />,
          role: 'alert',
        };
      case 'success':
        return {
          container: 'bg-teal-surface border border-teal/20 text-teal-text',
          icon: <CheckCircle2 className="w-[18px] h-[18px] text-teal-strong shrink-0" strokeWidth={1.75} />,
          role: 'status',
        };
      case 'info':
        return {
          container: 'bg-indigo-surface border border-indigo/20 text-ink-2',
          icon: <Info className="w-[18px] h-[18px] text-indigo-text shrink-0" strokeWidth={1.75} />,
          role: 'status',
        };
      case 'warning':
      default:
        return {
          container: 'bg-amber-surface border border-amber-line text-amber-text',
          icon: <AlertTriangle className="w-[18px] h-[18px] text-amber-text shrink-0" strokeWidth={1.75} />,
          role: 'status',
        };
    }
  };

  const style = getStyles();

  return (
    <div
      role={style.role}
      className={`rounded-lg p-3.5 sm:py-3.5 sm:px-5 flex items-start gap-3 text-[13px] leading-[1.5] ${style.container} ${className}`}
    >
      <div className="mt-0.5">{icon || style.icon}</div>
      <div className="flex-1">
        {title && <div className="font-bold mb-0.5">{title}</div>}
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Notice;

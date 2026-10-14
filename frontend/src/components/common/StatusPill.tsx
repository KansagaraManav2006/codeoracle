import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, WifiOff, Loader2 } from 'lucide-react';
import { useServiceHealth, ServiceStatus } from '../../hooks/useServiceHealth';

export type { ServiceStatus };

interface StatusPillProps {
  onStatusChange?: (status: ServiceStatus) => void;
}

export const StatusPill: React.FC<StatusPillProps> = ({ onStatusChange }) => {
  const { status, statusMessage } = useServiceHealth();

  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  const getStyle = () => {
    switch (status) {
      case 'ready':
        return {
          pillClass: 'bg-teal-surface text-teal-text border border-teal/20',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-teal-strong shrink-0" strokeWidth={1.75} />,
          text: 'Service ready',
        };
      case 'checking':
        return {
          pillClass: 'bg-slate-surface text-slate-text border border-slate/20',
          icon: <Loader2 className="w-3.5 h-3.5 animate-spin text-slate shrink-0" strokeWidth={1.75} />,
          text: 'Checking…',
        };
      case 'degraded':
        return {
          pillClass: 'bg-amber-surface text-amber-text border border-amber-line/40',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-strong shrink-0" strokeWidth={1.75} />,
          text: 'Degraded',
        };
      case 'offline':
      default:
        return {
          pillClass: 'bg-red-surface text-red-text border border-red-line/40',
          icon: <WifiOff className="w-3.5 h-3.5 text-red-strong shrink-0" strokeWidth={1.75} />,
          text: 'Offline',
        };
    }
  };

  const currentStyle = getStyle();

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex items-center gap-2 h-8 px-3 rounded-pill text-xs font-semibold select-none transition-colors duration-fast ${currentStyle.pillClass}`}
      title={statusMessage}
    >
      {currentStyle.icon}
      <span className="hidden sm:inline">{currentStyle.text}</span>
      <span className="sr-only sm:hidden">{currentStyle.text}</span>
    </div>
  );
};

export default StatusPill;

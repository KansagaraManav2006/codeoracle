import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, WifiOff, Loader2 } from 'lucide-react';
import { HealthResponse } from '../../types';

export type ServiceStatus = 'ready' | 'checking' | 'degraded' | 'offline';

interface StatusPillProps {
  onStatusChange?: (status: ServiceStatus) => void;
}

export const StatusPill: React.FC<StatusPillProps> = ({ onStatusChange }) => {
  const [status, setStatus] = useState<ServiceStatus>('checking');
  const [statusMessage, setStatusMessage] = useState<string>('Checking service status...');
  const lastChangeTime = useRef<number>(Date.now());
  const pendingStatus = useRef<{ status: ServiceStatus; message: string } | null>(null);

  const applyStatus = (newStatus: ServiceStatus, message: string) => {
    const now = Date.now();
    const elapsed = now - lastChangeTime.current;
    const MIN_DISPLAY_MS = 2000;

    if (elapsed < MIN_DISPLAY_MS) {
      pendingStatus.current = { status: newStatus, message };
      setTimeout(() => {
        if (pendingStatus.current) {
          setStatus(pendingStatus.current.status);
          setStatusMessage(pendingStatus.current.message);
          onStatusChange?.(pendingStatus.current.status);
          lastChangeTime.current = Date.now();
          pendingStatus.current = null;
        }
      }, MIN_DISPLAY_MS - elapsed);
    } else {
      setStatus(newStatus);
      setStatusMessage(message);
      onStatusChange?.(newStatus);
      lastChangeTime.current = now;
    }
  };

  const checkHealth = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch('/api/health', { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) {
        if (res.status >= 500) {
          applyStatus('degraded', 'Service response degraded');
        } else {
          applyStatus('offline', 'Service offline');
        }
        return;
      }

      const data: HealthResponse = await res.json();
      if (data.status === 'healthy' || data.status === 'ready' || data.status === 'ok') {
        applyStatus('ready', 'Service ready');
      } else {
        applyStatus('degraded', 'Service degraded');
      }
    } catch {
      applyStatus('offline', 'Service offline — Backend unavailable');
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000); // 30s polling per DESIGN.md §7.2
    return () => clearInterval(interval);
  }, []);

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

import React from 'react';

export const RiskBadge: React.FC<{ risk: string; size?: 'sm' | 'md' }> = ({ risk, size = 'md' }) => {
  const norm = (risk || 'low').toLowerCase();
  const isSm = size === 'sm';
  const label = `RISK: ${norm.toUpperCase()}`;

  let bgClasses = 'bg-slate-surface text-slate-text border border-slate/30';
  if (norm === 'critical') {
    bgClasses = 'bg-red-strong text-white border border-red-strong shadow-xs font-bold';
  } else if (norm === 'high') {
    bgClasses = 'bg-red-surface text-red-text border border-red-line/60 font-bold';
  } else if (norm === 'medium') {
    bgClasses = 'bg-amber-surface text-amber-text border border-amber-line/60 font-bold';
  }

  return (
    <span
      className={`inline-flex items-center font-mono font-bold uppercase select-none rounded-pill tracking-wider ${
        isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-[11px]'
      } ${bgClasses}`}
    >
      {label}
    </span>
  );
};

export const ComplexityBadge: React.FC<{ severity: string; value?: number; size?: 'sm' | 'md' }> = ({
  severity,
  value,
  size = 'md',
}) => {
  const norm = (severity || 'low').toLowerCase();
  const isSm = size === 'sm';
  const label = value !== undefined ? `${value} CC · COMPLEXITY: ${norm.toUpperCase()}` : `COMPLEXITY: ${norm.toUpperCase()}`;

  let bgClasses = 'bg-slate-surface text-slate-text border border-slate/30';
  if (norm === 'critical') {
    bgClasses = 'bg-red-surface text-red-text border border-red-line/60 font-semibold';
  } else if (norm === 'high') {
    bgClasses = 'bg-amber-surface text-amber-text border border-amber-line/60 font-semibold';
  } else if (norm === 'medium') {
    bgClasses = 'bg-tile text-ink-2 border border-line font-medium';
  }

  return (
    <span
      className={`inline-flex items-center font-mono uppercase select-none rounded-md tracking-wider ${
        isSm ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${bgClasses}`}
    >
      {label}
    </span>
  );
};

export const ParseBadge: React.FC<{ status: string; confidence?: string; size?: 'sm' | 'md' }> = ({
  status,
  confidence,
  size = 'md',
}) => {
  const normStatus = (status || 'full').toLowerCase();
  const normConf = (confidence || 'high').toLowerCase();
  const isSm = size === 'sm';

  let statusClass = 'bg-teal-surface text-teal-text border border-teal/30 font-bold';
  if (normStatus === 'partial') {
    statusClass = 'bg-amber-surface text-amber-text border border-amber-line/60 font-bold';
  } else if (normStatus === 'fallback' || normStatus === 'failed') {
    statusClass = 'bg-red-surface text-red-text border border-red-line/60 font-bold';
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <span
        className={`inline-flex items-center font-mono uppercase select-none rounded-pill tracking-wider ${
          isSm ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-[10px]'
        } ${statusClass}`}
      >
        PARSE: {normStatus.toUpperCase()}
      </span>
      {confidence && (
        <span
          className={`inline-flex items-center font-mono uppercase select-none rounded-md px-1.5 py-0.5 text-[10px] ${
            normConf === 'high'
              ? 'bg-tile text-ink-2 border border-line font-medium'
              : normConf === 'medium'
              ? 'bg-amber-surface/70 text-amber-text border border-amber-line/40 font-semibold'
              : 'bg-red-surface/70 text-red-text border border-red-line/40 font-bold'
          }`}
          title={`AST & Graph evidence confidence: ${normConf.toUpperCase()}`}
        >
          CONF: {normConf.toUpperCase()}
        </span>
      )}
    </div>
  );
};

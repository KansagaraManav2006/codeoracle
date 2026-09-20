import React from 'react';

export type LanguageType = 'python' | 'javascript' | 'typescript' | 'external' | 'entry' | string;

interface LanguageTagProps {
  language: LanguageType;
  showDot?: boolean;
  className?: string;
}

export const LanguageTag: React.FC<LanguageTagProps> = ({
  language,
  showDot = false,
  className = '',
}) => {
  const norm = (language || '').toLowerCase();

  let tagClass = 'bg-slate-surface text-slate-text';
  let dotColor = 'var(--slate)';
  let displayName = language.toUpperCase();

  if (norm.includes('python') || norm === 'py') {
    tagClass = 'bg-indigo-surface text-indigo-text';
    dotColor = 'var(--indigo)';
    displayName = 'PYTHON';
  } else if (norm.includes('javascript') || norm === 'js' || norm === 'jsx') {
    tagClass = 'bg-amber-surface text-amber-text';
    dotColor = 'var(--amber)';
    displayName = 'JAVASCRIPT';
  } else if (norm.includes('typescript') || norm === 'ts' || norm === 'tsx') {
    tagClass = 'bg-[#EFEBFC] text-[#4E3FA8]';
    dotColor = '#7862DE';
    displayName = 'TYPESCRIPT';
  } else if (norm.includes('external')) {
    tagClass = 'bg-slate-surface text-slate-text';
    dotColor = 'var(--slate)';
    displayName = 'EXTERNAL';
  } else if (norm.includes('entry')) {
    tagClass = 'bg-teal-surface text-teal-text';
    dotColor = 'var(--teal)';
    displayName = 'ENTRY POINT';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 h-[22px] px-2 rounded-pill font-sans text-[11px] font-bold tracking-[0.04em] uppercase select-none ${tagClass} ${className}`}
    >
      {showDot && (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: dotColor }}
          aria-hidden="true"
        />
      )}
      <span>{displayName}</span>
    </span>
  );
};

export type StatusType =
  | 'analyzed'
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'ready'
  | 'strong'
  | 'complexity-low'
  | 'complexity-medium'
  | 'complexity-high'
  | 'complexity-critical'
  | string;

interface StatusTagProps {
  status: StatusType;
  label?: string;
  className?: string;
}

export const StatusTag: React.FC<StatusTagProps> = ({ status, label, className = '' }) => {
  const norm = (status || '').toLowerCase();
  let tagClass = 'bg-teal-surface text-teal-text';
  let defaultLabel = (label || status).toUpperCase();

  if (norm === 'critical' || norm === 'complexity-critical') {
    tagClass = 'bg-red-strong text-white font-bold';
    defaultLabel = label || (norm === 'critical' ? 'CRITICAL' : 'COMPLEXITY: CRITICAL');
  } else if (norm === 'high' || norm === 'complexity-high' || norm === 'high risk') {
    tagClass = 'bg-red-surface text-red-text font-bold';
    defaultLabel = label || (norm === 'high' ? 'HIGH RISK' : 'COMPLEXITY: HIGH');
  } else if (norm === 'medium' || norm === 'complexity-medium') {
    tagClass = 'bg-amber-surface text-amber-text font-bold';
    defaultLabel = label || (norm === 'medium' ? 'MEDIUM' : 'COMPLEXITY: MEDIUM');
  } else if (norm === 'low' || norm === 'complexity-low') {
    tagClass = 'bg-teal-surface text-teal-text font-bold';
    defaultLabel = label || (norm === 'low' ? 'LOW' : 'COMPLEXITY: LOW');
  } else if (norm === 'analyzed') {
    tagClass = 'bg-teal-surface text-teal-text font-bold';
    defaultLabel = 'ANALYZED';
  } else if (norm === 'project-view') {
    tagClass = 'bg-indigo-surface text-indigo-text font-bold';
    defaultLabel = 'PROJECT VIEW';
  }

  return (
    <span
      className={`inline-flex items-center h-[22px] px-2 rounded-pill font-sans text-[11px] font-bold tracking-[0.04em] uppercase select-none ${tagClass} ${className}`}
    >
      {defaultLabel}
    </span>
  );
};

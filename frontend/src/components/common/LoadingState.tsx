import React from 'react';

interface LoadingStateProps {
  label: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label }) => {
  return (
    <div className="space-y-4" role="status" aria-live="polite">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink-2">{label}</p>
        <span className="inline-flex items-center h-5 px-1.5 rounded-pill bg-amber-surface text-amber-text border border-amber/35 text-[10px] font-bold uppercase tracking-wider">
          Working
        </span>
      </div>
      <div className="skeleton h-24 w-full" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
        <div className="skeleton h-24" />
      </div>
      <div className="skeleton h-48 w-full" />
      <p className="text-[11px] text-ink-3">
        Large archives (up to 200MB / 100k lines) can take a moment. Progress is shown in the stepper during ingest.
      </p>
    </div>
  );
};

export default LoadingState;

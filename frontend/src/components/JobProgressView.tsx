import React from 'react';
import { Activity, RotateCcw, ShieldAlert } from 'lucide-react';
import { JobResponse } from '../types';

interface JobProgressViewProps {
  job: JobResponse | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  onRetry: () => void;
}

export const JobProgressView: React.FC<JobProgressViewProps> = ({
  job,
  loading,
  error,
  errorCode,
  onRetry,
}) => {
  if (!loading && !job && !error) return null;

  if (error || (job && job.state === 'failed')) {
    return (
      <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto mb-8">
        <div className="flex items-start space-x-4">
          <div className="p-3 bg-red-900/40 border border-red-700/50 rounded-xl text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-base font-semibold text-white">Ingestion Failed</h3>
              {errorCode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-red-900/60 text-red-300 border border-red-700/40">
                  {errorCode}
                </span>
              )}
            </div>
            <p className="text-xs text-red-200/90 mb-4">{error || job?.error_message || 'An error occurred during ingestion.'}</p>
            <button
              onClick={onRetry}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-red-900/60 hover:bg-red-800/80 text-white text-xs font-medium rounded-lg transition-colors border border-red-700/50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry Ingestion</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = job?.progress_percentage ?? 10;
  const stage = job?.stage ?? 'Preparing ingestion workspace...';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-4xl mx-auto mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-indigo-400 animate-spin" />
          <div>
            <h3 className="text-sm font-semibold text-white">Processing Codebase</h3>
            <p className="text-xs text-slate-400">{stage}</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
          {progress}%
        </span>
      </div>

      {/* Animated Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
        <div
          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out shadow-lg shadow-indigo-500/50"
          style={{ width: `${Math.max(progress, 5)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default JobProgressView;

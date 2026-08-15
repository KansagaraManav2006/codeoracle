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
      <div className="bg-[#F6E5E2] border border-[#ECC7C3] rounded-[24px] p-5 sm:p-6 shadow-sm max-w-4xl mx-auto mb-6 sm:mb-8">
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-3 bg-[#FFFDFC] border border-[#ECC7C3] rounded-2xl text-[#C45F58] shadow-xs">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-base font-extrabold text-[#8F3F3A]">Ingestion Failed</h3>
              {errorCode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FFFDFC] text-[#8F3F3A] border border-[#ECC7C3] font-bold">
                  {errorCode}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8F3F3A] mb-4">
              {error || job?.error_message || 'An error occurred during ingestion.'}
            </p>
            <button
              onClick={onRetry}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-[#FFFDFC] hover:bg-[#F0EBE2] text-[#8F3F3A] text-xs font-bold rounded-full transition-colors border border-[#ECC7C3] shadow-xs"
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
    <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-5 sm:p-6 shadow-warm max-w-4xl mx-auto mb-6 sm:mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-[#EAE9FB] text-[#4C4FD6] rounded-2xl border border-[#C7C4F7]">
            <Activity className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[#292622]">Processing Codebase</h3>
            <p className="text-xs text-[#6B645A]">{stage}</p>
          </div>
        </div>
        <span className="text-xs font-mono font-bold text-[#4340A0] bg-[#EAE9FB] px-3 py-1 rounded-full border border-[#C7C4F7]">
          {progress}%
        </span>
      </div>

      {/* Animated Progress Bar */}
      <div className="w-full bg-[#EFE9DD] rounded-full h-2.5 overflow-hidden border border-[#D8CFC2]">
        <div
          className="bg-[#4C4FD6] h-2.5 rounded-full transition-all duration-500 ease-out shadow-xs"
          style={{ width: `${Math.max(progress, 5)}%` }}
        ></div>
      </div>
    </div>
  );
};

export default JobProgressView;

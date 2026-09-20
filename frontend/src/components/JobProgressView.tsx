import React from 'react';
import { JobResponse } from '../types';
import AnalysisStepper from './common/AnalysisStepper';

interface JobProgressViewProps {
  job: JobResponse | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  onRetry: () => void;
  onCancel?: () => void;
}

export const JobProgressView: React.FC<JobProgressViewProps> = ({
  job,
  loading,
  error,
  errorCode,
  onRetry,
  onCancel,
}) => {
  if (!loading && !job && !error) return null;

  const currentStage = job?.stage || (loading ? 'Preparing analysis workspace…' : '');
  const errorMessage =
    error ||
    (job?.state === 'failed'
      ? `${errorCode ? `[${errorCode}] ` : ''}${job.error_message || 'Analysis failed.'}`
      : null);

  return (
    <div className="w-full my-6 sm:my-8">
      <AnalysisStepper
        currentStage={currentStage}
        progressPercentage={job?.progress_percentage}
        errorMessage={errorMessage}
        onCancel={onCancel}
        onRetry={onRetry}
      />
    </div>
  );
};

export default JobProgressView;

import React from 'react';
import { FetchStage, JobResponse, RepoFetchError } from '../types';
import AnalysisStepper from './common/AnalysisStepper';

interface JobProgressViewProps {
  job: JobResponse | null;
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  fetchError?: RepoFetchError | null;
  fetchStage?: FetchStage;
  onRetry: () => void;
  onEditUrl?: () => void;
  onCancel?: () => void;
}

export const JobProgressView: React.FC<JobProgressViewProps> = ({
  job,
  loading,
  error,
  errorCode,
  fetchError,
  fetchStage,
  onRetry,
  onEditUrl,
  onCancel,
}) => {
  if (!loading && !job && !error && !fetchError) return null;

  const currentStage = job?.stage || (loading ? 'Validating repository and preparing workspace…' : '');
  const errorMessage =
    error ||
    (job?.state === 'failed'
      ? `${errorCode ? `[${errorCode}] ` : ''}${job.error_message || 'Analysis failed.'}`
      : null);

  return (
    <div className="w-full my-6 sm:my-8">
      <AnalysisStepper
        currentStage={currentStage}
        fetchStage={fetchStage}
        progressPercentage={job?.progress_percentage}
        errorMessage={errorMessage}
        fetchError={fetchError}
        onCancel={onCancel}
        onRetry={onRetry}
        onEditUrl={onEditUrl}
      />
    </div>
  );
};

export default JobProgressView;

import { useCallback, useEffect, useRef, useState } from 'react';
import { JobResponse, ProjectFileResponse, ProjectMetadataResponse } from '../types';

export interface UseJobPollerReturn {
  job: JobResponse | null;
  project: ProjectMetadataResponse | null;
  files: ProjectFileResponse[];
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  submitZip: (file: File) => Promise<void>;
  submitGithub: (url: string) => Promise<void>;
  loadDemo: () => Promise<void>;
  reset: () => void;
}

export const useJobPoller = (): UseJobPollerReturn => {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [project, setProject] = useState<ProjectMetadataResponse | null>(null);
  const [files, setFiles] = useState<ProjectFileResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const activeJobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchProjectData = useCallback(async (projectId: string) => {
    try {
      const [resMeta, resFiles] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/files`),
      ]);

      if (!resMeta.ok) throw new Error('Failed to load project metadata.');
      if (!resFiles.ok) throw new Error('Failed to load project file inventory.');

      const metaData: ProjectMetadataResponse = await resMeta.json();
      const filesData = await resFiles.json();

      setProject(metaData);
      setFiles(filesData.files || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch project details.');
    }
  }, []);

  const pollJobStatus = useCallback(
    async (jobId: string, delayMs: number = 1000) => {
      if (activeJobIdRef.current !== jobId) return;

      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error(`Status check failed: HTTP ${res.status}`);
        }

        const data: JobResponse = await res.json();
        setJob(data);

        if (data.state === 'completed') {
          setLoading(false);
          if (data.project_id) {
            await fetchProjectData(data.project_id);
          }
          return;
        }

        if (data.state === 'failed') {
          setLoading(false);
          setErrorCode(data.error_code || 'JOB_FAILED');
          setError(data.error_message || 'Job execution failed.');
          return;
        }

        // Bounded exponential backoff up to 4000ms max
        const nextDelay = Math.min(delayMs * 1.3, 4000);
        pollTimerRef.current = setTimeout(() => pollJobStatus(jobId, nextDelay), nextDelay);
      } catch (err: any) {
        setLoading(false);
        setError(err.message || 'Error polling job status.');
      }
    },
    [fetchProjectData]
  );

  const submitZip = async (file: File) => {
    clearPolling();
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setProject(null);
    setFiles([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/jobs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.detail?.message || data.detail || 'Upload failed.';
        const code = data.detail?.code || 'UPLOAD_FAILED';
        setErrorCode(code);
        setError(msg);
        setLoading(false);
        return;
      }

      setJob(data);
      activeJobIdRef.current = data.job_id;
      pollJobStatus(data.job_id, 1000);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Network error submitting ZIP file.');
    }
  };

  const submitGithub = async (url: string) => {
    clearPolling();
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setProject(null);
    setFiles([]);

    try {
      const res = await fetch('/api/jobs/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository_url: url }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.detail?.message || data.detail || 'GitHub submission failed.';
        const code = data.detail?.code || 'GITHUB_FAILED';
        setErrorCode(code);
        setError(msg);
        setLoading(false);
        return;
      }

      setJob(data);
      activeJobIdRef.current = data.job_id;
      pollJobStatus(data.job_id, 1000);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Network error submitting GitHub repository.');
    }
  };

  const loadDemo = async () => {
    clearPolling();
    setLoading(true); setError(null); setErrorCode(null); setProject(null); setFiles([]);
    try {
      const response = await fetch('/api/demo/benchmarks/python_legacy', { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to load the bundled demo.');
      await fetchProjectData(data.project_id);
    } catch (err: any) {
      setErrorCode('DEMO_LOAD_FAILED');
      setError(err.message || 'Unable to load the bundled demo.');
    } finally { setLoading(false); }
  };

  const reset = () => {
    clearPolling();
    activeJobIdRef.current = null;
    setJob(null);
    setProject(null);
    setFiles([]);
    setLoading(false);
    setError(null);
    setErrorCode(null);
  };

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  return {
    job,
    project,
    files,
    loading,
    error,
    errorCode,
    submitZip,
    submitGithub,
    loadDemo,
    reset,
  };
};

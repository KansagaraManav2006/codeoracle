import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FetchStage,
  JobResponse,
  ProjectFileResponse,
  ProjectMetadataResponse,
  ProjectSummary,
  RepoFetchError,
  RepoFetchErrorCode,
} from '../types';
import { normalizeGithubUrl } from '../utils/github';

export interface UseJobPollerReturn {
  job: JobResponse | null;
  project: ProjectMetadataResponse | null;
  projectSummary: ProjectSummary | null;
  files: ProjectFileResponse[];
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  repoFetchError: RepoFetchError | null;
  lastGithubUrl: string | null;
  fetchStage: FetchStage;
  submitZip: (file: File) => Promise<void>;
  submitGithub: (url: string) => Promise<void>;
  loadDemo: (benchmarkName?: string) => Promise<void>;
  openProject: (projectId: string) => Promise<void>;
  retry: () => void;
  editUrl: () => void;
  reset: () => void;
}

export function toRepoFetchErrorCode(rawCode?: string | null): RepoFetchErrorCode {
  if (!rawCode) return 'UNKNOWN';
  const c = rawCode.toUpperCase();
  if (c.includes('INVALID') || c.includes('URL')) return 'INVALID_URL';
  if (c.includes('NOT_FOUND')) return 'REPO_NOT_FOUND';
  if (c.includes('PRIVATE') || c.includes('AUTH') || c.includes('FORBIDDEN')) return 'PRIVATE_REPO';
  if (c.includes('RATE')) return 'RATE_LIMITED';
  if (c.includes('SIZE') || c.includes('LARGE')) return 'REPO_TOO_LARGE';
  if (c.includes('TIMEOUT')) return 'TIMEOUT';
  if (c.includes('CLONE')) return 'CLONE_FAILED';
  return 'UNKNOWN';
}

export function deriveFetchStage(loading: boolean, job: JobResponse | null, error: string | null): FetchStage {
  if (error || job?.state === 'failed') return 'failed';
  if (job?.state === 'completed') return 'completed';
  if (!loading && !job) return 'idle';

  const stage = (job?.stage || '').toLowerCase();
  const jState = (job?.state || '').toLowerCase();

  if (stage.includes('clone') || stage.includes('fetch') || stage.includes('extract') || stage.includes('download')) {
    return 'fetching_repo';
  }
  if (stage.includes('discover') || stage.includes('read') || stage.includes('classif')) {
    return 'reading_files';
  }
  if (stage.includes('graph') || stage.includes('dependenc')) {
    return 'building_graph';
  }
  if (
    stage.includes('analyz') ||
    stage.includes('generat') ||
    stage.includes('score') ||
    stage.includes('finaliz') ||
    stage.includes('architect') ||
    jState === 'generating'
  ) {
    return 'generating_analysis';
  }
  if (loading && !job) {
    return 'validating_url';
  }
  return 'fetching_repo';
}

export async function loadProjectData(
  projectId: string,
  fetchFn: typeof fetch = fetch
): Promise<{
  project: ProjectMetadataResponse;
  files: ProjectFileResponse[];
  summary: ProjectSummary | null;
}> {
  const [resMeta, resFiles, resSummary] = await Promise.all([
    fetchFn(`/api/projects/${projectId}`),
    fetchFn(`/api/projects/${projectId}/files`),
    fetchFn(`/api/projects/${projectId}/summary`),
  ]);

  if (!resMeta.ok) {
    throw new Error(`Failed to load project metadata (HTTP ${resMeta.status}).`);
  }
  if (!resFiles.ok) {
    throw new Error(`Failed to load project file inventory (HTTP ${resFiles.status}).`);
  }

  const metaData: ProjectMetadataResponse = await resMeta.json();
  const filesData = await resFiles.json();

  let summaryData: ProjectSummary | null = null;
  if (resSummary.ok) {
    try {
      summaryData = await resSummary.json();
    } catch {
      summaryData = null;
    }
  }

  return {
    project: metaData,
    files: filesData.files || [],
    summary: summaryData,
  };
}

export const useJobPoller = (): UseJobPollerReturn => {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [project, setProject] = useState<ProjectMetadataResponse | null>(null);
  const [projectSummary, setProjectSummary] = useState<ProjectSummary | null>(null);
  const [files, setFiles] = useState<ProjectFileResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [repoFetchError, setRepoFetchError] = useState<RepoFetchError | null>(null);
  const [lastGithubUrl, setLastGithubUrl] = useState<string | null>(null);

  const activeJobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchProjectData = useCallback(async (projectId: string) => {
    const data = await loadProjectData(projectId, fetch);
    // State updates happen only after all required metadata and files loads succeed
    setProject(data.project);
    setFiles(data.files);
    setProjectSummary(data.summary);
    return data;
  }, []);

  const pollAttemptsRef = useRef<number>(0);

  const pollJobStatus = useCallback(
    async (jobId: string, delayMs: number = 1000) => {
      if (activeJobIdRef.current !== jobId) return;

      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > 180) {
        // Polling timeout protection (approx 4-5 minutes)
        clearPolling();
        activeJobIdRef.current = null;
        setLoading(false);
        const timeoutMsg = 'Analysis timed out waiting for server completion. Please verify your repository or retry.';
        setError(timeoutMsg);
        setRepoFetchError({
          code: 'TIMEOUT',
          message: timeoutMsg,
          stage: 'generating_analysis',
        });
        return;
      }

      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) {
          throw new Error(`Status check failed: HTTP ${res.status}`);
        }

        const data: JobResponse = await res.json();
        if (activeJobIdRef.current !== jobId) return;

        setJob(data);

        // A job is only complete when backend returns state === 'completed', NOT solely progress_percentage === 100
        if (data.state === 'completed') {
          clearPolling();
          if (data.project_id) {
            try {
              await fetchProjectData(data.project_id);
              // Modal closes ONLY after both backend job completes and project results load successfully
              if (activeJobIdRef.current === jobId) {
                activeJobIdRef.current = null;
                setJob(null);
                setLoading(false);
                setRepoFetchError(null);
                setError(null);
              }
              return;
            } catch (fetchErr: any) {
              if (activeJobIdRef.current === jobId) {
                // Stop polling, keep the user in a clear recoverable error state, and do not show stale/incomplete results
                clearPolling();
                activeJobIdRef.current = null;
                setLoading(false);
                setProject(null);
                setProjectSummary(null);
                setFiles([]);
                const errMsg = fetchErr.message || 'Analysis completed, but failed to load project results.';
                setError(errMsg);
                setRepoFetchError({
                  code: 'UNKNOWN',
                  message: errMsg,
                  stage: 'generating_analysis',
                });
              }
              return;
            }
          } else {
            clearPolling();
            activeJobIdRef.current = null;
            setLoading(false);
            setProject(null);
            setProjectSummary(null);
            setFiles([]);
            const errMsg = 'Analysis completed, but no project ID was returned by the server.';
            setError(errMsg);
            setRepoFetchError({
              code: 'UNKNOWN',
              message: errMsg,
              stage: 'generating_analysis',
            });
            return;
          }
        }

        if (data.state === 'failed') {
          clearPolling();
          activeJobIdRef.current = null;
          setLoading(false);
          const rawCode = data.error_code || 'JOB_FAILED';
          const msg = data.error_message || 'Job execution failed.';
          const mappedCode = toRepoFetchErrorCode(rawCode);

          setErrorCode(rawCode);
          setError(msg);
          setRepoFetchError({
            code: mappedCode,
            message: msg,
            technicalMessage: data.technical_message || data.message || undefined,
            httpStatus: data.http_status || undefined,
            stage: data.stage || 'fetching_repo',
          });
          return;
        }

        // Bounded exponential backoff up to 3000ms max
        const nextDelay = Math.min(delayMs * 1.25, 3000);
        pollTimerRef.current = setTimeout(() => pollJobStatus(jobId, nextDelay), nextDelay);
      } catch (err: any) {
        if (activeJobIdRef.current !== jobId) return;
        clearPolling();
        activeJobIdRef.current = null;
        setLoading(false);
        const mappedCode = toRepoFetchErrorCode('CLONE_FAILED');
        const errMsg = err.message || 'Error polling job status.';
        setError(errMsg);
        setRepoFetchError({
          code: mappedCode,
          message: errMsg,
          stage: 'fetching_repo',
        });
      }
    },
    [clearPolling, fetchProjectData]
  );

  const submitZip = async (file: File) => {
    if (loading && activeJobIdRef.current) {
      return; // Prevent duplicate concurrent submission
    }
    clearPolling();
    pollAttemptsRef.current = 0;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setRepoFetchError(null);
    setProject(null);
    setProjectSummary(null);
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
        const code = data.detail?.code || (res.status === 401 ? 'AUTHENTICATION_REQUIRED' : 'UPLOAD_FAILED');
        setErrorCode(code);
        setError(msg);
        setRepoFetchError({
          code: toRepoFetchErrorCode(code),
          message: msg,
          stage: 'reading_files',
        });
        setLoading(false);
        return;
      }

      setJob(data);
      activeJobIdRef.current = data.job_id;
      pollJobStatus(data.job_id, 1000);
    } catch (err: any) {
      setLoading(false);
      setError(err.message || 'Network error submitting ZIP file.');
      setRepoFetchError({
        code: 'UNKNOWN',
        message: err.message || 'Network error submitting ZIP file.',
        stage: 'reading_files',
      });
    }
  };

  const submitGithub = async (url: string) => {
    if (loading && activeJobIdRef.current) {
      return; // Prevent duplicate concurrent submission
    }
    clearPolling();
    pollAttemptsRef.current = 0;
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setRepoFetchError(null);
    setProject(null);
    setProjectSummary(null);
    setFiles([]);

    const canonicalUrl = normalizeGithubUrl(url);
    setLastGithubUrl(canonicalUrl || url.trim());

    try {
      const res = await fetch('/api/jobs/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository_url: canonicalUrl || url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data.detail?.message || data.detail || 'GitHub submission failed.';
        const rawCode = data.detail?.code || (res.status === 401 ? 'AUTHENTICATION_REQUIRED' : 'INVALID_URL');
        const mappedCode = toRepoFetchErrorCode(rawCode);

        setErrorCode(rawCode);
        setError(msg);
        setRepoFetchError({
          code: mappedCode,
          message: msg,
          httpStatus: res.status,
          stage: data.detail?.stage || 'validating_url',
        });
        setLoading(false);
        return;
      }

      setJob(data);
      activeJobIdRef.current = data.job_id;
      pollJobStatus(data.job_id, 1000);
    } catch (err: any) {
      setLoading(false);
      const msg = err.message || 'Network error submitting GitHub repository.';
      setError(msg);
      setRepoFetchError({
        code: 'CLONE_FAILED',
        message: msg,
        stage: 'fetching_repo',
      });
    }
  };

  const loadDemo = async (benchmarkName: string = 'python_legacy') => {
    clearPolling();
    setLoading(true);
    setError(null);
    setErrorCode(null);
    setRepoFetchError(null);
    setProject(null);
    setProjectSummary(null);
    setFiles([]);
    try {
      const response = await fetch(`/api/demo/benchmarks/${benchmarkName}`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to load the bundled demo.');
      await fetchProjectData(data.project_id);
    } catch (err: any) {
      setErrorCode('DEMO_LOAD_FAILED');
      setError(err.message || 'Unable to load the bundled demo.');
      setRepoFetchError({
        code: 'UNKNOWN',
        message: err.message || 'Unable to load the bundled demo.',
        stage: 'reading_files',
      });
    } finally {
      setLoading(false);
    }
  };

  const openProject = useCallback(
    async (projectId: string) => {
      clearPolling();
      setLoading(true);
      setError(null);
      setErrorCode(null);
      setRepoFetchError(null);
      setProject(null);
      setProjectSummary(null);
      setFiles([]);
      try {
        await fetchProjectData(projectId);
      } catch (err: any) {
        setErrorCode('PROJECT_LOAD_FAILED');
        setError(err.message || 'Unable to load saved project.');
        setRepoFetchError({
          code: 'UNKNOWN',
          message: err.message || 'Unable to load saved project.',
          stage: 'reading_files',
        });
      } finally {
        setLoading(false);
      }
    },
    [clearPolling, fetchProjectData]
  );

  const retry = useCallback(() => {
    if (lastGithubUrl) {
      submitGithub(lastGithubUrl);
    } else {
      reset();
    }
  }, [lastGithubUrl]);

  const editUrl = useCallback(() => {
    // Clear error and progress to return to the input screen with prefilled URL
    clearPolling();
    activeJobIdRef.current = null;
    setJob(null);
    setLoading(false);
    setError(null);
    setErrorCode(null);
    setRepoFetchError(null);
  }, [clearPolling]);

  const reset = useCallback(() => {
    clearPolling();
    activeJobIdRef.current = null;
    setJob(null);
    setProject(null);
    setProjectSummary(null);
    setFiles([]);
    setLoading(false);
    setError(null);
    setErrorCode(null);
    setRepoFetchError(null);
  }, [clearPolling]);

  useEffect(() => {
    return () => {
      clearPolling();
    };
  }, [clearPolling]);

  const fetchStage = deriveFetchStage(loading, job, error);

  return {
    job,
    project,
    projectSummary,
    files,
    loading,
    error,
    errorCode,
    repoFetchError,
    lastGithubUrl,
    fetchStage,
    submitZip,
    submitGithub,
    loadDemo,
    openProject,
    retry,
    editUrl,
    reset,
  };
};

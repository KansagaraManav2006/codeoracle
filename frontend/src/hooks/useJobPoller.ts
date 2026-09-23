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

function toRepoFetchErrorCode(rawCode?: string | null): RepoFetchErrorCode {
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

function deriveFetchStage(loading: boolean, job: JobResponse | null, error: string | null): FetchStage {
  if (error || job?.state === 'failed') return 'failed';
  if (job?.state === 'completed') return 'completed';
  if (!loading && !job) return 'idle';

  const stage = (job?.stage || '').toLowerCase();
  if (stage.includes('clone') || stage.includes('fetch') || stage.includes('extract') || stage.includes('download')) {
    return 'fetching_repo';
  }
  if (stage.includes('discover') || stage.includes('read') || stage.includes('classif')) {
    return 'reading_files';
  }
  if (stage.includes('graph') || stage.includes('dependenc')) {
    return 'building_graph';
  }
  if (stage.includes('analyz') || stage.includes('generat') || stage.includes('score')) {
    return 'generating_analysis';
  }
  if (loading && !job) {
    return 'validating_url';
  }
  return 'fetching_repo';
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
    try {
      const [resMeta, resFiles, resSummary] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/files`),
        fetch(`/api/projects/${projectId}/summary`),
      ]);

      if (!resMeta.ok) throw new Error('Failed to load project metadata.');
      if (!resFiles.ok) throw new Error('Failed to load project file inventory.');

      const metaData: ProjectMetadataResponse = await resMeta.json();
      const filesData = await resFiles.json();

      let summaryData: ProjectSummary | null = null;
      if (resSummary.ok) {
        summaryData = await resSummary.json();
      }

      setProject(metaData);
      setFiles(filesData.files || []);
      setProjectSummary(summaryData);
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
          setRepoFetchError(null);
          if (data.project_id) {
            await fetchProjectData(data.project_id);
          }
          return;
        }

        if (data.state === 'failed') {
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
        setLoading(false);
        const mappedCode = toRepoFetchErrorCode('CLONE_FAILED');
        setError(err.message || 'Error polling job status.');
        setRepoFetchError({
          code: mappedCode,
          message: err.message || 'Error polling job status.',
          stage: 'fetching_repo',
        });
      }
    },
    [fetchProjectData]
  );

  const submitZip = async (file: File) => {
    clearPolling();
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
        const code = data.detail?.code || 'UPLOAD_FAILED';
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
    clearPolling();
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
        const rawCode = data.detail?.code || 'INVALID_URL';
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

  const reset = () => {
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
  };

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

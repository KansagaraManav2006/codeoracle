import { useCallback, useEffect, useRef, useState } from 'react';
import { JobResponse, ProjectFileResponse, ProjectMetadataResponse, RecentProjectSummary } from '../types';

const RECENT_PROJECTS_KEY = 'codeoracle.recent-projects.v1';

type ProjectLoadError = Error & { status?: number };

const readRecentProjects = (): RecentProjectSummary[] => {
  try { return JSON.parse(localStorage.getItem(RECENT_PROJECTS_KEY) || '[]').slice(0, 5); }
  catch { return []; }
};

export interface UseJobPollerReturn {
  job: JobResponse | null;
  project: ProjectMetadataResponse | null;
  files: ProjectFileResponse[];
  loading: boolean;
  error: string | null;
  errorCode: string | null;
  recentProjects: RecentProjectSummary[];
  submitZip: (file: File) => Promise<void>;
  submitGithub: (url: string) => Promise<void>;
  loadDemo: () => Promise<void>;
  openRecentProject: (projectId: string) => Promise<void>;
  removeRecentProject: (projectId: string) => void;
  reset: () => void;
}

export const useJobPoller = (): UseJobPollerReturn => {
  const [job, setJob] = useState<JobResponse | null>(null);
  const [project, setProject] = useState<ProjectMetadataResponse | null>(null);
  const [files, setFiles] = useState<ProjectFileResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [recentProjects, setRecentProjects] = useState<RecentProjectSummary[]>(readRecentProjects);

  const activeJobIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchProjectData = useCallback(async (projectId: string, fromRecent: boolean = false) => {
    try {
      const [resMeta, resFiles] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/files`),
      ]);

      if (!resMeta.ok) {
        const loadError: ProjectLoadError = new Error('Failed to load project metadata.');
        loadError.status = resMeta.status;
        throw loadError;
      }
      if (!resFiles.ok) {
        const loadError: ProjectLoadError = new Error('Failed to load project file inventory.');
        loadError.status = resFiles.status;
        throw loadError;
      }

      const metaData: ProjectMetadataResponse = await resMeta.json();
      const filesData = await resFiles.json();

      setProject(metaData);
      setFiles(filesData.files || []);
      let readinessScore: number | undefined;
      try {
        const planResponse = await fetch(`/api/projects/${projectId}/migration-plan`);
        if (planResponse.ok) readinessScore = (await planResponse.json()).readiness_score;
      } catch { /* Readiness is optional in recent-project history. */ }
      setRecentProjects((current) => {
        const entry: RecentProjectSummary = {
          project_id: metaData.project_id,
          display_name: metaData.display_name,
          source_type: metaData.source_type,
          detected_languages: metaData.detected_languages,
          total_files: metaData.total_files,
          total_lines: metaData.total_lines,
          created_at: metaData.created_at,
          readiness_score: readinessScore,
        };
        const next = [entry, ...current.filter((item) => item.project_id !== entry.project_id)].slice(0, 5);
        localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      if (fromRecent && err.status === 404) {
        setRecentProjects((current) => {
          const next = current.filter((item) => item.project_id !== projectId);
          localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(next));
          return next;
        });
        setErrorCode('RECENT_PROJECT_UNAVAILABLE');
        setError('This saved analysis is no longer available. Please analyze the repository again.');
        return;
      }

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
      const response = await fetch('/api/demo/benchmarks/legacy_retail', { method: 'POST' });
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

  const openRecentProject = async (projectId: string) => {
    setLoading(true); setError(null); setErrorCode(null);
    try { await fetchProjectData(projectId, true); }
    finally { setLoading(false); }
  };

  const removeRecentProject = (projectId: string) => {
    setRecentProjects((current) => {
      const next = current.filter((item) => item.project_id !== projectId);
      localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(next));
      return next;
    });
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
    recentProjects,
    submitZip,
    submitGithub,
    loadDemo,
    openRecentProject,
    removeRecentProject,
    reset,
  };
};

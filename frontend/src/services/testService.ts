import { fetchJson } from './apiClient';
import { JobResponse, ProjectTestResult } from '../types';

export const testService = {
  generateTests: (
    projectId: string,
    execute = false,
    force = false
  ): Promise<JobResponse> =>
    fetchJson<JobResponse>(`/api/projects/${projectId}/tests/generate`, {
      method: 'POST',
      body: JSON.stringify({ execute, force }),
    }),

  getProjectTests: (projectId: string): Promise<ProjectTestResult> =>
    fetchJson<ProjectTestResult>(`/api/projects/${projectId}/tests?t=${Date.now()}`),

  getTestDownloadUrl: (
    projectId: string,
    scope = 'all',
    testId?: string,
    targetPath?: string
  ): string => {
    const params = new URLSearchParams({ scope });
    if (testId) params.set('test_id', testId);
    if (targetPath) params.set('target_path', targetPath);
    return `/api/projects/${projectId}/tests/download?${params.toString()}`;
  },
};

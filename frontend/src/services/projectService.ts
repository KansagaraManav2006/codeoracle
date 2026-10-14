import { fetchJson } from './apiClient';
import {
  ProjectMetadataResponse,
  ProjectFileResponse,
  ProjectSummary,
} from '../types';

export interface RecentProjectsResponse {
  total: number;
  projects: ProjectMetadataResponse[];
}

export interface ProjectFilesResponse {
  total_files: number;
  files: ProjectFileResponse[];
}

export const projectService = {
  getRecentProjects: (limit = 12): Promise<RecentProjectsResponse> =>
    fetchJson<RecentProjectsResponse>(`/api/projects?limit=${limit}`),

  getDemoProjects: (): Promise<RecentProjectsResponse> =>
    fetchJson<RecentProjectsResponse>('/api/demo/projects'),

  getProjectMetadata: (projectId: string): Promise<ProjectMetadataResponse> =>
    fetchJson<ProjectMetadataResponse>(`/api/projects/${projectId}`),

  getProjectFiles: (projectId: string): Promise<ProjectFilesResponse> =>
    fetchJson<ProjectFilesResponse>(`/api/projects/${projectId}/files`),

  getProjectSummary: (projectId: string): Promise<ProjectSummary> =>
    fetchJson<ProjectSummary>(`/api/projects/${projectId}/summary`),

  deleteProject: (projectId: string): Promise<{ success: boolean }> =>
    fetchJson<{ success: boolean }>(`/api/projects/${projectId}`, { method: 'DELETE' }),

  loadDemoBenchmark: (benchmarkName = 'full'): Promise<ProjectMetadataResponse> =>
    fetchJson<ProjectMetadataResponse>(`/api/demo/benchmarks/${benchmarkName}`, { method: 'POST' }),
};

import { fetchJson } from './apiClient';
import {
  JobResponse,
  ProjectAnalysis,
  ProjectExplanation,
  ArchitectureOverview,
  GraphResponse,
  HotspotsResponse,
  SystemPulseResponse,
  ChangeImpact,
} from '../types';

export const analysisService = {
  triggerAnalysis: (projectId: string, force = false): Promise<JobResponse> =>
    fetchJson<JobResponse>(`/api/projects/${projectId}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  getAnalysis: (projectId: string): Promise<ProjectAnalysis> =>
    fetchJson<ProjectAnalysis>(`/api/projects/${projectId}/analysis`),

  getExplanation: (projectId: string): Promise<ProjectExplanation> =>
    fetchJson<ProjectExplanation>(`/api/projects/${projectId}/explanation`),

  getArchitecture: (projectId: string): Promise<ArchitectureOverview> =>
    fetchJson<ArchitectureOverview>(`/api/projects/${projectId}/architecture`),

  getDependencyGraph: (
    projectId: string,
    level = 'module',
    moduleId?: string,
    edgeTypes?: string,
    includeExternal = false
  ): Promise<GraphResponse> => {
    const params = new URLSearchParams({ level });
    if (moduleId) params.set('module_id', moduleId);
    if (edgeTypes) params.set('edge_types', edgeTypes);
    if (includeExternal) params.set('include_external', 'true');
    return fetchJson<GraphResponse>(`/api/projects/${projectId}/graph?${params.toString()}`);
  },

  getHotspots: (projectId: string): Promise<HotspotsResponse> =>
    fetchJson<HotspotsResponse>(`/api/projects/${projectId}/hotspots`),

  getImpact: (projectId: string, target: string): Promise<ChangeImpact> =>
    fetchJson<ChangeImpact>(`/api/projects/${projectId}/impact?target=${encodeURIComponent(target)}`),

  getSystemPulse: (projectId: string): Promise<SystemPulseResponse> =>
    fetchJson<SystemPulseResponse>(`/api/projects/${projectId}/system-pulse`),

  getAnalysisDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/analysis/download`,

  getGraphDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/graph/download`,
};

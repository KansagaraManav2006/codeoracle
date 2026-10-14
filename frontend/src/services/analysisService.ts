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
  triggerAnalysis: (projectId: string, force = false, options?: RequestInit): Promise<JobResponse> =>
    fetchJson<JobResponse>(`/api/projects/${projectId}/analyze`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  getAnalysis: (projectId: string, options?: RequestInit): Promise<ProjectAnalysis> =>
    fetchJson<ProjectAnalysis>(`/api/projects/${projectId}/analysis`, options),

  getExplanation: (projectId: string, options?: RequestInit): Promise<ProjectExplanation> =>
    fetchJson<ProjectExplanation>(`/api/projects/${projectId}/explanation`, options),

  getArchitecture: (projectId: string, options?: RequestInit): Promise<ArchitectureOverview> =>
    fetchJson<ArchitectureOverview>(`/api/projects/${projectId}/architecture`, options),

  getDependencyGraph: (
    projectId: string,
    level = 'module',
    moduleId?: string,
    edgeTypes?: string,
    includeExternal = false,
    options?: RequestInit
  ): Promise<GraphResponse> => {
    const params = new URLSearchParams({ level });
    if (moduleId) params.set('module_id', moduleId);
    if (edgeTypes) params.set('edge_types', edgeTypes);
    if (includeExternal) params.set('include_external', 'true');
    return fetchJson<GraphResponse>(`/api/projects/${projectId}/graph?${params.toString()}`, options);
  },

  getHotspots: (projectId: string, options?: RequestInit): Promise<HotspotsResponse> =>
    fetchJson<HotspotsResponse>(`/api/projects/${projectId}/hotspots`, options),

  getImpact: (projectId: string, target: string, options?: RequestInit): Promise<ChangeImpact> =>
    fetchJson<ChangeImpact>(`/api/projects/${projectId}/impact?target=${encodeURIComponent(target)}`, options),

  getSystemPulse: (projectId: string, options?: RequestInit): Promise<SystemPulseResponse> =>
    fetchJson<SystemPulseResponse>(`/api/projects/${projectId}/system-pulse`, options),

  getAnalysisDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/analysis/download`,

  getGraphDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/graph/download`,
};

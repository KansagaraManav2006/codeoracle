import { fetchJson } from './apiClient';
import { ChangeImpact, MigrationPlanResponse } from '../types';

export const migrationService = {
  getMigrationPlan: (projectId: string): Promise<MigrationPlanResponse> =>
    fetchJson<MigrationPlanResponse>(`/api/projects/${projectId}/migration-plan?t=${Date.now()}`),

  getChangeImpact: (projectId: string, target: string): Promise<ChangeImpact> =>
    fetchJson<ChangeImpact>(`/api/projects/${projectId}/impact?target=${encodeURIComponent(target)}`),

  getMarkdownDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/migration-plan/download`,

  getJsonDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/migration-plan/download-json`,
};

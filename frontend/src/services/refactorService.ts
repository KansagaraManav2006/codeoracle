import { fetchJson } from './apiClient';
import {
  ProjectRefactorResult,
  RefactorVerificationResult,
} from '../types';

export const refactorService = {
  generateRefactor: (
    projectId: string,
    force = false,
    options?: RequestInit
  ): Promise<ProjectRefactorResult> =>
    fetchJson<ProjectRefactorResult>(`/api/projects/${projectId}/refactor`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  getProjectRefactor: (projectId: string, options?: RequestInit): Promise<ProjectRefactorResult> =>
    fetchJson<ProjectRefactorResult>(`/api/projects/${projectId}/refactor`, options),

  verifyRefactor: (
    projectId: string,
    force = false,
    options?: RequestInit
  ): Promise<RefactorVerificationResult> =>
    fetchJson<RefactorVerificationResult>(`/api/projects/${projectId}/refactor/verify`, {
      ...options,
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  getRefactorVerification: (
    projectId: string,
    options?: RequestInit
  ): Promise<RefactorVerificationResult> =>
    fetchJson<RefactorVerificationResult>(`/api/projects/${projectId}/refactor/verify`, options),

  getRefactorDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/refactor/download`,
};

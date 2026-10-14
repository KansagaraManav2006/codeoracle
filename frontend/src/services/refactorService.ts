import { fetchJson } from './apiClient';
import {
  ProjectRefactorResult,
  RefactorVerificationResult,
} from '../types';

export const refactorService = {
  generateRefactor: (
    projectId: string,
    force = false
  ): Promise<ProjectRefactorResult> =>
    fetchJson<ProjectRefactorResult>(`/api/projects/${projectId}/refactor`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  getProjectRefactor: (projectId: string): Promise<ProjectRefactorResult> =>
    fetchJson<ProjectRefactorResult>(`/api/projects/${projectId}/refactor`),

  verifyRefactor: (
    projectId: string,
    force = false
  ): Promise<RefactorVerificationResult> =>
    fetchJson<RefactorVerificationResult>(`/api/projects/${projectId}/refactor/verify`, {
      method: 'POST',
      body: JSON.stringify({ force }),
    }),

  getRefactorVerification: (
    projectId: string
  ): Promise<RefactorVerificationResult> =>
    fetchJson<RefactorVerificationResult>(`/api/projects/${projectId}/refactor/verify`),

  getRefactorDownloadUrl: (projectId: string): string =>
    `/api/projects/${projectId}/refactor/download`,
};

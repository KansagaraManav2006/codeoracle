import { useState, useEffect, useCallback, useRef } from 'react';
import { isAbortError } from '../services/apiClient';

export interface UseProjectQueryOptions<T> {
  projectId?: string | null;
  enabled?: boolean;
  queryFn: (signal: AbortSignal) => Promise<T>;
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface UseProjectQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

/**
 * useProjectQuery
 *
 * Provides an abortable, project-scoped data query hook with:
 * - Automatic AbortController lifecycle (aborts previous in-flight requests on project switch or unmount).
 * - Stale response protection (ignores resolution from a superseded project ID).
 * - Clean AbortError suppression.
 * - Project isolation (clears data immediately when switching projects).
 */
export function useProjectQuery<T>({
  projectId,
  enabled = true,
  queryFn,
  onSuccess,
  onError,
}: UseProjectQueryOptions<T>): UseProjectQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(enabled && projectId));
  const [error, setError] = useState<string | null>(null);

  // Track currently active project and in-flight controller to discard stale resolutions
  const activeProjectIdRef = useRef<string | null | undefined>(projectId);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // Sync ref
  activeProjectIdRef.current = projectId;

  const execute = useCallback(async () => {
    if (!enabled || !projectId) {
      setLoading(false);
      return;
    }

    // Abort previous in-flight request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const requestProjectId = projectId;

    setLoading(true);
    setError(null);

    try {
      const result = await queryFn(controller.signal);

      // Discard if component unmounted or project has changed since request started
      if (!isMountedRef.current || activeProjectIdRef.current !== requestProjectId) {
        return;
      }

      setData(result);
      onSuccess?.(result);
    } catch (err: unknown) {
      if (isAbortError(err)) {
        return;
      }
      if (!isMountedRef.current || activeProjectIdRef.current !== requestProjectId) {
        return;
      }

      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      onError?.(err instanceof Error ? err : new Error(message));
    } finally {
      if (isMountedRef.current && activeProjectIdRef.current === requestProjectId) {
        setLoading(false);
      }
    }
  }, [enabled, projectId, queryFn, onSuccess, onError]);

  // Execute on mount / projectId / dependency change
  useEffect(() => {
    isMountedRef.current = true;
    // Reset data when switching to a different project
    setData(null);
    execute();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [projectId, execute]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch: execute,
    setData,
  };
}

export default useProjectQuery;

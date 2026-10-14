import { useState, useEffect } from 'react';
import { HealthResponse } from '../types';

export type ServiceStatus = 'ready' | 'checking' | 'degraded' | 'offline';

export interface ServiceHealthState {
  status: ServiceStatus;
  statusMessage: string;
  data: HealthResponse | null;
  loading: boolean;
  error: boolean;
}

type Listener = (state: ServiceHealthState) => void;

let currentState: ServiceHealthState = {
  status: 'checking',
  statusMessage: 'Checking service status...',
  data: null,
  loading: true,
  error: false,
};

const listeners = new Set<Listener>();
let timerId: ReturnType<typeof setInterval> | null = null;
let lastChangeTime = Date.now();
let pendingState: ServiceHealthState | null = null;
let activeController: AbortController | null = null;

function notifyListeners() {
  listeners.forEach((listener) => listener(currentState));
}

function updateState(newState: ServiceHealthState) {
  const now = Date.now();
  const elapsed = now - lastChangeTime;
  const MIN_DISPLAY_MS = 2000;

  if (elapsed < MIN_DISPLAY_MS) {
    pendingState = newState;
    setTimeout(() => {
      if (pendingState) {
        currentState = pendingState;
        lastChangeTime = Date.now();
        pendingState = null;
        notifyListeners();
      }
    }, MIN_DISPLAY_MS - elapsed);
  } else {
    currentState = newState;
    lastChangeTime = now;
    notifyListeners();
  }
}

async function fetchHealth() {
  if (activeController) {
    activeController.abort();
  }
  const controller = new AbortController();
  activeController = controller;

  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch('/api/health', { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status >= 500) {
        updateState({
          status: 'degraded',
          statusMessage: 'Service response degraded',
          data: null,
          loading: false,
          error: true,
        });
      } else {
        updateState({
          status: 'offline',
          statusMessage: 'Service offline',
          data: null,
          loading: false,
          error: true,
        });
      }
      return;
    }

    const data: HealthResponse = await res.json();
    if (data.status === 'healthy' || data.status === 'ready' || data.status === 'ok') {
      updateState({
        status: 'ready',
        statusMessage: 'Service ready',
        data,
        loading: false,
        error: false,
      });
    } else {
      updateState({
        status: 'degraded',
        statusMessage: 'Service degraded',
        data,
        loading: false,
        error: false,
      });
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return;
    }
    updateState({
      status: 'offline',
      statusMessage: 'Service offline — Backend unavailable',
      data: null,
      loading: false,
      error: true,
    });
  }
}

function startPolling() {
  if (timerId === null) {
    fetchHealth();
    timerId = setInterval(fetchHealth, 30000);
  }
}

function stopPollingIfNoListeners() {
  if (listeners.size === 0 && timerId !== null) {
    clearInterval(timerId);
    timerId = null;
    if (activeController) {
      activeController.abort();
      activeController = null;
    }
  }
}

/**
 * useServiceHealth
 *
 * Consolidated singleton hook for service health monitoring across the app.
 * Deduplicates /api/health requests so only ONE poll occurs every 30s regardless
 * of how many StatusPill or HealthIndicator components are mounted simultaneously.
 */
export function useServiceHealth() {
  const [state, setState] = useState<ServiceHealthState>(currentState);

  useEffect(() => {
    listeners.add(setState);
    startPolling();

    return () => {
      listeners.delete(setState);
      stopPollingIfNoListeners();
    };
  }, []);

  return {
    ...state,
    refetch: fetchHealth,
  };
}

export default useServiceHealth;

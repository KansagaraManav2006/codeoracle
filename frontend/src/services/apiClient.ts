/**
 * Core HTTP Client for CodeOracle Frontend.
 * Provides unified JSON fetching, typing, and standard error handling.
 */

export class ApiError extends Error {
  status: number;
  detail: any;

  constructor(message: string, status: number, detail?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (init?.body && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...init,
    headers,
  });

  if (!response.ok) {
    let detail: any = null;
    let message = `Request failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      detail = errJson.detail || errJson;
      if (typeof detail === 'string') {
        message = detail;
      } else if (detail && typeof detail.detail === 'string') {
        message = detail.detail;
      }
    } catch {
      // Body not JSON
    }
    throw new ApiError(message, response.status, detail);
  }

  return response.json() as Promise<T>;
}

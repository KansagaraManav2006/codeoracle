/**
 * CodeOracle Performance Timing & User Marks Utility
 * Provides lightweight instrumentation wrapper around the browser's User Timing API.
 */

export function markPerf(name: string): void {
  if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
    try {
      performance.mark(name);
    } catch {
      // Ignore in restricted environments
    }
  }
}

export function measurePerf(name: string, startMark: string, endMark?: string): void {
  if (typeof performance !== 'undefined' && typeof performance.measure === 'function') {
    try {
      performance.measure(name, startMark, endMark);
    } catch {
      // Ignore if startMark does not exist
    }
  }
}

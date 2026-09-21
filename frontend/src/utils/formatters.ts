/**
 * Formatter and presentation utilities for CodeOracle Pro Engine.
 * Adheres strictly to DESIGN.md §0.4, §1.5, §2.3, §11.3, and §15.
 */

/**
 * Truncates a file path in the middle so the critical filename and extension
 * remain visible. For example: "src/components/dashboard/DashboardPage.tsx" -> "src/…/DashboardPage.tsx".
 */
export function truncateMiddle(path: string, maxLength: number = 36): string {
  if (!path) return '';
  const normalized = path.replace(/\\/g, '/');
  if (normalized.length <= maxLength) return normalized;

  const parts = normalized.split('/');
  const filename = parts.pop() || '';
  if (filename.length >= maxLength - 4) {
    // Filename itself is very long
    const extIndex = filename.lastIndexOf('.');
    if (extIndex > 3) {
      const ext = filename.slice(extIndex);
      const base = filename.slice(0, extIndex);
      const keep = maxLength - ext.length - 3;
      return `${base.slice(0, Math.max(1, Math.floor(keep / 2)))}…${base.slice(-Math.max(1, Math.ceil(keep / 2)))}${ext}`;
    }
    return `${filename.slice(0, maxLength - 3)}…`;
  }

  const prefix = parts.join('/');
  const availableForPrefix = maxLength - filename.length - 3; // "…/" takes 2-3 chars
  if (availableForPrefix <= 3) {
    return `…/${filename}`;
  }

  // Keep start of prefix + "…/" + filename
  const firstPart = parts[0] || '';
  if (firstPart.length + 3 + filename.length <= maxLength) {
    return `${firstPart}/…/${filename}`;
  }

  return `${prefix.slice(0, availableForPrefix)}…/${filename}`;
}

const numberFormatter = new Intl.NumberFormat('en-US');

/**
 * Formats numbers using standard thousands separators (e.g. 23,131).
 */
export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return '0';
  return numberFormatter.format(val);
}

/**
 * Formats file sizes in bytes to human-readable units with tabular spacing.
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Constructs download filenames according to DESIGN.md §11.3:
 * codeoracle-{repo}-{tab}-{YYYY-MM-DD}.{ext}
 */
export function getDownloadFileName(repoName: string, tabName: string, extension: string): string {
  const sanitizedRepo = (repoName || 'project')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  const dateStr = new Date().toISOString().split('T')[0];
  const cleanExt = extension.replace(/^\./, '');
  return `codeoracle-${sanitizedRepo}-${tabName.toLowerCase()}-${dateStr}.${cleanExt}`;
}

export interface ScoreBandInfo {
  label: 'Strong' | 'Ready with care' | 'High risk';
  color: 'teal' | 'amber' | 'red';
  barFill: string;
  textColor: string;
  strokeColor: string;
  surfaceClass: string;
  isRisk: boolean;
}

/**
 * Evaluates readiness score against DESIGN.md §1.5 bands:
 * - 80–100: Strong (Teal)
 * - 50–79:  Ready with care (Amber)
 * - 0–49:   High risk (Red)
 */
export function getScoreBand(score: number): ScoreBandInfo {
  if (score >= 80) {
    return {
      label: 'Strong',
      color: 'teal',
      barFill: 'var(--teal)',
      textColor: 'var(--teal-strong)',
      strokeColor: '#0D9488',
      surfaceClass: 'bg-surface border-line',
      isRisk: false,
    };
  }
  if (score >= 50) {
    return {
      label: 'Ready with care',
      color: 'amber',
      barFill: 'var(--amber-strong)',
      textColor: 'var(--amber-text)',
      strokeColor: '#D97706',
      surfaceClass: 'bg-surface border-line',
      isRisk: false,
    };
  }
  return {
    label: 'High risk',
    color: 'red',
    barFill: 'var(--red)',
    textColor: 'var(--red-text)',
    strokeColor: '#DC2626',
    surfaceClass: 'bg-red-wash border-red-line',
    isRisk: true,
  };
}

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface RiskLevelStyle {
  label: string;
  badgeClass: string;
  dotColor: string;
}

/**
 * Risk levels mapped to DESIGN.md §1.5:
 * LOW = teal pill
 * MEDIUM = amber pill
 * HIGH = red-surface pill
 * CRITICAL = solid --red-strong with white text
 */
export function getRiskLevelStyle(level: string): RiskLevelStyle {
  const normalized = (level || 'low').toLowerCase() as RiskLevel;
  switch (normalized) {
    case 'critical':
      return {
        label: 'CRITICAL',
        badgeClass: 'bg-red-strong text-white border-transparent font-bold',
        dotColor: 'var(--red-strong)',
      };
    case 'high':
      return {
        label: 'HIGH RISK',
        badgeClass: 'bg-red-surface text-red-text border-transparent font-bold',
        dotColor: 'var(--red)',
      };
    case 'medium':
      return {
        label: 'MEDIUM',
        badgeClass: 'bg-amber-surface text-amber-text border-transparent font-bold',
        dotColor: 'var(--amber)',
      };
    case 'low':
    default:
      return {
        label: 'LOW',
        badgeClass: 'bg-teal-surface text-teal-text border-transparent font-bold',
        dotColor: 'var(--teal)',
      };
  }
}

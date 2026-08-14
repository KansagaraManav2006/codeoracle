export const cleanText = (value?: string | null): string =>
  (value || '').replace(/`/g, '').replace(/\s+/g, ' ').trim();

export const titleCase = (value: string): string =>
  value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const sourceLabel = (sourceType: string): string => {
  const labels: Record<string, string> = {
    demo_benchmark: 'Built-in demo',
    github: 'GitHub repository',
    zip: 'ZIP upload',
  };
  return labels[sourceType] || titleCase(sourceType);
};

export const complexityLabel = (rating?: string, score?: number): string => {
  if (rating) return titleCase(rating);
  if ((score || 0) <= 5) return 'Low';
  if ((score || 0) <= 10) return 'Moderate';
  if ((score || 0) <= 20) return 'High';
  return 'Critical';
};

export const warningTitle = (code: string): string => {
  const labels: Record<string, string> = {
    VAR_USAGE: 'Replace var with const or let',
    COMMONJS_USAGE: 'Consider modern ES module imports',
    CALLBACK_HEAVY: 'Consider promises or async/await',
    LEGACY_PYTHON2_CONSTRUCT: 'Update Python 2 syntax',
    MUTABLE_DEFAULT_ARG: 'Avoid mutable default arguments',
    BARE_EXCEPT: 'Catch specific exceptions',
    HIGH_COMPLEXITY: 'Simplify complex logic',
    EVAL_USAGE: 'Remove unsafe dynamic evaluation',
  };
  return labels[code] || titleCase(code);
};

export const severityLabel = (severity: string): string => {
  if (severity === 'risk') return 'Important';
  if (severity === 'warning') return 'Review';
  return 'Note';
};

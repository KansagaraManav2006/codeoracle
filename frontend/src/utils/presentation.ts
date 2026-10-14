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

export interface WaveResidualRisk {
  riskLevel: 'high' | 'medium' | 'low';
  label: string;
  description: string;
}

export const getWaveResidualRisk = (
  waveNum: number,
  cycleCount: number = 0
): WaveResidualRisk => {
  switch (waveNum) {
    case 0:
      return {
        riskLevel: 'high',
        label: 'HIGH STRUCTURAL RISK',
        description:
          'Source code still contains legacy syntax, cyclomatic complexity, and coupling. Baseline tests now provide a regression harness for subsequent waves.',
      };
    case 1:
      return {
        riskLevel: 'high',
        label: 'MODERATE-TO-HIGH RISK',
        description:
          cycleCount > 0
            ? 'Standalone leaf utilities are modernized, but circular dependency loops and core business services remain unmodernized.'
            : 'Standalone leaf utilities are modernized, but intermediate domain services and root entry points remain to be modernized.',
      };
    case 2:
      if (cycleCount === 0) {
        return {
          riskLevel: 'low',
          label: 'ZERO CYCLE RESIDUAL RISK',
          description: 'No dependency cycles were detected in the resolved graph. This wave is not required.',
        };
      }
      return {
        riskLevel: 'medium',
        label: 'CONTROLLED RISK',
        description:
          'Circular dependency loops are broken, but complex domain services and entry points still require refactoring and contract verification.',
      };
    case 3:
      return {
        riskLevel: 'medium',
        label: 'MODERATE RISK',
        description:
          'Core domain logic is modernized; only root entry points and runtime orchestration remain to be verified.',
      };
    case 4:
      return {
        riskLevel: 'low',
        label: 'LOW RESIDUAL RISK',
        description:
          'All internal layers modernized. Final end-to-end smoke verification and post-deployment monitoring required.',
      };
    default:
      return {
        riskLevel: 'low',
        label: 'CONTROLLED RISK',
        description:
          'Follow automated test execution and verify behavioral equivalence in disposable sandbox before merging.',
      };
  }
};


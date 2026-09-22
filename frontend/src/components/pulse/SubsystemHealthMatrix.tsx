import React from 'react';
import { Table, Info } from 'lucide-react';
import { SubsystemHealth } from '../../types';
import Card from '../common/Card';
import Badge from '../common/Badge';

interface SubsystemHealthMatrixProps {
  subsystems: SubsystemHealth[];
}

export const SubsystemHealthMatrix: React.FC<SubsystemHealthMatrixProps> = ({ subsystems }) => {
  const getRating = (
    val: number,
    type: 'score' | 'risk_count' | 'unresolved_count' | 'parse_pct'
  ): { label: string; tone: 'green' | 'indigo' | 'amber' | 'red' } => {
    if (type === 'score' || type === 'parse_pct') {
      if (val >= 90) return { label: 'Strong', tone: 'green' };
      if (val >= 75) return { label: 'Healthy', tone: 'indigo' };
      if (val >= 50) return { label: 'Medium', tone: 'amber' };
      return { label: 'High Pressure', tone: 'red' };
    } else {
      if (val === 0) return { label: 'Strong', tone: 'green' };
      if (val <= 1) return { label: 'Healthy', tone: 'indigo' };
      if (val <= 3) return { label: 'Medium', tone: 'amber' };
      return { label: 'High Pressure', tone: 'red' };
    }
  };

  const getSubsystemLabel = (id: string) => {
    switch (id) {
      case 'frontend':
        return 'Frontend UI';
      case 'backend':
        return 'Backend & APIs';
      case 'ml':
        return 'ML & Pipelines';
      case 'database':
        return 'Persistence & DB';
      case 'infrastructure':
        return 'Infrastructure';
      default:
        return id;
    }
  };

  return (
    <Card variant="primary" padding="lg" className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-line">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-ink font-display tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-surface border border-indigo/20 flex items-center justify-center text-indigo">
              <Table className="w-4 h-4" />
            </div>
            <span>Subsystem Health Matrix</span>
          </h3>
          <p className="text-xs text-ink-3 mt-0.5 leading-relaxed">
            Cross-dimensional qualitative classification across all 5 architectural subsystems.
          </p>
        </div>

        {/* Compact Legend */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge tone="green" size="sm">Strong</Badge>
          <Badge tone="indigo" size="sm">Healthy</Badge>
          <Badge tone="amber" size="sm">Medium</Badge>
          <Badge tone="red" size="sm">High Pressure</Badge>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-line bg-tile/70 text-[10px] font-bold uppercase tracking-wider text-ink-3 font-sans">
              <th className="py-3 px-4">Subsystem</th>
              <th className="py-3 px-3 text-center">Parse Status</th>
              <th className="py-3 px-3 text-center">Risk Level</th>
              <th className="py-3 px-3 text-center">Dependencies</th>
              <th className="py-3 px-3 text-center">Test Protection</th>
              <th className="py-3 px-3 text-center">Modernization</th>
              <th className="py-3 px-4 text-center text-ink bg-tile border-l border-line font-extrabold">
                Overall Health
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line bg-surface">
            {subsystems.map((sub) => {
              const parseRating = getRating(sub.fullParseCoverage, 'parse_pct');
              const riskRating = getRating(sub.highRiskFiles, 'risk_count');
              const depRating = getRating(sub.unresolvedDependencies, 'unresolved_count');
              const protPct = sub.fileCount > 0 ? ((sub.fileCount - sub.unprotectedFiles) / sub.fileCount) * 100 : 100;
              const protRating = getRating(protPct, 'score');
              const modRating = getRating(sub.modernizationCandidates, 'unresolved_count');

              return (
                <tr key={sub.id} className="hover:bg-tile/40 transition-colors">
                  <td className="py-3 px-4 font-semibold text-ink">
                    <div className="flex items-center gap-2">
                      <span>{getSubsystemLabel(sub.id)}</span>
                      <span className="font-mono text-[10px] text-ink-4">({sub.fileCount}f)</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <Badge tone={parseRating.tone} size="sm">
                      {parseRating.label}
                    </Badge>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <Badge tone={riskRating.tone} size="sm">
                      {riskRating.label}
                    </Badge>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <Badge tone={depRating.tone} size="sm">
                      {depRating.label}
                    </Badge>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <Badge tone={protRating.tone} size="sm">
                      {protRating.label}
                    </Badge>
                  </td>

                  <td className="py-3 px-3 text-center">
                    <Badge tone={modRating.tone} size="sm">
                      {modRating.label}
                    </Badge>
                  </td>

                  <td className="py-3 px-4 text-center font-mono font-bold bg-tile/30 border-l border-line">
                    <span className={sub.healthScore >= 80 ? 'text-teal-strong' : sub.healthScore >= 60 ? 'text-indigo' : 'text-amber-strong'}>
                      {sub.healthScore}/100
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-ink-3">
        <Info className="w-3.5 h-3.5 text-indigo" />
        <span>Grounded in active AST parsing contracts, import dependency graph edges, and characterization test coverage.</span>
      </div>
    </Card>
  );
};

export default SubsystemHealthMatrix;

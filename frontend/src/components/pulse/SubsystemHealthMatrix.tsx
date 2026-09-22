import React, { useState } from 'react';
import { Table, Info } from 'lucide-react';
import { SubsystemHealth } from '../../types';

interface SubsystemHealthMatrixProps {
  subsystems: SubsystemHealth[];
}

export const SubsystemHealthMatrix: React.FC<SubsystemHealthMatrixProps> = ({ subsystems }) => {
  const [hoveredCell, setHoveredCell] = useState<{
    subsystemId: string;
    dimension: string;
    details: string;
  } | null>(null);

  // Helper categorical rating logic
  const getRating = (
    val: number,
    type: 'score' | 'risk_count' | 'unresolved_count' | 'parse_pct'
  ): { label: string; bg: string; text: string } => {
    if (type === 'score' || type === 'parse_pct') {
      if (val >= 90) return { label: 'Strong', bg: 'bg-teal-surface', text: 'text-teal-text' };
      if (val >= 75) return { label: 'Healthy', bg: 'bg-interactive-surface', text: 'text-interactive' };
      if (val >= 55) return { label: 'Medium', bg: 'bg-panel', text: 'text-ink-2' };
      if (val >= 40) return { label: 'Weak', bg: 'bg-amber-surface', text: 'text-amber-text' };
      return { label: 'High Pressure', bg: 'bg-red-surface', text: 'text-red-text' };
    } else {
      // For counts where 0 is best
      if (val === 0) return { label: 'Strong', bg: 'bg-teal-surface', text: 'text-teal-text' };
      if (val <= 1) return { label: 'Healthy', bg: 'bg-interactive-surface', text: 'text-interactive' };
      if (val <= 3) return { label: 'Medium', bg: 'bg-panel', text: 'text-ink-2' };
      if (val <= 5) return { label: 'Weak', bg: 'bg-amber-surface', text: 'text-amber-text' };
      return { label: 'High Pressure', bg: 'bg-red-surface', text: 'text-red-text' };
    }
  };

  return (
    <div className="bg-surface border border-line rounded-card shadow-1 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line pb-4">
        <div>
          <h3 className="text-base font-bold text-ink tracking-tight flex items-center gap-2">
            <Table className="w-4 h-4 text-interactive" />
            Subsystem Health Matrix
          </h3>
          <p className="text-xs text-ink-3 mt-0.5">
            Cross-dimensional qualitative classification across all 5 architectural subsystems. Hover reveals exact metrics.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono">
          <span className="px-1.5 py-0.5 rounded bg-teal-surface text-teal-text font-bold">Strong</span>
          <span className="px-1.5 py-0.5 rounded bg-interactive-surface text-interactive font-bold">Healthy</span>
          <span className="px-1.5 py-0.5 rounded bg-panel text-ink-2 font-bold">Medium</span>
          <span className="px-1.5 py-0.5 rounded bg-amber-surface text-amber-text font-bold">Weak</span>
          <span className="px-1.5 py-0.5 rounded bg-red-surface text-red-text font-bold">High Pressure</span>
        </div>
      </div>

      {/* Matrix Table */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-line bg-panel/40 text-[11px] font-mono uppercase text-ink-3">
              <th className="py-2.5 px-3 font-semibold">Subsystem</th>
              <th className="py-2.5 px-3 font-semibold text-center">Parse</th>
              <th className="py-2.5 px-3 font-semibold text-center">Risk</th>
              <th className="py-2.5 px-3 font-semibold text-center">Dependencies</th>
              <th className="py-2.5 px-3 font-semibold text-center">Protection</th>
              <th className="py-2.5 px-3 font-semibold text-center">Modernization</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/60">
            {subsystems.map((sub) => {
              const parseRating = getRating(sub.fullParseCoverage, 'parse_pct');
              const riskRating = getRating(sub.highRiskFiles, 'risk_count');
              const depRating = getRating(sub.unresolvedDependencies, 'unresolved_count');
              // Protection rating: percentage of protected files
              const protPct = sub.fileCount > 0 ? ((sub.fileCount - sub.unprotectedFiles) / sub.fileCount) * 100 : 100;
              const protRating = getRating(protPct, 'score');
              // Modernization rating: candidate count
              const modRating = getRating(sub.modernizationCandidates, 'unresolved_count');

              return (
                <tr key={sub.id} className="hover:bg-panel/30 transition-colors">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-ink">{sub.label}</span>
                      <span className="text-[10px] font-mono text-ink-3">({sub.fileCount} files)</span>
                    </div>
                  </td>

                  {/* Parse */}
                  <td className="py-3 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Parse',
                          details: `${sub.fullParseCoverage}% full AST coverage across ${sub.fileCount} files.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-help transition-transform hover:scale-105 ${parseRating.bg} ${parseRating.text}`}
                      title={`${sub.fullParseCoverage}% full AST coverage`}
                    >
                      {parseRating.label}
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="py-3 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Risk',
                          details: `${sub.highRiskFiles} elevated or critical risk files identified in this subsystem.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-help transition-transform hover:scale-105 ${riskRating.bg} ${riskRating.text}`}
                      title={`${sub.highRiskFiles} high risk modules`}
                    >
                      {riskRating.label}
                    </div>
                  </td>

                  {/* Dependencies */}
                  <td className="py-3 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Dependencies',
                          details: `${sub.unresolvedDependencies} unresolved import edges originating from ${sub.label}.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-help transition-transform hover:scale-105 ${depRating.bg} ${depRating.text}`}
                      title={`${sub.unresolvedDependencies} unresolved imports`}
                    >
                      {depRating.label}
                    </div>
                  </td>

                  {/* Protection */}
                  <td className="py-3 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Protection',
                          details: `${sub.unprotectedFiles} unprotected files (${sub.fileCount - sub.unprotectedFiles} protected) in ${sub.label}.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-help transition-transform hover:scale-105 ${protRating.bg} ${protRating.text}`}
                      title={`${sub.unprotectedFiles} unprotected modules`}
                    >
                      {protRating.label}
                    </div>
                  </td>

                  {/* Modernization */}
                  <td className="py-3 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Modernization',
                          details: `${sub.modernizationCandidates} modernization pattern candidate(s) detected in ${sub.label}.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block px-2.5 py-1 rounded text-[11px] font-mono font-bold cursor-help transition-transform hover:scale-105 ${modRating.bg} ${modRating.text}`}
                      title={`${sub.modernizationCandidates} modernization candidates`}
                    >
                      {modRating.label}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dynamic Hover Details Pill */}
      {hoveredCell && (
        <div className="mt-3 p-2.5 rounded-lg bg-interactive-surface/80 border border-interactive/20 text-xs flex items-center gap-2 animate-fadeIn">
          <Info className="w-4 h-4 text-interactive shrink-0" />
          <span className="font-semibold text-interactive">
            {hoveredCell.dimension} Inspection:
          </span>
          <span className="text-ink-2">{hoveredCell.details}</span>
        </div>
      )}
    </div>
  );
};

export default SubsystemHealthMatrix;

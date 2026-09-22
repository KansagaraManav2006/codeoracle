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

  // Helper categorical rating logic with curated Ocean Breeze semantic palette
  const getRating = (
    val: number,
    type: 'score' | 'risk_count' | 'unresolved_count' | 'parse_pct'
  ): { label: string; bg: string; text: string; border: string } => {
    if (type === 'score' || type === 'parse_pct') {
      if (val >= 90) return { label: 'Strong', bg: 'bg-[#E6F8F3]', text: 'text-[#167C69]', border: 'border-[#7FE7D6]/50' };
      if (val >= 75) return { label: 'Healthy', bg: 'bg-[#E8F6FF]', text: 'text-[#0B3D91]', border: 'border-[#3BA7F2]/40' };
      if (val >= 55) return { label: 'Medium', bg: 'bg-[#F7FBFF]', text: 'text-[#52697A]', border: 'border-[#D7EAF5]' };
      if (val >= 40) return { label: 'Weak', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FCD34D]' };
      return { label: 'High Pressure', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FCA5A5]' };
    } else {
      // For counts where 0 is best
      if (val === 0) return { label: 'Strong', bg: 'bg-[#E6F8F3]', text: 'text-[#167C69]', border: 'border-[#7FE7D6]/50' };
      if (val <= 1) return { label: 'Healthy', bg: 'bg-[#E8F6FF]', text: 'text-[#0B3D91]', border: 'border-[#3BA7F2]/40' };
      if (val <= 3) return { label: 'Medium', bg: 'bg-[#F7FBFF]', text: 'text-[#52697A]', border: 'border-[#D7EAF5]' };
      if (val <= 5) return { label: 'Weak', bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]', border: 'border-[#FCD34D]' };
      return { label: 'High Pressure', bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]', border: 'border-[#FCA5A5]' };
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#167C69]';
    if (score >= 70) return 'text-[#0B3D91]';
    if (score >= 50) return 'text-[#D97706]';
    return 'text-[#DC2626]';
  };

  return (
    <section
      className="bg-white border border-[#D7EAF5] rounded-[20px] shadow-[0_8px_28px_rgba(11,61,145,0.06)] p-6 sm:p-7 transition-all"
      aria-label="Subsystem Health Matrix"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#D7EAF5]">
        <div>
          <h3 className="text-lg font-bold text-[#102536] tracking-tight font-display flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91]">
              <Table className="w-4 h-4" />
            </div>
            <span>Subsystem Health Matrix</span>
          </h3>
          <p className="text-xs text-[#52697A] mt-1">
            Cross-dimensional qualitative classification across all 5 architectural subsystems. Hover reveals exact grounded metrics.
          </p>
        </div>

        {/* Compact Legend (Section 24) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-sans">
          <span className="px-2 py-0.5 rounded-full bg-[#E6F8F3] text-[#167C69] border border-[#7FE7D6]/40 font-semibold text-[11px]">Strong</span>
          <span className="px-2 py-0.5 rounded-full bg-[#E8F6FF] text-[#0B3D91] border border-[#3BA7F2]/30 font-semibold text-[11px]">Healthy</span>
          <span className="px-2 py-0.5 rounded-full bg-[#F7FBFF] text-[#52697A] border border-[#D7EAF5] font-semibold text-[11px]">Medium</span>
          <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] font-semibold text-[11px]">Weak</span>
          <span className="px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] font-semibold text-[11px]">High Pressure</span>
        </div>
      </div>

      {/* Matrix Table with Rounded Cells & OVERALL Column (Section 24, 25) */}
      <div className="mt-5 overflow-x-auto rounded-xl border border-[#D7EAF5]">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-[#D7EAF5] bg-[#F7FBFF] text-[11px] font-bold uppercase tracking-wider text-[#52697A] font-sans">
              <th className="py-3 px-4 font-semibold">Subsystem</th>
              <th className="py-3 px-3 font-semibold text-center">Parse</th>
              <th className="py-3 px-3 font-semibold text-center">Risk</th>
              <th className="py-3 px-3 font-semibold text-center">Dependencies</th>
              <th className="py-3 px-3 font-semibold text-center">Protection</th>
              <th className="py-3 px-3 font-semibold text-center">Modernization</th>
              <th className="py-3 px-4 font-bold text-center text-[#0B3D91] bg-[#E8F6FF]/40 border-l border-[#D7EAF5]">
                Overall
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D7EAF5] bg-white">
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
                <tr key={sub.id} className="hover:bg-[#F7FBFF] transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#102536] text-xs sm:text-sm font-display">{sub.label}</span>
                      <span className="text-[11px] font-mono font-medium text-[#52697A]">({sub.fileCount}f)</span>
                    </div>
                  </td>

                  {/* Parse */}
                  <td className="py-3.5 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Parse',
                          details: `${sub.fullParseCoverage}% full AST coverage across ${sub.fileCount} source files.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block min-w-[100px] px-3 py-1 rounded-full text-xs font-semibold cursor-help transition-all hover:scale-105 border ${parseRating.bg} ${parseRating.text} ${parseRating.border}`}
                      title={`${sub.fullParseCoverage}% full AST coverage`}
                    >
                      {parseRating.label}
                    </div>
                  </td>

                  {/* Risk */}
                  <td className="py-3.5 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Risk',
                          details: `${sub.highRiskFiles} elevated or critical risk files identified in this subsystem.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block min-w-[100px] px-3 py-1 rounded-full text-xs font-semibold cursor-help transition-all hover:scale-105 border ${riskRating.bg} ${riskRating.text} ${riskRating.border}`}
                      title={`${sub.highRiskFiles} high risk modules`}
                    >
                      {riskRating.label}
                    </div>
                  </td>

                  {/* Dependencies */}
                  <td className="py-3.5 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Dependencies',
                          details: `${sub.unresolvedDependencies} unresolved import edges originating from ${sub.label}.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block min-w-[100px] px-3 py-1 rounded-full text-xs font-semibold cursor-help transition-all hover:scale-105 border ${depRating.bg} ${depRating.text} ${depRating.border}`}
                      title={`${sub.unresolvedDependencies} unresolved imports`}
                    >
                      {depRating.label}
                    </div>
                  </td>

                  {/* Protection */}
                  <td className="py-3.5 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Protection',
                          details: `${sub.unprotectedFiles} unprotected files (${sub.fileCount - sub.unprotectedFiles} protected) in ${sub.label}.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block min-w-[100px] px-3 py-1 rounded-full text-xs font-semibold cursor-help transition-all hover:scale-105 border ${protRating.bg} ${protRating.text} ${protRating.border}`}
                      title={`${sub.unprotectedFiles} unprotected modules`}
                    >
                      {protRating.label}
                    </div>
                  </td>

                  {/* Modernization */}
                  <td className="py-3.5 px-3 text-center">
                    <div
                      onMouseEnter={() =>
                        setHoveredCell({
                          subsystemId: sub.id,
                          dimension: 'Modernization',
                          details: `${sub.modernizationCandidates} modernization pattern candidate(s) detected in ${sub.label}.`,
                        })
                      }
                      onMouseLeave={() => setHoveredCell(null)}
                      className={`inline-block min-w-[100px] px-3 py-1 rounded-full text-xs font-semibold cursor-help transition-all hover:scale-105 border ${modRating.bg} ${modRating.text} ${modRating.border}`}
                      title={`${sub.modernizationCandidates} modernization candidates`}
                    >
                      {modRating.label}
                    </div>
                  </td>

                  {/* OVERALL Summary Column (Section 25) */}
                  <td className="py-3.5 px-4 text-center bg-[#F7FBFF]/50 border-l border-[#D7EAF5]">
                    <span className={`font-mono text-sm font-black ${getScoreColor(sub.healthScore)}`}>
                      {sub.healthScore}
                    </span>
                    <span className="text-[10px] text-[#94A3B8] font-mono">/100</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Dynamic Hover Details Pill */}
      {hoveredCell ? (
        <div className="mt-3.5 p-3 rounded-xl bg-[#F7FBFF] border border-[#D7EAF5] text-xs flex items-center gap-2.5 text-[#102536] animate-[fade-up_150ms_ease-out_both]">
          <div className="w-5 h-5 rounded-md bg-[#E8F6FF] flex items-center justify-center text-[#0B3D91] shrink-0">
            <Info className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-[#0B3D91] mr-1.5 font-sans">
              {hoveredCell.dimension} Detail:
            </span>
            <span className="text-[#52697A] font-sans">{hoveredCell.details}</span>
          </div>
        </div>
      ) : (
        <div className="mt-3.5 px-3 py-2 text-[11px] text-[#52697A] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#94A3B8]" />
          <span>Hover any qualitative pill to view exact file counts and grounding coverage.</span>
        </div>
      )}
    </section>
  );
};

export default SubsystemHealthMatrix;

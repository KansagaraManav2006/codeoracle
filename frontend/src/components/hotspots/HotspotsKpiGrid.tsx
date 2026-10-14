import React from 'react';
import KpiCard from '../common/KpiCard';
import { formatNumber } from '../../utils/formatters';

export interface HotspotsKpiGridProps {
  totalFilesCount: number;
  criticalCount: number;
  highCount: number;
  topScore: number;
  highConfCount: number;
}

export const HotspotsKpiGrid: React.FC<HotspotsKpiGridProps> = ({
  totalFilesCount,
  criticalCount,
  highCount,
  topScore,
  highConfCount,
}) => {
  return (
    <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <KpiCard
          label="FILES EVALUATED"
          value={formatNumber(totalFilesCount)}
          subtext="Parsed into AST models"
        />
        <KpiCard
          label="CRITICAL RISK (≥70)"
          value={formatNumber(criticalCount)}
          variant={criticalCount > 0 ? 'highlight' : 'default'}
          subtext="Immediate refactoring priority"
        />
        <KpiCard
          label="HIGH RISK (45-69)"
          value={formatNumber(highCount)}
          subtext="Elevated caller ripple"
        />
        <KpiCard
          label="TOP HOTSPOT SCORE"
          value={`${topScore} / 100`}
          variant="selected"
          subtext="Normalized max severity"
        />
        <KpiCard
          label="FULL ANALYSIS CONFIDENCE"
          value={`${highConfCount} / ${totalFilesCount}`}
          subtext="Full AST, no missing imports"
        />
      </div>
    </section>
  );
};

export default HotspotsKpiGrid;

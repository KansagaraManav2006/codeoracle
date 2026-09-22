import React, { useMemo, useState } from 'react';
import { Target, Info } from 'lucide-react';
import { ChangeImpact } from '../../types';
import { truncateMiddle } from '../../utils/formatters';

interface PriorityMatrixProps {
  impacts: ChangeImpact[];
  selectedId?: string;
  onSelectFile?: (filePath: string) => void;
  className?: string;
}

export const PriorityMatrix: React.FC<PriorityMatrixProps> = ({
  impacts,
  selectedId,
  onSelectFile,
  className = '',
}) => {
  const [hoveredItem, setHoveredItem] = useState<ChangeImpact | null>(null);

  // Compute max blast radius for scaling Y-axis
  const maxBlast = useMemo(() => {
    return Math.max(10, ...impacts.map((i) => i.blast_radius || 0));
  }, [impacts]);

  // Take top 40 files to avoid cluttering scatter chart
  const plottedItems = useMemo(() => {
    return impacts.slice(0, 45);
  }, [impacts]);

  return (
    <div className={`bg-surface border border-line rounded-xl p-5 shadow-1 space-y-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-indigo-surface text-indigo flex items-center justify-center border border-indigo/20 shrink-0">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-bold text-sm text-ink">
              Architectural Priority Matrix (Risk vs. Downstream Impact)
            </h4>
            <p className="text-[11px] text-ink-3">
              Quadrant mapping explains why files are staged into early vs. late migration waves.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-mono text-ink-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-strong inline-block" /> Wave 1
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo inline-block" /> Wave 3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-strong inline-block" /> Wave 0/4
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-red-strong inline-block" /> Cycle
          </span>
        </div>
      </div>

      {/* 2D Scatter Canvas Container */}
      <div className="relative w-full h-[280px] bg-tile/70 border border-line rounded-lg p-4 select-none overflow-hidden">
        {/* Quadrant dividing grid lines */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px border-r border-dashed border-line/80 pointer-events-none" />
        <div className="absolute top-1/2 left-0 right-0 h-px border-b border-dashed border-line/80 pointer-events-none" />

        {/* Quadrant Labels */}
        <div className="absolute top-2 left-3 text-[10px] font-bold uppercase tracking-wider text-ink-3/70 pointer-events-none">
          Shared Services (High Blast &bull; Low Risk)
        </div>
        <div className="absolute top-2 right-3 text-[10px] font-bold uppercase tracking-wider text-red-text/70 pointer-events-none text-right">
          Critical Bottlenecks (High Blast &bull; High Risk)
        </div>
        <div className="absolute bottom-2 left-3 text-[10px] font-bold uppercase tracking-wider text-teal-strong/70 pointer-events-none">
          Quick Wins (Low Blast &bull; Low Risk)
        </div>
        <div className="absolute bottom-2 right-3 text-[10px] font-bold uppercase tracking-wider text-amber-strong/70 pointer-events-none text-right">
          Isolated Complex Logic (Low Blast &bull; High Risk)
        </div>

        {/* Axis Labels */}
        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-mono uppercase text-ink-3 tracking-widest pointer-events-none">
          &larr; Downstream Blast &rarr;
        </div>
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[9px] font-mono uppercase text-ink-3 tracking-widest pointer-events-none">
          &larr; Change Risk Score &rarr;
        </div>

        {/* Plot points */}
        <div className="relative w-full h-full">
          {plottedItems.map((item) => {
            const riskX = Math.max(5, Math.min(95, item.hotspot_score || 20));
            const blastY = Math.max(8, Math.min(92, 100 - ((item.blast_radius || 0) / maxBlast) * 85));
            const isSelected = selectedId === item.module_id || selectedId === item.relative_path;
            const isHovered = hoveredItem?.module_id === item.module_id;

            let dotColor = 'bg-teal-strong';
            if (item.is_cycle_participant) dotColor = 'bg-red-strong';
            else if (item.wave === 4) dotColor = 'bg-amber-strong';
            else if (item.wave === 3) dotColor = 'bg-indigo';
            else if (item.wave === 0) dotColor = 'bg-red-strong';

            return (
              <button
                key={item.module_id}
                type="button"
                onClick={() => onSelectFile?.(item.relative_path)}
                onMouseEnter={() => setHoveredItem(item)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{ left: `${riskX}%`, top: `${blastY}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-150 rounded-full focus:outline-none ${
                  isSelected || isHovered
                    ? 'scale-150 z-30 ring-2 ring-indigo ring-offset-1 shadow-md'
                    : 'hover:scale-125 z-10'
                }`}
                title={`${item.relative_path} (Risk: ${item.hotspot_score || 0}, Blast: ${item.blast_radius || 0})`}
              >
                <span className={`block w-3 h-3 rounded-full ${dotColor} border border-white/80 shadow-xs`} />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected / Hovered Detail Bar */}
      {(hoveredItem || selectedId) && (
        <div className="p-3 bg-tile border border-line rounded-lg flex items-center justify-between text-xs animate-[fade-in_100ms_ease-out_both]">
          <div className="flex items-center gap-2">
            <Info className="w-3.5 h-3.5 text-indigo shrink-0" />
            <div className="font-mono">
              <strong className="text-ink font-bold">
                {truncateMiddle((hoveredItem || impacts.find((i) => i.module_id === selectedId) || impacts[0]).relative_path, 34)}
              </strong>
              <span className="text-ink-3 ml-2">
                Wave {(hoveredItem || impacts.find((i) => i.module_id === selectedId) || impacts[0]).wave || 1} &bull;{' '}
                {(hoveredItem || impacts.find((i) => i.module_id === selectedId) || impacts[0]).architecture_role || 'module'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span className="text-ink-2">
              Risk: <strong className="text-ink">{(hoveredItem || impacts.find((i) => i.module_id === selectedId) || impacts[0]).hotspot_score || 0}/100</strong>
            </span>
            <span className="text-ink-2">
              Blast Radius: <strong className="text-ink">{(hoveredItem || impacts.find((i) => i.module_id === selectedId) || impacts[0]).blast_radius || 0} files</strong>
            </span>
            {onSelectFile && (
              <button
                type="button"
                onClick={() => onSelectFile((hoveredItem || impacts.find((i) => i.module_id === selectedId) || impacts[0]).relative_path)}
                className="font-sans font-bold text-indigo hover:underline text-[11px]"
              >
                Inspect &rarr;
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PriorityMatrix;

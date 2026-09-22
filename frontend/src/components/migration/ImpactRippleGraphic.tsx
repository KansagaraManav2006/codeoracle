import React from 'react';
import { Target, Network, Layers, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ChangeImpact } from '../../types';
import { truncateMiddle } from '../../utils/formatters';

interface ImpactRippleGraphicProps {
  impact: ChangeImpact;
  onSelectFile?: (filePath: string) => void;
  className?: string;
}

export const ImpactRippleGraphic: React.FC<ImpactRippleGraphicProps> = ({
  impact,
  onSelectFile,
  className = '',
}) => {
  const directList = impact.direct_dependents || [];
  const directCount = directList.length;
  const transitiveList = impact.transitive_dependents || [];
  const transitiveCount = impact.blast_radius || transitiveList.length;
  const entryList = impact.affected_entry_points || [];
  const entryCount = entryList.length;
  const isLeaf = directCount === 0 && transitiveCount === 0;

  return (
    <div className={`p-4 bg-tile border border-line rounded-xl space-y-3.5 select-none ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo animate-pulse" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink font-mono">
            Downstream Impact Propagation Ripple
          </span>
        </div>
        <span className="text-[10px] font-mono text-ink-3 px-2 py-0.5 rounded bg-surface border border-line">
          Max Depth: <strong className="text-ink">{impact.dependency_depth || 0}</strong> {impact.dependency_depth === 1 ? 'hop' : 'hops'}
        </span>
      </div>

      {/* Ripple Nodes Flow Diagram */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-stretch relative">
        {/* Stage 1: Selected Module */}
        <div className="p-3 rounded-lg bg-surface border-2 border-indigo/40 shadow-xs flex flex-col justify-between space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-indigo font-mono flex items-center gap-1">
              <Target className="w-3 h-3" /> Target
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-ink truncate" title={impact.relative_path}>
              {truncateMiddle(impact.relative_path, 20)}
            </div>
            <div className="text-[10px] text-ink-3 mt-0.5">
              Wave {impact.wave || 1} &bull; {impact.architecture_role || 'Module'}
            </div>
          </div>
          <div className="text-[10px] font-mono text-indigo font-medium">Origin Point</div>
        </div>

        {/* Stage 2: Direct Callers */}
        <div className="p-3 rounded-lg bg-surface border border-line shadow-xs flex flex-col justify-between space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-ink-2 font-mono flex items-center gap-1">
              <Network className="w-3 h-3 text-amber-strong" /> Direct
            </span>
            <span className="text-xs font-mono font-bold text-ink">{directCount}</span>
          </div>
          <div>
            <div className="text-xs font-bold text-ink">
              {directCount} Direct {directCount === 1 ? 'Caller' : 'Callers'}
            </div>
            <div className="text-[10px] text-ink-3 mt-0.5 truncate">
              {directCount > 0 ? truncateMiddle(directList[0], 18) : 'Zero direct callers'}
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-3">Immediate 1-hop ripple</div>
        </div>

        {/* Stage 3: Transitive Downstream Blast */}
        <div className="p-3 rounded-lg bg-surface border border-line shadow-xs flex flex-col justify-between space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-ink-2 font-mono flex items-center gap-1">
              <Layers className="w-3 h-3 text-red-strong" /> Blast Radius
            </span>
            <span className="text-xs font-mono font-bold text-ink">{transitiveCount}</span>
          </div>
          <div>
            <div className="text-xs font-bold text-ink">
              {transitiveCount} {transitiveCount === 1 ? 'Downstream File' : 'Downstream Files'}
            </div>
            <div className="text-[10px] text-ink-3 mt-0.5 truncate">
              {transitiveCount > 0 ? `${transitiveCount - directCount} indirect cascading` : 'Zero downstream blast'}
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-3">Cascading downstream chain</div>
        </div>

        {/* Stage 4: Entry Points Affected */}
        <div className={`p-3 rounded-lg bg-surface border shadow-xs flex flex-col justify-between space-y-2 relative ${entryCount > 0 ? 'border-amber/40 bg-amber-surface/20' : 'border-line'}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-ink-2 font-mono flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-teal-strong" /> Entry Roots
            </span>
            <span className="text-xs font-mono font-bold text-ink">{entryCount}</span>
          </div>
          <div>
            <div className="text-xs font-bold text-ink">
              {entryCount} {entryCount === 1 ? 'Runtime Root' : 'Runtime Roots'}
            </div>
            <div className="text-[10px] text-ink-3 mt-0.5 truncate">
              {entryCount > 0 ? truncateMiddle(entryList[0], 18) : 'Bootstrap unaffected'}
            </div>
          </div>
          <div className="text-[10px] font-mono text-ink-3">Application execution impact</div>
        </div>
      </div>

      {/* Ripple Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line text-xs">
        <div className="flex items-center gap-2">
          {isLeaf ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-teal-surface text-teal-strong border border-teal/20">
              <ShieldCheck className="w-3 h-3" /> Isolated Leaf (Low Estimated Downstream Impact)
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-surface text-amber-strong border border-amber/25">
              <AlertTriangle className="w-3 h-3" /> Downstream Ripple: {transitiveCount} files affected across {impact.dependency_depth || 1} hops
            </span>
          )}
        </div>

        {directCount > 0 && onSelectFile && (
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-ink-3">Primary Caller:</span>
            <button
              type="button"
              onClick={() => onSelectFile(directList[0])}
              className="font-mono text-indigo font-bold hover:underline truncate max-w-[200px]"
              title={directList[0]}
            >
              {truncateMiddle(directList[0], 24)}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImpactRippleGraphic;

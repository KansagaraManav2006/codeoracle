import React from 'react';
import { Compass, ChevronDown, ChevronUp } from 'lucide-react';

export interface GraphLegendProps {
  isOpen: boolean;
  onToggle: () => void;
}

export const GraphLegend: React.FC<GraphLegendProps> = ({ isOpen, onToggle }) => {
  return (
    <div className="bg-surface/98 backdrop-blur-md border border-line-strong/60 rounded-lg p-3 shadow-lg max-w-md text-xs">
      <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-line/60 mb-2">
        <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
          <Compass className="w-3.5 h-3.5 text-indigo" /> Graph Legend
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="text-ink-4 hover:text-ink text-[11px] flex items-center gap-0.5"
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          {isOpen ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {isOpen ? (
        <div className="space-y-2">
          {/* 1. Node Role */}
          <div>
            <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
              Node Role
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs border-l-[3px] border-l-teal bg-surface border border-line" />
                Entry Point
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-surface border border-line" />
                Internal Module
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-surface border border-dashed border-slate" />
                External Package
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-surface/50 border border-dashed border-amber" />
                Partial / Unresolved
              </span>
            </div>
          </div>

          {/* 2. Risk Level */}
          <div className="pt-1.5 border-t border-line/50">
            <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
              Risk Level
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-amber-surface border border-amber-line" />
                High Complexity
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-strong" />
                Critical Risk
              </span>
            </div>
          </div>

          {/* 3. Graph State */}
          <div className="pt-1.5 border-t border-line/50">
            <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
              Graph State
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-red-surface/95 border-2 border-red-line ring-1 ring-red/30" />
                Cycle Member
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 border-t-2 border-dashed border-red" />
                Cycle Edge
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 text-[11px] text-ink-3">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-teal" /> Entry
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-indigo" /> Module
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red" /> Cycle
          </span>
        </div>
      )}
    </div>
  );
};

export default GraphLegend;

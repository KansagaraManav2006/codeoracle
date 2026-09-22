import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';

export default function NeuralMapLegend() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-white/15 bg-black/85 backdrop-blur-md p-3 text-[11px] text-white/80 max-w-sm shadow-2 select-none">
      <div className="flex items-center justify-between gap-3 border-b border-white/15 pb-2 mb-2">
        <span className="font-bold tracking-wider text-white text-[10px] uppercase flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-on-dark" />
          Semantic Graph Information System
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="text-white/60 hover:text-white p-0.5 rounded transition-colors"
          title={collapsed ? 'Expand legend' : 'Collapse legend'}
        >
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2.5">
          {/* Group 1: Node Shape (Role) */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Node Shape = Module Role
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="text-teal text-sm leading-none">◆</span> Entry Point
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="text-indigo-text text-sm leading-none">■</span> Service
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="text-sky-400 text-sm leading-none">⬡</span> API / Router
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="text-pink-400 text-sm leading-none">▲</span> ML Module
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="text-teal-strong text-sm leading-none">○</span> UI Component
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="text-emerald-400 text-sm leading-none">⬢</span> Database / Repo
              </span>
            </div>
          </div>

          {/* Group 2: Outer Halo (Overall Risk) */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Outer Halo = Overall Risk
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-red bg-red/30 shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                <span>Critical</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber shadow-[0_0_8px_rgba(245,158,11,0.7)]" />
                <span>High</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/60" />
                <span>Medium</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-white/40" />
                <span>Low</span>
              </span>
            </div>
          </div>

          {/* Group 3: Border Style (Parse Confidence) */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Border Style = Parse Confidence
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-3 h-3 rounded-full border border-white inline-block" />
                <span>Full AST</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-3 h-3 rounded-full border border-dashed border-amber inline-block" />
                <span>Partial</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-3 h-3 rounded-full border border-dotted border-red inline-block" />
                <span>Fallback</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-3 h-3 rounded-full border border-dashed border-purple-400 inline-block" />
                <span>Unresolved</span>
              </span>
            </div>
          </div>

          {/* Group 4: Edge Styles */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Edge Style = Dependency Type
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px]">
              <span>─── Runtime</span>
              <span>- - - Type-only</span>
              <span>···· Dynamic</span>
              <span className="text-cyan-400">● Particle = Active Flow</span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 text-[10px] text-white/50 space-y-0.5">
            <p>Size = Fan-in + Fan-out + Blast Radius + Entry bonus</p>
            <p>Drag to pan · Scroll to zoom · Minimap in bottom-right</p>
          </div>
        </div>
      )}
    </div>
  );
}

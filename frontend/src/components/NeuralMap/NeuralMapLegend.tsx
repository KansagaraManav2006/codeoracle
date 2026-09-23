import { useState } from 'react';
import { ChevronDown, ChevronUp, Info } from 'lucide-react';
import type { VisualMode } from './graphDataAdapter';

interface Props {
  visualMode?: VisualMode;
}

export default function NeuralMapLegend({ visualMode = 'structure' }: Props) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-xl border border-cyan-500/30 bg-[#071625]/90 backdrop-blur-md p-3 text-[11px] text-white/80 max-w-sm shadow-2xl select-none transition-all">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1.5 text-left font-bold tracking-wider text-cyan-300 text-[11px] uppercase hover:text-white transition-colors"
        >
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Legend · {visualMode.toUpperCase()}</span>
        </button>
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
        <div className="space-y-3 mt-2.5 pt-2 border-t border-white/10 animate-[fade-in_150ms_ease-out]">
          {/* Mode-Adaptive Highlights */}
          {visualMode === 'risk' && (
            <div className="p-2 rounded-lg bg-red-950/40 border border-red-500/30 text-[10px]">
              <span className="font-bold text-red-300 block mb-1">RISK MODE ACTIVE</span>
              <p className="text-white/70">
                Halo radius and color indicate composite risk (complexity, coupling, and blast radius). Low-risk modules fade.
              </p>
            </div>
          )}

          {visualMode === 'parse_quality' && (
            <div className="p-2 rounded-lg bg-teal-950/40 border border-teal-500/30 text-[10px]">
              <span className="font-bold text-teal-300 block mb-1">PARSE QUALITY MODE</span>
              <p className="text-white/70">
                Borders display code intelligence confidence: solid for Full AST, dashed for Partial syntax, and dotted for token fallbacks.
              </p>
            </div>
          )}

          {visualMode === 'flow' && (
            <div className="p-2 rounded-lg bg-sky-950/40 border border-sky-500/30 text-[10px]">
              <span className="font-bold text-sky-300 block mb-1">SIGNAL FLOW MODE</span>
              <p className="text-white/70">
                Nodes are organized in layered execution stages. Traveling light particles indicate verified directional execution flow.
              </p>
            </div>
          )}

          {/* Group 1: Node Shape (Role) */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Node Shape = Module Role
            </span>
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1.5">
                <span className="text-teal-400 text-xs">◆</span> Entry Point
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-blue-400 text-xs">■</span> Service
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-sky-400 text-xs">⬡</span> API / Router
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-purple-400 text-xs">▲</span> ML Module
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-emerald-400 text-xs">○</span> UI Component
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="text-teal-300 text-xs">⬢</span> Database / Repo
              </span>
            </div>
          </div>

          {/* Group 2: Outer Halo (Overall Risk) */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Outer Halo = Composite Risk
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full border border-red-500 bg-red-500/40 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                <span>Critical</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500/80 shadow-[0_0_6px_rgba(249,115,22,0.8)]" />
                <span>High</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400/60" />
                <span>Medium</span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
                <span>Low</span>
              </span>
            </div>
          </div>

          {/* Group 3: Border Style (Parse Confidence) */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Border = Analysis Confidence
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full border border-white inline-block" />
                <span>Full AST</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-amber-400 inline-block" />
                <span>Partial</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full border border-dotted border-orange-400 inline-block" />
                <span>Fallback</span>
              </span>
              <span className="inline-flex items-center gap-1.5 font-mono">
                <span className="w-2.5 h-2.5 rounded-full border border-dashed border-red-400 inline-block" />
                <span>Unresolved</span>
              </span>
            </div>
          </div>

          {/* Group 4: Inner Core = Language */}
          <div>
            <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider block mb-1">
              Inner Dot = Language
            </span>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-mono">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> Python
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-400 inline-block" /> TypeScript
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> JavaScript
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10 text-[10px] text-white/50 space-y-0.5">
            <p>Node Size = Architectural Centrality &amp; Degree</p>
            <p>Highways = Cross-layer aggregated conduits</p>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo } from 'react';
import {
  RotateCcw,
  Search,
  Filter,
  Command,
  Sparkles,
  GitFork,
  Maximize,
  Minimize,
} from 'lucide-react';
import Button from '../common/Button';
import type {
  ClusterInfo,
  ClusterMode,
  DensityLevel,
  FocusDepth,
  NeuralNode,
  VisualMode,
} from './graphDataAdapter';

interface Props {
  search: string;
  onSearch: (value: string) => void;
  language: string;
  onLanguage: (value: string) => void;
  nodes: NeuralNode[];
  clusters: ClusterInfo[];
  selected: string | null;
  onSelect: (id: string | null) => void;
  onReset: () => void;
  visualMode: VisualMode;
  onVisualMode: (mode: VisualMode) => void;
  focusDepth: FocusDepth;
  onFocusDepth: (depth: FocusDepth) => void;
  clusterMode: ClusterMode;
  onClusterMode: (mode: ClusterMode) => void;
  quickFilter: 'all' | 'high_risk' | 'partial' | 'entry_points' | 'unresolved';
  onQuickFilter: (filter: 'all' | 'high_risk' | 'partial' | 'entry_points' | 'unresolved') => void;
  showIsolated: boolean;
  onToggleIsolated: () => void;
  activeCluster: string | null;
  onSelectCluster: (cluster: string | null) => void;
  density: DensityLevel;
  onDensity: (density: DensityLevel) => void;
  onOpenPalette: () => void;
  onStartTour: () => void;
  onOpenPathTrace: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function NeuralMapControls(props: Props) {
  const languages = useMemo(() => {
    return [
      ...new Set(['python', 'javascript', 'typescript', ...props.nodes.map(n => n.language)]),
    ].filter(Boolean);
  }, [props.nodes]);

  return (
    <div className="space-y-3 p-3.5 sm:p-4 rounded-xl border border-cyan-500/20 bg-[#071625]/90 text-white text-xs backdrop-blur-md shadow-xl">
      {/* Row 1: Search, Visual Modes, Tour, Palette & Reset */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        {/* Search Input with Command Palette Hint */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-cyan-400/60 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search modules by path or name"
            placeholder="Search universe (e.g. main, auth, api, .tsx)..."
            value={props.search}
            onChange={e => props.onSearch(e.target.value)}
            className="w-full pl-9 pr-16 py-1.5 rounded-lg text-xs bg-black/40 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-cyan-400 transition-colors"
          />
          <button
            type="button"
            onClick={props.onOpenPalette}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[10px] font-mono text-white/60 flex items-center gap-1 transition-colors"
            title="Command Palette (Ctrl+K)"
          >
            <Command className="w-2.5 h-2.5" /> K
          </button>
        </div>

        {/* Visual Mode Segmented Controls (7 Modes) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'structure' as VisualMode, label: 'STRUCTURE' },
            { id: 'flow' as VisualMode, label: 'FLOW' },
            { id: 'risk' as VisualMode, label: 'RISK' },
            { id: 'impact' as VisualMode, label: 'IMPACT' },
            { id: 'parse_quality' as VisualMode, label: 'PARSE' },
            { id: 'entry_points' as VisualMode, label: 'ENTRY' },
            { id: 'system' as VisualMode, label: 'SYSTEM' },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => props.onVisualMode(m.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold tracking-wide transition-all border ${
                props.visualMode === m.id
                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                  : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Utility Buttons: Tour, Path Trace, Fullscreen & Reset */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={props.onStartTour}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Start Guided Architecture Tour"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Tour</span>
          </button>

          <button
            type="button"
            onClick={props.onOpenPathTrace}
            className="px-2.5 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Trace Dependency Path between modules"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Trace</span>
          </button>

          <button
            type="button"
            onClick={props.onToggleFullscreen}
            className="p-1.5 rounded-lg bg-white/5 border border-white/15 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title={props.isFullscreen ? 'Exit Fullscreen' : 'Enter Immersive Fullscreen'}
          >
            {props.isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
          </button>

          <Button
            variant="outline"
            size="sm"
            onClick={props.onReset}
            className="border-white/20 text-white/80 hover:text-white hover:bg-white/10 text-xs shrink-0"
            icon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Row 2: Quick Filters, Constellation Filter Chips, Focus Depth & Density */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2.5 border-t border-white/10">
        {/* Quick Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            Filter:
          </span>
          {[
            { id: 'all' as const, label: 'ALL' },
            { id: 'high_risk' as const, label: 'HIGH RISK' },
            { id: 'partial' as const, label: 'PARTIAL PARSE' },
            { id: 'entry_points' as const, label: 'ENTRY POINTS' },
            { id: 'unresolved' as const, label: 'UNRESOLVED' },
          ].map(q => (
            <button
              key={q.id}
              type="button"
              onClick={() => props.onQuickFilter(q.id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors border ${
                props.quickFilter === q.id
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/70 border-white/15 hover:border-white/30'
              }`}
            >
              {q.label}
            </button>
          ))}

          {/* Architecture Constellation Filter Chips */}
          {props.clusters.length > 1 && (
            <>
              <span className="text-white/30 mx-1">|</span>
              {props.clusters.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() =>
                    props.onSelectCluster(props.activeCluster === c.id ? null : c.id)
                  }
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold transition-all border ${
                    props.activeCluster === c.id
                      ? 'bg-cyan-500 text-black border-cyan-400 shadow-sm'
                      : 'bg-white/5 text-white/70 border-white/15 hover:border-white/30'
                  }`}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </>
          )}
        </div>

        {/* Focus Depth & Density Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Focus Depth */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Focus:
            </span>
            {(['1-hop', '2-hop', '3-hop', 'all'] as FocusDepth[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => props.onFocusDepth(d)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition-all ${
                  props.focusDepth === d
                    ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <span className="text-white/20">|</span>

          {/* Density Level */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider">
              Density:
            </span>
            {(['minimal', 'balanced', 'full'] as DensityLevel[]).map(dl => (
              <button
                key={dl}
                type="button"
                onClick={() => props.onDensity(dl)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold capitalize transition-all ${
                  props.density === dl
                    ? 'bg-white/20 text-white font-bold'
                    : 'text-white/50 hover:text-white'
                }`}
              >
                {dl}
              </button>
            ))}
          </div>

          <span className="text-white/20">|</span>

          {/* Language Selector */}
          <select
            aria-label="Filter by language"
            value={props.language}
            onChange={e => props.onLanguage(e.target.value)}
            className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/10 border border-white/20 text-white focus:outline-none"
          >
            <option value="all" className="bg-slate-900 text-white">ALL LANGS</option>
            {languages.map(l => (
              <option key={l} value={l} className="bg-slate-900 text-white">
                {l.toUpperCase()}
              </option>
            ))}
          </select>

          <span className="text-white/20">|</span>

          {/* Isolated Nodes Toggle */}
          <button
            type="button"
            onClick={props.onToggleIsolated}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors border ${
              props.showIsolated
                ? 'bg-white/10 text-white border-white/20'
                : 'bg-transparent text-white/40 border-transparent hover:text-white/70'
            }`}
          >
            Standalone: {props.showIsolated ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}

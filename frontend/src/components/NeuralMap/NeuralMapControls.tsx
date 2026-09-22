import { useMemo, useState } from 'react';
import {
  RotateCcw,
  Search,
  Layers,
  Filter,
  Eye,
  ChevronDown,
} from 'lucide-react';
import Button from '../common/Button';
import type {
  ClusterInfo,
  ClusterMode,
  FocusDepth,
  NeuralNode,
  VisualMode,
} from './graphDataAdapter';
import { truncateMiddle } from '../../utils/formatters';

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
}

export default function NeuralMapControls(props: Props) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState('');

  const languages = useMemo(() => {
    return [...new Set(['python', 'javascript', 'typescript', ...props.nodes.map(n => n.language)])].filter(Boolean);
  }, [props.nodes]);

  const selectedNode = props.nodes.find(n => n.id === props.selected);

  // Filtered dropdown options
  const dropdownOptions = useMemo(() => {
    if (!fileSearch) return props.nodes.slice(0, 50);
    const q = fileSearch.toLowerCase();
    return props.nodes.filter(n => n.label.toLowerCase().includes(q)).slice(0, 50);
  }, [props.nodes, fileSearch]);

  return (
    <div className="space-y-3 p-3.5 sm:p-4 rounded-xl border border-white/15 bg-white/5 text-white text-xs">
      {/* Row 1: Search, Visual Mode & Reset */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search files by path or name"
            placeholder="Search files (e.g. auth, api, .tsx)..."
            value={props.search}
            onChange={e => props.onSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg text-xs bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-1 focus:ring-indigo"
          />
        </div>

        {/* Visual Mode Segmented Control (5 Modes including FLOW) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider mr-1">
            Mode:
          </span>
          {[
            { id: 'structure' as VisualMode, label: 'STRUCTURE' },
            { id: 'risk' as VisualMode, label: 'RISK' },
            { id: 'parse_quality' as VisualMode, label: 'PARSE' },
            { id: 'entry_points' as VisualMode, label: 'ENTRY POINTS' },
            { id: 'flow' as VisualMode, label: 'FLOW' },
          ].map(m => (
            <button
              key={m.id}
              type="button"
              onClick={() => props.onVisualMode(m.id)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold tracking-wide transition-all border ${
                props.visualMode === m.id
                  ? 'bg-indigo text-white border-indigo shadow-xs'
                  : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10 hover:text-white'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Reset View Button */}
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

      {/* Row 2: Quick Filters, Cluster Drilldown Chips, and Isolated Nodes Toggle */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 pt-2.5 border-t border-white/10">
        {/* Quick Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-indigo-on-dark" />
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
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold transition-colors border ${
                props.quickFilter === q.id
                  ? 'bg-white text-black border-white'
                  : 'bg-white/5 text-white/70 border-white/15 hover:border-white/30'
              }`}
            >
              {q.label}
            </button>
          ))}

          {/* Architecture Cluster Filter Chips */}
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
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                    props.activeCluster === c.id
                      ? 'bg-indigo text-white border-indigo'
                      : 'bg-white/5 text-white/70 border-white/15 hover:text-white'
                  }`}
                  style={{ color: props.activeCluster === c.id ? '#FFFFFF' : c.color }}
                  title={`Focus on ${c.label} cluster (${c.count} modules)`}
                >
                  {c.label} ({c.count})
                </button>
              ))}
            </>
          )}
        </div>

        {/* Isolated Nodes Toggle & Language Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={props.onToggleIsolated}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border transition-colors ${
              props.showIsolated
                ? 'bg-teal/20 text-teal-on-dark border-teal/40'
                : 'bg-white/5 text-white/50 border-white/15'
            }`}
            title="When off, hides standalone/unresolved nodes with 0 connected edges"
          >
            ISOLATED NODES: {props.showIsolated ? 'ON' : 'OFF'}
          </button>

          <span className="text-[11px] font-bold text-white/40 select-none">|</span>

          {['all', ...languages.slice(0, 4)].map(lang => (
            <button
              key={lang}
              type="button"
              onClick={() => props.onLanguage(lang)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase border transition-colors ${
                props.language === lang
                  ? 'bg-indigo/30 text-indigo-on-dark border-indigo/50'
                  : 'bg-white/5 text-white/60 border-white/15 hover:text-white'
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Row 3: Focus Depth, Cluster Grouping & File Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-white/10">
        {/* Focus Depth */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Eye className="w-3.5 h-3.5 text-teal" />
            Focus Depth:
          </span>
          {[
            { id: '1-hop' as FocusDepth, label: '1-HOP' },
            { id: '2-hop' as FocusDepth, label: '2-HOP' },
            { id: 'all' as FocusDepth, label: 'FULL GRAPH' },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => props.onFocusDepth(f.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                props.focusDepth === f.id
                  ? 'bg-teal/30 text-teal-on-dark border-teal/60'
                  : 'bg-white/5 text-white/60 border-white/15 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Cluster Grouping */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1 mr-1">
            <Layers className="w-3.5 h-3.5 text-indigo-on-dark" />
            Group By:
          </span>
          {[
            { id: 'none' as ClusterMode, label: 'NONE' },
            { id: 'folder' as ClusterMode, label: 'FOLDER' },
            { id: 'role' as ClusterMode, label: 'ROLE' },
            { id: 'language' as ClusterMode, label: 'LANGUAGE' },
          ].map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => props.onClusterMode(c.id)}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border transition-colors ${
                props.clusterMode === c.id
                  ? 'bg-indigo/30 text-indigo-on-dark border-indigo/60'
                  : 'bg-white/5 text-white/60 border-white/15 hover:text-white'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Searchable File Selector */}
        <div className="relative min-w-[220px]">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-surface text-ink text-xs font-mono border border-line shadow-xs hover:border-indigo transition-colors"
            title={selectedNode ? selectedNode.label : 'Select a file to inspect'}
          >
            <span className="truncate max-w-[180px]">
              {selectedNode ? truncateMiddle(selectedNode.label, 24) : 'Choose a file...'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-ink-3 ml-1 shrink-0" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-80 bg-surface border border-line rounded-lg shadow-2 z-50 p-2 space-y-1.5 text-ink">
              <input
                type="text"
                placeholder="Filter files..."
                value={fileSearch}
                onChange={e => setFileSearch(e.target.value)}
                autoFocus
                className="w-full px-2.5 py-1 text-xs font-mono rounded bg-tile border border-line focus:outline-none focus:border-indigo"
              />
              <div className="max-h-56 overflow-y-auto space-y-0.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    props.onSelect(null);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-2 py-1 rounded text-ink-3 hover:bg-tile"
                >
                  (Clear selection)
                </button>
                {dropdownOptions.map(n => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      props.onSelect(n.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded flex items-center justify-between hover:bg-tile ${
                      props.selected === n.id ? 'bg-indigo-surface text-indigo font-bold' : ''
                    }`}
                    title={n.label}
                  >
                    <span className="truncate">{n.label}</span>
                    <span className="text-[10px] text-ink-4 shrink-0 uppercase ml-2">{n.role}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import {
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  Position,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Workflow,
  Download,
  Info,
  Target,
  List,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  TestTube,
  Wand2,
} from 'lucide-react';
import { GraphResponse, TabType } from '../types';
import { truncateMiddle, formatNumber, getDownloadFileName } from '../utils/formatters';
import Button from './common/Button';
import StatTile from './common/StatTile';
import SearchField from './common/SearchField';
import SegmentedControl from './common/SegmentedControl';
import { ToggleChip, FilterChip } from './common/Chips';
import { LanguageTag, StatusTag } from './common/Tags';
import { useToast } from './common/Toast';

interface DependencyGraphTabProps {
  projectId?: string | null;
  projectName?: string;
  targetFile?: string | null;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

type GraphFilterMode = 'all' | 'entry_points' | 'high_complexity' | 'cycles' | 'upstream' | 'downstream';

// Custom React Flow node component
const GraphNodeComponent = ({ data }: any) => {
  const { node, isSelected, isCycle, isEntryPoint, isExternal } = data;

  let containerClass = 'bg-surface border border-line';
  if (isCycle) {
    containerClass = 'bg-red-surface border border-red-line shadow-xs';
  } else if (isEntryPoint) {
    containerClass = 'bg-surface border border-line border-l-4 border-l-teal shadow-xs';
  } else if (isExternal) {
    containerClass = 'bg-slate-surface border border-dashed border-slate shadow-none';
  }

  if (isSelected) {
    containerClass += ' ring-2 ring-indigo ring-offset-1';
  }

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Node ${node.label}, ${node.language}, ${node.line_count} lines`}
      className={`w-[200px] p-2.5 rounded-md transition-all select-none hover:shadow-2 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${containerClass}`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-indigo !border-surface" />

      {/* Row 1: mono path + language tag */}
      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="font-mono text-[12px] font-semibold text-ink truncate flex-1"
          title={node.label}
        >
          {truncateMiddle(node.label, 20)}
        </span>
        <LanguageTag language={node.language} />
      </div>

      {/* Row 2: Module info + lines */}
      <div className="flex items-center justify-between text-[11px] font-mono text-ink-3">
        <span>Module</span>
        <span className="num">{formatNumber(node.line_count)} lines</span>
      </div>

      {/* Row 3 (optional): cycle or entry badge */}
      {(isCycle || isEntryPoint) && (
        <div className="mt-1.5 pt-1.5 border-t border-line/60 flex items-center justify-between">
          {isCycle && <StatusTag status="critical" label="CRITICAL" />}
          {isEntryPoint && <StatusTag status="entry-point" label="ENTRY" />}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-indigo !border-surface" />
    </div>
  );
};

const nodeTypes = {
  custom: GraphNodeComponent,
};

// Auto-fit helper
const AutoFitView: React.FC<{ trigger: any }> = ({ trigger }) => {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.15, duration: 400 });
    }, 60);
    return () => clearTimeout(timer);
  }, [trigger, fitView]);
  return null;
};

export const DependencyGraphTab: React.FC<DependencyGraphTabProps> = ({
  projectId,
  projectName = 'project',
  targetFile,
  onInspectImpact,
  onNavigateTab,
  onSelectFile,
}) => {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [edgeFilter, setEdgeFilter] = useState<'all' | 'import' | 'require'>('all');
  const [filterMode, setFilterMode] = useState<GraphFilterMode>('all');
  const [includeExternal, setIncludeExternal] = useState(false);
  const [highlightCycles, setHighlightCycles] = useState(true);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { showToast } = useToast();

  const fetchGraph = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/graph?level=module`);
      if (!res.ok) throw new Error(`Failed to load dependency graph (${res.status})`);
      const data: GraphResponse = await res.json();
      setGraph(data);
    } catch (err: any) {
      setError(err.message || 'Unable to fetch dependency graph.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGraph();
  }, [projectId]);

  // Sync selected node with targetFile prop
  useEffect(() => {
    if (targetFile && graph) {
      const match = graph.nodes.find(
        (n) =>
          n.label.toLowerCase() === targetFile.toLowerCase() ||
          n.id === targetFile ||
          n.label.endsWith(targetFile)
      );
      if (match) setSelectedNodeId(match.id);
    }
  }, [targetFile, graph]);

  // Cycle node IDs set
  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (graph?.cycles) {
      graph.cycles.forEach((c) => c.forEach((id) => set.add(id)));
    }
    return set;
  }, [graph]);

  // Cycle edge IDs set
  const cycleEdgePairs = useMemo(() => {
    const set = new Set<string>();
    if (graph?.cycles) {
      graph.cycles.forEach((cycle) => {
        for (let i = 0; i < cycle.length; i++) {
          const u = cycle[i];
          const v = cycle[(i + 1) % cycle.length];
          set.add(`${u}->${v}`);
        }
      });
    }
    return set;
  }, [graph]);

  // Upstream and downstream sets for isolation
  const upstreamNodeIds = useMemo(() => {
    if (!selectedNodeId || !graph) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    graph.edges.forEach((e) => {
      if (e.target === selectedNodeId) set.add(e.source);
    });
    return set;
  }, [selectedNodeId, graph]);

  const downstreamNodeIds = useMemo(() => {
    if (!selectedNodeId || !graph) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    graph.edges.forEach((e) => {
      if (e.source === selectedNodeId) set.add(e.target);
    });
    return set;
  }, [selectedNodeId, graph]);

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => {
      if (!includeExternal && n.is_external) return false;
      if (searchQuery.trim() && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (filterMode === 'entry_points' && !n.is_entry_point) return false;
      if (filterMode === 'high_complexity' && n.complexity_rating !== 'high' && n.complexity_rating !== 'critical') {
        return false;
      }
      if (filterMode === 'cycles' && !cycleNodeIds.has(n.id)) return false;
      if (filterMode === 'upstream' && !upstreamNodeIds.has(n.id)) return false;
      if (filterMode === 'downstream' && !downstreamNodeIds.has(n.id)) return false;

      return true;
    });
  }, [graph, includeExternal, searchQuery, filterMode, cycleNodeIds, upstreamNodeIds, downstreamNodeIds]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filtered edges
  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    return graph.edges.filter((e) => {
      if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;
      if (edgeFilter === 'import' && e.type !== 'import') return false;
      if (edgeFilter === 'require' && e.type !== 'require') return false;
      return true;
    });
  }, [graph, filteredNodeIds, edgeFilter]);

  // React Flow Nodes
  const rfNodes: Node[] = useMemo(() => {
    const cols = Math.max(1, Math.ceil(Math.sqrt(filteredNodes.length * 1.5)));
    const nodeWidth = 230;
    const nodeHeight = 110;

    return filteredNodes.map((n, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const isCycle = cycleNodeIds.has(n.id) && highlightCycles;
      const isSelected = selectedNodeId === n.id;

      return {
        id: n.id,
        type: 'custom',
        position: { x: col * nodeWidth + (row % 2) * 30, y: row * nodeHeight },
        data: {
          node: n,
          isSelected,
          isCycle,
          isEntryPoint: n.is_entry_point,
          isExternal: n.is_external,
        },
      };
    });
  }, [filteredNodes, selectedNodeId, cycleNodeIds, highlightCycles]);

  // React Flow Edges with Type-Only visual distinction
  const rfEdges: Edge[] = useMemo(() => {
    return filteredEdges.map((e) => {
      const isCycle = cycleEdgePairs.has(`${e.source}->${e.target}`) && highlightCycles;
      const isConnectedToSelected =
        selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId);

      let stroke = 'rgba(77, 80, 215, 0.65)';
      let strokeWidth = 1.5;
      let strokeDasharray: string | undefined = undefined;
      let opacity = selectedNodeId ? (isConnectedToSelected ? 1 : 0.15) : 0.75;
      let label: string | undefined = undefined;

      if (isCycle) {
        stroke = 'var(--red)';
        strokeWidth = 2.2;
        strokeDasharray = '4 4';
        opacity = 1;
      } else if (e.is_type_only) {
        stroke = '#7862DE'; // Type-only import (violet)
        strokeWidth = 1.5;
        strokeDasharray = '3 3';
        label = 'type';
        opacity = selectedNodeId ? (isConnectedToSelected ? 0.9 : 0.15) : 0.65;
      } else if (isConnectedToSelected) {
        stroke = 'var(--indigo)';
        strokeWidth = 2.5;
        opacity = 1;
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isCycle,
        label,
        labelStyle: { fill: '#7862DE', fontSize: 10, fontFamily: 'monospace', fontWeight: 600 },
        style: { stroke, strokeWidth, strokeDasharray, opacity },
      };
    });
  }, [filteredEdges, cycleEdgePairs, highlightCycles, selectedNodeId]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !graph) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graph]);

  // Incoming / outgoing edge breakdown
  const incomingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.target === selectedNodeId);
  }, [selectedNodeId, graph]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.source === selectedNodeId);
  }, [selectedNodeId, graph]);

  const inRuntime = incomingEdges.filter((e) => !e.is_type_only).length;
  const inTypeOnly = incomingEdges.filter((e) => e.is_type_only).length;
  const outRuntime = outgoingEdges.filter((e) => !e.is_type_only).length;
  const outTypeOnly = outgoingEdges.filter((e) => e.is_type_only).length;

  const cyclesWithNode = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.cycles.filter((c) => c.includes(selectedNodeId));
  }, [selectedNodeId, graph]);

  const handleDownloadMermaid = () => {
    if (!graph) return;
    const filename = getDownloadFileName(projectName, 'dependency-graph', 'mmd');
    let mmd = 'graph TD\n';
    graph.nodes.forEach((n) => {
      const cleanLabel = n.label.replace(/[^a-zA-Z0-9_.-]/g, '_');
      mmd += `  ${cleanLabel}["${n.label}"]\n`;
    });
    graph.edges.forEach((e) => {
      const src = e.source.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const tgt = e.target.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const arrow = e.is_type_only ? '-.->' : '-->';
      mmd += `  ${src} ${arrow} ${tgt}\n`;
    });

    const blob = new Blob([mmd], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Downloaded ${filename}`, 'success');
  };

  if (!projectId) return null;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-32 w-full" />
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton h-16" />
          ))}
        </div>
        <div className="skeleton h-[480px] w-full" />
      </div>
    );
  }

  if (error || !graph) {
    return (
      <div className="p-8 bg-red-surface rounded-xl border border-red-line text-center">
        <p className="font-bold text-red-text text-sm mb-3">{error || 'Unable to load graph.'}</p>
        <Button variant="outline" size="sm" onClick={fetchGraph}>
          Retry
        </Button>
      </div>
    );
  }

  const cycleCount = graph.summary.cycle_count || graph.cycles.length || 0;

  return (
    <div className="space-y-6 animate-[fade-up_250ms_ease-out_both]" role="tabpanel" id="tabpanel-graph" aria-labelledby="tab-graph">
      {/* 1. Section Header Card */}
      <section className="bg-surface border border-line rounded-xl p-5 sm:p-6 shadow-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-line">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-11 h-11 rounded-md bg-indigo-surface text-indigo flex items-center justify-center shrink-0 border border-indigo/20"
              aria-hidden="true"
            >
              <Workflow className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-lg sm:text-[20px] text-ink leading-tight">
                  Code Relationships &amp; Architecture Map
                </h2>
                <StatusTag status="project-view" label="PROJECT VIEW" />
                {cycleCount > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-pill bg-red-surface text-red-text font-sans text-[11px] font-bold tracking-[0.04em] uppercase border border-red-line">
                    {cycleCount} DEPENDENCY {cycleCount === 1 ? 'LOOP' : 'LOOPS'}
                  </span>
                )}
              </div>
              <p className="font-sans text-xs text-ink-3 mt-0.5">
                Explore architectural dependencies, entry points, and verified runtime loops with type-only import separation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMermaid}
              icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
            >
              Download Mermaid
            </Button>
          </div>
        </div>

        {/* 6 Stat tiles across */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <StatTile label="Files shown" value={formatNumber(filteredNodes.length)} color="ink" />
          <StatTile label="Connections" value={formatNumber(filteredEdges.length)} color="indigo" />
          <StatTile label="Dependency loops" value={formatNumber(cycleCount)} color="red" />
          <StatTile label="Standalone files" value={formatNumber(graph.summary.orphan_count || 0)} color="amber" />
          <StatTile label="Entry points" value={formatNumber(graph.summary.entry_point_count || 0)} color="teal" />
          <StatTile label="Needs review" value={formatNumber(graph.summary.high_complexity_module_count || 0)} color="amber" />
        </div>
      </section>

      {/* 2. Subgraph Views Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-surface border border-line rounded-lg p-3 sm:px-4 shadow-1">
        <SearchField
          id="graph-search"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search files and modules…"
          resultCount={{ current: filteredNodes.length, total: graph.nodes.length, unit: 'nodes' }}
          className="w-full lg:w-64"
        />

        {/* Subgraph Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-ink-2 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-indigo" />
            View:
          </span>
          <FilterChip
            label="ALL"
            active={filterMode === 'all'}
            onClick={() => setFilterMode('all')}
          />
          <FilterChip
            label="ENTRY POINTS"
            active={filterMode === 'entry_points'}
            onClick={() => setFilterMode('entry_points')}
          />
          <FilterChip
            label="COMPLEX"
            active={filterMode === 'high_complexity'}
            onClick={() => setFilterMode('high_complexity')}
          />
          {cycleCount > 0 && (
            <FilterChip
              label={`CYCLES (${cycleCount})`}
              active={filterMode === 'cycles'}
              onClick={() => setFilterMode('cycles')}
            />
          )}
          {selectedNodeId && (
            <>
              <FilterChip
                label="UPSTREAM"
                active={filterMode === 'upstream'}
                onClick={() => setFilterMode(filterMode === 'upstream' ? 'all' : 'upstream')}
              />
              <FilterChip
                label="DOWNSTREAM"
                active={filterMode === 'downstream'}
                onClick={() => setFilterMode(filterMode === 'downstream' ? 'all' : 'downstream')}
              />
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* ALL | IMPORT | REQUIRE */}
          <SegmentedControl<'all' | 'import' | 'require'>
            options={[
              { id: 'all', label: 'ALL' },
              { id: 'import', label: 'IMPORT' },
              { id: 'require', label: 'REQUIRE' },
            ]}
            value={edgeFilter}
            onChange={setEdgeFilter}
          />

          <ToggleChip
            label={includeExternal ? 'EXT: ON' : 'EXT: OFF'}
            active={includeExternal}
            tone="slate"
            onToggle={() => setIncludeExternal((v) => !v)}
          />

          <ToggleChip
            label={highlightCycles ? 'CYCLES: ON' : 'CYCLES: OFF'}
            active={highlightCycles}
            tone="red"
            onToggle={() => setHighlightCycles((v) => !v)}
          />

          <Button
            variant={viewMode === 'list' ? 'indigo' : 'outline'}
            size="sm"
            onClick={() => setViewMode((m) => (m === 'graph' ? 'list' : 'graph'))}
            icon={<List className="w-3.5 h-3.5" strokeWidth={1.75} />}
          >
            {viewMode === 'list' ? 'Graph View' : 'List View'}
          </Button>
        </div>
      </div>

      {/* 3. Main Workspace: Graph Canvas vs List View + Side Panel */}
      {viewMode === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4 items-start">
          {/* React Flow Canvas */}
          <div className="relative w-full h-[540px] sm:h-[620px] rounded-lg border border-line overflow-hidden graph-dot-grid">
            <ReactFlowProvider>
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => {
                  setSelectedNodeId(node.id);
                  const nodeLabel = (node.data as any)?.node?.label || node.id;
                  onSelectFile?.(nodeLabel);
                }}
                onPaneClick={() => {
                  setSelectedNodeId(null);
                  if (filterMode === 'upstream' || filterMode === 'downstream') {
                    setFilterMode('all');
                  }
                }}
                minZoom={0.2}
                maxZoom={2.0}
                fitView
              >
                <AutoFitView trigger={filteredNodes.length} />
                <Controls
                  className="!m-3 !bg-surface !border !border-line !rounded-md !shadow-1 !overflow-hidden [&>button]:!border-b [&>button]:!border-line [&>button]:!w-9 [&>button]:!h-9"
                  showInteractive={false}
                />

                {/* Floating Legend */}
                <Panel position="bottom-left" className="!m-3 !ml-16">
                  <div className="bg-surface/95 backdrop-blur-sm border border-line rounded-pill px-3 py-1.5 shadow-1 flex items-center gap-3 text-xs flex-wrap">
                    <span className="font-bold text-ink-2">Legend:</span>
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo" /> Python
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber" /> JavaScript
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#7862DE]" /> TypeScript
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="w-2.5 h-0.5 border-t border-dashed border-[#7862DE]" /> Type Import
                    </span>
                    <span className="flex items-center gap-1.5 text-ink-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal" /> Entry
                    </span>
                    {cycleCount > 0 && (
                      <span className="flex items-center gap-1.5 text-red font-semibold">
                        <span className="w-2.5 h-2.5 rounded-full bg-red" /> Cycle
                      </span>
                    )}
                  </div>
                </Panel>

                <MiniMap
                  className="!m-3 hidden md:block !bg-surface !border !border-line !rounded-md !w-40 !h-28"
                  nodeColor={(node: any) => {
                    const lang = node.data?.node?.language?.toLowerCase() || '';
                    if (lang.includes('python')) return '#4D50D7';
                    if (lang.includes('javascript')) return '#B7822A';
                    if (lang.includes('typescript')) return '#7862DE';
                    return '#637F93';
                  }}
                  maskColor="rgba(231, 224, 211, 0.6)"
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {/* Selected Item Side Panel */}
          <div className="bg-surface border border-line rounded-lg p-5 shadow-1 min-h-[380px] flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-line mb-4 flex items-center justify-between">
                <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block">
                  SELECTED NODE
                </span>
                {selectedNodeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(null);
                      if (filterMode === 'upstream' || filterMode === 'downstream') setFilterMode('all');
                    }}
                    className="text-xs text-ink-3 hover:text-ink font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedNodeData ? (
                <div className="space-y-4">
                  <div>
                    <div className="font-mono font-bold text-[13px] text-ink break-all">
                      {selectedNodeData.label}
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <LanguageTag language={selectedNodeData.language} />
                      {cycleNodeIds.has(selectedNodeData.id) && (
                        <StatusTag status="critical" label="CRITICAL LOOP" />
                      )}
                      {selectedNodeData.is_entry_point && (
                        <StatusTag status="entry-point" label="ENTRY POINT" />
                      )}
                    </div>
                  </div>

                  {/* Cycle Warning if applicable */}
                  {cyclesWithNode.length > 0 && (
                    <div className="p-2.5 rounded-md bg-red-surface border border-red-line text-xs space-y-1 text-red-text">
                      <div className="font-bold flex items-center gap-1">
                        <span>Part of {cyclesWithNode.length} Runtime Loop(s)</span>
                      </div>
                      <p className="text-[11px] opacity-90">
                        Circular dependencies must be broken to enable isolated unit migration.
                      </p>
                    </div>
                  )}

                  {/* Lines / Degree / Type breakdown */}
                  <div className="bg-tile rounded-md p-3 border border-line text-xs space-y-1.5 text-ink-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-ink-3">Lines of Code:</span>
                      <span className="font-bold">{formatNumber(selectedNodeData.line_count)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Complexity:</span>
                      <span className="font-bold">{selectedNodeData.complexity_rating.toUpperCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Incoming callers:</span>
                      <span className="font-bold text-teal-strong">
                        {incomingEdges.length} ({inRuntime} run / {inTypeOnly} type)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Dependencies:</span>
                      <span className="font-bold text-indigo-text">
                        {outgoingEdges.length} ({outRuntime} run / {outTypeOnly} type)
                      </span>
                    </div>
                  </div>

                  {/* Subgraph Isolation Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <Button
                      variant={filterMode === 'upstream' ? 'indigo' : 'outline'}
                      size="sm"
                      onClick={() => setFilterMode(filterMode === 'upstream' ? 'all' : 'upstream')}
                      icon={<ArrowUpRight className="w-3 h-3" />}
                    >
                      Upstream
                    </Button>
                    <Button
                      variant={filterMode === 'downstream' ? 'indigo' : 'outline'}
                      size="sm"
                      onClick={() => setFilterMode(filterMode === 'downstream' ? 'all' : 'downstream')}
                      icon={<ArrowDownLeft className="w-3 h-3" />}
                    >
                      Downstream
                    </Button>
                  </div>

                  {/* Cross-tab action links */}
                  <div className="space-y-2 pt-2 border-t border-line">
                    <Button
                      variant="indigo"
                      size="sm"
                      onClick={() => {
                        onSelectFile?.(selectedNodeData.label);
                        onInspectImpact?.(selectedNodeData.label);
                      }}
                      icon={<Target className="w-3.5 h-3.5" strokeWidth={2} />}
                      className="w-full justify-center text-xs font-bold shadow-xs"
                    >
                      What breaks if I change this?
                    </Button>
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(selectedNodeData.label);
                          onNavigateTab?.('tests');
                        }}
                        icon={<TestTube className="w-3.5 h-3.5" />}
                        className="text-xs justify-center"
                      >
                        Tests
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onSelectFile?.(selectedNodeData.label);
                          onNavigateTab?.('refactor');
                        }}
                        icon={<Wand2 className="w-3.5 h-3.5" />}
                        className="text-xs justify-center"
                      >
                        Modernize
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 px-2 text-center text-ink-4 flex flex-col items-center">
                  <Info className="w-7 h-7 mb-2.5 stroke-1" />
                  <p className="text-xs text-ink-3 font-sans leading-relaxed">
                    Select any node on the graph canvas to inspect callers, runtime vs type dependencies, and cycles.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Accessible List View Table */
        <div
          role="region"
          aria-label="Dependency graph data table"
          className="bg-surface border border-line rounded-lg overflow-x-auto shadow-1"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-panel text-ink-2 font-bold uppercase tracking-wider text-[11px] border-b border-line">
              <tr>
                <th className="py-3 px-4">Module Path</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4 text-right">Lines</th>
                <th className="py-3 px-4">Complexity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-ink-2 font-mono">
              {filteredNodes.map((n) => {
                const isCycle = cycleNodeIds.has(n.id);
                return (
                  <tr
                    key={n.id}
                    className="hover:bg-tile/70 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedNodeId(n.id);
                      onSelectFile?.(n.label);
                      setViewMode('graph');
                    }}
                  >
                    <td className="py-3 px-4 font-bold text-indigo-text">
                      {truncateMiddle(n.label, 40)}
                    </td>
                    <td className="py-3 px-4">
                      <LanguageTag language={n.language} />
                    </td>
                    <td className="py-3 px-4 text-right num">
                      {formatNumber(n.line_count)}
                    </td>
                    <td className="py-3 px-4">
                      <StatusTag
                        status={`complexity-${n.complexity_rating.toLowerCase()}`}
                        label={n.complexity_rating.toUpperCase()}
                      />
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {isCycle ? (
                        <StatusTag status="critical" label="CYCLE MEMBER" />
                      ) : n.is_entry_point ? (
                        <StatusTag status="entry-point" label="ENTRY POINT" />
                      ) : (
                        <span className="text-ink-3 text-xs">Standard</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectFile?.(n.label);
                          onInspectImpact?.(n.label);
                        }}
                      >
                        Inspect
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default DependencyGraphTab;

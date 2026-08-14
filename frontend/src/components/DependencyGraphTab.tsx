import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  Handle,
  MiniMap,
  Node,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  ReactFlowProvider,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Download,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
} from 'lucide-react';
import { GraphNodeData, GraphResponse } from '../types';
import { complexityLabel, titleCase } from '../utils/presentation';

interface DependencyGraphTabProps {
  projectId?: string | null;
}

const GraphNodeView = ({ data }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-slate-950 !bg-indigo-400" />
    {data.nodeContent}
    <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-slate-950 !bg-indigo-400" />
  </>
);

const GRAPH_NODE_TYPES = { default: GraphNodeView };

const GraphCanvasContent: React.FC<{
  graph: GraphResponse;
  searchQuery: string;
  edgeTypeFilter: string;
  includeExternal: boolean;
  highlightCycles: boolean;
  nodeFocusFilter: string;
  onSelectNode: (node: GraphNodeData | null) => void;
  onDrillDown: (moduleId: string) => void;
}> = ({
  graph,
  searchQuery,
  edgeTypeFilter,
  includeExternal,
  highlightCycles,
  nodeFocusFilter,
  onSelectNode,
  onDrillDown,
}) => {
  // Create set of cycle node IDs
  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    graph.cycles.forEach((c) => c.forEach((id) => set.add(id)));
    return set;
  }, [graph.cycles]);

  // Layout Nodes Deterministically in a multi-row grid
  const initialNodes: Node[] = useMemo(() => {
    const filtered = graph.nodes.filter((n) => {
      if (!includeExternal && n.is_external) return false;
      if (nodeFocusFilter === 'review' && n.warning_count === 0 && n.complexity_score <= 10 && !cycleNodeIds.has(n.id)) return false;
      if (nodeFocusFilter === 'entry' && !n.is_entry_point) return false;
      if (searchQuery.trim()) {
        return n.label.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    const columns = Math.ceil(Math.sqrt(filtered.length * 1.5)) || 1;
    const xSpacing = 280;
    const ySpacing = 160;

    return filtered.map((n, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const isCycle = cycleNodeIds.has(n.id);

      // Color coding & borders
      let borderClass = 'border-slate-700 bg-slate-900';
      if (isCycle && highlightCycles) {
        borderClass = 'border-rose-500 bg-rose-950/40 shadow-rose-500/20 shadow-lg';
      } else if (n.is_external) {
        borderClass = 'border-purple-500/60 border-dashed bg-slate-950';
      } else if (n.language === 'python') {
        borderClass = 'border-blue-500/50 bg-slate-900';
      } else if (n.language === 'javascript') {
        borderClass = 'border-amber-500/50 bg-slate-900';
      }

      return {
        id: n.id,
        position: { x: col * xSpacing + 50, y: row * ySpacing + 50 },
        data: { raw: n },
        style: {
          background: 'transparent',
          border: 'none',
          padding: 0,
        },
        nodeContent: (
          <div
            onClick={() => onSelectNode(n)}
            onDoubleClick={() => !n.is_external && n.kind === 'module' && onDrillDown(n.id)}
            className={`p-3 rounded-xl border ${borderClass} transition-all duration-200 hover:scale-105 hover:z-20 cursor-pointer min-w-[200px] shadow-md`}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-mono text-xs font-bold text-white truncate max-w-[140px]" title={n.label}>
                {n.label}
              </span>
              <span
                className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                  n.is_external
                    ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                    : n.language === 'python'
                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                }`}
              >
                {n.is_external ? 'EXT' : n.language}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-2">
              <span>{n.kind}</span>
              {n.line_count > 0 && <span>{n.line_count.toLocaleString()} lines</span>}
            </div>

            {/* Badges footer */}
            <div className="flex flex-wrap gap-1 mt-2">
              {n.is_entry_point && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Entry
                </span>
              )}
              {n.warning_count > 0 && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {n.warning_count} {n.warning_count === 1 ? 'note' : 'notes'}
                </span>
              )}
              {n.complexity_score > 10 && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  {complexityLabel(n.complexity_rating, n.complexity_score)} complexity
                </span>
              )}
            </div>
          </div>
        ),
      };
    });
  }, [graph.nodes, searchQuery, includeExternal, highlightCycles, nodeFocusFilter, cycleNodeIds, onSelectNode, onDrillDown]);

  // Transform React Flow Edges
  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(initialNodes.map((n) => n.id));

    return graph.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .filter((e) => edgeTypeFilter === 'all' || e.type === edgeTypeFilter)
      .map((e) => {
        const isCycleEdge = cycleNodeIds.has(e.source) && cycleNodeIds.has(e.target);
        const strokeColor = isCycleEdge && highlightCycles ? '#f43f5e' : e.type === 'require' ? '#f59e0b' : '#6366f1';

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: isCycleEdge && highlightCycles,
          style: {
            stroke: strokeColor,
            strokeWidth: isCycleEdge && highlightCycles ? 2.5 : 1.5,
            strokeDasharray: e.type === 'require' ? '4,4' : undefined,
          },
          label: e.type !== 'import' ? e.type : undefined,
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#0f172a' },
        };
      });
  }, [graph.edges, initialNodes, edgeTypeFilter, highlightCycles, cycleNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const renderedNodes = useMemo(
    () => nodes.map((node: any) => ({ ...node, data: { ...node.data, nodeContent: node.nodeContent } })),
    [nodes]
  );

  return (
    <div className="relative h-[460px] w-full touch-none overflow-hidden rounded-xl border border-slate-800 bg-slate-950 sm:h-[560px]">
      {initialNodes.length === 0 && <div className="absolute inset-0 z-10 grid place-items-center p-8 text-center text-xs text-slate-500">No files match the active graph filters. Clear search or select “All files”.</div>}
      <ReactFlow
        nodes={renderedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={GRAPH_NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.12}
        maxZoom={2}
        panOnScroll
        zoomOnPinch
        zoomOnDoubleClick={false}
        colorMode="dark"
      >
        <Background color="#334155" gap={16} />
        <Controls className="bg-slate-900 border-slate-800 text-slate-200 fill-slate-200" />
        <MiniMap
          nodeColor={(node: any) => {
            const raw = node.data?.raw;
            if (raw?.is_external) return '#a855f7';
            if (raw?.language === 'python') return '#3b82f6';
            if (raw?.language === 'javascript') return '#f59e0b';
            return '#64748b';
          }}
          maskColor="rgba(15, 23, 42, 0.7)"
          className="hidden bg-slate-900 border-slate-800 rounded-xl sm:block"
        />

        <Panel position="bottom-left" className="hidden bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl text-[10px] text-slate-400 items-center space-x-3 backdrop-blur-md sm:flex">
          <span className="font-bold text-slate-300">Legend:</span>
          <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span><span>Python</span></span>
          <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span><span>JavaScript</span></span>
          <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span><span>External</span></span>
          <span className="flex items-center space-x-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span><span>Entry Point</span></span>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const DependencyGraphTab: React.FC<DependencyGraphTabProps> = ({ projectId }) => {
  const [graph, setGraph] = useState<GraphResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Controls state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string>('all');
  const [includeExternal, setIncludeExternal] = useState<boolean>(false);
  const [highlightCycles, setHighlightCycles] = useState<boolean>(true);
  const [nodeFocusFilter, setNodeFocusFilter] = useState<string>('all');
  const [selectedNode, setSelectedNode] = useState<GraphNodeData | null>(null);
  const [currentLevel, setCurrentLevel] = useState<'module' | 'symbol'>('module');

  const fetchGraph = useCallback(
    async (lvl: 'module' | 'symbol' = 'module', modId: string | null = null) => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      setPending(false);

      try {
        let url = `/api/projects/${projectId}/graph?level=${lvl}`;
        if (modId) {
          url += `&module_id=${encodeURIComponent(modId)}`;
        }
        if (edgeTypeFilter !== 'all') {
          url += `&edge_types=${encodeURIComponent(edgeTypeFilter)}`;
        }
        if (includeExternal) {
          url += `&include_external=true`;
        }
        const res = await fetch(url);

        if (res.status === 409) {
          const body = await res.json();
          setPending(true);
          setError(body.detail || 'Analysis is currently processing.');
          return;
        }

        if (!res.ok) {
          throw new Error(`Failed to fetch dependency graph (${res.status})`);
        }

        const data: GraphResponse = await res.json();
        setGraph(data);
        setCurrentLevel(lvl);
      } catch (err: any) {
        setError(err.message || 'Failed to load dependency graph.');
      } finally {
        setLoading(false);
      }
    },
    [projectId, edgeTypeFilter, includeExternal]
  );

  useEffect(() => {
    if (projectId) {
      fetchGraph('module', null);
    } else {
      setGraph(null);
    }
  }, [projectId, fetchGraph]);

  const handleDrillDown = (moduleId: string) => {
    fetchGraph('symbol', moduleId);
  };

  const handleBackToModules = () => {
    fetchGraph('module', null);
  };

  if (!projectId) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-4 bg-indigo-500/10 text-indigo-400 rounded-2xl border border-indigo-500/20 mb-4">
          <Cpu className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">No Repository Ingested</h3>
        <p className="text-xs text-slate-400 max-w-md">
          Please upload a legacy codebase archive or submit a GitHub repository to visualize its architecture and dependency graph.
        </p>
      </div>
    );
  }

  if (loading && !graph) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800 rounded-xl w-1/3"></div>
        <div className="h-[450px] bg-slate-800/40 rounded-xl"></div>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-10 text-center min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-4 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 mb-4 animate-spin">
          <RefreshCw className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Analysis Pending or In Progress</h3>
        <p className="text-xs text-slate-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => fetchGraph('module', null)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          Check Analysis Status
        </button>
      </div>
    );
  }

  if (error && !graph) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="p-4 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Graph Generation Failed</h3>
        <p className="text-xs text-slate-400 max-w-md mb-6">{error}</p>
        <button
          onClick={() => fetchGraph('module', null)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors"
        >
          Retry Graph Generation
        </button>
      </div>
    );
  }

  if (!graph) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner: Graph Metrics & Level Indicator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white">Code Relationships</h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  {currentLevel === 'module' ? 'Project View' : 'File Details'}
                </span>
                {graph.cycles.length > 0 && (
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    {graph.cycles.length} Dependency {graph.cycles.length === 1 ? 'Loop' : 'Loops'}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">See how files connect and identify areas that need attention.</p>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
          <a href={`/api/projects/${projectId}/graph/download`} className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-800"><Download className="h-3.5 w-3.5"/>Download Mermaid</a>
          {currentLevel === 'symbol' && (
            <button
              onClick={handleBackToModules}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors border border-slate-700"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Project View</span>
            </button>
          )}
          </div>
        </div>

        {/* Graph Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Files shown</span>
            <span className="text-lg font-bold text-white">{graph.summary.total_nodes}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Connections</span>
            <span className="text-lg font-bold text-indigo-300">{graph.summary.total_edges}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Dependency loops</span>
            <span className={`text-lg font-bold ${graph.summary.cycle_count > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {graph.summary.cycle_count}
            </span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Standalone files</span>
            <span className="text-lg font-bold text-amber-400">{graph.summary.orphan_count}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">Entry Points</span>
            <span className="text-lg font-bold text-emerald-400">{graph.summary.entry_point_count}</span>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
            <span className="text-[11px] text-slate-400 block mb-1">High complexity</span>
            <span className="text-lg font-bold text-orange-400">{graph.summary.high_complexity_module_count}</span>
          </div>
        </div>

        {graph.summary.truncated_edges_count > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300 flex items-center space-x-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>
              {graph.summary.truncated_edges_count} additional function call connection(s) are hidden to keep the graph readable.
            </span>
          </div>
        )}
      </div>

      {/* Graph Toolbar Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files and modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center space-x-1 border border-slate-800 bg-slate-950 rounded-xl p-1" aria-label="File focus filter">
            <Filter className="ml-1 h-3.5 w-3.5 text-slate-500"/>
            {[['all','All files'],['review','Needs review'],['entry','Entry points']].map(([value,label]) => <button key={value} onClick={() => setNodeFocusFilter(value)} className={`rounded-lg px-2 py-1 text-[9px] font-bold uppercase ${nodeFocusFilter === value ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>{label}</button>)}
          </div>
          {/* Edge Type Filter */}
          <div className="flex items-center space-x-1 border border-slate-800 bg-slate-950 rounded-xl p-1">
            {['all', 'import', 'require'].map((type) => (
              <button
                key={type}
                onClick={() => setEdgeTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg uppercase text-[10px] font-bold transition-colors ${
                  edgeTypeFilter === type
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* External Toggle */}
          <button
            onClick={() => setIncludeExternal(!includeExternal)}
            className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-bold border transition-colors ${
              includeExternal
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {includeExternal ? 'External: On' : 'External: Off'}
          </button>

          {/* Highlight Cycles Toggle */}
          <button
            onClick={() => setHighlightCycles(!highlightCycles)}
            className={`px-3 py-1.5 rounded-xl uppercase text-[10px] font-bold border transition-colors ${
              highlightCycles
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {highlightCycles ? 'Cycles: Highlighted' : 'Cycles: Normal'}
          </button>
        </div>
      </div>

      {/* Main Canvas & Details Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <ReactFlowProvider>
            <GraphCanvasContent
              graph={graph}
              searchQuery={searchQuery}
              edgeTypeFilter={edgeTypeFilter}
              includeExternal={includeExternal}
              highlightCycles={highlightCycles}
              nodeFocusFilter={nodeFocusFilter}
              onSelectNode={setSelectedNode}
              onDrillDown={handleDrillDown}
            />
          </ReactFlowProvider>
        </div>

        {/* Selected Node Detail Drawer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-4 border-b border-slate-800 pb-2">
              Selected Item
            </h3>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">{titleCase(selectedNode.kind)}</span>
                  <p className="font-mono text-sm font-bold text-white break-all">{selectedNode.label}</p>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Language:</span>
                    <span className="font-semibold">{titleCase(selectedNode.language)}</span>
                  </div>
                  {selectedNode.line_count > 0 && (
                    <div className="flex justify-between border-b border-slate-800/60 pb-1">
                      <span className="text-slate-400">Lines:</span>
                      <span>{selectedNode.line_count.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Complexity:</span>
                    <span className="font-semibold" title={`Score ${selectedNode.complexity_score}`}>{complexityLabel(selectedNode.complexity_rating, selectedNode.complexity_score)}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Suggestions:</span>
                    <span className="font-semibold">{selectedNode.warning_count}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Entry Point:</span>
                    <span className="font-semibold">{selectedNode.is_entry_point ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800/60 pb-1">
                    <span className="text-slate-400">Third-party:</span>
                    <span className="font-semibold">{selectedNode.is_external ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {!selectedNode.is_external && selectedNode.kind === 'module' && (
                  <button
                    onClick={() => handleDrillDown(selectedNode.id)}
                    className="w-full mt-4 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Functions and Classes</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>Tap a file to view details. Use the button that appears to open its functions and classes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyGraphTab;

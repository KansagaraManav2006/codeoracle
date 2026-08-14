import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  Edge,
  Handle,
  MarkerType,
  MiniMap,
  Node,
  Panel,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow,
  ReactFlowProvider,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Cpu,
  Download,
  Eye,
  Filter,
  Info,
  Network,
  RefreshCw,
  Search,
} from 'lucide-react';
import { GraphEdgeData, GraphNodeData, GraphResponse } from '../types';
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
  selectedNodeId: string | null;
  focusSelected: boolean;
  onSelectNode: (node: GraphNodeData | null) => void;
  onDrillDown: (moduleId: string) => void;
}> = ({
  graph,
  searchQuery,
  edgeTypeFilter,
  includeExternal,
  highlightCycles,
  nodeFocusFilter,
  selectedNodeId,
  focusSelected,
  onSelectNode,
  onDrillDown,
}) => {
  // Create set of cycle node IDs
  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    graph.cycles.forEach((c) => c.forEach((id) => set.add(id)));
    return set;
  }, [graph.cycles]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const ids = new Set<string>([selectedNodeId]);
    graph.edges.forEach((edge) => {
      if (edge.source === selectedNodeId) ids.add(edge.target);
      if (edge.target === selectedNodeId) ids.add(edge.source);
    });
    return ids;
  }, [graph.edges, selectedNodeId]);

  // Place entry points on the left and dependencies in successive columns.
  // This makes an arrow read naturally as "source depends on target".
  const initialNodes: Node[] = useMemo(() => {
    const filtered = graph.nodes.filter((n) => {
      if (!includeExternal && n.is_external) return false;
      if (focusSelected && selectedNodeId && !connectedNodeIds.has(n.id)) return false;
      if (nodeFocusFilter === 'review' && n.warning_count === 0 && n.complexity_score <= 10 && !cycleNodeIds.has(n.id)) return false;
      if (nodeFocusFilter === 'entry' && !n.is_entry_point) return false;
      if (searchQuery.trim()) {
        return n.label.toLowerCase().includes(searchQuery.toLowerCase());
      }
      return true;
    });

    const visibleIds = new Set(filtered.map((node) => node.id));
    const outgoing = new Map<string, string[]>();
    graph.edges.forEach((edge) => {
      if (!visibleIds.has(edge.source) || !visibleIds.has(edge.target)) return;
      outgoing.set(edge.source, [...(outgoing.get(edge.source) || []), edge.target]);
    });
    const depth = new Map<string, number>();
    const roots = filtered.filter((node) => node.is_entry_point).map((node) => node.id);
    const queue = (roots.length ? roots : filtered.slice(0, 1).map((node) => node.id)).map((id) => ({ id, level: 0 }));
    while (queue.length) {
      const current = queue.shift()!;
      if ((depth.get(current.id) ?? Number.POSITIVE_INFINITY) <= current.level) continue;
      depth.set(current.id, current.level);
      (outgoing.get(current.id) || []).forEach((target) => queue.push({ id: target, level: current.level + 1 }));
    }
    const maxDepth = Math.max(0, ...depth.values());
    filtered.forEach((node) => { if (!depth.has(node.id)) depth.set(node.id, maxDepth + 1); });
    const rowsByDepth = new Map<number, string[]>();
    filtered.forEach((node) => {
      const level = depth.get(node.id) || 0;
      rowsByDepth.set(level, [...(rowsByDepth.get(level) || []), node.id]);
    });
    const xSpacing = 300;
    const ySpacing = 150;

    return filtered.map((n) => {
      const col = depth.get(n.id) || 0;
      const row = (rowsByDepth.get(col) || []).indexOf(n.id);
      const isCycle = cycleNodeIds.has(n.id);
      const isSelected = selectedNodeId === n.id;
      const isRelated = !selectedNodeId || connectedNodeIds.has(n.id);

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
        position: { x: col * xSpacing + 40, y: row * ySpacing + 40 },
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
            className={`min-w-[210px] cursor-pointer rounded-xl border p-3 shadow-md transition-all duration-200 hover:z-20 hover:scale-[1.02] ${borderClass} ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-950' : ''} ${!isRelated ? 'opacity-35' : ''}`}
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
  }, [graph.nodes, graph.edges, searchQuery, includeExternal, highlightCycles, nodeFocusFilter, cycleNodeIds, onSelectNode, onDrillDown, selectedNodeId, connectedNodeIds, focusSelected]);

  // Transform React Flow Edges
  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(initialNodes.map((n) => n.id));

    return graph.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .filter((e) => edgeTypeFilter === 'all' || e.type === edgeTypeFilter)
      .map((e) => {
        const isCycleEdge = cycleNodeIds.has(e.source) && cycleNodeIds.has(e.target);
        const isSelectedEdge = Boolean(selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId));
        const isDimmed = Boolean(selectedNodeId && !isSelectedEdge);
        const strokeColor = isCycleEdge && highlightCycles ? '#f43f5e' : e.type === 'require' ? '#f59e0b' : '#6366f1';

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: isSelectedEdge || (isCycleEdge && highlightCycles),
          style: {
            stroke: strokeColor,
            strokeWidth: isSelectedEdge ? 3 : isCycleEdge && highlightCycles ? 2.5 : 1.5,
            opacity: isDimmed ? 0.18 : 1,
            strokeDasharray: e.type === 'require' ? '4,4' : undefined,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor, width: 18, height: 18 },
          label: isSelectedEdge ? (e.type === 'require' ? 'requires' : e.type === 'call' ? 'calls' : 'imports') : undefined,
          labelStyle: { fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#0f172a' },
        };
      });
  }, [graph.edges, initialNodes, edgeTypeFilter, highlightCycles, cycleNodeIds, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const { fitView } = useReactFlow();

  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    const fitTimer = window.setTimeout(() => fitView({ padding: 0.25, duration: 350 }), 60);
    return () => window.clearTimeout(fitTimer);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

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

const RelationshipList: React.FC<{
  title: string;
  tone: 'indigo' | 'emerald';
  items: Array<{ edge: GraphEdgeData; node: GraphNodeData }>;
  onSelect: (node: GraphNodeData) => void;
}> = ({ title, tone, items, onSelect }) => (
  <div>
    <h4 className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">{title}</h4>
    <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
      {items.map(({ edge, node }) => (
        <button key={edge.id} type="button" onClick={() => onSelect(node)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-2 text-left hover:border-slate-600 hover:bg-slate-800">
          <span className="min-w-0"><span className="block truncate font-mono text-[10px] text-slate-200" title={node.label}>{node.label}</span><span className={`mt-0.5 block text-[9px] ${tone === 'indigo' ? 'text-indigo-300' : 'text-emerald-300'}`}>{edge.type === 'require' ? 'requires' : edge.type === 'call' ? 'calls' : edge.type}</span></span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500"/>
        </button>
      ))}
    </div>
  </div>
);

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
  const [focusSelected, setFocusSelected] = useState<boolean>(false);
  const [currentLevel, setCurrentLevel] = useState<'module' | 'symbol'>('module');

  const nodeById = useMemo(() => new Map((graph?.nodes || []).map((node) => [node.id, node])), [graph]);
  const outgoingRelations = useMemo<Array<{ edge: GraphEdgeData; node: GraphNodeData }>>(
    () => selectedNode && graph ? graph.edges.filter((edge) => edge.source === selectedNode.id).flatMap((edge) => { const node = nodeById.get(edge.target); return node ? [{ edge, node }] : []; }) : [],
    [graph, selectedNode, nodeById]
  );
  const incomingRelations = useMemo<Array<{ edge: GraphEdgeData; node: GraphNodeData }>>(
    () => selectedNode && graph ? graph.edges.filter((edge) => edge.target === selectedNode.id).flatMap((edge) => { const node = nodeById.get(edge.source); return node ? [{ edge, node }] : []; }) : [],
    [graph, selectedNode, nodeById]
  );

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
    setSelectedNode(null);
    setFocusSelected(false);
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

      <div className="grid gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4 text-xs text-slate-300 sm:grid-cols-3">
        <div className="flex gap-2"><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-indigo-400"/><span><strong className="text-white">Follow the arrow:</strong> the file at the tail imports, requires, or calls the file at the arrowhead.</span></div>
        <div className="flex gap-2"><Network className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400"/><span><strong className="text-white">Tap a file:</strong> its direct connections become brighter and are explained in the side panel.</span></div>
        <div className="flex gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-400"/><span><strong className="text-white">Connection styles:</strong> solid purple means import; dashed amber means CommonJS require; red marks a loop.</span></div>
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
              selectedNodeId={selectedNode?.id || null}
              focusSelected={focusSelected}
              onSelectNode={setSelectedNode}
              onDrillDown={handleDrillDown}
            />
          </ReactFlowProvider>
        </div>

        {/* Selected Node Detail Drawer */}
        <div className="min-h-[400px] rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
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
                    <span className="text-slate-400">Functions / classes:</span>
                    <span className="font-semibold">{selectedNode.symbol_count}</span>
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

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-3"><span className="block text-[10px] uppercase text-indigo-300">Depends on</span><strong className="mt-1 block text-xl text-white">{outgoingRelations.length}</strong></div>
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3"><span className="block text-[10px] uppercase text-emerald-300">Used by</span><strong className="mt-1 block text-xl text-white">{incomingRelations.length}</strong></div>
                </div>

                {(outgoingRelations.length > 0 || incomingRelations.length > 0) && (
                  <button type="button" onClick={() => setFocusSelected((value) => !value)} className={`w-full rounded-xl border px-3 py-2 text-xs font-semibold transition-colors ${focusSelected ? 'border-indigo-500 bg-indigo-600 text-white' : 'border-slate-700 bg-slate-950 text-slate-300 hover:bg-slate-800'}`}>
                    {focusSelected ? 'Show whole graph' : 'Focus direct connections'}
                  </button>
                )}

                {outgoingRelations.length > 0 && <RelationshipList title="This file depends on" tone="indigo" items={outgoingRelations} onSelect={setSelectedNode}/>}
                {incomingRelations.length > 0 && <RelationshipList title="Files that use this" tone="emerald" items={incomingRelations} onSelect={setSelectedNode}/>}

                {!selectedNode.is_external && selectedNode.kind === 'module' && selectedNode.symbol_count > 0 && (
                  <button
                    onClick={() => handleDrillDown(selectedNode.id)}
                    className="w-full mt-4 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-2"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open {selectedNode.symbol_count} functions / classes</span>
                  </button>
                )}
                {!selectedNode.is_external && selectedNode.kind === 'module' && selectedNode.symbol_count === 0 && (
                  <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 text-[11px] leading-5 text-slate-400">No functions or classes were detected in this file, so symbol-level drill-down is not available.</div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500 text-xs">
                <Info className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>Tap a file to see what it depends on, which files use it, and whether symbol-level details are available.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyGraphTab;

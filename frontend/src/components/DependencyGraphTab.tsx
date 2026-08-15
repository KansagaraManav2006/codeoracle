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
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  AlertTriangle,
  ArrowLeft,
  Cpu,
  Download,
  Eye,
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
    <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-[#FFFDFC] !bg-[#4C4FD6]" />
    {data.nodeContent}
    <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-[#FFFDFC] !bg-[#4C4FD6]" />
  </>
);

const GRAPH_NODE_TYPES = { default: GraphNodeView };

// Helper component to trigger auto-fit zoom on load/updates
const AutoFitController: React.FC<{ nodesLength: number }> = ({ nodesLength }) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodesLength > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [nodesLength, fitView]);

  return null;
};

const GraphCanvasContent: React.FC<{
  graph: GraphResponse;
  searchQuery: string;
  edgeTypeFilter: string;
  includeExternal: boolean;
  highlightCycles: boolean;
  onSelectNode: (node: GraphNodeData | null) => void;
  onDrillDown: (moduleId: string) => void;
}> = ({
  graph,
  searchQuery,
  edgeTypeFilter,
  includeExternal,
  highlightCycles,
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

      // Color coding & borders for light theme
      let borderClass = 'border-[#D8CFC2] bg-[#FFFDFC] text-[#292622]';
      if (isCycle && highlightCycles) {
        borderClass = 'border-[#C45F58] bg-[#F6E5E2] text-[#8F3F3A] shadow-[0_4px_16px_rgba(196,95,88,0.15)]';
      } else if (n.is_external) {
        borderClass = 'border-[#5D8194]/60 border-dashed bg-[#E6EFF2]/60 text-[#3D657A]';
      } else if (n.language === 'python') {
        borderClass = 'border-[#C8DCE4] bg-[#FFFDFC] text-[#292622]';
      } else if (n.language === 'javascript') {
        borderClass = 'border-[#E6D3A9] bg-[#FFFDFC] text-[#292622]';
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
            className={`p-3.5 rounded-2xl border ${borderClass} transition-all duration-200 hover:scale-105 hover:shadow-warm hover:z-20 cursor-pointer min-w-[210px] shadow-sm`}
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="font-mono text-xs font-bold truncate max-w-[140px]" title={n.label}>
                {n.label}
              </span>
              <span
                className={`text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded-full border ${
                  n.is_external
                    ? 'bg-[#E6EFF2] text-[#3D657A] border-[#C8DCE4]'
                    : n.language === 'python'
                    ? 'bg-[#E6EFF2] text-[#3D657A] border-[#C8DCE4]'
                    : 'bg-[#F5E8CC] text-[#76561B] border-[#E6D3A9]'
                }`}
              >
                {n.is_external ? 'EXT' : n.language}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#6B645A] font-mono mt-2">
              <span className="capitalize">{n.kind}</span>
              {n.line_count > 0 && <span>{n.line_count.toLocaleString()} lines</span>}
            </div>

            {/* Badges footer */}
            <div className="flex flex-wrap gap-1 mt-2.5 pt-2 border-t border-[#D8CFC2]/50">
              {n.is_entry_point && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#E0EFEB] text-[#245F59] border border-[#BEE0D6]">
                  Entry
                </span>
              )}
              {n.warning_count > 0 && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#F5E8CC] text-[#76561B] border border-[#E6D3A9]">
                  {n.warning_count} {n.warning_count === 1 ? 'note' : 'notes'}
                </span>
              )}
              {n.complexity_score > 10 && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#F6E5E2] text-[#8F3F3A] border border-[#ECC7C3]">
                  {complexityLabel(n.complexity_rating, n.complexity_score)}
                </span>
              )}
            </div>
          </div>
        ),
      };
    });
  }, [graph.nodes, searchQuery, includeExternal, highlightCycles, cycleNodeIds, onSelectNode, onDrillDown]);

  // Transform React Flow Edges
  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(initialNodes.map((n) => n.id));

    return graph.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .filter((e) => edgeTypeFilter === 'all' || e.type === edgeTypeFilter)
      .map((e) => {
        const isCycleEdge = cycleNodeIds.has(e.source) && cycleNodeIds.has(e.target);
        const strokeColor =
          isCycleEdge && highlightCycles ? '#C45F58' : e.type === 'require' ? '#C7953D' : '#4C4FD6';

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
          labelStyle: { fill: '#4D4842', fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#FFFDFC' },
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
    <div className="relative h-[420px] w-full overflow-hidden rounded-[20px] border border-[#D8CFC2] bg-[#EFE9DD]/50 graph-dot-grid sm:h-[520px]">
      <AutoFitController nodesLength={renderedNodes.length} />
      <ReactFlow
        nodes={renderedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={GRAPH_NODE_TYPES}
        fitView
        colorMode="light"
      >
        <Background color="#D8CFC2" gap={20} size={1.5} />
        <Controls className="bg-[#FFFDFC] border-[#D8CFC2] text-[#292622] fill-[#292622] shadow-sm rounded-xl" />
        <MiniMap
          nodeColor={(node: any) => {
            const raw = node.data?.raw;
            if (raw?.is_external) return '#5D8194';
            if (raw?.language === 'python') return '#4C4FD6';
            if (raw?.language === 'javascript') return '#C7953D';
            return '#948C81';
          }}
          maskColor="rgba(247, 244, 238, 0.7)"
          className="bg-[#FFFDFC] border-[#D8CFC2] rounded-xl shadow-sm"
        />

        <Panel
          position="bottom-left"
          className="bg-[#FFFDFC]/95 border border-[#D8CFC2] p-2.5 rounded-xl text-[10px] text-[#4D4842] flex items-center space-x-3 backdrop-blur-md shadow-xs"
        >
          <span className="font-bold text-[#292622]">Legend:</span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4C4FD6]"></span>
            <span>Python</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C7953D]"></span>
            <span>JavaScript</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#5D8194]"></span>
            <span>External</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#368A80]"></span>
            <span>Entry Point</span>
          </span>
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
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-10 text-center min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-3.5 bg-[#EAE9FB] text-[#4340A0] rounded-2xl border border-[#C7C4F7] mb-3">
          <Cpu className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#292622] mb-1">No Repository Ingested</h3>
        <p className="text-xs text-[#6B645A] max-w-md">
          Upload a legacy codebase archive or submit a GitHub repository to visualize its architecture and dependency graph.
        </p>
      </div>
    );
  }

  if (loading && !graph) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-[#F0EBE2] rounded-xl w-1/3"></div>
        <div className="h-[450px] bg-[#EFE9DD]/60 rounded-[20px]"></div>
      </div>
    );
  }

  if (pending) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-10 text-center min-h-[350px] flex flex-col items-center justify-center">
        <div className="p-3.5 bg-[#F5E8CC] text-[#C7953D] rounded-2xl border border-[#E6D3A9] mb-3 animate-spin">
          <RefreshCw className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#292622] mb-1">Analysis Pending or In Progress</h3>
        <p className="text-xs text-[#6B645A] max-w-md mb-5">{error}</p>
        <button onClick={() => fetchGraph('module', null)} className="btn-brand-pill px-5 py-2 text-xs">
          Check Analysis Status
        </button>
      </div>
    );
  }

  if (error && !graph) {
    return (
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-8 text-center min-h-[300px] flex flex-col items-center justify-center">
        <div className="p-3.5 bg-[#F6E5E2] text-[#C45F58] rounded-2xl border border-[#ECC7C3] mb-3">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-[#292622] mb-1">Graph Generation Failed</h3>
        <p className="text-xs text-[#6B645A] max-w-md mb-5">{error}</p>
        <button onClick={() => fetchGraph('module', null)} className="btn-brand-pill px-5 py-2 text-xs">
          Retry Graph Generation
        </button>
      </div>
    );
  }

  if (!graph) return null;

  return (
    <div className="space-y-6">
      {/* Top Banner: Graph Metrics & Level Indicator */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[24px] p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#D8CFC2] pb-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-[#EAE9FB] border border-[#C7C4F7] rounded-2xl text-[#4340A0]">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-extrabold text-[#292622]">Code Relationships</h2>
                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7]">
                  {currentLevel === 'module' ? 'Project View' : 'File Details'}
                </span>
                {graph.cycles.length > 0 && (
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-[#F6E5E2] text-[#8F3F3A] border border-[#ECC7C3]">
                    {graph.cycles.length} Dependency {graph.cycles.length === 1 ? 'Loop' : 'Loops'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B645A] mt-0.5">
                See how files connect and identify areas that need attention.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {currentLevel === 'module' && (
              <a
                href={`/api/projects/${projectId}/graph/download`}
                className="btn-brand-outline-pill px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Mermaid</span>
              </a>
            )}
            {currentLevel === 'symbol' && (
              <button
                onClick={handleBackToModules}
                className="btn-brand-outline-pill px-4 py-2 text-xs flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Project View</span>
              </button>
            )}
          </div>
        </div>

        {/* Graph Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          <div className="bg-[#F0EBE2]/60 p-3 rounded-2xl border border-[#D8CFC2]">
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Files shown</span>
            <span className="text-lg font-extrabold text-[#292622]">{graph.summary.total_nodes}</span>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3 rounded-2xl border border-[#D8CFC2]">
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Connections</span>
            <span className="text-lg font-extrabold text-[#4C4FD6]">{graph.summary.total_edges}</span>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3 rounded-2xl border border-[#D8CFC2]">
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Dependency loops</span>
            <span
              className={`text-lg font-extrabold ${
                graph.summary.cycle_count > 0 ? 'text-[#C45F58]' : 'text-[#368A80]'
              }`}
            >
              {graph.summary.cycle_count}
            </span>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3 rounded-2xl border border-[#D8CFC2]">
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Standalone files</span>
            <span className="text-lg font-extrabold text-[#C7953D]">{graph.summary.orphan_count}</span>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3 rounded-2xl border border-[#D8CFC2]">
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Entry Points</span>
            <span className="text-lg font-extrabold text-[#368A80]">{graph.summary.entry_point_count}</span>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3 rounded-2xl border border-[#D8CFC2]">
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Needs review</span>
            <span className="text-lg font-extrabold text-[#C7953D]">{graph.summary.high_complexity_module_count}</span>
          </div>
        </div>

        {graph.summary.truncated_edges_count > 0 && (
          <div className="bg-[#F5E8CC] border border-[#E6D3A9] rounded-xl p-3 text-xs font-semibold text-[#76561B] flex items-center space-x-2">
            <Info className="w-4 h-4 shrink-0 text-[#C7953D]" />
            <span>
              {graph.summary.truncated_edges_count} additional connection(s) hidden to keep graph readable.
            </span>
          </div>
        )}
      </div>

      {/* Graph Toolbar Controls */}
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-[#6B645A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search files and modules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#EFE9DD]/50 border border-[#D8CFC2] rounded-full pl-9 pr-4 py-1.5 text-xs text-[#292622] placeholder-[#6B645A] focus:outline-none focus:border-[#4C4FD6] focus:bg-[#FFFDFC] transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Edge Type Filter */}
          <div className="flex items-center space-x-1 border border-[#D8CFC2] bg-[#F0EBE2] rounded-full p-1">
            {['all', 'import', 'require'].map((type) => (
              <button
                key={type}
                onClick={() => setEdgeTypeFilter(type)}
                className={`px-3 py-1 rounded-full uppercase text-[10px] font-bold transition-all ${
                  edgeTypeFilter === type
                    ? 'bg-[#EAE9FB] text-[#4340A0] shadow-xs'
                    : 'text-[#4D4842] hover:text-[#292622]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* External Toggle */}
          <button
            onClick={() => setIncludeExternal(!includeExternal)}
            className={`px-3.5 py-1.5 rounded-full uppercase text-[10px] font-bold border transition-colors ${
              includeExternal
                ? 'bg-[#E6EFF2] text-[#3D657A] border-[#C8DCE4]'
                : 'bg-[#FFFDFC] text-[#6B645A] border-[#D8CFC2] hover:bg-[#F0EBE2]'
            }`}
          >
            {includeExternal ? 'External: On' : 'External: Off'}
          </button>

          {/* Highlight Cycles Toggle */}
          <button
            onClick={() => setHighlightCycles(!highlightCycles)}
            className={`px-3.5 py-1.5 rounded-full uppercase text-[10px] font-bold border transition-colors ${
              highlightCycles
                ? 'bg-[#F6E5E2] text-[#8F3F3A] border-[#ECC7C3]'
                : 'bg-[#FFFDFC] text-[#6B645A] border-[#D8CFC2] hover:bg-[#F0EBE2]'
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
              onSelectNode={setSelectedNode}
              onDrillDown={handleDrillDown}
            />
          </ReactFlowProvider>
        </div>

        {/* Selected Node Detail Drawer */}
        <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-5 shadow-xs flex flex-col justify-between min-h-[400px]">
          <div>
            <h3 className="text-xs uppercase font-extrabold text-[#6B645A] tracking-wider mb-4 border-b border-[#D8CFC2] pb-2">
              Selected Item
            </h3>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-[#4C4FD6] block mb-0.5">
                    {titleCase(selectedNode.kind)}
                  </span>
                  <p className="font-mono text-sm font-bold text-[#292622] break-all">{selectedNode.label}</p>
                </div>

                <div className="space-y-2.5 text-xs text-[#4D4842]">
                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Language:</span>
                    <span className="font-bold">{titleCase(selectedNode.language)}</span>
                  </div>
                  {selectedNode.line_count > 0 && (
                    <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                      <span className="text-[#6B645A]">Lines:</span>
                      <span className="font-semibold">{selectedNode.line_count.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Complexity:</span>
                    <span className="font-bold" title={`Score ${selectedNode.complexity_score}`}>
                      {complexityLabel(selectedNode.complexity_rating, selectedNode.complexity_score)}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Suggestions:</span>
                    <span className="font-bold text-[#C7953D]">{selectedNode.warning_count}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Entry Point:</span>
                    <span className="font-bold">{selectedNode.is_entry_point ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#D8CFC2]/60 pb-1.5">
                    <span className="text-[#6B645A]">Third-party:</span>
                    <span className="font-bold">{selectedNode.is_external ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                {!selectedNode.is_external && selectedNode.kind === 'module' && (
                  <button
                    onClick={() => handleDrillDown(selectedNode.id)}
                    className="btn-brand-pill w-full mt-4 py-2 px-3 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Functions and Classes</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="text-center py-14 text-[#948C81] text-xs space-y-2">
                <Info className="w-6 h-6 mx-auto text-[#948C81] opacity-60" />
                <p>Select an item to view details. Double-click a file to see its functions and classes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyGraphTab;

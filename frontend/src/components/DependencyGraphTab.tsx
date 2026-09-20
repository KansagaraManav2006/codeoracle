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
  ArrowDownRight,
  ArrowLeft,
  ArrowUpRight,
  Cpu,
  Download,
  Eye,
  Filter,
  Info,
  RefreshCw,
  Search,
  Target,
  X,
} from 'lucide-react';
import { GraphEdgeData, GraphNodeData, GraphResponse } from '../types';
import { complexityLabel, titleCase } from '../utils/presentation';

interface DependencyGraphTabProps {
  projectId?: string | null;
  targetFile?: string | null;
  onInspectImpact?: (filePath: string) => void;
}

export type FilterMode = 'all' | 'upstream' | 'downstream' | 'cycles' | 'entry_points' | 'high_complexity';

const GraphNodeView = ({ data }: any) => (
  <>
    <Handle type="target" position={Position.Left} className="!h-2.5 !w-2.5 !border-[#FFFDFC] !bg-[#4C4FD6]" />
    {data.nodeContent}
    <Handle type="source" position={Position.Right} className="!h-2.5 !w-2.5 !border-[#FFFDFC] !bg-[#4C4FD6]" />
  </>
);

const GRAPH_NODE_TYPES = { default: GraphNodeView };

// Helper component to trigger auto-fit zoom on load/updates
const AutoFitController: React.FC<{ nodesLength: number; filterMode: FilterMode }> = ({ nodesLength, filterMode }) => {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (nodesLength > 0) {
      const timer = setTimeout(() => {
        fitView({ padding: 0.2, duration: 400 });
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [nodesLength, filterMode, fitView]);

  return null;
};

// BFS to find all upstream caller nodes (ancestors)
const getUpstreamNodeIds = (startId: string, edges: GraphEdgeData[]): Set<string> => {
  const result = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const e of edges) {
      if (e.target === curr && !result.has(e.source)) {
        result.add(e.source);
        queue.push(e.source);
      }
    }
  }
  return result;
};

// BFS to find all downstream dependency nodes (descendants)
const getDownstreamNodeIds = (startId: string, edges: GraphEdgeData[]): Set<string> => {
  const result = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const curr = queue.shift()!;
    for (const e of edges) {
      if (e.source === curr && !result.has(e.target)) {
        result.add(e.target);
        queue.push(e.target);
      }
    }
  }
  return result;
};

const GraphCanvasContent: React.FC<{
  graph: GraphResponse;
  searchQuery: string;
  edgeTypeFilter: string;
  includeExternal: boolean;
  highlightCycles: boolean;
  filterMode: FilterMode;
  selectedNode: GraphNodeData | null;
  onSelectNode: (node: GraphNodeData | null) => void;
  onDrillDown: (moduleId: string) => void;
}> = ({
  graph,
  searchQuery,
  edgeTypeFilter,
  includeExternal,
  highlightCycles,
  filterMode,
  selectedNode,
  onSelectNode,
  onDrillDown,
}) => {
  // Create set of cycle node IDs
  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    graph.cycles.forEach((c) => c.forEach((id) => set.add(id)));
    return set;
  }, [graph.cycles]);

  // Connected sets for selected node focus
  const upstreamNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return getUpstreamNodeIds(selectedNode.id, graph.edges);
  }, [selectedNode, graph.edges]);

  const downstreamNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    return getDownstreamNodeIds(selectedNode.id, graph.edges);
  }, [selectedNode, graph.edges]);

  const immediateConnectedIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const set = new Set<string>([selectedNode.id]);
    graph.edges.forEach((e) => {
      if (e.source === selectedNode.id) set.add(e.target);
      if (e.target === selectedNode.id) set.add(e.source);
    });
    return set;
  }, [selectedNode, graph.edges]);

  // Filter nodes based on active filter mode
  const filteredRawNodes = useMemo(() => {
    return graph.nodes.filter((n) => {
      if (!includeExternal && n.is_external) return false;
      if (searchQuery.trim() && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      switch (filterMode) {
        case 'cycles':
          return cycleNodeIds.has(n.id);
        case 'entry_points':
          return n.is_entry_point;
        case 'high_complexity':
          return n.complexity_rating === 'high' || n.complexity_rating === 'critical' || n.complexity_score >= 15;
        case 'upstream':
          return selectedNode ? upstreamNodeIds.has(n.id) : true;
        case 'downstream':
          return selectedNode ? downstreamNodeIds.has(n.id) : true;
        case 'all':
        default:
          return true;
      }
    });
  }, [graph.nodes, includeExternal, searchQuery, filterMode, cycleNodeIds, selectedNode, upstreamNodeIds, downstreamNodeIds]);

  // Layout Nodes Deterministically in a multi-row grid
  const initialNodes: Node[] = useMemo(() => {
    const columns = Math.ceil(Math.sqrt(filteredRawNodes.length * 1.5)) || 1;
    const xSpacing = 290;
    const ySpacing = 170;

    return filteredRawNodes.map((n, idx) => {
      const col = idx % columns;
      const row = Math.floor(idx / columns);
      const isCycle = cycleNodeIds.has(n.id);
      const isSelected = selectedNode?.id === n.id;
      const isConnected = selectedNode ? immediateConnectedIds.has(n.id) : true;
      const isUpstream = selectedNode && selectedNode.id !== n.id && upstreamNodeIds.has(n.id);
      const isDownstream = selectedNode && selectedNode.id !== n.id && downstreamNodeIds.has(n.id);

      // Node styling classes
      let borderClass = 'border-[#D8CFC2] bg-[#FFFDFC] text-[#292622]';
      if (isSelected) {
        borderClass = 'border-[#4C4FD6] bg-[#FFFDFC] text-[#292622] ring-2 ring-[#4C4FD6] shadow-[0_4px_16px_rgba(76,79,214,0.2)]';
      } else if (isCycle && highlightCycles) {
        borderClass = 'border-[#C45F58] bg-[#F6E5E2] text-[#8F3F3A] shadow-[0_4px_16px_rgba(196,95,88,0.15)]';
      } else if (n.is_external) {
        borderClass = 'border-[#5D8194]/60 border-dashed bg-[#E6EFF2]/60 text-[#3D657A]';
      } else if (n.language === 'python') {
        borderClass = 'border-[#C8DCE4] bg-[#FFFDFC] text-[#292622]';
      } else if (n.language === 'javascript') {
        borderClass = 'border-[#E6D3A9] bg-[#FFFDFC] text-[#292622]';
      } else if (n.language === 'typescript') {
        borderClass = 'border-[#C7C4F7] bg-[#FFFDFC] text-[#292622]';
      }

      // Dimming when a specific node is selected and this node is unconnected
      const opacityClass = selectedNode && !isConnected && filterMode === 'all' ? 'opacity-35 hover:opacity-100' : 'opacity-100';

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
            className={`p-3.5 rounded-2xl border ${borderClass} ${opacityClass} transition-all duration-200 hover:scale-105 hover:shadow-warm hover:z-20 cursor-pointer min-w-[210px] shadow-sm`}
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
              {isUpstream && filterMode === 'all' && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7]">
                  Upstream
                </span>
              )}
              {isDownstream && filterMode === 'all' && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#E6EFF2] text-[#3D657A] border border-[#C8DCE4]">
                  Downstream
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
              {n.standalone_reason && (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-full bg-[#F0EBE2] text-[#6B645A] border border-[#D8CFC2]">
                  Standalone
                </span>
              )}
            </div>
          </div>
        ),
      };
    });
  }, [
    filteredRawNodes,
    cycleNodeIds,
    selectedNode,
    immediateConnectedIds,
    upstreamNodeIds,
    downstreamNodeIds,
    highlightCycles,
    filterMode,
    onSelectNode,
    onDrillDown,
  ]);

  // Transform React Flow Edges
  const initialEdges: Edge[] = useMemo(() => {
    const nodeIds = new Set(initialNodes.map((n) => n.id));

    return graph.edges
      .filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target))
      .filter((e) => edgeTypeFilter === 'all' || e.type === edgeTypeFilter)
      .map((e) => {
        const isCycleEdge = cycleNodeIds.has(e.source) && cycleNodeIds.has(e.target);
        const isConnectedToSelected = selectedNode ? e.source === selectedNode.id || e.target === selectedNode.id : true;

        // Color coding
        let strokeColor = '#4C4FD6';
        let strokeDasharray: string | undefined = undefined;

        if (isCycleEdge && highlightCycles) {
          strokeColor = '#C45F58';
        } else if (e.is_type_only) {
          strokeColor = '#7B61D1';
          strokeDasharray = '5,5';
        } else if (e.is_dynamic) {
          strokeColor = '#C7953D';
          strokeDasharray = '2,3';
        } else if (e.type === 'require') {
          strokeColor = '#C7953D';
          strokeDasharray = '4,4';
        }

        const edgeOpacity = selectedNode && !isConnectedToSelected && filterMode === 'all' ? 0.2 : 1;

        let edgeLabel = undefined;
        if (e.is_type_only) {
          edgeLabel = 'type';
        } else if (e.is_dynamic) {
          edgeLabel = 'dynamic';
        } else if (e.type !== 'import') {
          edgeLabel = e.type;
        }

        return {
          id: e.id,
          source: e.source,
          target: e.target,
          type: 'smoothstep',
          animated: isCycleEdge && highlightCycles,
          style: {
            stroke: strokeColor,
            strokeWidth: isCycleEdge && highlightCycles ? 2.5 : isConnectedToSelected && selectedNode ? 2.2 : 1.5,
            strokeDasharray,
            opacity: edgeOpacity,
          },
          label: edgeLabel,
          labelStyle: { fill: strokeColor, fontSize: 9, fontFamily: 'monospace', fontWeight: 600 },
          labelBgStyle: { fill: '#FFFDFC', fillOpacity: 0.9 },
        };
      });
  }, [graph.edges, initialNodes, edgeTypeFilter, highlightCycles, cycleNodeIds, selectedNode, filterMode]);

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
    <div className="relative h-[440px] w-full overflow-hidden rounded-[20px] border border-[#D8CFC2] bg-[#EFE9DD]/50 graph-dot-grid sm:h-[560px]">
      <AutoFitController nodesLength={renderedNodes.length} filterMode={filterMode} />
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
            if (raw?.language === 'typescript') return '#7B61D1';
            return '#948C81';
          }}
          maskColor="rgba(247, 244, 238, 0.7)"
          className="bg-[#FFFDFC] border-[#D8CFC2] rounded-xl shadow-sm"
        />

        {/* Legend panel with edge types & languages */}
        <Panel
          position="bottom-left"
          className="bg-[#FFFDFC]/95 border border-[#D8CFC2] p-2.5 rounded-xl text-[10px] text-[#4D4842] flex flex-wrap items-center gap-3 backdrop-blur-md shadow-xs max-w-full"
        >
          <span className="font-bold text-[#292622]">Legend:</span>
          <span className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 bg-[#4C4FD6]"></span>
            <span>Runtime</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 border-b border-dashed border-[#7B61D1]"></span>
            <span className="text-[#7B61D1] font-semibold">Type-only</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 border-b border-dotted border-[#C7953D]"></span>
            <span className="text-[#C7953D] font-semibold">Dynamic</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-4 h-0.5 bg-[#C45F58]"></span>
            <span className="text-[#8F3F3A] font-semibold">Cycle</span>
          </span>
          <span className="border-l border-[#D8CFC2] pl-2 flex items-center space-x-2">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#368A80]"></span>
              <span>Entry Point</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-[#5D8194]"></span>
              <span>External</span>
            </span>
          </span>
        </Panel>
      </ReactFlow>
    </div>
  );
};

export const DependencyGraphTab: React.FC<DependencyGraphTabProps> = ({
  projectId,
  targetFile,
  onInspectImpact,
}) => {
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
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
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

  useEffect(() => {
    if (targetFile && graph) {
      const match = graph.nodes.find(
        (n) => n.label.toLowerCase() === targetFile.toLowerCase() || n.id === targetFile
      );
      if (match) {
        setSelectedNode(match);
      }
    }
  }, [targetFile, graph]);

  const handleDrillDown = (moduleId: string) => {
    fetchGraph('symbol', moduleId);
  };

  const handleBackToModules = () => {
    fetchGraph('module', null);
  };

  // Selected node degree and breakdown computations
  const selectedNodeMetrics = useMemo(() => {
    if (!selectedNode || !graph) return null;
    const incoming = graph.edges.filter((e) => e.target === selectedNode.id);
    const outgoing = graph.edges.filter((e) => e.source === selectedNode.id);

    const inRuntime = incoming.filter((e) => !e.is_type_only).length;
    const inTypeOnly = incoming.filter((e) => e.is_type_only).length;
    const outRuntime = outgoing.filter((e) => !e.is_type_only).length;
    const outTypeOnly = outgoing.filter((e) => e.is_type_only).length;

    // Cycle membership check
    const cyclesWithNode = graph.cycles.filter((c) => c.includes(selectedNode.id));

    return {
      incomingCount: incoming.length,
      inRuntime,
      inTypeOnly,
      outgoingCount: outgoing.length,
      outRuntime,
      outTypeOnly,
      cyclesWithNode,
    };
  }, [selectedNode, graph]);

  // Standalone explanation helper
  const getStandaloneExplanation = (reason?: string | null) => {
    switch (reason) {
      case 'config':
        return 'Configuration or build setup file. Typically invoked directly by toolchains, not imported by code.';
      case 'test':
        return 'Standalone test suite file. Invoked directly by the test runner (pytest/Vitest).';
      case 'script':
        return 'CLI utility or executable runner script designed for direct command-line execution.';
      case 'unreferenced':
        return 'Unreferenced source module. Not imported anywhere in the project; potential dead code or dynamic entry.';
      default:
        return 'Isolated module with zero incoming or outgoing dependencies.';
    }
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
                    {graph.cycles.length} Runtime {graph.cycles.length === 1 ? 'Cycle' : 'Cycles'}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#6B645A] mt-0.5">
                Explore architectural structure, entry points, and verified runtime dependency cycles.
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
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Static dependency references</span>
            <span className="text-lg font-extrabold text-[#4C4FD6]">{graph.summary.total_edges}</span>
          </div>

          <div className="bg-[#F0EBE2]/60 p-3 rounded-2xl border border-[#D8CFC2]">
            <span className="text-[11px] font-semibold text-[#6B645A] block mb-0.5">Detected static cycles</span>
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
      <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-3.5 flex flex-col gap-3 shadow-xs">
        {/* Top toolbar row: Search & Views */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
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
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B645A] hover:text-[#292622]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Interactive Graph Filters */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold text-[#6B645A] flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3 text-[#4C4FD6]" /> View:
            </span>

            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filterMode === 'all'
                  ? 'bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7] shadow-xs'
                  : 'bg-[#F0EBE2]/60 text-[#4D4842] border border-transparent hover:border-[#D8CFC2]'
              }`}
            >
              All Files
            </button>

            <button
              onClick={() => setFilterMode('entry_points')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filterMode === 'entry_points'
                  ? 'bg-[#E0EFEB] text-[#245F59] border border-[#BEE0D6] shadow-xs'
                  : 'bg-[#F0EBE2]/60 text-[#4D4842] border border-transparent hover:border-[#D8CFC2]'
              }`}
            >
              Entry Points ({graph.summary.entry_point_count})
            </button>

            <button
              onClick={() => setFilterMode('high_complexity')}
              className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                filterMode === 'high_complexity'
                  ? 'bg-[#F5E8CC] text-[#76561B] border border-[#E6D3A9] shadow-xs'
                  : 'bg-[#F0EBE2]/60 text-[#4D4842] border border-transparent hover:border-[#D8CFC2]'
              }`}
            >
              High Complexity ({graph.summary.high_complexity_module_count})
            </button>

            {graph.summary.cycle_count > 0 && (
              <button
                onClick={() => setFilterMode('cycles')}
                className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                  filterMode === 'cycles'
                    ? 'bg-[#F6E5E2] text-[#8F3F3A] border border-[#ECC7C3] shadow-xs'
                    : 'bg-[#F0EBE2]/60 text-[#4D4842] border border-transparent hover:border-[#D8CFC2]'
                }`}
              >
                Cycles ({graph.summary.cycle_count})
              </button>
            )}

            {selectedNode && (
              <>
                <button
                  onClick={() => setFilterMode('upstream')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                    filterMode === 'upstream'
                      ? 'bg-[#EAE9FB] text-[#4340A0] border border-[#C7C4F7] shadow-xs'
                      : 'bg-[#F0EBE2]/60 text-[#4D4842] border border-transparent hover:border-[#D8CFC2]'
                  }`}
                  title="Show selected node and all files that depend on it"
                >
                  <ArrowUpRight className="w-3 h-3" />
                  Upstream
                </button>

                <button
                  onClick={() => setFilterMode('downstream')}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                    filterMode === 'downstream'
                      ? 'bg-[#E6EFF2] text-[#3D657A] border border-[#C8DCE4] shadow-xs'
                      : 'bg-[#F0EBE2]/60 text-[#4D4842] border border-transparent hover:border-[#D8CFC2]'
                  }`}
                  title="Show selected node and all files it depends on"
                >
                  <ArrowDownRight className="w-3 h-3" />
                  Downstream
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom toolbar row: Edge & Display switches */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#D8CFC2]/40 text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase font-bold text-[#6B645A]">Import Type:</span>
            <div className="flex items-center space-x-1 border border-[#D8CFC2] bg-[#F0EBE2] rounded-full p-0.5">
              {['all', 'import', 'require'].map((type) => (
                <button
                  key={type}
                  onClick={() => setEdgeTypeFilter(type)}
                  className={`px-2.5 py-0.5 rounded-full uppercase text-[9px] font-bold transition-all ${
                    edgeTypeFilter === type
                      ? 'bg-[#EAE9FB] text-[#4340A0] shadow-xs'
                      : 'text-[#4D4842] hover:text-[#292622]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* External Toggle */}
            <button
              onClick={() => setIncludeExternal(!includeExternal)}
              className={`px-3 py-1 rounded-full uppercase text-[10px] font-bold border transition-colors ${
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
              className={`px-3 py-1 rounded-full uppercase text-[10px] font-bold border transition-colors ${
                highlightCycles
                  ? 'bg-[#F6E5E2] text-[#8F3F3A] border-[#ECC7C3]'
                  : 'bg-[#FFFDFC] text-[#6B645A] border-[#D8CFC2] hover:bg-[#F0EBE2]'
              }`}
            >
              {highlightCycles ? 'Cycles: Highlighted' : 'Cycles: Normal'}
            </button>
          </div>
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
              filterMode={filterMode}
              selectedNode={selectedNode}
              onSelectNode={setSelectedNode}
              onDrillDown={handleDrillDown}
            />
          </ReactFlowProvider>
        </div>

        {/* Selected Node Detail Drawer */}
        <div className="bg-[#FFFDFC] border border-[#D8CFC2] rounded-[20px] p-5 shadow-xs flex flex-col justify-between min-h-[420px]">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-[#D8CFC2] pb-2">
              <h3 className="text-xs uppercase font-extrabold text-[#6B645A] tracking-wider">
                Selected Item
              </h3>
              {selectedNode && (
                <button
                  onClick={() => {
                    setSelectedNode(null);
                    if (filterMode === 'upstream' || filterMode === 'downstream') {
                      setFilterMode('all');
                    }
                  }}
                  className="text-[10px] text-[#6B645A] hover:text-[#292622] flex items-center gap-0.5 font-semibold"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4">
                <div>
                  <span className="text-[10px] uppercase font-extrabold text-[#4C4FD6] block mb-0.5">
                    {titleCase(selectedNode.kind)}
                  </span>
                  <p className="font-mono text-sm font-bold text-[#292622] break-all">{selectedNode.label}</p>
                </div>

                {/* Upstream & Downstream Degree Card */}
                {selectedNodeMetrics && (
                  <div className="grid grid-cols-2 gap-2 bg-[#F0EBE2]/60 p-3 rounded-xl border border-[#D8CFC2]">
                    <div>
                      <span className="text-[10px] font-bold text-[#6B645A] uppercase block">Callers (In)</span>
                      <span className="text-base font-extrabold text-[#292622]">
                        {selectedNodeMetrics.incomingCount}
                      </span>
                      <div className="text-[9px] text-[#6B645A] mt-0.5">
                        {selectedNodeMetrics.inRuntime} runtime
                        {selectedNodeMetrics.inTypeOnly > 0 && `, ${selectedNodeMetrics.inTypeOnly} type`}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#6B645A] uppercase block">Dependencies (Out)</span>
                      <span className="text-base font-extrabold text-[#4C4FD6]">
                        {selectedNodeMetrics.outgoingCount}
                      </span>
                      <div className="text-[9px] text-[#6B645A] mt-0.5">
                        {selectedNodeMetrics.outRuntime} runtime
                        {selectedNodeMetrics.outTypeOnly > 0 && `, ${selectedNodeMetrics.outTypeOnly} type`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Standalone explanation banner */}
                {selectedNode.standalone_reason && (
                  <div className="p-2.5 rounded-xl bg-[#F5E8CC]/70 border border-[#E6D3A9] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#76561B]">
                      <Info className="w-3.5 h-3.5 shrink-0" />
                      <span>Standalone Module: {selectedNode.standalone_reason.toUpperCase()}</span>
                    </div>
                    <p className="text-[11px] text-[#76561B]">
                      {getStandaloneExplanation(selectedNode.standalone_reason)}
                    </p>
                  </div>
                )}

                {/* Cycle indicator */}
                {selectedNodeMetrics && selectedNodeMetrics.cyclesWithNode.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#F6E5E2] border border-[#ECC7C3] text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-[#8F3F3A]">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Part of {selectedNodeMetrics.cyclesWithNode.length} Runtime Loop(s)</span>
                    </div>
                    <p className="text-[11px] text-[#8F3F3A]">
                      Participates in cyclic runtime imports. Refactor using dependency inversion or separate interface modules.
                    </p>
                  </div>
                )}

                {/* Metadata list */}
                <div className="space-y-2 text-xs text-[#4D4842]">
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

                {/* Quick focus toggles */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    onClick={() => setFilterMode(filterMode === 'upstream' ? 'all' : 'upstream')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      filterMode === 'upstream'
                        ? 'bg-[#EAE9FB] text-[#4340A0] border-[#C7C4F7]'
                        : 'bg-[#F0EBE2]/60 text-[#4D4842] border-[#D8CFC2] hover:bg-[#EFE9DD]'
                    }`}
                  >
                    <ArrowUpRight className="w-3 h-3" />
                    <span>Focus Callers</span>
                  </button>
                  <button
                    onClick={() => setFilterMode(filterMode === 'downstream' ? 'all' : 'downstream')}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                      filterMode === 'downstream'
                        ? 'bg-[#E6EFF2] text-[#3D657A] border-[#C8DCE4]'
                        : 'bg-[#F0EBE2]/60 text-[#4D4842] border-[#D8CFC2] hover:bg-[#EFE9DD]'
                    }`}
                  >
                    <ArrowDownRight className="w-3 h-3" />
                    <span>Focus Dependencies</span>
                  </button>
                </div>

                {!selectedNode.is_external && selectedNode.kind === 'module' && (
                  <button
                    onClick={() => handleDrillDown(selectedNode.id)}
                    className="btn-brand-pill w-full mt-2 py-2 px-3 text-xs flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Functions and Classes</span>
                  </button>
                )}

                <button
                  onClick={() => onInspectImpact?.(selectedNode.label)}
                  className="btn-brand-outline-pill w-full mt-2 py-2 px-3 text-xs flex items-center justify-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5 text-[#C45F58]" />
                  <span>What Breaks If I Change This?</span>
                </button>
              </div>
            ) : (
              <div className="text-center py-14 text-[#948C81] text-xs space-y-2">
                <Info className="w-6 h-6 mx-auto text-[#948C81] opacity-60" />
                <p>Select an item to view incoming/outgoing connections, standalone reasons, and focus upstream or downstream trees.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DependencyGraphTab;

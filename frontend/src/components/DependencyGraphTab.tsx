import React, { useEffect, useMemo, useState } from 'react';
import {
  Controls,
  Edge,
  Handle,
  MarkerType,
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
  Layers,
  Eye,
  RotateCcw,
  Compass,
  ChevronDown,
  ChevronUp,
  X,
  Maximize2,
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

type GraphFilterMode =
  | 'all'
  | 'entry_points'
  | 'high_complexity'
  | 'cycles'
  | 'upstream'
  | 'downstream';

type GraphLayoutMode = 'architecture' | 'standard' | 'focus';
type EdgeFilterType = 'all' | 'runtime' | 'require' | 'type';

// Custom React Flow node component with enhanced readability and status badges
const GraphNodeComponent = ({ data }: any) => {
  const {
    node,
    isSelected,
    isCycle,
    isEntryPoint,
    isExternal,
    isDimmed,
    inDegree = 0,
    outDegree = 0,
  } = data;

  let containerClass = 'bg-surface border border-line shadow-xs';
  if (isCycle) {
    containerClass = 'bg-red-surface/95 border-2 border-red-line shadow-xs ring-1 ring-red/30';
  } else if (isEntryPoint) {
    containerClass = 'bg-surface border border-line border-l-4 border-l-teal shadow-xs';
  } else if (isExternal) {
    containerClass = 'bg-slate-surface/80 border border-dashed border-slate shadow-none';
  }

  if (isSelected) {
    containerClass += ' ring-2 ring-indigo ring-offset-2 shadow-2 scale-[1.02] z-20';
  }

  if (isDimmed) {
    containerClass += ' opacity-25 hover:opacity-100 transition-opacity';
  }

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Node ${node.label}, ${node.language}, ${node.line_count} lines`}
      className={`w-[240px] p-2.5 rounded-lg transition-all select-none hover:shadow-2 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${containerClass}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-indigo !border-surface !border-2"
      />

      {/* Row 1: File name + language tag */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span
          className="font-mono text-[12px] font-bold text-ink truncate flex-1"
          title={node.label}
        >
          {truncateMiddle(node.label, 20)}
        </span>
        <LanguageTag language={node.language} />
      </div>

      {/* Row 2: Metrics (Lines + Complexity chip) */}
      <div className="flex items-center justify-between text-[11px] font-mono text-ink-3 mb-1.5">
        <span>{formatNumber(node.line_count)} lines</span>
        <span
          className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-bold tracking-wide uppercase ${
            node.complexity_rating === 'critical'
              ? 'bg-red-strong text-white'
              : node.complexity_rating === 'high'
              ? 'bg-amber-surface text-amber-text border border-amber-line'
              : node.complexity_rating === 'medium'
              ? 'bg-amber-surface/70 text-amber-text'
              : 'bg-teal-surface/70 text-teal-text'
          }`}
        >
          {node.complexity_rating}
        </span>
      </div>

      {/* Row 3: Callers & Dependencies + Role pill */}
      <div className="flex items-center justify-between pt-1.5 border-t border-line/60 text-[10px] font-mono text-ink-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 font-semibold" title={`${inDegree} incoming callers`}>
            <ArrowDownLeft className="w-2.5 h-2.5 text-teal" />
            <span className="text-teal-strong">{inDegree} in</span>
          </span>
          <span className="flex items-center gap-0.5 font-semibold" title={`${outDegree} outgoing dependencies`}>
            <ArrowUpRight className="w-2.5 h-2.5 text-indigo" />
            <span className="text-indigo-text">{outDegree} out</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          {isCycle && <StatusTag status="critical" label="LOOP" />}
          {isEntryPoint && <StatusTag status="entry-point" label="ENTRY" />}
          {isExternal && (
            <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-slate-surface text-slate-text border border-slate/30">
              EXT
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-indigo !border-surface !border-2"
      />
    </div>
  );
};

const nodeTypes = {
  custom: GraphNodeComponent,
};

// Auto-fit helper component for ReactFlow context
const AutoFitView: React.FC<{ trigger: any }> = ({ trigger }) => {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.16, duration: 400 });
    }, 90);
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

  // View & Layout Modes
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [graphLayout, setGraphLayout] = useState<GraphLayoutMode>('architecture');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<GraphFilterMode>('all');
  const [edgeFilter, setEdgeFilter] = useState<EdgeFilterType>('all');
  const [includeExternal, setIncludeExternal] = useState(false);
  const [highlightCycles, setHighlightCycles] = useState(true);

  // Selection & UI State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);

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

  // Synchronize targetFile prop with selected node
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

  // Precompute in-degrees and out-degrees map
  const { inDegreeMap, outDegreeMap } = useMemo(() => {
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();
    if (graph) {
      graph.nodes.forEach((n) => {
        inMap.set(n.id, 0);
        outMap.set(n.id, 0);
      });
      graph.edges.forEach((e) => {
        inMap.set(e.target, (inMap.get(e.target) || 0) + 1);
        outMap.set(e.source, (outMap.get(e.source) || 0) + 1);
      });
    }
    return { inDegreeMap: inMap, outDegreeMap: outMap };
  }, [graph]);

  // Cycle node IDs set
  const cycleNodeIds = useMemo(() => {
    const set = new Set<string>();
    if (graph?.cycles) {
      graph.cycles.forEach((c) => c.forEach((id) => set.add(id)));
    }
    return set;
  }, [graph]);

  // Cycle edge pairs set (source->target)
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

  // Upstream and downstream sets for isolation / filtering
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

  // Direct 1-hop neighborhood for Focus Mode
  const focusNeighborhoodIds = useMemo(() => {
    if (!selectedNodeId || !graph) return new Set<string>();
    const set = new Set<string>([selectedNodeId]);
    graph.edges.forEach((e) => {
      if (e.target === selectedNodeId) set.add(e.source);
      if (e.source === selectedNodeId) set.add(e.target);
    });
    return set;
  }, [selectedNodeId, graph]);

  // Filtered nodes based on search, active filterMode, and external toggle
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => {
      if (!includeExternal && n.is_external) return false;

      if (searchQuery.trim() && !n.label.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }

      if (filterMode === 'entry_points' && !n.is_entry_point) return false;
      if (
        filterMode === 'high_complexity' &&
        n.complexity_rating !== 'high' &&
        n.complexity_rating !== 'critical' &&
        n.complexity_score < 15
      ) {
        return false;
      }
      if (filterMode === 'cycles' && !cycleNodeIds.has(n.id)) return false;
      if (filterMode === 'upstream' && !upstreamNodeIds.has(n.id)) return false;
      if (filterMode === 'downstream' && !downstreamNodeIds.has(n.id)) return false;

      // In Focus Mode, isolate strictly to the focal node's 1-hop neighborhood
      if (graphLayout === 'focus' && selectedNodeId) {
        if (!focusNeighborhoodIds.has(n.id)) return false;
      }

      return true;
    });
  }, [
    graph,
    includeExternal,
    searchQuery,
    filterMode,
    graphLayout,
    selectedNodeId,
    cycleNodeIds,
    upstreamNodeIds,
    downstreamNodeIds,
    focusNeighborhoodIds,
  ]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Filtered edges based on filteredNodeIds and edgeFilter
  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    return graph.edges.filter((e) => {
      if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;

      if (edgeFilter === 'runtime') {
        if (e.type !== 'import' || e.is_type_only) return false;
      } else if (edgeFilter === 'require') {
        if (e.type !== 'require') return false;
      } else if (edgeFilter === 'type') {
        if (!e.is_type_only) return false;
      }

      // If cycles only filter is active, only show cycle edges
      if (filterMode === 'cycles' && !cycleEdgePairs.has(`${e.source}->${e.target}`)) {
        return false;
      }

      return true;
    });
  }, [graph, filteredNodeIds, edgeFilter, filterMode, cycleEdgePairs]);

  // React Flow Nodes layout calculation
  const rfNodes: Node[] = useMemo(() => {
    if (filteredNodes.length === 0) return [];

    // --- Mode 1: Selected-Node Focus Mode (3-column pipeline) ---
    if (graphLayout === 'focus' && selectedNodeId) {
      const focalNode = filteredNodes.find((n) => n.id === selectedNodeId);
      const upstreamList = filteredNodes.filter(
        (n) => n.id !== selectedNodeId && upstreamNodeIds.has(n.id)
      );
      const downstreamList = filteredNodes.filter(
        (n) => n.id !== selectedNodeId && downstreamNodeIds.has(n.id)
      );

      const maxSide = Math.max(upstreamList.length, downstreamList.length, 1);
      const focalY = Math.max(80, (maxSide - 1) * 65 + 80);

      const nodesResult: Node[] = [];

      // Left Column: Upstream Callers
      upstreamList.forEach((n, idx) => {
        nodesResult.push({
          id: n.id,
          type: 'custom',
          position: { x: 50, y: idx * 135 + 80 },
          data: {
            node: n,
            isSelected: false,
            isCycle: cycleNodeIds.has(n.id) && highlightCycles,
            isEntryPoint: n.is_entry_point,
            isExternal: n.is_external,
            isDimmed: false,
            inDegree: inDegreeMap.get(n.id) || 0,
            outDegree: outDegreeMap.get(n.id) || 0,
          },
        });
      });

      // Center Column: Focal Node
      if (focalNode) {
        nodesResult.push({
          id: focalNode.id,
          type: 'custom',
          position: { x: 420, y: focalY },
          data: {
            node: focalNode,
            isSelected: true,
            isCycle: cycleNodeIds.has(focalNode.id) && highlightCycles,
            isEntryPoint: focalNode.is_entry_point,
            isExternal: focalNode.is_external,
            isDimmed: false,
            inDegree: inDegreeMap.get(focalNode.id) || 0,
            outDegree: outDegreeMap.get(focalNode.id) || 0,
          },
        });
      }

      // Right Column: Downstream Dependencies
      downstreamList.forEach((n, idx) => {
        nodesResult.push({
          id: n.id,
          type: 'custom',
          position: { x: 790, y: idx * 135 + 80 },
          data: {
            node: n,
            isSelected: false,
            isCycle: cycleNodeIds.has(n.id) && highlightCycles,
            isEntryPoint: n.is_entry_point,
            isExternal: n.is_external,
            isDimmed: false,
            inDegree: inDegreeMap.get(n.id) || 0,
            outDegree: outDegreeMap.get(n.id) || 0,
          },
        });
      });

      return nodesResult;
    }

    // --- Mode 2: Architecture Overview Mode (Layered Tiers) ---
    if (graphLayout === 'architecture') {
      const tier0: typeof filteredNodes = []; // Entry points
      const tier1: typeof filteredNodes = []; // Core domain & intermediate services
      const tier2: typeof filteredNodes = []; // Leaf modules & utilities
      const tier3: typeof filteredNodes = []; // External packages

      filteredNodes.forEach((n) => {
        if (n.is_external) {
          tier3.push(n);
        } else if (
          n.is_entry_point ||
          (graph?.entry_point_ids && graph.entry_point_ids.includes(n.id)) ||
          (inDegreeMap.get(n.id) === 0 && (outDegreeMap.get(n.id) || 0) > 0)
        ) {
          tier0.push(n);
        } else if ((outDegreeMap.get(n.id) || 0) === 0) {
          tier2.push(n);
        } else {
          tier1.push(n);
        }
      });

      const nodesResult: Node[] = [];
      const xSpacing = 280;
      const ySubRowSpacing = 135;
      const tierGap = 90;
      const maxCols = 4;

      let currentY = 50;

      const placeTier = (tierNodes: typeof filteredNodes) => {
        if (tierNodes.length === 0) return;
        tierNodes.forEach((n, idx) => {
          const col = idx % maxCols;
          const subRow = Math.floor(idx / maxCols);
          const isSelected = selectedNodeId === n.id;
          const isDimmed =
            Boolean(selectedNodeId) &&
            !isSelected &&
            !upstreamNodeIds.has(n.id) &&
            !downstreamNodeIds.has(n.id);

          nodesResult.push({
            id: n.id,
            type: 'custom',
            position: {
              x: col * xSpacing + (subRow % 2) * 35 + 50,
              y: currentY + subRow * ySubRowSpacing,
            },
            data: {
              node: n,
              isSelected,
              isCycle: cycleNodeIds.has(n.id) && highlightCycles,
              isEntryPoint: n.is_entry_point,
              isExternal: n.is_external,
              isDimmed,
              inDegree: inDegreeMap.get(n.id) || 0,
              outDegree: outDegreeMap.get(n.id) || 0,
            },
          });
        });

        const rowsCount = Math.ceil(tierNodes.length / maxCols);
        currentY += rowsCount * ySubRowSpacing + tierGap;
      };

      placeTier(tier0);
      placeTier(tier1);
      placeTier(tier2);
      placeTier(tier3);

      return nodesResult;
    }

    // --- Mode 3: Standard Grid Mode ---
    const cols = Math.max(2, Math.ceil(Math.sqrt(filteredNodes.length * 1.5)));
    const nodeWidth = 280;
    const nodeHeight = 145;

    return filteredNodes.map((n, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const isCycle = cycleNodeIds.has(n.id) && highlightCycles;
      const isSelected = selectedNodeId === n.id;
      const isDimmed =
        Boolean(selectedNodeId) &&
        !isSelected &&
        !upstreamNodeIds.has(n.id) &&
        !downstreamNodeIds.has(n.id);

      return {
        id: n.id,
        type: 'custom',
        position: { x: col * nodeWidth + (row % 2) * 35 + 50, y: row * nodeHeight + 50 },
        data: {
          node: n,
          isSelected,
          isCycle,
          isEntryPoint: n.is_entry_point,
          isExternal: n.is_external,
          isDimmed,
          inDegree: inDegreeMap.get(n.id) || 0,
          outDegree: outDegreeMap.get(n.id) || 0,
        },
      };
    });
  }, [
    filteredNodes,
    graphLayout,
    selectedNodeId,
    upstreamNodeIds,
    downstreamNodeIds,
    cycleNodeIds,
    highlightCycles,
    inDegreeMap,
    outDegreeMap,
    graph?.entry_point_ids,
  ]);

  // React Flow Edges with explicit closed arrow markers and type distinction
  const rfEdges: Edge[] = useMemo(() => {
    return filteredEdges.map((e) => {
      const isCycle = cycleEdgePairs.has(`${e.source}->${e.target}`) && highlightCycles;
      const isConnectedToSelected =
        Boolean(selectedNodeId) && (e.source === selectedNodeId || e.target === selectedNodeId);

      let stroke = 'rgba(77, 80, 215, 0.7)';
      let strokeWidth = 1.75;
      let strokeDasharray: string | undefined = undefined;
      let opacity = selectedNodeId ? (isConnectedToSelected ? 1 : 0.12) : 0.75;
      let label: string | undefined = undefined;
      let markerColor = '#4D50D7';

      if (isCycle) {
        stroke = '#DC2626';
        strokeWidth = 2.4;
        strokeDasharray = '5 5';
        opacity = 1;
        markerColor = '#DC2626';
      } else if (e.is_type_only) {
        stroke = '#7862DE'; // Type-only import (violet)
        strokeWidth = 1.5;
        strokeDasharray = '4 4';
        label = 'type';
        markerColor = '#7862DE';
        opacity = selectedNodeId ? (isConnectedToSelected ? 0.95 : 0.12) : 0.65;
      } else if (e.type === 'require') {
        stroke = '#0D9488'; // Dynamic require (teal)
        strokeWidth = 1.75;
        markerColor = '#0D9488';
        label = 'require';
        opacity = selectedNodeId ? (isConnectedToSelected ? 1 : 0.12) : 0.7;
      } else if (isConnectedToSelected) {
        stroke = '#4D50D7';
        strokeWidth = 2.5;
        markerColor = '#4D50D7';
        opacity = 1;
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        type: 'smoothstep',
        animated: isCycle,
        label,
        labelStyle: { fill: stroke, fontSize: 10, fontFamily: 'monospace', fontWeight: 600 },
        style: { stroke, strokeWidth, strokeDasharray, opacity },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: markerColor,
        },
      };
    });
  }, [filteredEdges, cycleEdgePairs, highlightCycles, selectedNodeId]);

  // Selected node data
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !graph) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graph]);

  // Incoming and outgoing edge breakdown
  const incomingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.target === selectedNodeId);
  }, [selectedNodeId, graph]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.source === selectedNodeId);
  }, [selectedNodeId, graph]);

  const inRuntime = incomingEdges.filter((e) => !e.is_type_only && e.type !== 'require').length;
  const inRequire = incomingEdges.filter((e) => e.type === 'require').length;
  const inTypeOnly = incomingEdges.filter((e) => e.is_type_only).length;

  const outRuntime = outgoingEdges.filter((e) => !e.is_type_only && e.type !== 'require').length;
  const outRequire = outgoingEdges.filter((e) => e.type === 'require').length;
  const outTypeOnly = outgoingEdges.filter((e) => e.is_type_only).length;

  const cyclesWithNode = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.cycles.filter((c) => c.includes(selectedNodeId));
  }, [selectedNodeId, graph]);

  // Deterministic risk summary for the selected node
  const selectedNodeRisk = useMemo(() => {
    if (!selectedNodeData) return null;
    const inCount = incomingEdges.length;
    const outCount = outgoingEdges.length;
    const isPartCycle = cycleNodeIds.has(selectedNodeData.id);
    const isCritComplexity = selectedNodeData.complexity_rating === 'critical';
    const isHighComplexity = selectedNodeData.complexity_rating === 'high';

    let level: 'critical' | 'high' | 'medium' | 'low' = 'low';
    let reason = 'Isolated or standard utility with minimal blast radius.';

    if (isPartCycle || isCritComplexity) {
      level = 'critical';
      reason = isPartCycle
        ? `Part of ${cyclesWithNode.length} circular dependency loop(s); blocks clean decomposition.`
        : 'Critical cyclomatic complexity requiring careful characterization testing.';
    } else if (isHighComplexity || inCount >= 4) {
      level = 'high';
      reason =
        inCount >= 4
          ? `High blast radius with ${inCount} direct callers across the codebase.`
          : 'High cyclomatic complexity prone to regression bugs.';
    } else if (inCount >= 2 || outCount >= 4) {
      level = 'medium';
      reason = 'Moderate fan-in/fan-out affecting adjacent modules.';
    }

    return { level, reason, blastRadius: inCount };
  }, [selectedNodeData, incomingEdges, outgoingEdges, cycleNodeIds, cyclesWithNode]);

  // Handle export to Mermaid format
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

  const handleNodeClick = (_: any, node: any) => {
    setSelectedNodeId(node.id);
    const nodeLabel = (node.data as any)?.node?.label || node.id;
    onSelectFile?.(nodeLabel);
  };

  const handlePaneClick = () => {
    if (graphLayout !== 'focus') {
      setSelectedNodeId(null);
      if (filterMode === 'upstream' || filterMode === 'downstream') {
        setFilterMode('all');
      }
    }
  };

  // Toggle Focus Mode for selected node or prompt
  const handleToggleFocusMode = () => {
    if (graphLayout === 'focus') {
      setGraphLayout('architecture');
      setFitTrigger((v) => v + 1);
    } else {
      if (!selectedNodeId) {
        const candidate =
          graph?.nodes.find((n) => n.is_entry_point) ||
          graph?.nodes.find((n) => n.complexity_rating === 'critical') ||
          graph?.nodes[0];
        if (candidate) {
          setSelectedNodeId(candidate.id);
          onSelectFile?.(candidate.label);
          showToast(`Focused on ${candidate.label}`, 'info');
        }
      }
      setGraphLayout('focus');
      setFitTrigger((v) => v + 1);
    }
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
        <div className="skeleton h-[520px] w-full" />
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
  const isLargeGraph = filteredNodes.length > 20 || graph.nodes.length > 25;

  return (
    <div
      className="space-y-3.5 sm:space-y-4 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-graph"
      aria-labelledby="tab-graph"
    >
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

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
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

        {/* 6 Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-5">
          <StatTile label="Files shown" value={formatNumber(filteredNodes.length)} color="ink" />
          <StatTile label="Connections" value={formatNumber(filteredEdges.length)} color="indigo" />
          <StatTile label="Dependency loops" value={formatNumber(cycleCount)} color="red" />
          <StatTile
            label="Standalone files"
            value={formatNumber(graph.summary.orphan_count || 0)}
            color="amber"
          />
          <StatTile
            label="Entry points"
            value={formatNumber(graph.summary.entry_point_count || 0)}
            color="teal"
          />
          <StatTile
            label="Needs review"
            value={formatNumber(graph.summary.high_complexity_module_count || 0)}
            color="amber"
          />
        </div>
      </section>

      {/* 2. Subgraph Views & Layout Toolbar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 bg-surface border border-line rounded-lg p-3 sm:px-4 shadow-1">
        {/* Search */}
        <SearchField
          id="graph-search"
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search files and modules…"
          resultCount={{ current: filteredNodes.length, total: graph.nodes.length, unit: 'nodes' }}
          className="w-full xl:w-64"
        />

        {/* Subgraph Filter Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-bold text-ink-2 flex items-center gap-1 mr-1">
            <Filter className="w-3 h-3 text-indigo" />
            Filter:
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
            label="HIGH COMPLEXITY"
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
          <FilterChip
            label={selectedNodeId ? `UPSTREAM (${upstreamNodeIds.size - 1})` : 'UPSTREAM'}
            active={filterMode === 'upstream'}
            onClick={() => {
              if (!selectedNodeId) {
                showToast('Select a node first to isolate its upstream callers.', 'info');
              } else {
                setFilterMode(filterMode === 'upstream' ? 'all' : 'upstream');
              }
            }}
          />
          <FilterChip
            label={selectedNodeId ? `DOWNSTREAM (${downstreamNodeIds.size - 1})` : 'DOWNSTREAM'}
            active={filterMode === 'downstream'}
            onClick={() => {
              if (!selectedNodeId) {
                showToast('Select a node first to isolate its downstream dependencies.', 'info');
              } else {
                setFilterMode(filterMode === 'downstream' ? 'all' : 'downstream');
              }
            }}
          />
        </div>

        {/* Mode Controls & Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Edge Filter Segmented Control */}
          <SegmentedControl<EdgeFilterType>
            options={[
              { id: 'all', label: 'ALL EDGES' },
              { id: 'runtime', label: 'RUNTIME' },
              { id: 'require', label: 'REQUIRE' },
              { id: 'type', label: 'TYPE-ONLY' },
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

          {/* Layout Mode Selector */}
          <div className="inline-flex rounded-md border border-line bg-panel p-0.5">
            <button
              type="button"
              onClick={() => {
                setGraphLayout('architecture');
                setFitTrigger((v) => v + 1);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
                graphLayout === 'architecture'
                  ? 'bg-surface text-indigo shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              }`}
              title="Architecture Overview Layout (Layered Tiers)"
            >
              <Layers className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              type="button"
              onClick={() => {
                setGraphLayout('standard');
                setFitTrigger((v) => v + 1);
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
                graphLayout === 'standard'
                  ? 'bg-surface text-indigo shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              }`}
              title="Standard Grid Layout"
            >
              <Workflow className="w-3.5 h-3.5" />
              Grid
            </button>
            <button
              type="button"
              onClick={handleToggleFocusMode}
              className={`px-2.5 py-1 text-xs font-bold rounded flex items-center gap-1.5 transition-colors ${
                graphLayout === 'focus'
                  ? 'bg-surface text-indigo shadow-xs'
                  : 'text-ink-3 hover:text-ink'
              }`}
              title="Selected-Node Focus Mode (3-Column Neighborhood Pipeline)"
            >
              <Eye className="w-3.5 h-3.5" />
              Focus
            </button>
          </div>

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

      {/* 3. Main Workspace: Graph Canvas vs List View */}
      {viewMode === 'graph' ? (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_310px] gap-4 items-start">
          {/* React Flow Canvas Container */}
          <div className="relative w-full h-[580px] sm:h-[650px] rounded-lg border border-line overflow-hidden graph-dot-grid shadow-inner">
            {/* Large Graph Info Banner */}
            {isLargeGraph && (
              <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-sm border border-line rounded-lg px-3 py-1.5 shadow-1 flex items-center gap-2.5 text-xs text-ink-2 max-w-lg">
                <Info className="w-4 h-4 text-indigo shrink-0" />
                <span className="truncate">
                  Showing <strong>{filteredNodes.length}</strong> modules. Tip: Switch to Architecture mode or click Focus Mode for streamlined inspection.
                </span>
                <button
                  type="button"
                  onClick={() => setFitTrigger((v) => v + 1)}
                  className="font-bold text-indigo hover:underline shrink-0 flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" /> Fit
                </button>
              </div>
            )}

            {/* Focus Mode Active Banner */}
            {graphLayout === 'focus' && selectedNodeData && (
              <div className="absolute top-3 inset-x-3 z-10 bg-indigo-surface/95 backdrop-blur-sm border border-indigo/30 rounded-lg px-4 py-2 shadow-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-4 h-4 text-indigo shrink-0" />
                  <span className="font-bold text-indigo-text truncate">
                    Focus Mode: <span className="font-mono">{selectedNodeData.label}</span>
                  </span>
                  <span className="text-ink-3 hidden sm:inline">
                    ({incomingEdges.length} direct callers, {outgoingEdges.length} direct dependencies)
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setGraphLayout('architecture');
                    setFitTrigger((v) => v + 1);
                  }}
                  icon={<X className="w-3 h-3" />}
                  className="shrink-0 text-[11px] h-7 px-2 bg-surface"
                >
                  Exit Focus Mode
                </Button>
              </div>
            )}

            {/* Empty & Filtered State Card */}
            {filteredNodes.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10 bg-canvas/85 backdrop-blur-xs">
                <div className="w-12 h-12 rounded-xl bg-panel text-ink-3 flex items-center justify-center mb-3 border border-line">
                  <Filter className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-ink text-base mb-1">
                  No Matching Modules Found
                </h3>
                <p className="text-xs text-ink-3 max-w-sm mb-4">
                  No nodes match the active filter criteria{' '}
                  {searchQuery ? `with search "${searchQuery}"` : `in mode "${filterMode}"`}.
                </p>
                <Button
                  variant="indigo"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setFilterMode('all');
                    setIncludeExternal(true);
                    setEdgeFilter('all');
                    setFitTrigger((v) => v + 1);
                  }}
                  icon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Reset All Filters
                </Button>
              </div>
            )}

            <ReactFlowProvider>
              <ReactFlow
                nodes={rfNodes}
                edges={rfEdges}
                nodeTypes={nodeTypes}
                onNodeClick={handleNodeClick}
                onPaneClick={handlePaneClick}
                minZoom={0.15}
                maxZoom={2.0}
                fitView
              >
                <AutoFitView trigger={fitTrigger + filteredNodes.length + (selectedNodeId ? 1 : 0)} />

                <Controls
                  className="!m-3 !bg-surface !border !border-line !rounded-md !shadow-1 !overflow-hidden [&>button]:!border-b [&>button]:!border-line [&>button]:!w-9 [&>button]:!h-9"
                  showInteractive={false}
                />

                {/* Collapsible Edge-Type & Node Legend */}
                <Panel position="bottom-left" className="!m-3">
                  <div className="bg-surface/95 backdrop-blur-md border border-line rounded-lg p-2.5 shadow-2 max-w-md text-xs">
                    <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-line/60 mb-2">
                      <span className="font-bold text-[11px] uppercase tracking-wider text-ink-2 flex items-center gap-1.5">
                        <Compass className="w-3.5 h-3.5 text-indigo" /> Graph Legend
                      </span>
                      <button
                        type="button"
                        onClick={() => setLegendOpen((v) => !v)}
                        className="text-ink-4 hover:text-ink text-[11px] flex items-center gap-0.5"
                      >
                        {legendOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                        {legendOpen ? 'Collapse' : 'Expand'}
                      </button>
                    </div>

                    {legendOpen ? (
                      <div className="space-y-2">
                        {/* Node Types */}
                        <div>
                          <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
                            Nodes
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs border-l-2 border-l-teal bg-surface border border-line" />
                              Entry Point
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-surface border border-line" />
                              Internal Module
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-amber-surface border border-amber-line" />
                              High Complexity
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-red-surface border border-red-line" />
                              Cycle Member
                            </span>
                            <span className="flex items-center gap-1.5 col-span-2">
                              <span className="w-2.5 h-2.5 rounded-xs bg-slate-surface border border-dashed border-slate" />
                              External Package
                            </span>
                          </div>
                        </div>

                        {/* Edge Types */}
                        <div className="pt-1.5 border-t border-line/50">
                          <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
                            Edges (Dependencies)
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 bg-indigo" />
                              Runtime Import
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 bg-teal" />
                              Dynamic Require
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 border-t border-dashed border-[#7862DE]" />
                              Type-Only Import
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 border-t-2 border-dashed border-red" />
                              Cycle Loop
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
                </Panel>

                {/* Minimap with semantic node color coding */}
                <MiniMap
                  className="!m-3 hidden md:block !bg-surface !border !border-line !rounded-md !w-44 !h-32 shadow-1"
                  nodeColor={(node: any) => {
                    if (node.data?.isCycle) return '#DC2626';
                    if (node.data?.isEntryPoint) return '#0D9488';
                    if (
                      node.data?.node?.complexity_rating === 'high' ||
                      node.data?.node?.complexity_rating === 'critical'
                    )
                      return '#D97706';
                    if (node.data?.isExternal) return '#94A3B8';
                    return '#4D50D7';
                  }}
                  maskColor="rgba(231, 224, 211, 0.45)"
                  zoomable
                  pannable
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {/* 4. Selected Node Risk Summary & Action Side Drawer */}
          <div className="bg-surface border border-line rounded-lg p-5 shadow-1 min-h-[440px] flex flex-col justify-between">
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
                      if (graphLayout === 'focus') setGraphLayout('architecture');
                    }}
                    className="text-xs text-ink-3 hover:text-ink font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {selectedNodeData ? (
                <div className="space-y-4">
                  {/* File Label & Badges */}
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

                  {/* Selected-Node Risk Summary Card */}
                  <div
                    className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                      selectedNodeRisk?.level === 'critical'
                        ? 'bg-red-surface border-red-line text-red-text'
                        : selectedNodeRisk?.level === 'high'
                        ? 'bg-amber-surface border-amber-line text-amber-text'
                        : selectedNodeRisk?.level === 'medium'
                        ? 'bg-amber-surface/40 border-amber-line/60 text-ink-2'
                        : 'bg-tile border-line text-ink-2'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold uppercase tracking-wider text-[10px]">
                        RISK SUMMARY
                      </span>
                      <StatusTag
                        status={
                          selectedNodeRisk?.level === 'critical'
                            ? 'critical'
                            : selectedNodeRisk?.level === 'high'
                            ? 'complexity-high'
                            : selectedNodeRisk?.level === 'medium'
                            ? 'complexity-medium'
                            : 'complexity-low'
                        }
                        label={selectedNodeRisk?.level.toUpperCase() || 'LOW'}
                      />
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      {selectedNodeRisk?.reason}
                    </p>
                  </div>

                  {/* Cycle Warning Breakdown if member of cycle */}
                  {cyclesWithNode.length > 0 && (
                    <div className="p-3 rounded-md bg-red-surface border border-red-line text-xs space-y-1.5 text-red-text">
                      <div className="font-bold flex items-center gap-1">
                        <span>Part of {cyclesWithNode.length} Circular Dependency Loop(s)</span>
                      </div>
                      <div className="space-y-1 font-mono text-[10px] bg-white/60 p-2 rounded border border-red-line/40">
                        {cyclesWithNode.map((cycle, i) => (
                          <div key={i} className="truncate" title={cycle.join(' → ')}>
                            Loop {i + 1}: {cycle.slice(0, 3).join(' → ')}
                            {cycle.length > 3 ? ' → …' : ` → ${cycle[0]}`}
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] opacity-90">
                        Circular loops must be broken to enable isolated unit migration.
                      </p>
                    </div>
                  )}

                  {/* Metric Breakdown */}
                  <div className="bg-tile rounded-md p-3 border border-line text-xs space-y-1.5 text-ink-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-ink-3">Lines of Code:</span>
                      <span className="font-bold">{formatNumber(selectedNodeData.line_count)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Complexity:</span>
                      <span className="font-bold">
                        {selectedNodeData.complexity_rating.toUpperCase()} (score {selectedNodeData.complexity_score})
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Incoming Callers:</span>
                      <span className="font-bold text-teal-strong">
                        {incomingEdges.length} ({inRuntime} run / {inRequire} req / {inTypeOnly} type)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Dependencies:</span>
                      <span className="font-bold text-indigo-text">
                        {outgoingEdges.length} ({outRuntime} run / {outRequire} req / {outTypeOnly} type)
                      </span>
                    </div>
                  </div>

                  {/* Focus & Neighborhood Isolation Buttons */}
                  <div className="space-y-2">
                    <Button
                      variant={graphLayout === 'focus' ? 'indigo' : 'outline'}
                      size="sm"
                      onClick={handleToggleFocusMode}
                      icon={<Eye className="w-3.5 h-3.5" />}
                      className="w-full justify-center text-xs"
                    >
                      {graphLayout === 'focus' ? 'Exit Focus Mode' : 'Focus Mode (1-Hop Subgraph)'}
                    </Button>

                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant={filterMode === 'upstream' ? 'indigo' : 'outline'}
                        size="sm"
                        onClick={() => setFilterMode(filterMode === 'upstream' ? 'all' : 'upstream')}
                        icon={<ArrowUpRight className="w-3 h-3" />}
                        className="justify-center text-xs"
                      >
                        Upstream ({incomingEdges.length})
                      </Button>
                      <Button
                        variant={filterMode === 'downstream' ? 'indigo' : 'outline'}
                        size="sm"
                        onClick={() => setFilterMode(filterMode === 'downstream' ? 'all' : 'downstream')}
                        icon={<ArrowDownLeft className="w-3 h-3" />}
                        className="justify-center text-xs"
                      >
                        Downstream ({outgoingEdges.length})
                      </Button>
                    </div>
                  </div>

                  {/* Primary Action: What breaks if I change this? */}
                  <div className="space-y-2 pt-2 border-t border-line">
                    <Button
                      variant="indigo"
                      size="sm"
                      onClick={() => {
                        onSelectFile?.(selectedNodeData.label);
                        onInspectImpact?.(selectedNodeData.label);
                      }}
                      icon={<Target className="w-3.5 h-3.5" strokeWidth={2} />}
                      className="w-full justify-center text-xs font-bold shadow-xs py-2"
                    >
                      What breaks if I change this?
                    </Button>

                    {/* Secondary Cross-tab links */}
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
                        Safety Tests
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
                  <Info className="w-8 h-8 mb-2.5 stroke-1 text-ink-3" />
                  <h4 className="text-xs font-bold text-ink mb-1">No Node Selected</h4>
                  <p className="text-xs text-ink-3 font-sans leading-relaxed max-w-xs">
                    Click any node on the graph canvas to inspect callers, runtime vs type dependencies, cycle loops, and run Change-Impact analysis.
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
                <th className="py-3 px-4 text-center">In / Out</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-ink-2 font-mono">
              {filteredNodes.map((n) => {
                const isCycle = cycleNodeIds.has(n.id);
                const inCount = inDegreeMap.get(n.id) || 0;
                const outCount = outDegreeMap.get(n.id) || 0;

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
                    <td className="py-3 px-4 text-center">
                      <span className="text-teal-strong">{inCount}</span> /{' '}
                      <span className="text-indigo-text">{outCount}</span>
                    </td>
                    <td className="py-3 px-4 font-sans">
                      {isCycle ? (
                        <StatusTag status="critical" label="CYCLE MEMBER" />
                      ) : n.is_entry_point ? (
                        <StatusTag status="entry-point" label="ENTRY POINT" />
                      ) : n.is_external ? (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-surface text-slate-text border border-slate/30">
                          EXTERNAL
                        </span>
                      ) : (
                        <span className="text-ink-3 text-xs">Internal Module</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <Button
                          variant="indigo"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFile?.(n.label);
                            onInspectImpact?.(n.label);
                          }}
                          icon={<Target className="w-3 h-3" />}
                        >
                          Impact
                        </Button>
                      </div>
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

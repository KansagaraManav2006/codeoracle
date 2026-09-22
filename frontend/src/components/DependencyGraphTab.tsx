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
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
} from 'lucide-react';
import {
  GraphResponse,
  TabType,
} from '../types';
import { truncateMiddle, formatNumber, getDownloadFileName } from '../utils/formatters';
import Button from './common/Button';
import StatTile from './common/StatTile';
import SearchField from './common/SearchField';
import SegmentedControl from './common/SegmentedControl';
import { ToggleChip, FilterChip } from './common/Chips';
import { LanguageTag, StatusTag } from './common/Tags';
import { useToast } from './common/Toast';
import LoadingState from './common/LoadingState';
import Badge from './common/Badge';
import Card from './common/Card';
import PageHeader from './common/PageHeader';

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
  | 'unresolved'
  | 'upstream'
  | 'downstream';

type GraphLayoutMode = 'architecture' | 'standard' | 'focus';
type EdgeFilterType = 'all' | 'runtime' | 'require' | 'type';

// Custom React Flow node component with role-first presentation and relationship emphasis
const GraphNodeComponent = ({ data }: any) => {
  const {
    node,
    isSelected,
    isCycle,
    isEntryPoint,
    isExternal,
    isUnresolved,
    isDimmed,
    inDegree = 0,
    outDegree = 0,
  } = data;

  let containerClass = 'bg-surface border border-line shadow-xs';
  if (isCycle) {
    containerClass = 'bg-red-surface/95 border-2 border-red-line shadow-xs ring-1 ring-red/30';
  } else if (isEntryPoint) {
    containerClass = 'bg-surface border border-line border-l-4 border-l-teal shadow-xs';
  } else if (isUnresolved) {
    containerClass = 'bg-amber-surface/20 border-2 border-dashed border-amber shadow-none';
  } else if (isExternal) {
    containerClass = 'bg-slate-surface/80 border border-dashed border-slate shadow-none';
  }

  if (isSelected) {
    containerClass += ' ring-2 ring-indigo ring-offset-2 shadow-2 scale-[1.02] z-20';
  }

  if (isDimmed) {
    containerClass += ' opacity-25 hover:opacity-100 transition-opacity';
  }

  const roleLabel = (node.module_role || 'module').toUpperCase();
  const entryKind = node.entry_point_kind
    ? node.entry_point_kind.replace('_', ' ').toUpperCase()
    : 'ENTRY';

  return (
    <div
      tabIndex={0}
      role="button"
      aria-label={`Node ${node.label}, ${node.language}, ${inDegree} in, ${outDegree} out`}
      className={`w-[250px] p-2.5 rounded-lg transition-all select-none hover:shadow-2 hover:-translate-y-[1px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo ${containerClass}`}
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
          {truncateMiddle(node.label, 22)}
        </span>
        <LanguageTag language={node.language} />
      </div>

      {/* Row 2: Role badge + Entry point / Status badges */}
      <div className="flex items-center justify-between gap-1 mb-1.5 flex-wrap">
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-panel text-ink-2 border border-line">
            {roleLabel}
          </span>
          {isEntryPoint && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-teal-surface text-teal-text border border-teal-line"
              title={node.entry_point_evidence || 'Confirmed entry point'}
            >
              {entryKind}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {isCycle && <StatusTag status="critical" label="LOOP" />}
          {isUnresolved && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-surface text-amber-text border border-amber-line flex items-center gap-0.5"
              title={node.standalone_reason || 'Unresolved imports or partial AST parse'}
            >
              <AlertTriangle className="w-2.5 h-2.5" /> PARTIAL
            </span>
          )}
          {isExternal && (
            <span className="px-1 py-0.5 rounded text-[9px] font-mono bg-slate-surface text-slate-text border border-slate/30">
              EXT
            </span>
          )}
        </div>
      </div>

      {/* Row 3: Primary Relationships (IN / OUT) + Risk & CC */}
      <div className="flex items-center justify-between pt-1.5 border-t border-line/60 text-[10px] font-mono text-ink-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-0.5 font-bold" title={`${inDegree} incoming callers`}>
            <ArrowDownLeft className="w-2.5 h-2.5 text-teal" />
            <span className="text-teal-strong">IN {inDegree}</span>
          </span>
          <span className="flex items-center gap-0.5 font-bold" title={`${outDegree} outgoing dependencies`}>
            <ArrowUpRight className="w-2.5 h-2.5 text-indigo" />
            <span className="text-indigo-text">OUT {outDegree}</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span
            className={`px-1.5 py-0.2 rounded text-[9px] font-sans font-bold uppercase ${
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
          <span className="text-ink-4 text-[9px]">CC {node.complexity_score}</span>
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

  // Selection & Inspector State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [showNeedsReviewModal, setShowNeedsReviewModal] = useState(false);
  const [selectedDiagnosticKey, setSelectedDiagnosticKey] = useState<string>('all');
  const [copiedPath, setCopiedPath] = useState(false);

  // List View sorting state
  const [sortField, setSortField] = useState<'label' | 'role' | 'in' | 'out' | 'unresolved' | 'status' | 'cc'>('cc');
  const [sortAsc, setSortAsc] = useState(false);

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
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const match = graph.nodes.find((n) => {
        const itemNorm = n.label.replace(/\\/g, '/').toLowerCase();
        return itemNorm === norm || n.id === targetFile || itemNorm.endsWith(norm);
      });
      if (match) setSelectedNodeId(match.id);
    }
  }, [targetFile, graph]);

  // Precompute in-degrees and out-degrees map
  const { inDegreeMap, outDegreeMap } = useMemo(() => {
    const inMap = new Map<string, number>();
    const outMap = new Map<string, number>();
    if (graph) {
      graph.nodes.forEach((n) => {
        inMap.set(n.id, n.fan_in ?? 0);
        outMap.set(n.id, n.fan_out ?? 0);
      });
      // If fan_in / fan_out weren't on nodes, calculate from edges
      if (graph.nodes.length > 0 && graph.nodes[0].fan_in === undefined) {
        graph.nodes.forEach((n) => {
          inMap.set(n.id, 0);
          outMap.set(n.id, 0);
        });
        graph.edges.forEach((e) => {
          inMap.set(e.target, (inMap.get(e.target) || 0) + 1);
          outMap.set(e.source, (outMap.get(e.source) || 0) + 1);
        });
      }
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

  // Advanced search query parser (e.g. "role:service", "entry:runtime", "unresolved:true", "lang:python")
  const parsedSearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tokens = q.split(/\s+/);
    const textTokens: string[] = [];
    let roleFilter: string | null = null;
    let entryFilter: string | null = null;
    let unresolvedOnly = false;
    let langFilter: string | null = null;
    let statusFilter: string | null = null;

    tokens.forEach((tok) => {
      if (tok.startsWith('role:')) {
        roleFilter = tok.slice(5);
      } else if (tok.startsWith('entry:')) {
        entryFilter = tok.slice(6);
      } else if (tok === 'unresolved:true' || tok === 'is:unresolved') {
        unresolvedOnly = true;
      } else if (tok.startsWith('lang:')) {
        langFilter = tok.slice(5);
      } else if (tok.startsWith('status:')) {
        statusFilter = tok.slice(7);
      } else if (tok) {
        textTokens.push(tok);
      }
    });

    return {
      rawText: textTokens.join(' '),
      roleFilter,
      entryFilter,
      unresolvedOnly,
      langFilter,
      statusFilter,
    };
  }, [searchQuery]);

  // Filtered nodes based on search, active filterMode, and external toggle
  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.filter((n) => {
      if (!includeExternal && n.is_external) return false;

      // Advanced search tokens
      if (parsedSearch.roleFilter && !(n.module_role || '').toLowerCase().includes(parsedSearch.roleFilter)) {
        return false;
      }
      if (parsedSearch.entryFilter && !(n.entry_point_kind || '').toLowerCase().includes(parsedSearch.entryFilter)) {
        return false;
      }
      if (parsedSearch.unresolvedOnly && !(n.unresolved_imports && n.unresolved_imports > 0) && n.standalone_status !== 'isolation_uncertain') {
        return false;
      }
      if (parsedSearch.langFilter && !n.language.toLowerCase().includes(parsedSearch.langFilter)) {
        return false;
      }
      if (parsedSearch.statusFilter && !(n.parse_status || '').toLowerCase().includes(parsedSearch.statusFilter)) {
        return false;
      }
      if (parsedSearch.rawText && !n.label.toLowerCase().includes(parsedSearch.rawText)) {
        return false;
      }

      // Filter modes
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
      if (filterMode === 'unresolved' && !(n.unresolved_imports && n.unresolved_imports > 0) && n.standalone_status !== 'isolation_uncertain') {
        return false;
      }
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
    parsedSearch,
    filterMode,
    graphLayout,
    selectedNodeId,
    cycleNodeIds,
    upstreamNodeIds,
    downstreamNodeIds,
    focusNeighborhoodIds,
  ]);

  // For large repos: cap the rendered nodes to prevent browser freeze.
  // Sort by complexity so the most important nodes are always shown.
  const MAX_GRAPH_NODES = 120;
  const cappedNodes = useMemo(() => {
    if (filteredNodes.length <= MAX_GRAPH_NODES) return filteredNodes;
    return [...filteredNodes]
      .sort((a, b) => (b.complexity_score ?? 0) - (a.complexity_score ?? 0))
      .slice(0, MAX_GRAPH_NODES);
  }, [filteredNodes]);
  const isGraphCapped = filteredNodes.length > MAX_GRAPH_NODES;

  const filteredNodeIds = useMemo(() => new Set(cappedNodes.map((n) => n.id)), [cappedNodes]);

  // Filtered edges based on filteredNodeIds and edgeFilter
  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    return graph.edges.filter((e) => {
      if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;

      const edgeKind = e.kind || e.type;
      if (edgeFilter === 'runtime') {
        if (edgeKind === 'type_only_import' || e.is_type_only) return false;
      } else if (edgeFilter === 'require') {
        if (edgeKind !== 'require' && e.type !== 'require') return false;
      } else if (edgeFilter === 'type') {
        if (edgeKind !== 'type_only_import' && !e.is_type_only) return false;
      }

      // If cycles only filter is active, only show cycle edges
      if (filterMode === 'cycles' && !cycleEdgePairs.has(`${e.source}->${e.target}`)) {
        return false;
      }

      return true;
    });
  }, [graph, filteredNodeIds, edgeFilter, filterMode, cycleEdgePairs]);

  // React Flow Nodes layout calculation with Architecture Tier, Focus, or Grid
  const rfNodes: Node[] = useMemo(() => {
    if (cappedNodes.length === 0) return [];

    // --- Mode 1: Selected-Node Focus Mode (3-column pipeline) ---
    if (graphLayout === 'focus' && selectedNodeId) {
      const focalNode = cappedNodes.find((n) => n.id === selectedNodeId);
      const upstreamList = cappedNodes.filter(
        (n) => n.id !== selectedNodeId && upstreamNodeIds.has(n.id)
      );
      const downstreamList = cappedNodes.filter(
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
          position: { x: 50, y: idx * 140 + 80 },
          data: {
            node: n,
            isSelected: false,
            isCycle: cycleNodeIds.has(n.id) && highlightCycles,
            isEntryPoint: n.is_entry_point,
            isExternal: n.is_external,
            isUnresolved: n.standalone_status === 'isolation_uncertain' || (n.unresolved_imports && n.unresolved_imports > 0),
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
          position: { x: 430, y: focalY },
          data: {
            node: focalNode,
            isSelected: true,
            isCycle: cycleNodeIds.has(focalNode.id) && highlightCycles,
            isEntryPoint: focalNode.is_entry_point,
            isExternal: focalNode.is_external,
            isUnresolved: focalNode.standalone_status === 'isolation_uncertain' || (focalNode.unresolved_imports && focalNode.unresolved_imports > 0),
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
          position: { x: 810, y: idx * 140 + 80 },
          data: {
            node: n,
            isSelected: false,
            isCycle: cycleNodeIds.has(n.id) && highlightCycles,
            isEntryPoint: n.is_entry_point,
            isExternal: n.is_external,
            isUnresolved: n.standalone_status === 'isolation_uncertain' || (n.unresolved_imports && n.unresolved_imports > 0),
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
      const tier0: typeof cappedNodes = []; // Entry points
      const tier1: typeof cappedNodes = []; // Core domain & services
      const tier2: typeof cappedNodes = []; // Leaf modules & utilities
      const tier3: typeof cappedNodes = []; // External packages

      cappedNodes.forEach((n) => {
        if (n.is_external) {
          tier3.push(n);
        } else if (
          n.is_entry_point ||
          (graph?.entry_point_ids && graph.entry_point_ids.includes(n.id)) ||
          n.entry_point_kind !== null
        ) {
          tier0.push(n);
        } else if ((outDegreeMap.get(n.id) || 0) === 0) {
          tier2.push(n);
        } else {
          tier1.push(n);
        }
      });

      const nodesResult: Node[] = [];
      const xSpacing = 290;
      const ySubRowSpacing = 145;
      const tierGap = 90;
      const maxCols = 4;

      let currentY = 50;

      const placeTier = (tierNodes: typeof cappedNodes) => {
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
              isUnresolved: n.standalone_status === 'isolation_uncertain' || (n.unresolved_imports && n.unresolved_imports > 0),
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
    const cols = Math.max(2, Math.ceil(Math.sqrt(cappedNodes.length * 1.5)));
    const nodeWidth = 290;
    const nodeHeight = 150;

    return cappedNodes.map((n, idx) => {
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
          isUnresolved: n.standalone_status === 'isolation_uncertain' || (n.unresolved_imports && n.unresolved_imports > 0),
          isDimmed,
          inDegree: inDegreeMap.get(n.id) || 0,
          outDegree: outDegreeMap.get(n.id) || 0,
        },
      };
    });
  }, [
    cappedNodes,
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
      const isEdgeSelected = selectedEdgeId === e.id;

      let stroke = 'rgba(29, 78, 216, 0.75)';
      let strokeWidth = 1.75;
      let strokeDasharray: string | undefined = undefined;
      let opacity = selectedNodeId ? (isConnectedToSelected ? 1 : 0.12) : 0.75;
      let label: string | undefined = undefined;
      let markerColor = '#1D4ED8';

      const edgeKind = e.kind || e.type;

      if (isEdgeSelected) {
        stroke = '#4F46E5';
        strokeWidth = 3;
        opacity = 1;
        markerColor = '#4F46E5';
      } else if (isCycle) {
        stroke = '#DC2626';
        strokeWidth = 2.4;
        strokeDasharray = '5 5';
        opacity = 1;
        markerColor = '#DC2626';
      } else if (edgeKind === 'type_only_import' || e.is_type_only) {
        stroke = '#60A5FA';
        strokeWidth = 1.5;
        strokeDasharray = '4 4';
        label = 'type';
        markerColor = '#60A5FA';
        opacity = selectedNodeId ? (isConnectedToSelected ? 0.95 : 0.12) : 0.65;
      } else if (edgeKind === 'dynamic_import' || e.is_dynamic) {
        stroke = '#8B5CF6';
        strokeWidth = 1.8;
        strokeDasharray = '3 3';
        label = 'dynamic';
        markerColor = '#8B5CF6';
        opacity = selectedNodeId ? (isConnectedToSelected ? 1 : 0.12) : 0.7;
      } else if (edgeKind === 're_export') {
        stroke = '#059669';
        strokeWidth = 1.8;
        label = 're-export';
        markerColor = '#059669';
        opacity = selectedNodeId ? (isConnectedToSelected ? 1 : 0.12) : 0.7;
      } else if (edgeKind === 'require' || e.type === 'require') {
        stroke = '#0D9488';
        strokeWidth = 1.75;
        markerColor = '#0D9488';
        label = 'require';
        opacity = selectedNodeId ? (isConnectedToSelected ? 1 : 0.12) : 0.7;
      } else if (isConnectedToSelected) {
        stroke = '#1D4ED8';
        strokeWidth = 2.5;
        markerColor = '#1D4ED8';
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
        style: { stroke, strokeWidth, strokeDasharray, opacity, cursor: 'pointer' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 14,
          height: 14,
          color: markerColor,
        },
      };
    });
  }, [filteredEdges, cycleEdgePairs, highlightCycles, selectedNodeId, selectedEdgeId]);

  // Selected node data
  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !graph) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graph]);

  // Selected edge data for edge inspector
  const selectedEdgeData = useMemo(() => {
    if (!selectedEdgeId || !graph) return null;
    const edge = graph.edges.find((e) => e.id === selectedEdgeId);
    if (!edge) return null;
    const srcNode = graph.nodes.find((n) => n.id === edge.source);
    const tgtNode = graph.nodes.find((n) => n.id === edge.target);
    return {
      edge,
      sourceLabel: srcNode?.label || edge.source,
      targetLabel: tgtNode?.label || edge.target,
    };
  }, [selectedEdgeId, graph]);

  // Incoming and outgoing edge breakdown
  const incomingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.target === selectedNodeId);
  }, [selectedNodeId, graph]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.source === selectedNodeId);
  }, [selectedNodeId, graph]);

  // Unresolved imports for selected node
  const selectedNodeUnresolved = useMemo(() => {
    if (!selectedNodeId || !graph?.unresolved) return [];
    return graph.unresolved.filter((u) => u.source === selectedNodeId);
  }, [selectedNodeId, graph]);

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
    let reason = 'Standard modular component with isolated blast radius.';

    if (isPartCycle || isCritComplexity) {
      level = 'critical';
      reason = isPartCycle
        ? `Part of ${cyclesWithNode.length} circular dependency loop(s); tightly coupled.`
        : 'Critical cyclomatic complexity requiring contract characterization.';
    } else if (isHighComplexity || inCount >= 4) {
      level = 'high';
      reason =
        inCount >= 4
          ? `High incoming caller coupling with ${inCount} dependents across the codebase.`
          : 'High cyclomatic complexity prone to regression bugs.';
    } else if (inCount >= 2 || outCount >= 4) {
      level = 'medium';
      reason = 'Moderate coupling affecting adjacent architectural layers.';
    }

    return { level, reason, blastRadius: selectedNodeData.blast_radius ?? inCount };
  }, [selectedNodeData, incomingEdges, outgoingEdges, cycleNodeIds, cyclesWithNode]);

  // Sortable List View items
  const sortedListNodes = useMemo(() => {
    const list = [...filteredNodes];
    list.sort((a, b) => {
      let valA: any = 0;
      let valB: any = 0;
      if (sortField === 'label') {
        valA = a.label.toLowerCase();
        valB = b.label.toLowerCase();
      } else if (sortField === 'role') {
        valA = a.module_role || '';
        valB = b.module_role || '';
      } else if (sortField === 'in') {
        valA = inDegreeMap.get(a.id) || 0;
        valB = inDegreeMap.get(b.id) || 0;
      } else if (sortField === 'out') {
        valA = outDegreeMap.get(a.id) || 0;
        valB = outDegreeMap.get(b.id) || 0;
      } else if (sortField === 'unresolved') {
        valA = a.unresolved_imports || 0;
        valB = b.unresolved_imports || 0;
      } else if (sortField === 'status') {
        valA = a.parse_status || 'complete';
        valB = b.parse_status || 'complete';
      } else if (sortField === 'cc') {
        valA = a.complexity_score || 0;
        valB = b.complexity_score || 0;
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [filteredNodes, sortField, sortAsc, inDegreeMap, outDegreeMap]);

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
    setSelectedEdgeId(null);
    const nodeLabel = (node.data as any)?.node?.label || node.id;
    onSelectFile?.(nodeLabel);
  };

  const handleEdgeClick = (_: any, edge: any) => {
    setSelectedEdgeId(edge.id);
  };

  const handlePaneClick = () => {
    if (graphLayout !== 'focus') {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
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

  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
    showToast('Copied file path to clipboard', 'info');
  };

  if (!projectId) return null;

  if (loading) {
    return <LoadingState label="Building dependency graph…" />;
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

  const cycleCount = graph.summary.cycles ?? graph.summary.cycle_count ?? graph.cycles.length ?? 0;
  const totalInternalModules = graph.summary.total_modules ?? graph.nodes.filter((n) => !n.is_external).length;
  const canonicalResolvedEdges = graph.summary.resolved_edges ?? graph.edges.filter((e) => e.resolved).length;
  const unresolvedCount = graph.summary.unresolved_imports ?? (graph.unresolved ? graph.unresolved.length : 0);
  const confirmedEntryPoints = graph.summary.entry_points ?? graph.summary.entry_point_count ?? 0;
  const trueStandaloneCount = graph.summary.standalone_modules ?? graph.summary.orphan_count ?? 0;
  const graphConfidence = graph.summary.graph_confidence || 'high';

  return (
    <div
      className="space-y-3.5 sm:space-y-4 animate-[fade-up_250ms_ease-out_both]"
      role="tabpanel"
      id="tabpanel-graph"
      aria-labelledby="tab-graph"
    >
      <PageHeader
        icon={Workflow}
        title="Dependency Graph"
        description="Deterministic module coupling, semantic entry points, and verified cycles. Single canonical source of truth for blast radius and impact."
        badge={
          <>
            <Badge tone="indigo" size="sm">
              Canonical map
            </Badge>
            <Badge
              tone={graphConfidence === 'high' ? 'green' : 'amber'}
              size="sm"
              title={graph.summary.graph_confidence_reason || 'Graph confidence score'}
            >
              Confidence: {graphConfidence}
            </Badge>
          </>
        }
        actions={
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {unresolvedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNeedsReviewModal(true)}
                icon={<AlertTriangle className="w-3.5 h-3.5 text-amber" />}
                className="border-amber-line bg-amber-surface/40 text-amber-text hover:bg-amber-surface"
              >
                Needs Review ({unresolvedCount})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadMermaid}
              icon={<Download className="w-3.5 h-3.5" strokeWidth={1.75} />}
            >
              Download Mermaid
            </Button>
          </div>
        }
      />

      <Card variant="primary" padding="lg">
        {/* 6 Canonical Stat tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatTile
            label="MODULES"
            value={formatNumber(totalInternalModules)}
            color="ink"
          />
          <StatTile
            label="RESOLVED EDGES"
            value={formatNumber(canonicalResolvedEdges)}
            color="ink"
          />
          <StatTile
            label="UNRESOLVED IMPORTS"
            value={formatNumber(unresolvedCount)}
            color={unresolvedCount > 0 ? 'amber' : 'ink'}
            onClick={unresolvedCount > 0 ? () => setShowNeedsReviewModal(true) : undefined}
            title={unresolvedCount > 0 ? 'Click to inspect unresolved import diagnostics' : undefined}
          />
          <StatTile
            label="DETECTED CYCLES"
            value={formatNumber(cycleCount)}
            color={cycleCount > 0 ? 'red' : 'ink'}
          />
          <StatTile
            label="CONFIRMED ENTRY POINTS"
            value={formatNumber(confirmedEntryPoints)}
            color="teal"
          />
          <StatTile
            label="TRUE STANDALONE"
            value={formatNumber(trueStandaloneCount)}
            color="ink"
          />
        </div>

        {/* Confidence Context Banner */}
        <div className="mt-3.5 pt-3 border-t border-line/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-ink-2">Cycle Semantics:</span>
            {cycleCount === 0 ? (
              <span className="inline-flex items-center gap-1 text-teal-strong font-medium">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                {unresolvedCount === 0 ? 'Clean hierarchical DAG' : '0 cycles detected in resolved graph'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-red font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-red" />
                {cycleCount} dependency cycle(s) detected
              </span>
            )}
            {graph.summary.cycle_confidence_warning && (
              <span className="text-amber-text font-medium ml-1">
                {graph.summary.cycle_confidence_warning}
              </span>
            )}
          </div>

          <div className="font-mono text-[10px] text-ink-4">
            Canvas renders top {cappedNodes.length} of {filteredNodes.length} modules · Metrics use all {totalInternalModules} modules
          </div>
        </div>
      </Card>

      {/* 2. Subgraph Views & Layout Toolbar */}
      <Card variant="secondary" padding="sm" className="space-y-3">
        {/* Row 1: Search & Subgraph Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <SearchField
            id="graph-search"
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search path, role:service, entry:bootstrap, unresolved:true…"
            resultCount={{ current: filteredNodes.length, total: graph.nodes.length, unit: 'nodes' }}
            className="w-full xl:w-80"
          />

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-ink-2 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5 text-indigo" />
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
            {unresolvedCount > 0 && (
              <FilterChip
                label={`UNRESOLVED (${unresolvedCount})`}
                active={filterMode === 'unresolved'}
                onClick={() => setFilterMode('unresolved')}
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
        </div>

        {/* Row 2: Edge Controls + Layout Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-line">
          {/* Edge Controls Group */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-ink-2 flex items-center gap-1 mr-1">
              <Workflow className="w-3.5 h-3.5 text-indigo" />
              Edge Type:
            </span>
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
              tone={cycleCount > 0 ? 'red' : 'indigo'}
              onToggle={() => setHighlightCycles((v) => !v)}
            />
          </div>

          {/* View Mode & Layout Group */}
          <div className="flex flex-wrap items-center gap-2 lg:pl-4 lg:border-l lg:border-line">
            <span className="text-xs font-bold text-ink-2 flex items-center gap-1 mr-1">
              <Layers className="w-3.5 h-3.5 text-indigo" />
              Layout:
            </span>
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
                title="Architecture Layered Tiers"
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
                title="Selected-Node 1-Hop Focus Mode"
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
      </Card>

      {/* 3. Main Workspace: Graph Canvas vs List View */}
      {viewMode === 'graph' ? (
        <div
          className={`grid grid-cols-1 ${
            selectedNodeData || selectedEdgeData ? 'lg:grid-cols-[1fr_320px]' : 'lg:grid-cols-[1fr_240px]'
          } gap-4 items-start`}
        >
          {/* React Flow Canvas Container */}
          <div className="relative w-full h-[580px] sm:h-[650px] rounded-lg border border-line overflow-hidden graph-dot-grid shadow-inner">
            {/* Top Canvas Status Notice */}
            <div className="absolute top-3 left-3 z-10 bg-surface/90 backdrop-blur-sm border border-line rounded-lg px-3 py-1.5 shadow-1 flex items-center gap-2.5 text-xs text-ink-2 max-w-lg">
              <Info className="w-4 h-4 text-indigo shrink-0" />
              <span className="truncate">
                {isGraphCapped ? (
                  <>
                    Showing top <strong>{cappedNodes.length}</strong> of <strong>{filteredNodes.length}</strong> nodes for performance. Graph metrics use all <strong>{totalInternalModules}</strong> modules.
                  </>
                ) : (
                  <>
                    Showing <strong>{cappedNodes.length}</strong> modules. All graph metrics reflect the canonical repository graph.
                  </>
                )}
              </span>
              <button
                type="button"
                onClick={() => setFitTrigger((v) => v + 1)}
                className="font-bold text-indigo hover:underline shrink-0 flex items-center gap-1"
              >
                <Maximize2 className="w-3 h-3" /> Fit
              </button>
            </div>

            {/* Focus Mode Active Banner */}
            {graphLayout === 'focus' && selectedNodeData && (
              <div className="absolute top-12 inset-x-3 z-10 bg-indigo-surface/95 backdrop-blur-sm border border-indigo/30 rounded-lg px-4 py-2 shadow-2 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Eye className="w-4 h-4 text-indigo shrink-0" />
                  <span className="font-bold text-indigo-text truncate">
                    Focus Mode: <span className="font-mono">{selectedNodeData.label}</span>
                  </span>
                  <span className="text-ink-3 hidden sm:inline">
                    ({incomingEdges.length} callers, {outgoingEdges.length} dependencies)
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
            {cappedNodes.length === 0 && (
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
                    setIncludeExternal(false);
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
                onEdgeClick={handleEdgeClick}
                onPaneClick={handlePaneClick}
                minZoom={0.15}
                maxZoom={2.0}
                fitView
              >
                <AutoFitView trigger={fitTrigger + cappedNodes.length + (selectedNodeId ? 1 : 0)} />

                <Controls
                  className="!m-3 !bg-surface !border !border-line !rounded-md !shadow-1 !overflow-hidden [&>button]:!border-b [&>button]:!border-line [&>button]:!w-9 [&>button]:!h-9"
                  showInteractive={false}
                />

                {/* Collapsible Separated Legend */}
                <Panel position="bottom-left" className="!m-3">
                  <div className="bg-surface/98 backdrop-blur-md border border-line-strong/60 rounded-lg p-3 shadow-lg max-w-md text-xs">
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
                        {/* 1. Node Role */}
                        <div>
                          <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
                            Node Role
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs border-l-[3px] border-l-teal bg-surface border border-line" />
                              Entry Point
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-surface border border-line" />
                              Internal Module
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-slate-surface border border-dashed border-slate" />
                              External Package
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-amber-surface/50 border border-dashed border-amber" />
                              Partial / Unresolved
                            </span>
                          </div>
                        </div>

                        {/* 2. Risk Level */}
                        <div className="pt-1.5 border-t border-line/50">
                          <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
                            Risk Level
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-amber-surface border border-amber-line" />
                              High Complexity
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-red-strong" />
                              Critical Risk
                            </span>
                          </div>
                        </div>

                        {/* 3. Graph State */}
                        <div className="pt-1.5 border-t border-line/50">
                          <span className="text-[10px] font-bold text-ink-3 uppercase tracking-wider block mb-1">
                            Graph State
                          </span>
                          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] text-ink-2 font-sans">
                            <span className="flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-xs bg-red-surface/95 border-2 border-red-line ring-1 ring-red/30" />
                              Cycle Member
                            </span>
                            <span className="flex items-center gap-1.5">
                              <span className="w-3 h-0.5 border-t-2 border-dashed border-red" />
                              Cycle Edge
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

                {/* Minimap */}
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
                    return '#4C4FD6';
                  }}
                  maskColor="rgba(231, 224, 211, 0.45)"
                  zoomable
                  pannable
                />
              </ReactFlow>
            </ReactFlowProvider>
          </div>

          {/* 4. Side Drawer: Selected Node OR Selected Edge Inspector */}
          <div className="bg-surface border border-line rounded-lg p-5 shadow-1 min-h-[440px] flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-line mb-4 flex items-center justify-between">
                <span className="font-sans text-[11px] font-bold text-ink-2 uppercase tracking-wider block">
                  {selectedEdgeData ? 'SELECTED RELATIONSHIP' : 'SELECTED NODE'}
                </span>
                {(selectedNodeId || selectedEdgeId) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedNodeId(null);
                      setSelectedEdgeId(null);
                      if (filterMode === 'upstream' || filterMode === 'downstream') setFilterMode('all');
                      if (graphLayout === 'focus') setGraphLayout('architecture');
                    }}
                    className="text-xs text-ink-3 hover:text-ink font-semibold"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Edge Inspection Card */}
              {selectedEdgeData ? (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-ink-3 font-semibold mb-1">
                      <span>Source Module:</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-ink break-all bg-tile p-2 rounded border border-line">
                      {selectedEdgeData.sourceLabel}
                    </div>
                  </div>

                  <div className="text-center font-mono text-indigo font-bold text-sm">↓ imports ↓</div>

                  <div>
                    <div className="flex items-center justify-between gap-1 text-[11px] text-ink-3 font-semibold mb-1">
                      <span>Target Module:</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-ink break-all bg-tile p-2 rounded border border-line">
                      {selectedEdgeData.targetLabel}
                    </div>
                  </div>

                  <div className="bg-tile rounded-md p-3 border border-line text-xs space-y-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-ink-3">Relationship:</span>
                      <span className="font-bold text-indigo-text">
                        {(selectedEdgeData.edge.kind || selectedEdgeData.edge.type).replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Confidence:</span>
                      <span className="font-bold text-teal-strong">
                        {(selectedEdgeData.edge.confidence || 'HIGH').toUpperCase()}
                      </span>
                    </div>
                    {selectedEdgeData.edge.raw_import && (
                      <div className="flex justify-between">
                        <span className="text-ink-3">Raw Specifier:</span>
                        <span className="font-bold text-ink break-all">{selectedEdgeData.edge.raw_import}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-ink-3">Source Line:</span>
                      <span className="font-bold">Line {selectedEdgeData.edge.source_line}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-line space-y-2">
                    <Button
                      variant="indigo"
                      size="sm"
                      onClick={() => {
                        setSelectedNodeId(selectedEdgeData.edge.target);
                        setSelectedEdgeId(null);
                      }}
                      className="w-full justify-center text-xs"
                    >
                      Focus Target Module
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedNodeId(selectedEdgeData.edge.source);
                        setSelectedEdgeId(null);
                      }}
                      className="w-full justify-center text-xs"
                    >
                      Focus Source Module
                    </Button>
                  </div>
                </div>
              ) : selectedNodeData ? (
                <div className="space-y-4">
                  {/* File Label & Badges */}
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div className="font-mono font-bold text-[13px] text-ink break-all">
                        {selectedNodeData.label}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPath(selectedNodeData.label)}
                        className="p-1 rounded text-ink-3 hover:text-ink hover:bg-tile"
                        title="Copy relative file path"
                      >
                        {copiedPath ? <Check className="w-3.5 h-3.5 text-teal" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <LanguageTag language={selectedNodeData.language} />
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-panel text-ink-2 border border-line">
                        ROLE: {(selectedNodeData.module_role || 'utility').toUpperCase()}
                      </span>
                      {selectedNodeData.is_entry_point && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-teal-surface text-teal-text border border-teal-line">
                          {selectedNodeData.entry_point_kind
                            ? selectedNodeData.entry_point_kind.replace('_', ' ').toUpperCase()
                            : 'ENTRY POINT'}
                        </span>
                      )}
                      {cycleNodeIds.has(selectedNodeData.id) && (
                        <StatusTag status="critical" label="CYCLE LOOP" />
                      )}
                    </div>
                  </div>

                  {/* Parse Status & Entry Evidence */}
                  <div className="bg-tile rounded-md p-2.5 border border-line text-xs space-y-1 text-ink-2">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-ink-3">AST Parse:</span>
                      <span className="font-bold text-ink uppercase">
                        {selectedNodeData.parse_status || 'COMPLETE'} (HIGH)
                      </span>
                    </div>
                    {selectedNodeData.entry_point_evidence && (
                      <div className="text-[11px] text-teal-strong pt-1 border-t border-line/50">
                        <strong>Evidence:</strong> {selectedNodeData.entry_point_evidence}
                      </div>
                    )}
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

                  {/* Cycle Warning Breakdown */}
                  {cyclesWithNode.length > 0 && (
                    <div className="p-3 rounded-md bg-red-surface border border-red-line text-xs space-y-1.5 text-red-text">
                      <div className="font-bold flex items-center gap-1">
                        <span>Part of {cyclesWithNode.length} Circular Loop(s)</span>
                      </div>
                      <div className="space-y-1 font-mono text-[10px] bg-white/60 p-2 rounded border border-red-line/40">
                        {cyclesWithNode.map((cycle, i) => (
                          <div key={i} className="truncate" title={cycle.join(' → ')}>
                            Loop {i + 1}: {cycle.slice(0, 3).join(' → ')}
                            {cycle.length > 3 ? ' → …' : ` → ${cycle[0]}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metric Breakdown */}
                  <div className="bg-tile rounded-md p-3 border border-line text-xs space-y-1.5 text-ink-2 font-mono">
                    <div className="flex justify-between">
                      <span className="text-ink-3">LOC / Complexity:</span>
                      <span className="font-bold">
                        {formatNumber(selectedNodeData.line_count)} lines · CC {selectedNodeData.complexity_score}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Incoming Callers:</span>
                      <span className="font-bold text-teal-strong">
                        {incomingEdges.length} ({inDegreeMap.get(selectedNodeData.id) || 0} resolved)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Outgoing Dependencies:</span>
                      <span className="font-bold text-indigo-text">
                        {outgoingEdges.length} ({outDegreeMap.get(selectedNodeData.id) || 0} resolved)
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-3">Blast Radius:</span>
                      <span className="font-bold text-red">
                        {selectedNodeData.blast_radius ?? incomingEdges.length} downstream callers
                      </span>
                    </div>
                    {selectedNodeUnresolved.length > 0 && (
                      <div className="flex justify-between text-amber-text pt-1 border-t border-line/60">
                        <span>Unresolved Local Imports:</span>
                        <span className="font-bold">{selectedNodeUnresolved.length}</span>
                      </div>
                    )}
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
                      {graphLayout === 'focus' ? 'Exit Focus Mode' : 'Focus 1-Hop Neighborhood'}
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

                  {/* Primary Actions */}
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
                      Inspect Blast Radius &amp; Impact
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
                <div className="py-8 px-2 text-center text-ink-3 flex flex-col items-center justify-center my-auto">
                  <div className="w-10 h-10 rounded-full bg-tile border border-line flex items-center justify-center mb-3 text-ink-3 shadow-xs">
                    <Info className="w-5 h-5" />
                  </div>
                  <h4 className="text-xs font-bold text-ink mb-1.5">No Node Selected</h4>
                  <p className="text-[11px] text-ink-3 font-sans leading-relaxed">
                    Click any module node or relationship edge on the canvas to inspect incoming callers, outgoing dependencies, and characterization test hooks.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 4. Accessible & Sortable List View Table */
        <div
          role="region"
          aria-label="Dependency graph data table"
          className="bg-surface border border-line rounded-lg overflow-x-auto shadow-1"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-panel text-ink-2 font-bold uppercase tracking-wider text-[11px] border-b border-line select-none">
              <tr>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-tile"
                  onClick={() => {
                    setSortField('label');
                    setSortAsc((v) => !v);
                  }}
                >
                  Module {sortField === 'label' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-tile"
                  onClick={() => {
                    setSortField('role');
                    setSortAsc((v) => !v);
                  }}
                >
                  Role {sortField === 'role' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-tile"
                  onClick={() => {
                    setSortField('in');
                    setSortAsc((v) => !v);
                  }}
                >
                  Fan-In (Callers) {sortField === 'in' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-tile"
                  onClick={() => {
                    setSortField('out');
                    setSortAsc((v) => !v);
                  }}
                >
                  Fan-Out (Deps) {sortField === 'out' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:bg-tile"
                  onClick={() => {
                    setSortField('unresolved');
                    setSortAsc((v) => !v);
                  }}
                >
                  Unresolved {sortField === 'unresolved' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-tile"
                  onClick={() => {
                    setSortField('status');
                    setSortAsc((v) => !v);
                  }}
                >
                  Parse Status {sortField === 'status' && (sortAsc ? '↑' : '↓')}
                </th>
                <th
                  className="py-3 px-4 cursor-pointer hover:bg-tile"
                  onClick={() => {
                    setSortField('cc');
                    setSortAsc((v) => !v);
                  }}
                >
                  Risk / CC {sortField === 'cc' && (sortAsc ? '↑' : '↓')}
                </th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-ink-2 font-mono">
              {sortedListNodes.map((n) => {
                const inCount = inDegreeMap.get(n.id) || 0;
                const outCount = outDegreeMap.get(n.id) || 0;
                const unres = n.unresolved_imports || 0;

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
                      <div className="flex items-center gap-1.5">
                        <span>{truncateMiddle(n.label, 36)}</span>
                        <LanguageTag language={n.language} />
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-panel text-ink-2 border border-line">
                        {(n.module_role || 'utility').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-teal-strong font-bold">{inCount}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-indigo-text font-bold">{outCount}</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {unres > 0 ? (
                        <span className="text-amber font-bold">{unres}</span>
                      ) : (
                        <span className="text-ink-4">0</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-sans text-xs">
                      {n.parse_status === 'complete' ? (
                        <span className="text-teal-strong">Complete (Full AST)</span>
                      ) : (
                        <span className="text-amber-text font-bold uppercase">{n.parse_status || 'Partial'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <StatusTag
                        status={`complexity-${n.complexity_rating.toLowerCase()}`}
                        label={`${n.complexity_rating.toUpperCase()} (${n.complexity_score})`}
                      />
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

      {/* 5. Needs Review Diagnostics Modal */}
      {showNeedsReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-[fade-in_150ms_ease-out]">
          <div className="bg-surface border border-line rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-line flex items-center justify-between bg-panel">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-amber-surface text-amber flex items-center justify-center border border-amber-line">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-ink">
                    Unresolved Dependencies Diagnostics
                  </h3>
                  <p className="text-xs text-ink-3">
                    {unresolvedCount} internal relationship(s) could not be confidently resolved to target files.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowNeedsReviewModal(false)}
                className="p-1.5 rounded-md text-ink-3 hover:text-ink hover:bg-tile"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Diagnostic Categories Filter */}
            <div className="p-4 border-b border-line bg-surface flex items-center gap-2 overflow-x-auto">
              <button
                type="button"
                onClick={() => setSelectedDiagnosticKey('all')}
                className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors ${
                  selectedDiagnosticKey === 'all'
                    ? 'bg-indigo text-white'
                    : 'bg-panel text-ink-2 hover:bg-tile border border-line'
                }`}
              >
                All ({unresolvedCount})
              </button>
              {graph.summary.unresolved_breakdown &&
                Object.entries(graph.summary.unresolved_breakdown).map(([key, count]) => {
                  const label =
                    key === 'ts_alias'
                      ? 'TS Aliases'
                      : key === 'python_relative'
                      ? 'Python Relative'
                      : key === 'dynamic_import'
                      ? 'Dynamic Imports'
                      : key === 'generated'
                      ? 'Generated Code'
                      : key === 'syntax_error'
                      ? 'Parse Fallback'
                      : key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDiagnosticKey(key)}
                      className={`px-3 py-1 rounded text-xs font-bold font-mono transition-colors ${
                        selectedDiagnosticKey === key
                          ? 'bg-indigo text-white'
                          : 'bg-panel text-ink-2 hover:bg-tile border border-line'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
            </div>

            {/* Diagnostics Items List */}
            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {graph.unresolved && graph.unresolved.length > 0 ? (
                graph.unresolved
                  .filter((u) => selectedDiagnosticKey === 'all' || u.reason_key === selectedDiagnosticKey)
                  .map((u, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-lg border border-line bg-tile hover:bg-surface transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-indigo-text">
                          {u.source_path} <span className="text-ink-4">line {u.line}</span>
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-surface text-amber-text border border-amber-line">
                          {u.reason_key.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-xs text-ink bg-surface p-2 rounded border border-line/60 break-all mb-1.5">
                        <span className="text-ink-4">import:</span>
                        <strong>{u.raw_import}</strong>
                      </div>
                      <p className="text-[11px] text-ink-3">
                        {u.reason_label}
                      </p>
                    </div>
                  ))
              ) : (
                <div className="text-center py-10 text-xs text-ink-3">
                  No unresolved dependencies in this category.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-line bg-panel flex items-center justify-between">
              <span className="text-xs text-ink-3">
                Resolving tsconfig paths or Python package roots improves full architecture confidence.
              </span>
              <Button
                variant="indigo"
                size="sm"
                onClick={() => setShowNeedsReviewModal(false)}
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DependencyGraphTab;

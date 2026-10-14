import { useState, useEffect, useCallback, useMemo } from 'react';
import { GraphResponse } from '../types';
import { analysisService } from '../services';
import {
  GraphFilterMode,
  GraphLayoutMode,
  EdgeFilterType,
  computeDegreeMaps,
  findCycleNodeIds,
  findCycleEdgePairs,
  findUpstreamNodeIds,
  findDownstreamNodeIds,
  findFocusNeighborhoodIds,
  parseGraphSearchQuery,
  filterGraphNodes,
  capGraphNodes,
  filterGraphEdges,
  computeNodeRiskSummary,
  NodeRiskSummary,
} from '../utils/graphUtils';
import { ListSortField } from '../components/graph/GraphListViewTable';

import { useProjectQuery } from './useProjectQuery';

export interface UseDependencyGraphProps {
  projectId?: string | null;
  targetFile?: string | null;
  onSelectFile?: (filePath: string) => void;
}

export function useDependencyGraph({
  projectId,
  targetFile,
  onSelectFile,
}: UseDependencyGraphProps) {
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
  const [showMetricsToolbar, setShowMetricsToolbar] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [fitTrigger, setFitTrigger] = useState(0);
  const [showNeedsReviewModal, setShowNeedsReviewModal] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  // List View sorting state
  const [sortField, setSortField] = useState<ListSortField>('cc');
  const [sortAsc, setSortAsc] = useState(false);

  const queryFn = useCallback(
    (signal: AbortSignal) => {
      if (!projectId) throw new Error('No project ID');
      return analysisService.getDependencyGraph(projectId, 'module', undefined, undefined, false, {
        signal,
      });
    },
    [projectId]
  );

  const {
    data: graph,
    loading,
    error,
    refetch: fetchGraph,
  } = useProjectQuery<GraphResponse>({
    projectId,
    queryFn,
  });

  // Synchronize targetFile prop with selected node
  useEffect(() => {
    if (targetFile && graph) {
      const norm = targetFile.replace(/\\/g, '/').toLowerCase();
      const match = graph.nodes.find((n) => {
        const itemNorm = n.label.replace(/\\/g, '/').toLowerCase();
        return itemNorm === norm || n.id === targetFile || itemNorm.endsWith(norm);
      });
      if (match) {
        setSelectedNodeId(match.id);
        onSelectFile?.(match.label);
      }
    }
  }, [targetFile, graph, onSelectFile]);

  // Precompute in-degrees and out-degrees map
  const { inDegreeMap, outDegreeMap } = useMemo(() => {
    if (!graph) return { inDegreeMap: new Map<string, number>(), outDegreeMap: new Map<string, number>() };
    return computeDegreeMaps(graph.nodes, graph.edges);
  }, [graph]);

  // Cycle sets
  const cycleNodeIds = useMemo(() => findCycleNodeIds(graph?.cycles), [graph?.cycles]);
  const cycleEdgePairs = useMemo(() => findCycleEdgePairs(graph?.cycles), [graph?.cycles]);

  // Upstream, Downstream, Focus sets
  const upstreamNodeIds = useMemo(() => {
    if (!selectedNodeId || !graph) return new Set<string>();
    return findUpstreamNodeIds(selectedNodeId, graph.edges);
  }, [selectedNodeId, graph]);

  const downstreamNodeIds = useMemo(() => {
    if (!selectedNodeId || !graph) return new Set<string>();
    return findDownstreamNodeIds(selectedNodeId, graph.edges);
  }, [selectedNodeId, graph]);

  const focusNeighborhoodIds = useMemo(() => {
    if (!selectedNodeId || !graph) return new Set<string>();
    return findFocusNeighborhoodIds(selectedNodeId, graph.edges);
  }, [selectedNodeId, graph]);

  const parsedSearch = useMemo(() => parseGraphSearchQuery(searchQuery), [searchQuery]);

  const filteredNodes = useMemo(() => {
    if (!graph) return [];
    return filterGraphNodes(graph.nodes, {
      includeExternal,
      parsedSearch,
      filterMode,
      graphLayout,
      selectedNodeId,
      cycleNodeIds,
      upstreamNodeIds,
      downstreamNodeIds,
      focusNeighborhoodIds,
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

  const { cappedNodes, isCapped } = useMemo(
    () => capGraphNodes(filteredNodes, 120),
    [filteredNodes]
  );

  const filteredNodeIds = useMemo(() => new Set(cappedNodes.map((n) => n.id)), [cappedNodes]);

  const filteredEdges = useMemo(() => {
    if (!graph) return [];
    return filterGraphEdges(graph.edges, {
      filteredNodeIds,
      edgeFilter,
      filterMode,
      cycleEdgePairs,
    });
  }, [graph, filteredNodeIds, edgeFilter, filterMode, cycleEdgePairs]);

  const selectedNodeData = useMemo(() => {
    if (!selectedNodeId || !graph) return null;
    return graph.nodes.find((n) => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graph]);

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

  const incomingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.target === selectedNodeId);
  }, [selectedNodeId, graph]);

  const outgoingEdges = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.edges.filter((e) => e.source === selectedNodeId);
  }, [selectedNodeId, graph]);

  const selectedNodeUnresolved = useMemo(() => {
    if (!selectedNodeId || !graph?.unresolved) return [];
    return graph.unresolved.filter((u) => u.source === selectedNodeId);
  }, [selectedNodeId, graph]);

  const cyclesWithNode = useMemo(() => {
    if (!selectedNodeId || !graph) return [];
    return graph.cycles.filter((c) => c.includes(selectedNodeId));
  }, [selectedNodeId, graph]);

  const selectedNodeRisk: NodeRiskSummary | null = useMemo(() => {
    if (!selectedNodeData) return null;
    return computeNodeRiskSummary(
      selectedNodeData,
      incomingEdges.length,
      outgoingEdges.length,
      cycleNodeIds.has(selectedNodeData.id),
      cyclesWithNode.length
    );
  }, [selectedNodeData, incomingEdges.length, outgoingEdges.length, cycleNodeIds, cyclesWithNode.length]);

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

  return {
    graph,
    loading,
    error,
    fetchGraph,
    viewMode,
    setViewMode,
    graphLayout,
    setGraphLayout,
    searchQuery,
    setSearchQuery,
    filterMode,
    setFilterMode,
    edgeFilter,
    setEdgeFilter,
    includeExternal,
    setIncludeExternal,
    highlightCycles,
    setHighlightCycles,
    showMetricsToolbar,
    setShowMetricsToolbar,
    selectedNodeId,
    setSelectedNodeId,
    selectedEdgeId,
    setSelectedEdgeId,
    legendOpen,
    setLegendOpen,
    fitTrigger,
    setFitTrigger,
    showNeedsReviewModal,
    setShowNeedsReviewModal,
    copiedPath,
    setCopiedPath,
    sortField,
    setSortField,
    sortAsc,
    setSortAsc,
    inDegreeMap,
    outDegreeMap,
    cycleNodeIds,
    cycleEdgePairs,
    upstreamNodeIds,
    downstreamNodeIds,
    filteredNodes,
    cappedNodes,
    isCapped,
    filteredEdges,
    selectedNodeData,
    selectedEdgeData,
    incomingEdges,
    outgoingEdges,
    selectedNodeUnresolved,
    cyclesWithNode,
    selectedNodeRisk,
    sortedListNodes,
  };
}

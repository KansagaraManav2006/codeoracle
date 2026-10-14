import React, { useEffect, useMemo } from 'react';
import {
  Controls,
  Edge,
  MarkerType,
  MiniMap,
  Node,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Workflow,
  Download,
  Info,
  List,
  Filter,
  Layers,
  Eye,
  RotateCcw,
  ChevronDown,
  X,
  Maximize2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { TabType } from '../types';
import { formatNumber, getDownloadFileName } from '../utils/formatters';
import Button from './common/Button';
import StatTile from './common/StatTile';
import SearchField from './common/SearchField';
import SegmentedControl from './common/SegmentedControl';
import { ToggleChip, FilterChip } from './common/Chips';
import { useToast } from './common/Toast';
import LoadingState from './common/LoadingState';
import Card from './common/Card';
import PageHeroHeader from './common/PageHeroHeader';

import { generateMermaidGraph, EdgeFilterType } from '../utils/graphUtils';
import { useDependencyGraph } from '../hooks/useDependencyGraph';
import GraphNodeComponent from './graph/GraphNodeComponent';
import GraphLegend from './graph/GraphLegend';
import GraphInspectorDrawer from './graph/GraphInspectorDrawer';
import GraphListViewTable from './graph/GraphListViewTable';
import UnresolvedDiagnosticsModal from './graph/UnresolvedDiagnosticsModal';

interface DependencyGraphTabProps {
  projectId?: string | null;
  projectName?: string;
  targetFile?: string | null;
  onInspectImpact?: (filePath: string) => void;
  onNavigateTab?: (tab: TabType) => void;
  onSelectFile?: (filePath: string) => void;
}

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
  const {
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
  } = useDependencyGraph({ projectId, targetFile, onSelectFile });

  const { showToast } = useToast();

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

  // Handle export to Mermaid format
  const handleDownloadMermaid = () => {
    if (!graph) return;
    const filename = getDownloadFileName(projectName, 'dependency-graph', 'mmd');
    const mmd = generateMermaidGraph(graph.nodes, graph.edges);

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
      <PageHeroHeader
        icon={Workflow}
        title="DEPENDENCY GRAPH"
        eyebrow="Canonical Map"
        confidence={graphConfidence}
        confidenceReason={graph.summary.graph_confidence_reason || 'Graph confidence score'}
        description="Explore the canonical module graph, resolved relationships, semantic entry points, cycle evidence, and change-impact foundations."
        actions={[
          ...(unresolvedCount > 0
            ? [
                {
                  label: `Needs Review · ${unresolvedCount}`,
                  variant: 'warning' as const,
                  onClick: () => setShowNeedsReviewModal(true),
                  icon: <AlertTriangle className="w-3.5 h-3.5 text-[#FFB340]" />,
                },
              ]
            : []),
          {
            label: 'Download Mermaid',
            variant: 'secondary' as const,
            onClick: handleDownloadMermaid,
            icon: <Download className="w-3.5 h-3.5" strokeWidth={1.75} />,
          },
        ]}
      />

      {/* 1. Primary Canvas Action Bar (Search + Key Filters + Layout + Metrics Toggle) */}
      <Card variant="secondary" padding="sm" className="space-y-2.5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5">
          {/* Search + Quick Essential Filters */}
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
            <SearchField
              id="graph-search"
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search path, role:service, unresolved:true…"
              resultCount={{ current: filteredNodes.length, total: graph.nodes.length, unit: 'nodes' }}
              className="w-full sm:w-64 md:w-72"
            />

            <div className="flex items-center gap-1.5 flex-wrap">
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
            </div>
          </div>

          {/* Layout Controls + Metrics Toggle */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
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

            <Button
              variant={showMetricsToolbar ? 'indigo' : 'outline'}
              size="sm"
              onClick={() => setShowMetricsToolbar((prev) => !prev)}
              icon={<Filter className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              <span>{showMetricsToolbar ? 'Hide Metrics & Filters' : 'Metrics & Filters'}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${
                  showMetricsToolbar ? 'rotate-180' : ''
                }`}
              />
            </Button>
          </div>
        </div>
      </Card>

      {/* 2. Collapsible Metrics & Advanced Edge Controls Panel */}
      {showMetricsToolbar && (
        <Card variant="primary" padding="md" className="space-y-3 animate-[fade-down_150ms_ease-out]">
          {/* 6 Canonical Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
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

          {/* Edge Controls & Directional Isolation */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2.5 border-t border-line/60">
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

            <div className="flex items-center gap-1.5 flex-wrap">
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

          {/* Context Notice */}
          <div className="pt-2 border-t border-line/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-ink-3">
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
      )}

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
                {isCapped ? (
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
                  <GraphLegend
                    isOpen={legendOpen}
                    onToggle={() => setLegendOpen((v) => !v)}
                  />
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
          <GraphInspectorDrawer
            selectedEdgeData={selectedEdgeData}
            selectedNodeData={selectedNodeData}
            selectedNodeRisk={selectedNodeRisk}
            incomingEdges={incomingEdges}
            outgoingEdges={outgoingEdges}
            selectedNodeUnresolved={selectedNodeUnresolved}
            cyclesWithNode={cyclesWithNode}
            cycleNodeIds={cycleNodeIds}
            inDegreeMap={inDegreeMap}
            outDegreeMap={outDegreeMap}
            graphLayout={graphLayout}
            filterMode={filterMode}
            copiedPath={copiedPath}
            onClearSelection={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              if (filterMode === 'upstream' || filterMode === 'downstream') setFilterMode('all');
              if (graphLayout === 'focus') setGraphLayout('architecture');
            }}
            onFocusNode={(nodeId) => {
              setSelectedNodeId(nodeId);
              setSelectedEdgeId(null);
            }}
            onToggleFocusMode={handleToggleFocusMode}
            onFilterUpstream={() => setFilterMode(filterMode === 'upstream' ? 'all' : 'upstream')}
            onFilterDownstream={() => setFilterMode(filterMode === 'downstream' ? 'all' : 'downstream')}
            onInspectImpact={onInspectImpact}
            onNavigateTab={onNavigateTab}
            onSelectFile={onSelectFile}
            onCopyPath={handleCopyPath}
          />
        </div>
      ) : (
        /* 4. Accessible & Sortable List View Table */
        <GraphListViewTable
          sortedListNodes={sortedListNodes}
          sortField={sortField}
          sortAsc={sortAsc}
          inDegreeMap={inDegreeMap}
          outDegreeMap={outDegreeMap}
          onSortChange={(field) => {
            if (sortField === field) {
              setSortAsc((v) => !v);
            } else {
              setSortField(field);
              setSortAsc(false);
            }
          }}
          onSelectNode={(n) => {
            setSelectedNodeId(n.id);
            onSelectFile?.(n.label);
            setViewMode('graph');
          }}
          onInspectImpact={onInspectImpact}
          onSelectFile={onSelectFile}
        />
      )}

      {/* 5. Needs Review Diagnostics Modal */}
      {showNeedsReviewModal && (
        <UnresolvedDiagnosticsModal
          unresolvedCount={unresolvedCount}
          unresolvedDependencies={graph.unresolved}
          unresolvedBreakdown={graph.summary.unresolved_breakdown}
          onClose={() => setShowNeedsReviewModal(false)}
        />
      )}
    </div>
  );
};

export default DependencyGraphTab;

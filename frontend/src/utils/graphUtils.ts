import { GraphNodeData, GraphEdgeData } from '../types';

export interface ParsedGraphSearch {
  rawText: string;
  roleFilter: string | null;
  entryFilter: string | null;
  unresolvedOnly: boolean;
  langFilter: string | null;
  statusFilter: string | null;
}

export type GraphFilterMode =
  | 'all'
  | 'entry_points'
  | 'high_complexity'
  | 'cycles'
  | 'unresolved'
  | 'upstream'
  | 'downstream';

export type GraphLayoutMode = 'architecture' | 'standard' | 'focus';
export type EdgeFilterType = 'all' | 'runtime' | 'require' | 'type';

export interface NodeRiskSummary {
  level: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  blastRadius: number;
}

/**
 * Computes incoming caller count (fan-in) and outgoing dependency count (fan-out)
 * from nodes and edges with fallback if fan_in/fan_out are absent.
 */
export function computeDegreeMaps(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[]
): { inDegreeMap: Map<string, number>; outDegreeMap: Map<string, number> } {
  const inMap = new Map<string, number>();
  const outMap = new Map<string, number>();

  nodes.forEach((n) => {
    inMap.set(n.id, n.fan_in ?? 0);
    outMap.set(n.id, n.fan_out ?? 0);
  });

  // If fan_in / fan_out weren't precomputed on nodes, calculate from edges
  if (nodes.length > 0 && nodes[0].fan_in === undefined) {
    nodes.forEach((n) => {
      inMap.set(n.id, 0);
      outMap.set(n.id, 0);
    });
    edges.forEach((e) => {
      inMap.set(e.target, (inMap.get(e.target) || 0) + 1);
      outMap.set(e.source, (outMap.get(e.source) || 0) + 1);
    });
  }

  return { inDegreeMap: inMap, outDegreeMap: outMap };
}

/**
 * Finds all node IDs that participate in any circular dependency cycle.
 */
export function findCycleNodeIds(cycles?: string[][]): Set<string> {
  const set = new Set<string>();
  if (cycles) {
    cycles.forEach((c) => c.forEach((id) => set.add(id)));
  }
  return set;
}

/**
 * Finds all directed edge pairs (u->v) that form circular dependency cycles.
 */
export function findCycleEdgePairs(cycles?: string[][]): Set<string> {
  const set = new Set<string>();
  if (cycles) {
    cycles.forEach((cycle) => {
      for (let i = 0; i < cycle.length; i++) {
        const u = cycle[i];
        const v = cycle[(i + 1) % cycle.length];
        set.add(`${u}->${v}`);
      }
    });
  }
  return set;
}

/**
 * Returns upstream callers (direct 1-hop incoming nodes) including the focal node itself.
 */
export function findUpstreamNodeIds(
  selectedNodeId: string | null,
  edges: GraphEdgeData[]
): Set<string> {
  if (!selectedNodeId) return new Set<string>();
  const set = new Set<string>([selectedNodeId]);
  edges.forEach((e) => {
    if (e.target === selectedNodeId) set.add(e.source);
  });
  return set;
}

/**
 * Returns downstream dependencies (direct 1-hop outgoing nodes) including the focal node itself.
 */
export function findDownstreamNodeIds(
  selectedNodeId: string | null,
  edges: GraphEdgeData[]
): Set<string> {
  if (!selectedNodeId) return new Set<string>();
  const set = new Set<string>([selectedNodeId]);
  edges.forEach((e) => {
    if (e.source === selectedNodeId) set.add(e.target);
  });
  return set;
}

/**
 * Returns the immediate 1-hop neighborhood (both upstream and downstream) for focus mode.
 */
export function findFocusNeighborhoodIds(
  selectedNodeId: string | null,
  edges: GraphEdgeData[]
): Set<string> {
  if (!selectedNodeId) return new Set<string>();
  const set = new Set<string>([selectedNodeId]);
  edges.forEach((e) => {
    if (e.target === selectedNodeId) set.add(e.source);
    if (e.source === selectedNodeId) set.add(e.target);
  });
  return set;
}

/**
 * Parses user search query string into structured filter tokens.
 * Supports: role:service, entry:runtime, unresolved:true, is:unresolved, lang:python, status:complete
 */
export function parseGraphSearchQuery(searchQuery: string): ParsedGraphSearch {
  const q = searchQuery.trim().toLowerCase();
  if (!q) {
    return {
      rawText: '',
      roleFilter: null,
      entryFilter: null,
      unresolvedOnly: false,
      langFilter: null,
      statusFilter: null,
    };
  }

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
}

export interface FilterNodesOptions {
  includeExternal: boolean;
  parsedSearch: ParsedGraphSearch;
  filterMode: GraphFilterMode;
  graphLayout: GraphLayoutMode;
  selectedNodeId: string | null;
  cycleNodeIds: Set<string>;
  upstreamNodeIds: Set<string>;
  downstreamNodeIds: Set<string>;
  focusNeighborhoodIds: Set<string>;
}

/**
 * Filters nodes based on search criteria, filter mode, and focus layout.
 */
export function filterGraphNodes(
  nodes: GraphNodeData[],
  options: FilterNodesOptions
): GraphNodeData[] {
  const {
    includeExternal,
    parsedSearch,
    filterMode,
    graphLayout,
    selectedNodeId,
    cycleNodeIds,
    upstreamNodeIds,
    downstreamNodeIds,
    focusNeighborhoodIds,
  } = options;

  return nodes.filter((n) => {
    if (!includeExternal && n.is_external) return false;

    // Advanced search tokens
    if (parsedSearch.roleFilter && !(n.module_role || '').toLowerCase().includes(parsedSearch.roleFilter)) {
      return false;
    }
    if (parsedSearch.entryFilter && !(n.entry_point_kind || '').toLowerCase().includes(parsedSearch.entryFilter)) {
      return false;
    }
    if (
      parsedSearch.unresolvedOnly &&
      !(n.unresolved_imports && n.unresolved_imports > 0) &&
      n.standalone_status !== 'isolation_uncertain'
    ) {
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
    if (
      filterMode === 'unresolved' &&
      !(n.unresolved_imports && n.unresolved_imports > 0) &&
      n.standalone_status !== 'isolation_uncertain'
    ) {
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
}

/**
 * Caps rendered nodes for smooth canvas performance while prioritizing high complexity modules.
 */
export function capGraphNodes(
  nodes: GraphNodeData[],
  maxNodes = 120
): { cappedNodes: GraphNodeData[]; isCapped: boolean } {
  if (nodes.length <= maxNodes) {
    return { cappedNodes: nodes, isCapped: false };
  }
  const cappedNodes = [...nodes]
    .sort((a, b) => (b.complexity_score ?? 0) - (a.complexity_score ?? 0))
    .slice(0, maxNodes);
  return { cappedNodes, isCapped: true };
}

export interface FilterEdgesOptions {
  filteredNodeIds: Set<string>;
  edgeFilter: EdgeFilterType;
  filterMode: GraphFilterMode;
  cycleEdgePairs: Set<string>;
}

/**
 * Filters edges to ensure both endpoints are visible and edge type / cycle filters apply.
 */
export function filterGraphEdges(
  edges: GraphEdgeData[],
  options: FilterEdgesOptions
): GraphEdgeData[] {
  const { filteredNodeIds, edgeFilter, filterMode, cycleEdgePairs } = options;

  return edges.filter((e) => {
    if (!filteredNodeIds.has(e.source) || !filteredNodeIds.has(e.target)) return false;

    const edgeKind = e.kind || e.type;
    if (edgeFilter === 'runtime') {
      if (edgeKind === 'type_only_import' || e.is_type_only) return false;
    } else if (edgeFilter === 'require') {
      if (edgeKind !== 'require' && e.type !== 'require') return false;
    } else if (edgeFilter === 'type') {
      if (edgeKind !== 'type_only_import' && !e.is_type_only) return false;
    }

    if (filterMode === 'cycles' && !cycleEdgePairs.has(`${e.source}->${e.target}`)) {
      return false;
    }

    return true;
  });
}

/**
 * Computes deterministic risk summary and explainable rationale for a module node.
 */
export function computeNodeRiskSummary(
  node: GraphNodeData | null,
  inCount: number,
  outCount: number,
  isPartCycle: boolean,
  cyclesWithNodeCount: number
): NodeRiskSummary | null {
  if (!node) return null;

  const isCritComplexity = node.complexity_rating === 'critical';
  const isHighComplexity = node.complexity_rating === 'high';

  let level: 'critical' | 'high' | 'medium' | 'low' = 'low';
  let reason = 'Standard modular component with isolated blast radius.';

  if (isPartCycle || isCritComplexity) {
    level = 'critical';
    reason = isPartCycle
      ? `Part of ${cyclesWithNodeCount} circular dependency loop(s); tightly coupled.`
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

  return {
    level,
    reason,
    blastRadius: node.blast_radius ?? inCount,
  };
}

/**
 * Formats full repository graph as Mermaid graph TD markdown/text.
 */
export function generateMermaidGraph(
  nodes: GraphNodeData[],
  edges: GraphEdgeData[]
): string {
  let mmd = 'graph TD\n';
  nodes.forEach((n) => {
    const cleanLabel = n.label.replace(/[^a-zA-Z0-9_.-]/g, '_');
    mmd += `  ${cleanLabel}["${n.label}"]\n`;
  });
  edges.forEach((e) => {
    const src = e.source.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const tgt = e.target.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const arrow = e.is_type_only ? '-.->' : '-->';
    mmd += `  ${src} ${arrow} ${tgt}\n`;
  });
  return mmd;
}

import type { SimulationNodeDatum } from 'd3-force';
import type { GraphResponse, HotspotItem, RiskSeverity } from '../../types';

export type NeuralNodeState =
  | 'connected'
  | 'true_standalone'
  | 'partial'
  | 'unresolved'
  | 'failed';

export type ParseStatus = 'full' | 'partial' | 'fallback' | 'failed';
export type AnalysisConfidence = 'high' | 'medium' | 'low';
export type VisualMode = 'structure' | 'risk' | 'parse_quality' | 'entry_points' | 'flow';
export type ClusterMode = 'none' | 'folder' | 'role' | 'language';
export type FocusDepth = '1-hop' | '2-hop' | 'all';

export type NodeShape =
  | 'circle'
  | 'diamond'
  | 'service'
  | 'api'
  | 'ml'
  | 'ui'
  | 'db'
  | 'config';

export interface UnresolvedDetail {
  rawImport: string;
  reason: string;
  line: number;
}

export interface NeuralNode extends SimulationNodeDatum {
  id: string;
  label: string;
  language: string;
  loc: number;
  riskLevel: RiskSeverity | string;
  hotspotScore: number;
  complexityScore: number;
  complexityRating: string;
  warningCount: number;
  fanIn: number;
  fanOut: number;
  unresolvedImports: number;
  blastRadius: number;
  isEntryPoint: boolean;
  entryPointKind?: string | null;
  entryPointEvidence?: string | null;
  inCycle: boolean;
  radius: number;
  nodeState: NeuralNodeState;
  parseStatus: ParseStatus;
  parseReason?: string | null;
  analysisConfidence: AnalysisConfidence;
  role: string;
  shape: NodeShape;
  visualImportance: number;
  flowTier: number;
  flowX: number;
  flowY: number;
  clusterLabel: string;
  hotspot?: HotspotItem;
  folderCluster: string;
  upstreamIds: string[];
  downstreamIds: string[];
  unresolvedDetails: UnresolvedDetail[];
}

export interface NeuralLink {
  id: string;
  source: string;
  target: string;
  type: string;
  kind?: string;
  confidence?: string;
  rawImport?: string | null;
  sourceLine?: number;
  resolved: boolean;
  inCycle?: boolean;
}

export interface ClusterInfo {
  id: string;
  label: string;
  count: number;
  color: string;
}

export interface NeuralGraphSummary {
  totalModules: number;
  resolvedEdges: number;
  unresolvedImports: number;
  cycleCount: number;
  confirmedEntryPoints: number;
  trueStandaloneCount: number;
  graphConfidence: 'high' | 'medium' | 'partial' | 'low';
  graphConfidenceReason?: string | null;
  cycleWarning?: string | null;
  fullAstPercentage: number;
}

export interface NeuralGraph {
  nodes: NeuralNode[];
  links: NeuralLink[];
  summary: NeuralGraphSummary;
  clusters: ClusterInfo[];
}

export function extractFolderCluster(path: string): string {
  const normalized = path.replace(/\\/g, '/').replace(/^\/+/, '');
  const parts = normalized.split('/');
  if (parts.length <= 1) return 'root';
  if (parts[0] === 'src' && parts.length > 2) return `src/${parts[1]}`;
  return parts[0];
}

export function deriveNodeShape(role: string, isEntryPoint: boolean): NodeShape {
  if (isEntryPoint) return 'diamond';
  const r = (role || '').toLowerCase();
  if (r.includes('ui') || r.includes('component') || r.includes('view') || r.includes('page')) return 'ui';
  if (r.includes('service')) return 'service';
  if (r.includes('api') || r.includes('route') || r.includes('controller') || r.includes('endpoint')) return 'api';
  if (r.includes('ml') || r.includes('model') || r.includes('train')) return 'ml';
  if (r.includes('repo') || r.includes('db') || r.includes('persistence') || r.includes('store')) return 'db';
  if (r.includes('config') || r.includes('gen') || r.includes('type')) return 'config';
  return 'circle';
}

export function deriveFlowTier(role: string, isEntryPoint: boolean, fanIn: number, fanOut: number): number {
  if (isEntryPoint) return 0;
  const r = (role || '').toLowerCase();
  if (r.includes('ui') || r.includes('page') || r.includes('view') || r.includes('route') || r.includes('controller')) {
    return 1;
  }
  if (r.includes('service') || r.includes('domain') || r.includes('core')) {
    return 2;
  }
  if (r.includes('repo') || r.includes('db') || r.includes('persistence') || r.includes('ml') || r.includes('api')) {
    return 3;
  }
  if (fanOut === 0 && fanIn > 0) return 4;
  return 2;
}

export function buildNeuralGraphData(
  graph: GraphResponse,
  hotspots: HotspotItem[] = []
): NeuralGraph {
  const internal = graph.nodes.filter(n => !n.is_external);
  const ids = new Set(internal.map(n => n.id));

  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  const upstreamMap = new Map<string, string[]>();
  const downstreamMap = new Map<string, string[]>();

  for (const e of graph.edges) {
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
    outgoing.set(e.source, (outgoing.get(e.source) || 0) + 1);

    if (ids.has(e.source) && ids.has(e.target)) {
      if (!upstreamMap.has(e.target)) upstreamMap.set(e.target, []);
      upstreamMap.get(e.target)!.push(e.source);

      if (!downstreamMap.has(e.source)) downstreamMap.set(e.source, []);
      downstreamMap.get(e.source)!.push(e.target);
    }
  }

  const cycles = new Set((graph.cycles || []).flat());
  const cycleEdges = new Set<string>();
  for (const cycle of graph.cycles || []) {
    for (let i = 0; i < cycle.length; i++) {
      const u = cycle[i];
      const v = cycle[(i + 1) % cycle.length];
      cycleEdges.add(`${u}->${v}`);
    }
  }

  const links: NeuralLink[] = graph.edges
    .filter(e => ids.has(e.source) && ids.has(e.target))
    .map(e => ({
      id: e.id || `${e.source}->${e.target}`,
      source: e.source,
      target: e.target,
      type: e.is_type_only ? 'type-only' : e.type || 'import',
      kind: e.kind || (e.is_type_only ? 'type_only_import' : 'runtime_import'),
      confidence: e.confidence || 'high',
      rawImport: e.raw_import || null,
      sourceLine: e.source_line,
      resolved: e.resolved !== false,
      inCycle: cycleEdges.has(`${e.source}->${e.target}`),
    }));

  const unresolvedBySource = new Map<string, UnresolvedDetail[]>();
  if (graph.unresolved) {
    for (const u of graph.unresolved) {
      const key = (u.source_path || u.source).replace(/\\/g, '/');
      if (!unresolvedBySource.has(key)) unresolvedBySource.set(key, []);
      unresolvedBySource.get(key)!.push({
        rawImport: u.raw_import,
        reason: u.reason_label || u.reason_key || 'Unresolved import',
        line: u.line,
      });
    }
  }

  const risks = new Map(
    hotspots.map(h => [(h.filePath || h.file || '').replace(/\\/g, '/'), h])
  );

  let fullyParsedCount = 0;

  // Maximum metrics across modules for normalization
  let maxFanIn = 1;
  let maxFanOut = 1;
  let maxBlast = 1;
  for (const n of internal) {
    const fi = incoming.get(n.id) || n.fan_in || 0;
    const fo = outgoing.get(n.id) || n.fan_out || 0;
    const br = n.blast_radius || 0;
    if (fi > maxFanIn) maxFanIn = fi;
    if (fo > maxFanOut) maxFanOut = fo;
    if (br > maxBlast) maxBlast = br;
  }

  // Pre-calculate raw nodes
  const rawNodes = internal.map(n => {
    const normLabel = n.label.replace(/\\/g, '/');
    const fanIn = incoming.get(n.id) || n.fan_in || 0;
    const fanOut = outgoing.get(n.id) || n.fan_out || 0;
    const blastRadius = n.blast_radius || 0;
    const hotspot = risks.get(normLabel);

    const inCycle = cycles.has(n.id) || Boolean(n.is_cycle);
    const isEntryPoint = Boolean(
      n.is_entry_point || (graph.entry_point_ids && graph.entry_point_ids.includes(n.id))
    );

    let parseStatus: ParseStatus = 'full';
    const rawParse = (n.parse_status || '').toLowerCase();
    if (rawParse === 'partial') {
      parseStatus = 'partial';
    } else if (rawParse === 'fallback') {
      parseStatus = 'fallback';
    } else if (rawParse === 'failed' || rawParse === 'unsupported') {
      parseStatus = 'failed';
    } else if (hotspot?.parse?.status) {
      parseStatus = hotspot.parse.status as ParseStatus;
    } else {
      parseStatus = 'full';
    }

    if (parseStatus === 'full') fullyParsedCount++;

    const fileUnresolved = unresolvedBySource.get(normLabel) || [];
    const unresolvedCount = n.unresolved_imports ?? fileUnresolved.length;

    let nodeState: NeuralNodeState = 'connected';
    const isDisconnected = fanIn === 0 && fanOut === 0;

    if (parseStatus === 'failed' || parseStatus === 'fallback') {
      nodeState = 'failed';
    } else if (parseStatus === 'partial') {
      nodeState = 'partial';
    } else if (
      unresolvedCount > 0 ||
      n.standalone_status === 'isolation_uncertain' ||
      n.standalone_status === 'unresolved'
    ) {
      nodeState = 'unresolved';
    } else if (isDisconnected && (n.standalone_status === 'true_standalone' || parseStatus === 'full')) {
      nodeState = 'true_standalone';
    } else {
      nodeState = 'connected';
    }

    let parseReason = n.standalone_reason || null;
    if (!parseReason) {
      if (parseStatus === 'partial') {
        parseReason =
          fileUnresolved.length > 0
            ? `Parser fallback triggered: ${fileUnresolved[0].reason}`
            : 'Partially parsed due to syntax anomalies';
      } else if (parseStatus === 'fallback') {
        parseReason = 'Token-level fallback import extraction triggered';
      } else if (parseStatus === 'failed') {
        parseReason = 'AST parsing failed';
      } else if (nodeState === 'unresolved') {
        parseReason = `${unresolvedCount} unresolved import(s) detected`;
      }
    }

    let analysisConfidence: AnalysisConfidence = 'high';
    if (hotspot?.parse?.confidence) {
      analysisConfidence = hotspot.parse.confidence as AnalysisConfidence;
    } else if (parseStatus === 'partial' || nodeState === 'unresolved') {
      analysisConfidence = 'medium';
    } else if (parseStatus === 'failed' || parseStatus === 'fallback') {
      analysisConfidence = 'low';
    }

    const riskLevel: RiskSeverity | string =
      hotspot?.overallRisk ||
      hotspot?.risk_level ||
      (inCycle ? 'critical' : n.complexity_rating || 'low');

    const hotspotScore = hotspot?.hotspotScore ?? hotspot?.hotspot_score ?? 0;

    // Architectural importance score (0.0 to 1.0)
    const normIn = fanIn / maxFanIn;
    const normOut = fanOut / maxFanOut;
    const normBlast = blastRadius / maxBlast;
    const entryBonus = isEntryPoint ? 1.0 : 0.0;
    const visualImportance = Math.min(
      1.0,
      normIn * 0.35 + normOut * 0.2 + normBlast * 0.25 + entryBonus * 0.2
    );

    // Node radius: preserves exact test assertions: Math.max(6, Math.min(22, 6 + degree * 1.5))
    const radius = Math.max(6, Math.min(22, 6 + (fanIn + fanOut) * 1.5));

    const folderCluster = extractFolderCluster(n.label);
    const role = (n.module_role || 'module').toLowerCase();
    const shape = deriveNodeShape(role, isEntryPoint);
    const flowTier = deriveFlowTier(role, isEntryPoint, fanIn, fanOut);

    // Cluster label categorization
    let clusterLabel = 'BACKEND';
    const normL = normLabel.toLowerCase();
    if (normL.includes('front') || normL.includes('src/components') || normL.includes('src/pages') || normL.includes('ui/')) {
      clusterLabel = 'FRONTEND';
    } else if (normL.includes('ml/') || normL.includes('model') || normL.includes('train')) {
      clusterLabel = 'ML';
    } else if (normL.includes('db/') || normL.includes('store/') || normL.includes('sql') || normL.includes('schema')) {
      clusterLabel = 'DATABASE';
    }

    return {
      id: n.id,
      label: n.label,
      language: (n.language || 'unknown').toLowerCase(),
      loc: n.line_count || 0,
      riskLevel,
      hotspotScore,
      complexityScore: n.complexity_score || 1,
      complexityRating: n.complexity_rating || 'low',
      warningCount: n.warning_count || 0,
      fanIn,
      fanOut,
      unresolvedImports: unresolvedCount,
      blastRadius,
      isEntryPoint,
      entryPointKind: n.entry_point_kind || null,
      entryPointEvidence: n.entry_point_evidence || null,
      inCycle,
      radius,
      nodeState,
      parseStatus,
      parseReason,
      analysisConfidence,
      role,
      shape,
      visualImportance,
      flowTier,
      flowX: 0,
      flowY: 0,
      clusterLabel,
      hotspot,
      folderCluster,
      upstreamIds: upstreamMap.get(n.id) || [],
      downstreamIds: downstreamMap.get(n.id) || [],
      unresolvedDetails: fileUnresolved,
    };
  });

  // Calculate layered FLOW positions (Flow Mode)
  // Tiers 0..4 arranged horizontally or vertically in clean stages
  const tierBuckets = new Map<number, typeof rawNodes>();
  for (const n of rawNodes) {
    if (!tierBuckets.has(n.flowTier)) tierBuckets.set(n.flowTier, []);
    tierBuckets.get(n.flowTier)!.push(n);
  }

  const tierXSpread = 220;
  for (const [tier, tNodes] of tierBuckets.entries()) {
    tNodes.sort((a, b) => b.visualImportance - a.visualImportance);
    const count = tNodes.length;
    const ySpacing = Math.max(38, Math.min(85, 520 / Math.max(1, count)));
    const startY = -((count - 1) * ySpacing) / 2;
    tNodes.forEach((n, idx) => {
      n.flowX = (tier - 2) * tierXSpread;
      n.flowY = startY + idx * ySpacing;
    });
  }

  const nodes: NeuralNode[] = rawNodes;

  // Aggregate clusters
  const clusterCountMap = new Map<string, number>();
  for (const n of nodes) {
    clusterCountMap.set(n.clusterLabel, (clusterCountMap.get(n.clusterLabel) || 0) + 1);
  }

  const clusterPalette: Record<string, string> = {
    FRONTEND: '#38BDF8',
    BACKEND: '#818CF8',
    ML: '#F472B6',
    DATABASE: '#34D399',
  };

  const clusters: ClusterInfo[] = [...clusterCountMap.entries()].map(([id, count]) => ({
    id,
    label: id,
    count,
    color: clusterPalette[id] || '#A78BFA',
  }));

  const totalModules = graph.summary?.total_modules ?? internal.length;
  const resolvedEdges = graph.summary?.resolved_edges ?? graph.edges.filter(e => e.resolved).length;
  const unresolvedImports = graph.summary?.unresolved_imports ?? (graph.unresolved ? graph.unresolved.length : 0);
  const cycleCount = graph.summary?.cycles ?? graph.summary?.cycle_count ?? graph.cycles?.length ?? 0;
  const confirmedEntryPoints = graph.summary?.entry_points ?? graph.summary?.entry_point_count ?? 0;
  const trueStandaloneCount = graph.summary?.standalone_modules ?? graph.summary?.orphan_count ?? 0;
  const fullAstPercentage = totalModules > 0 ? Math.round((fullyParsedCount / totalModules) * 100) : 100;

  const summary: NeuralGraphSummary = {
    totalModules,
    resolvedEdges,
    unresolvedImports,
    cycleCount,
    confirmedEntryPoints,
    trueStandaloneCount,
    graphConfidence:
      graph.summary?.graph_confidence ||
      (fullAstPercentage >= 90 && unresolvedImports === 0
        ? 'high'
        : fullAstPercentage >= 70
        ? 'medium'
        : 'partial'),
    graphConfidenceReason: graph.summary?.graph_confidence_reason || null,
    cycleWarning: graph.summary?.cycle_confidence_warning || null,
    fullAstPercentage,
  };

  return { nodes, links, summary, clusters };
}

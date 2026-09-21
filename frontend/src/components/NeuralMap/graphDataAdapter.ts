import type { SimulationNodeDatum } from 'd3-force';
import type { GraphResponse, HotspotItem } from '../../types';

export interface NeuralNode extends SimulationNodeDatum {
  id: string;
  label: string;
  language: string;
  loc: number;
  riskLevel: string;
  fanIn: number;
  fanOut: number;
  isEntryPoint: boolean;
  inCycle: boolean;
  radius: number;
  hotspot?: HotspotItem;
}
export interface NeuralLink { source: string; target: string; type: string }
export interface NeuralGraph { nodes: NeuralNode[]; links: NeuralLink[] }

export function buildNeuralGraphData(graph: GraphResponse, hotspots: HotspotItem[] = []): NeuralGraph {
  const internal = graph.nodes.filter(n => !n.is_external);
  const ids = new Set(internal.map(n => n.id));
  const links = graph.edges.filter(e => ids.has(e.source) && ids.has(e.target))
    .map(e => ({ source: e.source, target: e.target, type: e.is_type_only ? 'type-only' : e.type }));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, number>();
  // Count the original API edges, including dependencies outside this codebase.
  for (const e of graph.edges) {
    incoming.set(e.target, (incoming.get(e.target) || 0) + 1);
    outgoing.set(e.source, (outgoing.get(e.source) || 0) + 1);
  }
  const cycles = new Set(graph.cycles.flat());
  const risks = new Map(hotspots.map(h => [(h.filePath || h.file || '').replace(/\\/g, '/'), h]));
  return { links, nodes: internal.map(n => {
    const fanIn = incoming.get(n.id) || 0;
    const fanOut = outgoing.get(n.id) || 0;
    const hotspot = risks.get(n.label.replace(/\\/g, '/'));
    return {
      id: n.id, label: n.label, language: n.language.toLowerCase(), loc: n.line_count,
      riskLevel: hotspot?.overallRisk || hotspot?.risk_level || (cycles.has(n.id) ? 'critical' : n.complexity_rating),
      fanIn, fanOut, isEntryPoint: n.is_entry_point || graph.entry_point_ids.includes(n.id),
      inCycle: cycles.has(n.id), hotspot,

      // Connectivity alone drives size: radius = 6 + degree * 1.5, clamped to 6–22px.
      radius: Math.max(6, Math.min(22, 6 + (fanIn + fanOut) * 1.5)),
    };
  }) };
}

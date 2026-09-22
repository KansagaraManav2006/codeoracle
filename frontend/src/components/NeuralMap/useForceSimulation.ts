import { useEffect, useMemo, useRef, useState } from 'react';
import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';
import {
  CONSTELLATION_CENTROIDS,
  type ClusterMode,
  type NeuralGraph,
  type NeuralNode,
  type VisualMode,
} from './graphDataAdapter';

export const LIVE_NODE_LIMIT = 150;
export const MAX_TICKS = 300;

export function getNodeClusterKey(node: NeuralNode, mode: ClusterMode = 'none'): string {
  if (mode === 'folder') return node.folderCluster || 'root';
  if (mode === 'role') return node.role || 'module';
  if (mode === 'language') return node.language || 'other';
  if (mode === 'constellation') return node.clusterLabel || 'BACKEND';
  return 'default';
}

export function computeClusterPositions(
  nodes: NeuralNode[],
  mode: ClusterMode
): Map<string, { x: number; y: number }> {
  const map = new Map<string, { x: number; y: number }>();
  if (mode === 'none') return map;

  if (mode === 'constellation') {
    for (const [key, val] of Object.entries(CONSTELLATION_CENTROIDS)) {
      map.set(key, { x: val.x, y: val.y });
    }
    return map;
  }

  const clusterCounts = new Map<string, number>();
  for (const n of nodes) {
    const k = getNodeClusterKey(n, mode);
    clusterCounts.set(k, (clusterCounts.get(k) || 0) + 1);
  }

  const clusters = [...clusterCounts.keys()].sort();
  const numClusters = clusters.length;
  if (numClusters <= 1) {
    for (const c of clusters) map.set(c, { x: 0, y: 0 });
    return map;
  }

  const radius = Math.max(140, Math.min(360, numClusters * 55));
  clusters.forEach((c, idx) => {
    const angle = (idx / numClusters) * 2 * Math.PI - Math.PI / 2;
    map.set(c, {
      x: Math.round(Math.cos(angle) * radius),
      y: Math.round(Math.sin(angle) * radius),
    });
  });

  return map;
}

export function createSimulation(
  graph: NeuralGraph,
  clusterMode: ClusterMode = 'none',
  cachedCoords?: Map<string, { x: number; y: number }>,
  visualMode: VisualMode = 'structure'
) {
  // d3 mutates its input; clone so API data stays immutable
  const nodes = graph.nodes.map(n => {
    const clone = { ...n };
    if (visualMode === 'flow') {
      clone.x = n.flowX;
      clone.y = n.flowY;
    } else if (cachedCoords?.has(n.id)) {
      const pos = cachedCoords.get(n.id)!;
      clone.x = pos.x;
      clone.y = pos.y;
    } else if (nodesCountForArch(graph.nodes.length) && (n.archX !== 0 || n.archY !== 0)) {
      clone.x = n.archX;
      clone.y = n.archY;
    }
    return clone;
  });

  const sim = forceSimulation<NeuralNode>(nodes).stop();

  if (visualMode === 'flow') {
    // In Flow mode, gently hold nodes near their layered architectural coordinates
    sim
      .force('flowX', forceX<NeuralNode>(n => n.flowX).strength(0.85))
      .force('flowY', forceY<NeuralNode>(n => n.flowY).strength(0.85))
      .force('collision', forceCollide<NeuralNode>().radius(n => n.radius + 8));
    return sim;
  }

  if (visualMode === 'system') {
    // In System mode, attract nodes into tight cluster spheres around constellation centers
    sim
      .force(
        'constellationX',
        forceX<NeuralNode>(n => CONSTELLATION_CENTROIDS[n.clusterLabel]?.x ?? 0).strength(0.65)
      )
      .force(
        'constellationY',
        forceY<NeuralNode>(n => CONSTELLATION_CENTROIDS[n.clusterLabel]?.y ?? 0).strength(0.65)
      )
      .force('collision', forceCollide<NeuralNode>().radius(n => n.radius + 4));
    return sim;
  }

  const isSmallGraph = nodes.length <= 3;

  sim
    .force('charge', forceManyBody().strength(isSmallGraph ? -160 : -110))
    .force(
      'links',
      forceLink<NeuralNode, { source: string; target: string }>(
        graph.links.map(e => ({ source: e.source, target: e.target }))
      )
        .id(n => n.id)
        .distance(nodes.length <= 2 ? 110 : clusterMode !== 'none' ? 45 : 65)
        .strength(0.3)
    )
    .force('center', forceCenter(0, 0))
    .force('collision', forceCollide<NeuralNode>().radius(n => n.radius + 7));

  // If clusterMode is explicitly specified, apply cluster forces
  if (clusterMode !== 'none') {
    const clusterPositions = computeClusterPositions(nodes, clusterMode);
    sim
      .force(
        'clusterX',
        forceX<NeuralNode>(n => clusterPositions.get(getNodeClusterKey(n, clusterMode))?.x ?? 0).strength(0.25)
      )
      .force(
        'clusterY',
        forceY<NeuralNode>(n => clusterPositions.get(getNodeClusterKey(n, clusterMode))?.y ?? 0).strength(0.25)
      );
  } else if (nodes.length > 3) {
    // Hybrid constellation gravity: gently constrain nodes toward their constellation territory
    sim
      .force(
        'archX',
        forceX<NeuralNode>(n => (n.archX ? n.archX : CONSTELLATION_CENTROIDS[n.clusterLabel]?.x ?? 0)).strength(0.14)
      )
      .force(
        'archY',
        forceY<NeuralNode>(n => (n.archY ? n.archY : CONSTELLATION_CENTROIDS[n.clusterLabel]?.y ?? 0)).strength(0.14)
      );
  }

  return sim;
}

function nodesCountForArch(count: number): boolean {
  // Only pre-position nodes when there are enough to form constellations (>3)
  return count > 3;
}

export function useForceSimulation(
  graph: NeuralGraph,
  clusterMode: ClusterMode = 'none',
  visualMode: VisualMode = 'structure'
) {
  const coordCache = useRef<Map<string, { x: number; y: number }>>(new Map());

  const simulation = useMemo(
    () => createSimulation(graph, clusterMode, coordCache.current, visualMode),
    [graph, clusterMode, visualMode]
  );

  const [revision, setRevision] = useState(0);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let frame = 0;
    let ticks = 0;
    setSettled(false);

    const run = () => {
      if (document.hidden) return;
      const batch = graph.nodes.length < LIVE_NODE_LIMIT ? 1 : 10;
      simulation.tick(Math.min(batch, MAX_TICKS - ticks));
      ticks += batch;

      if (visualMode !== 'flow' && visualMode !== 'system') {
        for (const n of simulation.nodes()) {
          if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
            coordCache.current.set(n.id, { x: n.x!, y: n.y! });
          }
        }
      }

      setRevision(v => v + 1);
      if (ticks < MAX_TICKS) {
        frame = requestAnimationFrame(run);
      } else {
        setSettled(true);
      }
    };

    const visibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden && ticks < MAX_TICKS) frame = requestAnimationFrame(run);
    };

    visibility();
    document.addEventListener('visibilitychange', visibility);

    return () => {
      cancelAnimationFrame(frame);
      simulation.stop();
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [simulation, graph, visualMode]);

  return { nodes: simulation.nodes(), revision, settled };
}

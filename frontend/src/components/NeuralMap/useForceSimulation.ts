import { useEffect, useMemo, useState } from 'react';
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force';
import type { NeuralGraph, NeuralNode } from './graphDataAdapter';

export const LIVE_NODE_LIMIT = 150;
export const MAX_TICKS = 300;
export function createSimulation(graph: NeuralGraph) {
  // d3 mutates its input; never hand it API data or the memoized adapter output.
  const nodes = graph.nodes.map(n => ({ ...n }));
  return forceSimulation<NeuralNode>(nodes).stop()
    .force('charge', forceManyBody().strength(-120))
    .force('links', forceLink<NeuralNode, { source: string; target: string }>(graph.links.map(e => ({ ...e })))
      .id(n => n.id).distance(nodes.length <= 2 ? 110 : 60).strength(0.3))
    .force('center', forceCenter(0, 0))
    .force('collision', forceCollide<NeuralNode>().radius(n => n.radius + 4));
}

export function useForceSimulation(graph: NeuralGraph) {
  const simulation = useMemo(() => createSimulation(graph), [graph]);
  const [revision, setRevision] = useState(0);
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let frame = 0;
    let ticks = 0;
    setSettled(false);
    const run = () => {
      if (document.hidden) return;
      // Large graphs settle in bounded batches, yielding to input between frames.
      const batch = graph.nodes.length < LIVE_NODE_LIMIT ? 1 : 10;
      simulation.tick(Math.min(batch, MAX_TICKS - ticks));
      ticks += batch;
      setRevision(v => v + 1);
      if (ticks < MAX_TICKS) frame = requestAnimationFrame(run);
      else setSettled(true);
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
  }, [simulation, graph]);
  return { nodes: simulation.nodes(), revision, settled };
}

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Bundle the actual TypeScript modules in memory; no test-only copy of graph logic.
const result = await build({ stdin: { contents: `export * from './src/components/NeuralMap/graphDataAdapter'; export * from './src/components/NeuralMap/useForceSimulation';`, resolveDir: process.cwd() }, bundle: true, write: false, platform: 'node', format: 'esm' });
const { buildNeuralGraphData, createSimulation, MAX_TICKS } = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
function fixture(count) {
  return {
    nodes: Array.from({ length: count }, (_, i) => ({ id: `module:${i}`, label: i === 0 ? 'calculator.py' : i === 1 ? 'utils.py' : `file${i}.py`, language: 'python', line_count: i ? 28 : 74, complexity_rating: 'low', is_entry_point: i === 1, is_external: false })),
    edges: Array.from({ length: count - 1 }, (_, i) => ({ source: `module:${i + 1}`, target: `module:${i}`, type: 'runtime' })),
    cycles: [], entry_point_ids: [],
  };
}
test('adapter preserves source data, counts external edges, and joins hotspot by full path', () => {
  const api = fixture(2);
  api.nodes.push({ id: 'external', is_external: true });
  api.edges.push({ source: 'module:0', target: 'external', type: 'type', is_type_only: true });
  api.cycles = [['module:0', 'module:1']];
  const before = JSON.stringify(api);
  const graph = buildNeuralGraphData(api, [{ file: 'calculator.py', risk_level: 'high', hotspot_score: 76 }]);
  assert.equal(graph.nodes.length, 2);
  assert.equal(graph.links.length, 1);
  assert.equal(graph.nodes[0].fanIn, 1);
  assert.equal(graph.nodes[0].fanOut, 1);
  assert.equal(graph.nodes[0].radius, 9);
  assert.equal(graph.nodes[0].hotspot.hotspot_score, 76);
  assert.equal(graph.nodes[0].inCycle, true);
  assert.equal(graph.nodes[1].isEntryPoint, true);
  assert.equal(JSON.stringify(api), before);
});
for (const count of [0, 1, 2, 100, 200, 500]) {
  test(`${count} files settle to finite, deterministic positions without mutating adapter data`, () => {
    const graph = buildNeuralGraphData(fixture(count));
    const original = JSON.stringify(graph);
    const a = createSimulation(graph).tick(MAX_TICKS).stop().nodes();
    const b = createSimulation(graph).tick(MAX_TICKS).stop().nodes();
    assert.deepEqual(a.map(n => [n.x, n.y]), b.map(n => [n.x, n.y]));
    assert.equal(JSON.stringify(graph), original);
    for (const n of a) { assert.ok(Number.isFinite(n.x) && Number.isFinite(n.y)); assert.ok(n.radius >= 6 && n.radius <= 22); }
    if (count === 2) {
      const separation = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      assert.ok(separation > a[0].radius + a[1].radius && separation < 200);
    }
  });
}
test('connectivity radius is capped and independent of risk score', () => {
  const api = fixture(100);
  api.edges.forEach(e => e.target = 'module:0');
  const low = buildNeuralGraphData(api);
  const high = buildNeuralGraphData(api, [{ file: 'calculator.py', risk_level: 'critical', hotspot_score: 100 }]);
  assert.equal(low.nodes[0].radius, 22);
  assert.equal(low.nodes[0].radius, high.nodes[0].radius);
});

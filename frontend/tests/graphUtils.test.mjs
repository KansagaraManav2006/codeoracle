import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundleResult = await build({
  stdin: {
    contents: `export * from './src/utils/graphUtils';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});

const {
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
  generateMermaidGraph,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundleResult.outputFiles[0].text).toString('base64')}`
);

test('computeDegreeMaps: counts in-degrees and out-degrees accurately', () => {
  const nodes = [
    { id: 'app.py', label: 'app.py' },
    { id: 'db.py', label: 'db.py' },
    { id: 'models.py', label: 'models.py' },
  ];
  const edges = [
    { id: 'e1', source: 'app.py', target: 'db.py' },
    { id: 'e2', source: 'db.py', target: 'models.py' },
    { id: 'e3', source: 'app.py', target: 'models.py' },
  ];

  const { inDegreeMap, outDegreeMap } = computeDegreeMaps(nodes, edges);
  assert.equal(inDegreeMap.get('models.py'), 2);
  assert.equal(inDegreeMap.get('db.py'), 1);
  assert.equal(inDegreeMap.get('app.py'), 0);

  assert.equal(outDegreeMap.get('app.py'), 2);
  assert.equal(outDegreeMap.get('db.py'), 1);
  assert.equal(outDegreeMap.get('models.py'), 0);
});

test('findCycleNodeIds & findCycleEdgePairs: collects cycle elements correctly', () => {
  const cycles = [['a.py', 'b.py', 'c.py']];
  const nodeIds = findCycleNodeIds(cycles);
  assert.equal(nodeIds.size, 3);
  assert.ok(nodeIds.has('a.py'));
  assert.ok(nodeIds.has('b.py'));
  assert.ok(nodeIds.has('c.py'));

  const edgePairs = findCycleEdgePairs(cycles);
  assert.equal(edgePairs.size, 3);
  assert.ok(edgePairs.has('a.py->b.py'));
  assert.ok(edgePairs.has('b.py->c.py'));
  assert.ok(edgePairs.has('c.py->a.py'));
});

test('parseGraphSearchQuery: parses key-value tokens and raw text', () => {
  const query = 'role:service entry:runtime auth unresolved:true lang:python';
  const parsed = parseGraphSearchQuery(query);
  assert.equal(parsed.roleFilter, 'service');
  assert.equal(parsed.entryFilter, 'runtime');
  assert.equal(parsed.unresolvedOnly, true);
  assert.equal(parsed.langFilter, 'python');
  assert.equal(parsed.rawText, 'auth');
});

test('computeNodeRiskSummary: calculates explainable risk tiers', () => {
  const critNode = {
    id: 'core.py',
    complexity_rating: 'critical',
    blast_radius: 8,
  };
  const critRisk = computeNodeRiskSummary(critNode, 5, 2, true, 1);
  assert.equal(critRisk.level, 'critical');
  assert.ok(critRisk.reason.includes('circular dependency'));
  assert.equal(critRisk.blastRadius, 8);

  const highNode = {
    id: 'utils.py',
    complexity_rating: 'low',
    blast_radius: 5,
  };
  const highRisk = computeNodeRiskSummary(highNode, 5, 1, false, 0);
  assert.equal(highRisk.level, 'high');
  assert.ok(highRisk.reason.includes('5 dependents'));

  const lowNode = {
    id: 'leaf.py',
    complexity_rating: 'low',
    blast_radius: 0,
  };
  const lowRisk = computeNodeRiskSummary(lowNode, 1, 1, false, 0);
  assert.equal(lowRisk.level, 'low');
});

test('generateMermaidGraph: renders graph TD with arrow conventions', () => {
  const nodes = [{ id: 'a', label: 'a.ts' }, { id: 'b', label: 'b.ts' }];
  const edges = [
    { source: 'a', target: 'b', is_type_only: false },
    { source: 'b', target: 'a', is_type_only: true },
  ];
  const mmd = generateMermaidGraph(nodes, edges);
  assert.ok(mmd.startsWith('graph TD\n'));
  assert.ok(mmd.includes('a --> b'));
  assert.ok(mmd.includes('b -.-> a'));
});

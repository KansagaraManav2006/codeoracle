import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundleResult = await build({
  stdin: {
    contents: `export * from './src/utils/hotspotUtils';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});

const {
  getFilePath,
  getHotspotScore,
  getOverallRisk,
  getComplexityVal,
  getComplexitySev,
  getFanIn,
  getBlastRadius,
  getLoc,
  getParseStatus,
  getParseConfidence,
  filterAndSortHotspots,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundleResult.outputFiles[0].text).toString('base64')}`
);

test('hotspot field extractors: handles canonical and legacy aliases', () => {
  const item1 = {
    filePath: 'src/main.py',
    hotspotScore: 85,
    overallRisk: 'critical',
    complexity: { value: 24, severity: 'critical' },
    graph: { fanIn: 10, blastRadius: 15, unresolvedRelations: 2 },
    linesOfCode: 450,
    parse: { status: 'full', confidence: 'high' },
  };

  assert.equal(getFilePath(item1), 'src/main.py');
  assert.equal(getHotspotScore(item1), 85);
  assert.equal(getOverallRisk(item1), 'critical');
  assert.equal(getComplexityVal(item1), 24);
  assert.equal(getComplexitySev(item1), 'critical');
  assert.equal(getFanIn(item1), 10);
  assert.equal(getBlastRadius(item1), 15);
  assert.equal(getLoc(item1), 450);
  assert.equal(getParseStatus(item1), 'full');
  assert.equal(getParseConfidence(item1), 'high');

  // Legacy field format fallback
  const item2 = {
    file: 'backend/legacy.py',
    hotspot_score: 55,
    risk_level: 'high',
    complexity: 18,
    dependency_fan_in: 4,
    blast_radius: 6,
    lines_of_code: 200,
    is_partially_parsed: true,
  };
  assert.equal(getFilePath(item2), 'backend/legacy.py');
  assert.equal(getHotspotScore(item2), 55);
  assert.equal(getOverallRisk(item2), 'high');
  assert.equal(getComplexityVal(item2), 18);
  assert.equal(getFanIn(item2), 4);
  assert.equal(getBlastRadius(item2), 6);
  assert.equal(getLoc(item2), 200);
  assert.equal(getParseStatus(item2), 'partial');
});

test('filterAndSortHotspots: filters by search term, risk, and sorts correctly', () => {
  const hotspots = [
    {
      filePath: 'src/auth/service.py',
      hotspotScore: 78,
      overallRisk: 'critical',
      complexity: { value: 20, severity: 'high' },
      graph: { fanIn: 8, blastRadius: 12 },
      parse: { status: 'full', confidence: 'high' },
      reason: 'Authentication service with wide caller reach',
    },
    {
      filePath: 'src/utils/helpers.py',
      hotspotScore: 30,
      overallRisk: 'low',
      complexity: { value: 5, severity: 'low' },
      graph: { fanIn: 2, blastRadius: 0 },
      parse: { status: 'full', confidence: 'high' },
      reason: 'Common string formatting helpers',
    },
    {
      filePath: 'src/billing/worker.py',
      hotspotScore: 65,
      overallRisk: 'high',
      complexity: { value: 16, severity: 'medium' },
      graph: { fanIn: 4, blastRadius: 8 },
      parse: { status: 'partial', confidence: 'medium' },
      reason: 'Background payment worker',
    },
  ];

  // 1. Filter by search
  const searchResult = filterAndSortHotspots(hotspots, {
    searchTerm: 'auth',
    riskFilter: 'all',
    evidenceFilter: 'all',
    sortField: 'score',
    sortAsc: false,
  });
  assert.equal(searchResult.length, 1);
  assert.equal(searchResult[0].filePath, 'src/auth/service.py');

  // 2. Filter by risk critical
  const riskResult = filterAndSortHotspots(hotspots, {
    searchTerm: '',
    riskFilter: 'critical',
    evidenceFilter: 'all',
    sortField: 'score',
    sortAsc: false,
  });
  assert.equal(riskResult.length, 1);
  assert.equal(riskResult[0].filePath, 'src/auth/service.py');

  // 3. Sort ascending by score
  const sortedAsc = filterAndSortHotspots(hotspots, {
    searchTerm: '',
    riskFilter: 'all',
    evidenceFilter: 'all',
    sortField: 'score',
    sortAsc: true,
  });
  assert.equal(sortedAsc[0].filePath, 'src/utils/helpers.py');
  assert.equal(sortedAsc[2].filePath, 'src/auth/service.py');
});

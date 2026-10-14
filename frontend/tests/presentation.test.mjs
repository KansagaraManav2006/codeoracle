import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const result = await build({
  stdin: {
    contents: `export * from './src/utils/presentation';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});

const {
  getWaveResidualRisk,
  cleanText,
  titleCase,
  sourceLabel,
  complexityLabel,
} = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
);

test('getWaveResidualRisk: Wave 0 is high structural risk', () => {
  const risk = getWaveResidualRisk(0, 0);
  assert.equal(risk.riskLevel, 'high');
  assert.equal(risk.label, 'HIGH STRUCTURAL RISK');
});

test('getWaveResidualRisk: Wave 1 reflects cycle presence in description', () => {
  const withCycles = getWaveResidualRisk(1, 2);
  assert.equal(withCycles.riskLevel, 'high');
  assert.match(withCycles.description, /circular dependency loops/);

  const withoutCycles = getWaveResidualRisk(1, 0);
  assert.equal(withoutCycles.riskLevel, 'high');
  assert.match(withoutCycles.description, /intermediate domain services/);
});

test('getWaveResidualRisk: Wave 2 is zero residual risk when cycles == 0', () => {
  const noCycles = getWaveResidualRisk(2, 0);
  assert.equal(noCycles.riskLevel, 'low');
  assert.equal(noCycles.label, 'ZERO CYCLE RESIDUAL RISK');

  const withCycles = getWaveResidualRisk(2, 1);
  assert.equal(withCycles.riskLevel, 'medium');
  assert.equal(withCycles.label, 'CONTROLLED RISK');
});

test('getWaveResidualRisk: Wave 3 is moderate risk', () => {
  const risk = getWaveResidualRisk(3, 0);
  assert.equal(risk.riskLevel, 'medium');
  assert.equal(risk.label, 'MODERATE RISK');
});

test('getWaveResidualRisk: Wave 4 is low residual risk', () => {
  const risk = getWaveResidualRisk(4, 0);
  assert.equal(risk.riskLevel, 'low');
  assert.equal(risk.label, 'LOW RESIDUAL RISK');
});

test('presentation utilities: formatting checks', () => {
  assert.equal(cleanText('`hello`   world'), 'hello world');
  assert.equal(titleCase('hello_world-test'), 'Hello World Test');
  assert.equal(sourceLabel('demo_benchmark'), 'Built-in demo');
  assert.equal(complexityLabel(undefined, 3), 'Low');
  assert.equal(complexityLabel(undefined, 8), 'Moderate');
  assert.equal(complexityLabel(undefined, 15), 'High');
  assert.equal(complexityLabel(undefined, 25), 'Critical');
});

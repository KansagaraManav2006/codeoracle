import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

const bundleResult = await build({
  stdin: {
    contents: `export * from './src/utils/modernizationUtils';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});

const { computeFileMetadata } = await import(
  `data:text/javascript;base64,${Buffer.from(bundleResult.outputFiles[0].text).toString('base64')}`
);

test('computeFileMetadata: identifies clean file with full syntax validity', () => {
  const file = {
    relative_path: 'src/main.py',
    language: 'python',
    changed: false,
    syntax_valid: true,
  };
  const result = { findings: [] };
  const meta = computeFileMetadata(file, result, null, []);
  assert.equal(meta.status, 'CLEAN');
  assert.equal(meta.candidateType, 'Clean / Unchanged');
  assert.equal(meta.disposition, 'already_modern');
  assert.equal(meta.hasDiff, false);
  assert.equal(meta.confidence, 'medium');
});

test('computeFileMetadata: identifies deterministic rule diff when changed with valid syntax', () => {
  const file = {
    relative_path: 'src/legacy.py',
    language: 'python',
    changed: true,
    syntax_valid: true,
    unified_diff: '--- a/src/legacy.py\n+++ b/src/legacy.py\n-for i in xrange(10):\n+for i in range(10):',
    applied_rule_ids: ['PY2_XRANGE'],
  };
  const result = {
    findings: [{ file: 'src/legacy.py', category: 'modernization', rule_id: 'PY2_XRANGE', autofixable: true }],
  };
  const meta = computeFileMetadata(file, result, null, []);
  assert.equal(meta.status, 'STATIC VALID');
  assert.equal(meta.candidateType, 'Deterministic rule diff');
  assert.equal(meta.hasDiff, true);
  assert.equal(meta.confidence, 'high');
});

test('computeFileMetadata: blocked candidate when modernization finding present but protection test missing', () => {
  const file = {
    relative_path: 'src/service.py',
    language: 'python',
    changed: false,
    syntax_valid: true,
  };
  const result = {
    findings: [{ file: 'src/service.py', category: 'modernization', rule_id: 'MANUAL_REFACTOR', autofixable: false }],
  };
  const meta = computeFileMetadata(file, result, null, []);
  assert.equal(meta.status, 'BLOCKED');
  assert.equal(meta.disposition, 'missing_protection');
});

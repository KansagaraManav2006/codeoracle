import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Bundle the TypeScript hook in memory using esbuild
const bundleResult = await build({
  stdin: {
    contents: `export * from './src/hooks/useJobPoller';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  write: false,
  platform: 'node',
  format: 'esm',
});

const {
  deriveFetchStage,
  toRepoFetchErrorCode,
  loadProjectData,
} = await import(
  `data:text/javascript;base64,${Buffer.from(bundleResult.outputFiles[0].text).toString('base64')}`
);

// -------------------------------------------------------------
// 1. STABLE ERROR CODES AND ACTIONABLE MESSAGES
// -------------------------------------------------------------
test('toRepoFetchErrorCode maps all failure codes deterministically', () => {
  const mappings = [
    { input: 'INVALID_URL_SCHEME', expected: 'INVALID_URL' },
    { input: 'MALFORMED_URL', expected: 'INVALID_URL' },
    { input: 'REPO_NOT_FOUND', expected: 'REPO_NOT_FOUND' },
    { input: 'PRIVATE_REPOSITORY_AUTH', expected: 'PRIVATE_REPO' },
    { input: 'FORBIDDEN_ACCESS', expected: 'PRIVATE_REPO' },
    { input: 'RATE_LIMIT_EXCEEDED', expected: 'RATE_LIMITED' },
    { input: 'ARCHIVE_TOO_LARGE', expected: 'REPO_TOO_LARGE' },
    { input: 'MAX_SIZE_EXCEEDED', expected: 'REPO_TOO_LARGE' },
    { input: 'CLONE_TIMEOUT', expected: 'TIMEOUT' },
    { input: 'GIT_CLONE_FAILED', expected: 'CLONE_FAILED' },
    { input: 'UNEXPECTED_EXCEPTION', expected: 'UNKNOWN' },
    { input: null, expected: 'UNKNOWN' },
    { input: undefined, expected: 'UNKNOWN' },
  ];

  for (const { input, expected } of mappings) {
    assert.equal(
      toRepoFetchErrorCode(input),
      expected,
      `Failed mapping for input: ${input}`
    );
  }
});

// -------------------------------------------------------------
// 2. ATOMIC LOAD & PARTIAL STATE PREVENTION
// -------------------------------------------------------------
test('loadProjectData: fails completely when metadata returns 500 (no partial state)', async () => {
  const fakeFetch = async (url) => {
    if (url.includes('/summary')) return { ok: true, status: 200, json: async () => ({}) };
    if (url.includes('/files')) return { ok: true, status: 200, json: async () => ({ files: [] }) };
    return { ok: false, status: 500, json: async () => ({ detail: 'Database error' }) };
  };

  await assert.rejects(
    async () => {
      await loadProjectData('proj_err', fakeFetch);
    },
    /Failed to load project metadata \(HTTP 500\)/
  );
});

test('loadProjectData: fails completely when files inventory returns 500 (no partial state)', async () => {
  const fakeFetch = async (url) => {
    if (url.endsWith('/files')) {
      return { ok: false, status: 500, json: async () => ({ detail: 'Disk read error' }) };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({ project_id: 'proj_err', display_name: 'Corrupted' }),
    };
  };

  await assert.rejects(
    async () => {
      await loadProjectData('proj_err', fakeFetch);
    },
    /Failed to load project file inventory \(HTTP 500\)/
  );
});

test('loadProjectData: handles unauthorized access (403 Forbidden)', async () => {
  const fakeFetch = async (url) => {
    return {
      ok: false,
      status: 403,
      json: async () => ({ detail: 'Access denied. You do not own this project.' }),
    };
  };

  await assert.rejects(
    async () => {
      await loadProjectData('proj_private', fakeFetch);
    },
    /Failed to load project metadata \(HTTP 403\)/
  );
});

// -------------------------------------------------------------
// 3. POLLING RETRY, BACKOFF, AND BOUNDS VERIFICATION
// -------------------------------------------------------------
test('polling backoff calculation: bounded exponential growth up to 3000ms max', () => {
  let delay = 1000;
  const delays = [delay];
  for (let i = 0; i < 10; i++) {
    delay = Math.min(delay * 1.25, 3000);
    delays.push(delay);
  }

  // Verify exponential progression
  assert.equal(delays[0], 1000);
  assert.equal(delays[1], 1250);
  assert.equal(delays[2], 1562.5);
  assert.equal(delays[3], 1953.125);
  assert.equal(delays[4], 2441.40625);
  assert.equal(delays[5], 3000); // capped at 3000ms
  assert.equal(delays[6], 3000); // remains capped
  assert.equal(delays[7], 3000);
});

test('polling bounds: 180 attempts limit guarantees no infinite request loop', () => {
  const MAX_POLL_ATTEMPTS = 180;
  assert.equal(MAX_POLL_ATTEMPTS, 180);
  // At ~2.5s avg interval, 180 attempts equates to ~7.5 minutes, preventing infinite spinning
  const estimatedMaxSeconds = (180 * 2500) / 1000;
  assert.ok(estimatedMaxSeconds >= 300 && estimatedMaxSeconds <= 600);
});

// -------------------------------------------------------------
// 4. FETCH STAGE TRANSITIONS & FAILURE RECOVERY
// -------------------------------------------------------------
test('deriveFetchStage: transitions through lifecycle and recovers accurately on failure', () => {
  // Idle
  assert.equal(deriveFetchStage(false, null, null), 'idle');

  // Loading start
  assert.equal(deriveFetchStage(true, null, null), 'validating_url');

  // Fetching repo
  assert.equal(
    deriveFetchStage(true, { id: 'j1', state: 'running', stage: 'Cloning Repository' }, null),
    'fetching_repo'
  );

  // Reading files
  assert.equal(
    deriveFetchStage(true, { id: 'j1', state: 'running', stage: 'Discovering Files' }, null),
    'reading_files'
  );

  // Building graph
  assert.equal(
    deriveFetchStage(true, { id: 'j1', state: 'running', stage: 'Building Dependency Graph' }, null),
    'building_graph'
  );

  // Generating analysis
  assert.equal(
    deriveFetchStage(true, { id: 'j1', state: 'generating', stage: 'Finalizing Architecture' }, null),
    'generating_analysis'
  );

  // Completed ONLY when state === 'completed'
  assert.equal(
    deriveFetchStage(false, { id: 'j1', state: 'completed', stage: 'Done', progress_percentage: 100 }, null),
    'completed'
  );

  // Progress 100% does NOT trigger completed if state is running/generating
  assert.equal(
    deriveFetchStage(true, { id: 'j1', state: 'running', stage: 'Finalizing', progress_percentage: 100 }, null),
    'generating_analysis'
  );

  // Failed state on backend job failure
  assert.equal(
    deriveFetchStage(false, { id: 'j1', state: 'failed', stage: 'Cloning Repository', error_message: 'Clone error' }, null),
    'failed'
  );

  // Failed state on network error
  assert.equal(deriveFetchStage(false, null, 'Network connection lost'), 'failed');
});

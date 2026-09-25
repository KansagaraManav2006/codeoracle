import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';

// Bundle the TypeScript module in memory
const result = await build({
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
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`
);

test('deriveFetchStage: idle when not loading and no job', () => {
  assert.equal(deriveFetchStage(false, null, null), 'idle');
});

test('deriveFetchStage: validating_url when loading and no job', () => {
  assert.equal(deriveFetchStage(true, null, null), 'validating_url');
});

test('deriveFetchStage: failed when error string present or job state failed', () => {
  assert.equal(deriveFetchStage(false, null, 'Network error'), 'failed');
  assert.equal(
    deriveFetchStage(false, { id: 'j1', state: 'failed', stage: 'Clone' }, null),
    'failed'
  );
});

test('deriveFetchStage: 100% progress alone is NOT treated as completed', () => {
  // Requirement 1 & 3: Source of truth is job state, not 100% alone
  const stage = deriveFetchStage(
    true,
    {
      id: 'j1',
      state: 'generating',
      stage: 'Finalizing Architecture',
      progress_percentage: 100,
    },
    null
  );
  assert.equal(stage, 'generating_analysis');
  assert.notEqual(stage, 'completed');
});

test('deriveFetchStage: completed only when job state is completed', () => {
  const stage = deriveFetchStage(
    false,
    {
      id: 'j1',
      state: 'completed',
      stage: 'Completed',
      progress_percentage: 100,
    },
    null
  );
  assert.equal(stage, 'completed');
});

test('toRepoFetchErrorCode mappings', () => {
  assert.equal(toRepoFetchErrorCode('INVALID_URL_SCHEME'), 'INVALID_URL');
  assert.equal(toRepoFetchErrorCode('REPO_NOT_FOUND'), 'REPO_NOT_FOUND');
  assert.equal(toRepoFetchErrorCode('PRIVATE_REPOSITORY_AUTH'), 'PRIVATE_REPO');
  assert.equal(toRepoFetchErrorCode('RATE_LIMIT_EXCEEDED'), 'RATE_LIMITED');
  assert.equal(toRepoFetchErrorCode('ARCHIVE_TOO_LARGE'), 'REPO_TOO_LARGE');
  assert.equal(toRepoFetchErrorCode('CLONE_TIMEOUT'), 'TIMEOUT');
  assert.equal(toRepoFetchErrorCode('GIT_CLONE_FAILED'), 'CLONE_FAILED');
  assert.equal(toRepoFetchErrorCode('OTHER_ERROR'), 'UNKNOWN');
  assert.equal(toRepoFetchErrorCode(null), 'UNKNOWN');
});

test('loadProjectData: successfully loads all records when endpoints succeed', async () => {
  const fakeFetch = async (url) => {
    if (url === '/api/projects/proj_1') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ project_id: 'proj_1', display_name: 'Test Project' }),
      };
    }
    if (url === '/api/projects/proj_1/files') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ files: [{ id: 'f1', relative_path: 'main.py' }] }),
      };
    }
    if (url === '/api/projects/proj_1/summary') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ total_files: 1, languages: ['python'] }),
      };
    }
    return { ok: false, status: 404 };
  };

  const result = await loadProjectData('proj_1', fakeFetch);
  assert.equal(result.project.project_id, 'proj_1');
  assert.equal(result.files.length, 1);
  assert.equal(result.summary?.total_files, 1);
});

test('loadProjectData: throws error when metadata fails, does not return partial state', async () => {
  const fakeFetch = async (url) => {
    if (url === '/api/projects/proj_fail') {
      return { ok: false, status: 404, json: async () => ({}) };
    }
    if (url === '/api/projects/proj_fail/files') {
      return { ok: true, status: 200, json: async () => ({ files: [] }) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  await assert.rejects(
    () => loadProjectData('proj_fail', fakeFetch),
    /Failed to load project metadata \(HTTP 404\)/
  );
});

test('loadProjectData: throws error when files inventory fails, does not return partial state', async () => {
  const fakeFetch = async (url) => {
    if (url === '/api/projects/proj_fail') {
      return { ok: true, status: 200, json: async () => ({ project_id: 'proj_fail' }) };
    }
    if (url === '/api/projects/proj_fail/files') {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    return { ok: true, status: 200, json: async () => ({}) };
  };

  await assert.rejects(
    () => loadProjectData('proj_fail', fakeFetch),
    /Failed to load project file inventory \(HTTP 500\)/
  );
});

test('loadProjectData: tolerates optional summary failure if metadata and files succeed', async () => {
  const fakeFetch = async (url) => {
    if (url === '/api/projects/proj_partial') {
      return { ok: true, status: 200, json: async () => ({ project_id: 'proj_partial' }) };
    }
    if (url === '/api/projects/proj_partial/files') {
      return { ok: true, status: 200, json: async () => ({ files: [{ id: 'f1' }] }) };
    }
    if (url === '/api/projects/proj_partial/summary') {
      return { ok: false, status: 500, json: async () => ({}) };
    }
    return { ok: false, status: 404 };
  };

  const result = await loadProjectData('proj_partial', fakeFetch);
  assert.equal(result.project.project_id, 'proj_partial');
  assert.equal(result.files.length, 1);
  assert.equal(result.summary, null);
});

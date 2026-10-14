import { ModuleRole, EntryPointKind } from '../types';

export function getModuleRole(path: string): { role: ModuleRole; label: string } {
  const norm = path.replace(/\\/g, '/').toLowerCase();
  const fname = norm.split('/').pop() || '';
  if (
    norm.includes('generated') ||
    norm.includes('.generated.') ||
    norm.includes('_pb2.') ||
    norm.includes('.g.') ||
    norm.includes('openapi')
  ) {
    return { role: 'generated', label: 'Generated Contract' };
  }
  if (norm.includes('test') || norm.includes('spec') || norm.includes('benchmark')) {
    return { role: 'test', label: 'Test Suite' };
  }
  if (
    fname.includes('config') ||
    fname.includes('setup.py') ||
    fname.includes('tsconfig') ||
    fname.includes('vite') ||
    fname.includes('webpack') ||
    fname.includes('tailwind')
  ) {
    return { role: 'configuration', label: 'Configuration' };
  }
  if (
    fname.includes('seed.py') ||
    fname.includes('run.py') ||
    fname.includes('manage.py') ||
    norm.includes('scripts/')
  ) {
    return { role: 'script', label: 'Executable Script' };
  }
  if (
    norm.includes('ml/') ||
    norm.includes('pipeline') ||
    norm.includes('forecast') ||
    norm.includes('preprocessing') ||
    norm.includes('training')
  ) {
    return { role: 'ml', label: 'ML Pipeline' };
  }
  if (
    norm.includes('api/') ||
    norm.includes('route') ||
    norm.includes('endpoint') ||
    norm.includes('controller')
  ) {
    return { role: 'api', label: 'API / Route' };
  }
  if (norm.includes('repo') || norm.includes('dao')) {
    return { role: 'repository', label: 'Repository' };
  }
  if (
    norm.includes('model') ||
    norm.includes('schema') ||
    norm.includes('entity') ||
    norm.includes('database') ||
    norm.includes('db.')
  ) {
    return { role: 'persistence', label: 'Persistence & Schema' };
  }
  if (
    norm.includes('components/') ||
    norm.includes('pages/') ||
    norm.includes('views/') ||
    norm.includes('frontend/src')
  ) {
    return { role: 'ui', label: 'User Interface' };
  }
  if (norm.includes('service') || norm.includes('core/')) {
    return { role: 'application_service', label: 'Application Service' };
  }
  if (
    norm.includes('util') ||
    norm.includes('helper') ||
    norm.includes('common') ||
    norm.includes('lib/')
  ) {
    return { role: 'utility', label: 'Shared Utility' };
  }
  return { role: 'domain', label: 'Domain Module' };
}

export function getEntryPointCategory(path: string): { kind: EntryPointKind; label: string } {
  const norm = path.replace(/\\/g, '/').toLowerCase();
  const fname = norm.split('/').pop() || '';
  if (norm.includes('ml/train') || norm.includes('train.py') || norm.includes('evaluate.py')) {
    return { kind: 'ml_training', label: 'ML TRAINING' };
  }
  if (
    ['main.py', 'app.py', 'server.py', 'wsgi.py', 'asgi.py'].includes(fname) &&
    !norm.includes('seed') &&
    !norm.includes('test')
  ) {
    return { kind: 'app_runtime', label: 'APP RUNTIME' };
  }
  if (['main.tsx', 'main.jsx', 'main.ts', 'main.js'].includes(fname)) {
    return { kind: 'frontend_bootstrap', label: 'FRONTEND BOOTSTRAP' };
  }
  if (['app.tsx', 'app.jsx', 'mainlayout.tsx', 'layout.tsx', 'rootlayout.tsx'].includes(fname)) {
    return { kind: 'route_root', label: 'ROUTE ROOT' };
  }
  if (fname.includes('worker') || fname.includes('celery') || fname.includes('queue')) {
    return { kind: 'worker', label: 'WORKER' };
  }
  if (['cli.py', 'cli.ts', 'manage.py'].includes(fname)) {
    return { kind: 'cli', label: 'CLI' };
  }
  if (fname.includes('seed.py') || norm.includes('scripts/')) {
    return { kind: 'script', label: 'SCRIPT' };
  }
  if (
    fname.includes('config') ||
    fname.includes('setup.py') ||
    fname.includes('tsconfig') ||
    fname.includes('vite')
  ) {
    return { kind: 'config', label: 'CONFIG' };
  }
  return { kind: 'unknown', label: 'STANDALONE' };
}

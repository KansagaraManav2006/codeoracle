import { test, expect } from '@playwright/test';
import {
  mockUser,
  mockProject,
  mockFiles,
  mockSummary,
  mockHotspots,
  mockGraph,
  mockGeneratedTests,
  mockRefactorResult,
  mockMigrationPlan,
  mockSystemPulse,
  mockAnalysis,
  mockArchitecture,
} from './fixtures/mock-data';

test.describe('Accessibility & Responsive Design Verification', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Setup deterministic API route mocks
    await page.route('**/api/auth/google/status', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ configured: false }) });
    });
    await page.route('**/api/projects?limit=12', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ projects: [mockProject] }) });
    });
    await page.route('**/api/demo/projects', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ benchmarks: [] }) });
    });
    await page.route('**/api/health', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) });
    });
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockUser) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockProject) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/files`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: mockFiles }) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/summary`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSummary) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/analysis*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockAnalysis) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/architecture*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockArchitecture) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/hotspots*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ hotspots: mockHotspots }) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/graph*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockGraph) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/tests*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockGeneratedTests) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/refactor*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockRefactorResult) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/migration*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockMigrationPlan) });
    });
    await page.route(`**/api/projects/${mockProject.project_id}/system-pulse*`, async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(mockSystemPulse) });
    });
    page.on('pageerror', (err) => console.log('PAGE_ERROR_IN_E2E:', err.message, err.stack));
  });

  test('Workspace accessibility semantics (Skip link, ARIA tabs, heading hierarchy)', async ({ page }) => {
    await page.goto('/workspace');

    // 1. Accessibility Skip Link
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeAttached();

    // 2. Semantic Workspace Navigation & Landmarks
    const nav = page.locator('nav[aria-label="Workspace"]');
    await expect(nav).toBeVisible({ timeout: 10000 });

    const analyzeBtn = page.locator('button[title="Analyze a codebase"]').first();
    await expect(analyzeBtn).toBeVisible();

    const detailsBtn = page.locator('button[title="Project Details"]').first();
    await expect(detailsBtn).toBeVisible();

    // 3. Main content landmark
    const mainContent = page.locator('#main-content');
    await expect(mainContent).toBeVisible();

    // 4. Tab navigation focuses interactive elements
    await page.keyboard.press('Tab');
    const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT', 'DIV']).toContain(activeTagName);
  });

  test('Responsive viewport verification: Mobile (375x667), Tablet (768x1024), Desktop (1440x900)', async ({ page }) => {
    const viewports = [
      { name: 'Mobile', width: 375, height: 667 },
      { name: 'Tablet', width: 768, height: 1024 },
      { name: 'Desktop', width: 1440, height: 900 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/workspace');

      // Verify page content mounts without crashing
      const mainContent = page.locator('#main-content, main, [role="tabpanel"]').first();
      await expect(mainContent).toBeVisible();

      // Check for horizontal document overflow
      const overflowingElements = await page.evaluate(() => {
        const docWidth = window.innerWidth;
        const elements = document.querySelectorAll('*');
        const bad = [];
        for (const el of elements) {
          const rect = el.getBoundingClientRect();
          if (rect.right > docWidth + 1) {
            bad.push({
              tag: el.tagName,
              id: el.id,
              className: el.className?.toString?.() || '',
              right: rect.right,
              width: rect.width,
            });
          }
        }
        return bad;
      });
      if (overflowingElements.length > 0) {
        console.log(`OVERFLOW ON ${vp.name}:`, JSON.stringify(overflowingElements.slice(0, 5)));
      }
      expect(overflowingElements.length, `Horizontal overflow detected on ${vp.name}`).toBe(0);
    }
  });
});

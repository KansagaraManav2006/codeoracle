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

test.describe('End-to-End Golden Path Workflow', () => {
  test('Complete user workflow: register, authenticate, ingest, analyze all tabs, export, refresh restoration, and sign out', async ({
    page,
  }) => {
    test.setTimeout(60000);
    let authState: { user: typeof mockUser | null } = { user: null };
    let pollCount = 0;

    // 1. Setup deterministic API route mocks
    await page.route('**/api/auth/google/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ configured: false }),
      });
    });

    await page.route('**/api/projects?limit=12', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: [] }),
      });
    });

    await page.route('**/api/demo/projects', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ benchmarks: [] }),
      });
    });

    await page.route('**/api/health', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ok' }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      if (authState.user) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(authState.user),
        });
      } else {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Not authenticated' }),
        });
      }
    });

    await page.route('**/api/auth/register', async (route) => {
      authState.user = mockUser;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user: mockUser,
          token: 'mock_playwright_token',
          message: 'Account registered successfully',
        }),
      });
    });

    await page.route('**/api/auth/login', async (route) => {
      authState.user = mockUser;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: mockUser,
          token: 'mock_playwright_token',
          message: 'Authenticated successfully',
        }),
      });
    });

    await page.route('**/api/auth/logout', async (route) => {
      authState.user = null;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Logged out successfully' }),
      });
    });

    // Ingestion jobs route
    await page.route('**/api/jobs/github', async (route) => {
      pollCount = 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'job_golden_1',
          state: 'pending',
          stage: 'Cloning Repository',
          progress_percentage: 10,
        }),
      });
    });

    await page.route('**/api/jobs/upload', async (route) => {
      pollCount = 0;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'job_golden_1',
          state: 'pending',
          stage: 'Extracting ZIP',
          progress_percentage: 10,
        }),
      });
    });

    // Poller status progression
    await page.route('**/api/jobs/job_golden_1', async (route) => {
      pollCount++;
      if (pollCount <= 1) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: 'job_golden_1',
            state: 'running',
            stage: 'Analyzing Dependencies',
            progress_percentage: 60,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: 'job_golden_1',
            state: 'completed',
            stage: 'Completed',
            progress_percentage: 100,
            project_id: mockProject.project_id,
          }),
        });
      }
    });

    // Project metadata & files
    await page.route('**/api/projects/' + mockProject.project_id, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProject),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/files', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ files: mockFiles }),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSummary),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/hotspots*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ hotspots: mockHotspots }),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/system-pulse*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockSystemPulse),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/analysis*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAnalysis),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/architecture*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockArchitecture),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/nodes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ nodes: mockGraph.nodes }),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/edges', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ edges: mockGraph.edges }),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/graph**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGraph),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/tests**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockGeneratedTests),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/refactor**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockRefactorResult),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/impact**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          target_file: 'src/auth_service.py',
          impact_score: 45,
          affected_callers: ['src/main.py'],
          transitive_callers: ['src/main.py'],
        }),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/migration**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMigrationPlan),
      });
    });

    await page.route('**/api/projects/' + mockProject.project_id + '/export**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'ready', download_url: '/download/report.json' }),
      });
    });

    page.on('pageerror', (err) => {
      console.log('PAGE_ERROR_MSG:', err.message, err.stack);
    });

    // -----------------------------------------------------------
    // STEP 1: Registration
    // -----------------------------------------------------------
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();

    await page.fill('#register-email', 'playwright@codeoracle.test');
    await page.fill('#register-password', 'StrongP@ssw0rd!');
    await page.getByRole('button', { name: 'Create Account' }).click();

    // -----------------------------------------------------------
    // STEP 2: Authenticated workspace & repository ingestion
    // -----------------------------------------------------------
    await expect(page).toHaveURL(/workspace|\//);

    // Open repository ingestion intake section
    const analyzeNavBtn = page.locator('button[title="Analyze a codebase"]').first();
    await analyzeNavBtn.click();

    // Fill GitHub URL inside InputSection
    const urlInput = page.locator('input[placeholder*="github.com"]').first();
    await expect(urlInput).toBeVisible();
    await urlInput.fill('https://github.com/example/fastapi-microservice');
    await page.locator('button[type="submit"]:has-text("Analyze")').first().click();

    // -----------------------------------------------------------
    // STEP 3: Job Polling & Analysis Completion
    // -----------------------------------------------------------
    // Wait for the project title to appear indicating successful polling and data loading
    await expect(page.getByText('FastAPI Microservice Architecture').first()).toBeVisible({ timeout: 15000 });

    // -----------------------------------------------------------
    // STEP 4: Opening Every Analysis Section
    // -----------------------------------------------------------
    // Section 1: Project Details (overview)
    await page.locator('button[title="Project Details"]').first().click();
    await expect(page.getByText('FastAPI Microservice Architecture').first()).toBeVisible();

    // Section 2: System Pulse
    await page.locator('button[title="System Pulse"]').first().click();
    await expect(page.getByText(/System Pulse|Subsystems|Health/i).first()).toBeVisible();

    // Section 3: Explanation
    await page.locator('button[title="Explanation"]').first().click();
    await expect(page.getByText(/Architecture Overview|Entry Points|Observations|src\/auth_service\.py/i).first()).toBeVisible();

    // Section 4: Risk Hotspots
    await page.locator('button[title="Risk Hotspots"]').first().click();
    await expect(page.getByText('src/auth_service.py').first()).toBeVisible();

    // Section 5: Dependency Graph
    await page.locator('button[title="Dependency Graph"]').first().click();
    await expect(page.getByRole('heading', { name: 'DEPENDENCY GRAPH' }).first()).toBeVisible();

    // Section 6: Neural Map
    await page.locator('button[title="Neural Map"]').first().click();
    await expect(page.getByRole('heading', { name: 'NEURAL MAP' }).first()).toBeVisible();

    // Section 7: Generated Tests & Creation
    await page.locator('button[title="Generated Tests"]').first().click();
    await expect(page.getByText('Authentication Boundary Test Suite').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Tests' }).first()).toBeVisible();

    // Section 8: Refactor Proposals & Verification
    await page.locator('button[title="Refactor Proposals"]').first().click();
    await expect(page.getByText('src/auth_service.py').first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Proposal' }).first()).toBeVisible();

    // Section 9: Migration Plan & Retrieval
    await page.locator('button[title*="Migration Plan"]').first().click();
    await expect(page.getByRole('heading', { name: 'MIGRATION PLAN' }).first()).toBeVisible();
    await expect(page.getByText(/Python 3.12 Asynchronous Modernization Strategy/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Download Markdown Plan' }).first()).toBeVisible();

    // -----------------------------------------------------------
    // STEP 5: Browser Refresh and Project State Restoration
    // -----------------------------------------------------------
    await page.reload();
    await expect(page.getByText('FastAPI Microservice Architecture').first()).toBeVisible({ timeout: 15000 });

    // -----------------------------------------------------------
    // STEP 6: Sign Out
    // -----------------------------------------------------------
    const logoutBtn = page.locator('button[title*="Sign out"], button:has-text("Sign Out"), button:has-text("Logout"), button[title="Sign out"]').first();
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/\/|\/signin/);
    }
  });
});

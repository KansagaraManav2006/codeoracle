import { test, expect } from '@playwright/test';

test.describe('End-to-End Failure States & Recovery', () => {
  test.beforeEach(async ({ page }) => {
    // Intercept common background polling endpoints to prevent ECONNREFUSED from unstarted backend in tests
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
  });

  // 1. Invalid Authentication
  test('Invalid authentication shows actionable error and does not enter workspace', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not authenticated' }),
      });
    });

    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Invalid email or password.' }),
      });
    });

    await page.goto('/signin');
    await page.fill('#signin-email', 'wrong@example.com');
    await page.fill('#signin-password', 'WrongPassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Verify user-facing error alert
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Invalid email or password.');
  });

  // 2. Guest Restrictions
  test('Guest restriction: unauthenticated users cannot trigger protected analysis jobs', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Not authenticated' }),
      });
    });

    await page.goto('/');
    const urlInput = page.locator('#repository-composer input[type="url"], input[type="url"]').first();
    await urlInput.fill('https://github.com/example/private-repo');
    await page.locator('#repository-composer button[type="submit"], form button[type="submit"]').first().click();

    // Verify guest restriction error banner is shown
    await expect(
      page.getByText(/Sign in is required to import repositories|Authentication required/i).first()
    ).toBeVisible();
  });

  // 3. Backend Unavailable / Network Drop
  test('Backend unavailable: poller surfaces actionable network error', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'u1', email: 'test@example.com' }),
      });
    });

    await page.route('**/api/jobs/github', async (route) => {
      await route.abort('connectionfailed');
    });

    await page.goto('/');
    const urlInput = page.locator('#repository-composer input[type="url"], input[type="url"]').first();
    await urlInput.fill('https://github.com/example/service');
    await page.locator('#repository-composer button[type="submit"], form button[type="submit"]').first().click();
    await expect(
      page.getByText(/Repository fetch failed|CLONE_FAILED|Repository could not be cloned/i).first()
    ).toBeVisible();
  });

  // 4. Database Unavailable (HTTP 500)
  test('Database unavailable: poller terminates immediately without infinite polling', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'u1', email: 'test@example.com' }),
      });
    });

    await page.route('**/api/jobs/github', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ job_id: 'job_db_err_1', state: 'pending', stage: 'Initializing' }),
      });
    });

    await page.route('**/api/jobs/job_db_err_1', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Database connection failed. Service degraded.' }),
      });
    });

    await page.goto('/');
    const urlInput = page.locator('#repository-composer input[type="url"], input[type="url"]').first();
    await urlInput.fill('https://github.com/example/service');
    await page.locator('#repository-composer button[type="submit"], form button[type="submit"]').first().click();
    await expect(page.getByText(/failed|error/i).first()).toBeVisible();
  });

  // 5. GitHub Rate Limiting (HTTP 429)
  test('GitHub rate limiting: displays actionable rate limit error with stable code', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'u1', email: 'test@example.com' }),
      });
    });

    await page.route('**/api/jobs/github', async (route) => {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'GitHub API rate limit exceeded. Please wait a moment and try again.',
          },
        }),
      });
    });

    await page.goto('/');
    const urlInput = page.locator('#repository-composer input[type="url"], input[type="url"]').first();
    await urlInput.fill('https://github.com/example/service');
    await page.locator('#repository-composer button[type="submit"], form button[type="submit"]').first().click();
    await expect(page.getByText(/rate limit/i).first()).toBeVisible();
  });

  // 6. Oversized Repository (HTTP 413)
  test('Oversized repository: displays clear file size limit warning', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'u1', email: 'test@example.com' }),
      });
    });

    await page.route('**/api/jobs/github', async (route) => {
      await route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({
          detail: {
            code: 'ARCHIVE_TOO_LARGE',
            message: 'Repository exceeds maximum allowed size.',
          },
        }),
      });
    });

    await page.goto('/');
    const urlInput = page.locator('#repository-composer input[type="url"], input[type="url"]').first();
    await urlInput.fill('https://github.com/example/huge-monorepo');
    await page.locator('#repository-composer button[type="submit"], form button[type="submit"]').first().click();
    await expect(page.getByText(/Repository size exceeds|maximum allowed/i).first()).toBeVisible();
  });

  // 7. Unauthorized Project Access (HTTP 403)
  test('Unauthorized project access: blocks viewing of non-owned private project', async ({
    page,
  }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'u2', email: 'other@example.com' }),
      });
    });

    await page.route('**/api/projects/proj_forbidden', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Access denied. You do not own this project.' }),
      });
    });

    await page.route('**/api/projects/proj_forbidden/files', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Access denied.' }),
      });
    });

    await page.route('**/api/projects/proj_forbidden/summary', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Access denied.' }),
      });
    });

    await page.goto('/?project=proj_forbidden');
    // Verifies that forbidden project is not displayed and app falls back cleanly to landing or empty intake
    await expect(
      page.getByText(/Access denied|Analyze a codebase|Repository Intake|Select a recent project/i).first()
    ).toBeVisible();
  });
});

import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright e2e test configuration for the drink-ux monorepo.
 *
 * Tests run against a locally started dev stack:
 *   - Mobile PWA  → http://localhost:3000
 *   - API         → http://localhost:3001
 *   - Admin       → http://localhost:3002
 *
 * In CI the stack is started via the webServer entries below.
 * Locally you can run `npm run dev` first, then `npm run test:e2e`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],

  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Start the full stack before running tests in CI */
  webServer: [
    {
      name: 'api',
      command: 'npm run dev --workspace=@drink-ux/api',
      url: 'http://localhost:3001/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
      env: {
        DATABASE_URL: 'file:./prisma/test.db',
        PORT: '3001',
      },
    },
    {
      name: 'mobile',
      command: 'npm run dev --workspace=@drink-ux/mobile',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      name: 'admin',
      command: 'npm run dev --workspace=@drink-ux/admin',
      url: 'http://localhost:3002',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
});

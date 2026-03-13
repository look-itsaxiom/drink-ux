import { test, expect } from '@playwright/test';

/**
 * Subscription flow tests — onboarding wizard, Square connect, activation.
 *
 * TODO: Placeholder stubs. Implement once subscription onboarding is built.
 *
 * Expected flows once implemented:
 *   Admin: /onboarding → connect Square → select plan → activate → /dashboard
 */

const ADMIN_URL = 'http://localhost:3002';

test.describe('Subscription — onboarding wizard', () => {
  test.skip('new user is redirected to onboarding wizard', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.waitForURL(/\/onboarding/);
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test.skip('onboarding wizard shows step 1: connect Square', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/onboarding`);
    await expect(page.locator('text=Connect Square')).toBeVisible();
    await expect(page.locator('button:has-text("Connect")')).toBeVisible();
  });

  test.skip('can activate subscription after connecting POS', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/onboarding?step=activate`);
    await page.click('button:has-text("Activate")');
    await page.waitForURL(/\//);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test('POS integration page renders', async ({ page }) => {
    // Current smoke test — POS integration page already exists
    await page.goto(`${ADMIN_URL}/pos`);
    await expect(page.locator('#root')).toBeVisible();
  });
});

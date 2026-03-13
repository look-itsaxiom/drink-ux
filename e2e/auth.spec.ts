import { test, expect } from '@playwright/test';

/**
 * Auth flow tests — sign up, sign in, sign out (mobile + admin).
 *
 * TODO: These are placeholder stubs. Implement once auth is added to both apps.
 *
 * Expected flows once implemented:
 *   - Mobile: /signup → /signin → home (authenticated) → sign out → /signin
 *   - Admin:  /login → /dashboard (authenticated) → sign out → /login
 */

const MOBILE_URL = 'http://localhost:3000';
const ADMIN_URL = 'http://localhost:3002';

test.describe('Auth — mobile app', () => {
  test.skip('customer can sign up with email and password', async ({ page }) => {
    await page.goto(`${MOBILE_URL}/signup`);
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/);
    await expect(page.locator('text=Build Your Perfect Drink')).toBeVisible();
  });

  test.skip('customer can sign in with valid credentials', async ({ page }) => {
    await page.goto(`${MOBILE_URL}/signin`);
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/home/);
    await expect(page.locator('text=Build Your Perfect Drink')).toBeVisible();
  });

  test.skip('customer can sign out', async ({ page }) => {
    await page.goto(`${MOBILE_URL}/home`);
    await page.click('[data-testid="user-menu"]');
    await page.click('text=Sign Out');
    await page.waitForURL(/\/signin/);
  });
});

test.describe('Auth — admin app', () => {
  test.skip('admin can log in', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/login`);
    await page.fill('[name="email"]', 'admin@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\//);
    await expect(page.locator('text=Dashboard')).toBeVisible();
  });

  test.skip('admin can log out', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.click('.user-row');
    await page.click('text=Log Out');
    await page.waitForURL(/\/login/);
  });
});

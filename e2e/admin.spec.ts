import { test, expect } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3002';

test.describe('Admin — dashboard and menu management', () => {
  test('dashboard loads with order queue', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('.sidebar')).toBeVisible();
  });

  test('dashboard shows order queue and activity feed', async ({ page }) => {
    await page.goto(ADMIN_URL);
    // Static prototype data: order codes visible
    await expect(page.locator('text=A3F8')).toBeVisible();
    await expect(page.locator('text=POS Synced')).toBeVisible();
  });

  test('navigates to menu management', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.click('.nav-item:has-text("Menu")');
    await page.waitForURL(/\/menu/);
    await expect(page.locator('text=Menu Management')).toBeVisible();
    await expect(page.locator('text=Drinks Menu')).toBeVisible();
  });

  test('menu management shows drink table', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/menu`);
    await expect(page.locator('text=Classic Latte')).toBeVisible();
    await expect(page.locator('text=Cappuccino')).toBeVisible();
    await expect(page.locator('text=Add New Drink')).toBeVisible();
  });

  test('navigates to POS integration page', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await page.click('.nav-item:has-text("Settings")');
    await page.waitForURL(/\/pos/);
    await expect(page).toHaveURL(/\/pos/);
  });

  test('orders page renders without crash', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/orders`);
    await expect(page.locator('#root')).toBeVisible();
  });

  test('sidebar navigation links are present', async ({ page }) => {
    await page.goto(ADMIN_URL);
    await expect(page.locator('.nav-item:has-text("Dashboard")')).toBeVisible();
    await expect(page.locator('.nav-item:has-text("Orders")')).toBeVisible();
    await expect(page.locator('.nav-item:has-text("Menu")')).toBeVisible();
    await expect(page.locator('.nav-item:has-text("Settings")')).toBeVisible();
  });
});

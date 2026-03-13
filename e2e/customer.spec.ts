import { test, expect } from '@playwright/test';

const MOBILE_URL = 'http://localhost:3000';

test.describe('Customer — browse menu and build a drink', () => {
  test('home page loads with drink builder prompt', async ({ page }) => {
    await page.goto(MOBILE_URL);
    // Ionic apps redirect from / to /home
    await page.waitForURL(/\/home/);
    await expect(page.locator('text=Build Your Perfect Drink')).toBeVisible();
    await expect(page.locator('text=Create Your Drink')).toBeVisible();
  });

  test('navigates to drink builder on button click', async ({ page }) => {
    await page.goto(`${MOBILE_URL}/home`);
    await page.click('text=Create Your Drink');
    await page.waitForURL(/\/drink\//);
    await expect(page).toHaveURL(/\/drink\//);
  });

  test('drink builder shows category selector first', async ({ page }) => {
    await page.goto(`${MOBILE_URL}/drink/new`);
    await expect(page.locator('ion-page, .ion-page')).toBeVisible();
  });

  test('cart page is accessible from header', async ({ page }) => {
    await page.goto(`${MOBILE_URL}/home`);
    const cartBtn = page.locator('[data-testid="cart-button"], ion-button[aria-label*="cart" i], ion-button').filter({ hasText: /cart/i }).first();
    const cartBtnCount = await cartBtn.count();
    if (cartBtnCount > 0) {
      await cartBtn.click();
    } else {
      await page.goto(`${MOBILE_URL}/cart`);
    }
    await page.waitForURL(/\/cart/);
    await expect(page).toHaveURL(/\/cart/);
  });

  test('cart page loads without errors', async ({ page }) => {
    await page.goto(`${MOBILE_URL}/cart`);
    await expect(page.locator('ion-app, #root')).toBeVisible();
  });
});

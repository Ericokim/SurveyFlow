import { test, expect } from '@playwright/test';

test.describe('Survey Flow', () => {
  test('should load homepage and take screenshot', async ({ page }) => {
    await page.goto('/');

    // Take a screenshot for Allure report
    await page.screenshot({ path: 'tests/screenshots/homepage.png', fullPage: true });

    // Basic assertion
    await expect(page).toHaveTitle(/Survey/);
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Look for login link/button
    const loginButton = page.getByRole('link', { name: /login|sign in/i });
    if (await loginButton.isVisible()) {
      await loginButton.click();

      // Take screenshot of login page
      await page.screenshot({ path: 'tests/screenshots/login-page.png', fullPage: true });

      // Basic assertion that we're on login page
      await expect(page.url()).toContain('login');
    } else {
      // If no login button found, just take a screenshot for debugging
      await page.screenshot({ path: 'tests/screenshots/homepage-no-login.png', fullPage: true });
    }
  });
});
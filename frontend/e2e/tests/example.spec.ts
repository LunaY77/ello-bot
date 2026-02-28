import { test, expect } from '@playwright/test';

/**
 * Example E2E Test - Demonstrates Authenticated Testing
 *
 * This test runs AFTER auth.setup.ts completes.
 * The user is already authenticated - no login required!
 */
test.describe('Authenticated User Flow', () => {
  test('should access protected page without login', async ({ page }) => {
    // Navigate to the app - user is already authenticated
    await page.goto('/');

    // Verify we're not redirected to login page
    expect(page.url()).not.toContain('/auth/login');

    // Verify authentication token exists in localStorage
    const token = await page.evaluate(() => {
      return localStorage.getItem('ELLO_AUTH_TOKEN');
    });

    expect(token).toBeTruthy();
    console.log('User is authenticated with token');
  });

  test('should display user information', async ({ page }) => {
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // The user should be logged in and see their profile/username
    // This is just an example - adjust selectors based on your actual UI
    const isAuthenticated = await page.evaluate(() => {
      return !!localStorage.getItem('ELLO_AUTH_TOKEN');
    });

    expect(isAuthenticated).toBe(true);
  });
});

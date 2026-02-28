import { test, expect } from '@playwright/test';

/**
 * Smoke Test - Critical User Journey
 *
 * This test validates the core user flow through the application:
 * 1. Landing page access
 * 2. Navigation to app (authenticated user)
 * 3. Profile page access
 * 4. Profile information verification
 * 5. Dashboard navigation
 *
 * Prerequisites:
 * - User is authenticated via auth.setup.ts
 * - Mock server provides API responses
 * - Authentication state is loaded from e2e/.auth/user.json
 */

test.describe('Smoke Test - Critical User Journey', () => {
  test('should complete full user journey from landing to dashboard', async ({
    page,
  }) => {
    // Step 1: Navigate to landing page
    await test.step('Navigate to landing page', async () => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Verify landing page loaded
      await expect(page.getByText(/ello/i)).toBeVisible();
      await expect(
        page.getByRole('button', { name: /get started|register/i }),
      ).toBeVisible();
    });

    // Step 2: Click "Get started" button - should redirect to /app (authenticated)
    await test.step('Click Get Started and redirect to app', async () => {
      const getStartedButton = page.getByRole('button', {
        name: /get started|register/i,
      });
      await getStartedButton.click();

      // Wait for navigation to complete
      await page.waitForURL(/\/app/, { timeout: 10000 });

      // Verify we're on the app page (dashboard)
      expect(page.url()).toContain('/app');
      expect(page.url()).not.toContain('/auth');

      // Verify authentication token exists
      const token = await page.evaluate(() => {
        return localStorage.getItem('ELLO_AUTH_TOKEN');
      });
      expect(token).toBeTruthy();
    });

    // Step 3: Navigate to profile page
    await test.step('Navigate to profile page', async () => {
      // Profile entry is the top-right user button in current layout
      const profileButton = page.getByRole('button', {
        name: /open user menu/i,
      });
      await expect(profileButton).toBeVisible();
      await profileButton.click();

      // Wait for profile page to load
      await page.waitForURL(/\/app\/profile/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Verify we're on the profile page
      expect(page.url()).toContain('/app/profile');
    });

    // Step 4: Verify profile information is displayed
    await test.step('Verify profile information', async () => {
      // Wait for profile content to load
      await expect(
        page.getByRole('heading', { name: /user information/i }),
      ).toBeVisible({ timeout: 10000 });

      // Verify username is displayed
      await expect(page.getByText(/^username$/i)).toBeVisible();

      // Verify role is displayed
      await expect(page.getByText(/^role$/i)).toBeVisible();

      // Verify status is displayed
      await expect(page.getByText(/^status$/i)).toBeVisible();

      // Verify additional profile sections exist
      await expect(
        page.getByRole('heading', { name: /change avatar|avatar/i }),
      ).toBeVisible();
      await expect(
        page.getByRole('heading', { name: /reset password|password/i }),
      ).toBeVisible();
    });

    // Step 5: Navigate to dashboard
    await test.step('Navigate to dashboard', async () => {
      // Find and click dashboard link in navigation
      const dashboardLink = page.getByRole('link', { name: /dashboard/i });
      await expect(dashboardLink).toBeVisible();
      await dashboardLink.click();

      // Wait for dashboard to load
      await page.waitForURL(/\/app$/, { timeout: 10000 });
      await page.waitForLoadState('networkidle');

      // Verify we're on the dashboard
      expect(page.url()).toMatch(/\/app$/);

      // Verify dashboard content is visible
      await expect(
        page.getByRole('heading', { name: /dashboard/i }),
      ).toBeVisible({ timeout: 10000 });

      // Verify welcome message or user-specific content
      await expect(page.getByText(/welcome/i)).toBeVisible();
    });
  });
});

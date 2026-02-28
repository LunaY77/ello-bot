import { randUserName, randPassword } from '@ngneat/falso';
import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

/**
 * Authentication Setup for E2E Tests
 *
 * This setup runs once before all tests to:
 * 1. Generate a unique test user
 * 2. Register the user via the mock API
 * 3. Verify token is persisted
 * 4. Save authentication state to a file
 *
 * All subsequent tests will use this saved auth state,
 * eliminating the need to login in each test.
 */
setup('authenticate', async ({ page }) => {
  // Generate unique test user credentials
  const uniqueSuffix = Date.now().toString(36).slice(-6);
  const normalizedName = randUserName()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const safeBaseName = normalizedName.slice(0, 13) || 'testuser';
  const username = `${safeBaseName}${uniqueSuffix}`;
  const password = randPassword({ size: 10 });

  console.log(`Creating test user: ${username}`);

  // Step 1: Register new test user
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Navigate to register page
  const registerLink = page.getByRole('link', { name: /register|sign up/i });
  if (await registerLink.isVisible()) {
    await registerLink.click();
  } else {
    // If already on register page or need to navigate directly
    await page.goto('/auth/register');
  }

  // Fill registration form
  await page.getByLabel(/^username$/i).fill(username);
  await page
    .getByLabel(/^password$/i)
    .first()
    .fill(password);
  await page.getByLabel(/confirm.*password/i).fill(password);

  // Submit registration
  await page.getByRole('button', { name: /register|sign up/i }).click();

  // Wait for successful registration (should redirect to app)
  await page.waitForURL(/^(?!.*\/auth).*$/, { timeout: 10000 });
  expect(page.url()).not.toContain('/auth');

  console.log(`User registered successfully: ${username}`);

  // Step 2: Verify authentication token is stored
  const token = await page.evaluate(() => {
    return localStorage.getItem('ELLO_AUTH_TOKEN');
  });

  expect(token).toBeTruthy();
  console.log('Authentication token verified in localStorage');

  // Step 3: Save authentication state to file
  await page.context().storageState({ path: authFile });

  console.log(`Authentication state saved to ${authFile}`);
  console.log('Setup complete - all tests will use this authenticated session');
});

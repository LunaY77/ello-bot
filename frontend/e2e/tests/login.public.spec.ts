import { expect, test } from '@playwright/test';

import {
  AUTH_STORAGE_KEY,
  createCredentials,
  registerUser,
} from '../fixtures/auth';

test.describe('public authentication flow', () => {
  test('signs in through the real login form', async ({ page, request }) => {
    const credentials = createCredentials('login');
    await registerUser(request, credentials);

    await page.goto('/auth/login');

    await page.getByLabel('Username').fill(credentials.username);
    await page.getByLabel('Password').fill(credentials.password);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/app$/);
    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sessions' })).toBeVisible();

    const persistedSession = await page.evaluate((storageKey) => {
      return localStorage.getItem(storageKey);
    }, AUTH_STORAGE_KEY);

    expect(persistedSession).toBeTruthy();
  });
});

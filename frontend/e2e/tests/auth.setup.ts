import { test as setup, expect } from '@playwright/test';

import {
  AUTH_STORAGE_KEY,
  createCredentials,
  persistAuthSession,
  registerUser,
} from '../fixtures/auth';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page, request }) => {
  const credentials = createCredentials('auth');
  const session = await registerUser(request, credentials);

  await persistAuthSession(page, session);
  await page.goto('/app');

  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

  const persistedSession = await page.evaluate((storageKey) => {
    return localStorage.getItem(storageKey);
  }, AUTH_STORAGE_KEY);

  expect(persistedSession).toBeTruthy();

  await page.context().storageState({ path: authFile });
});

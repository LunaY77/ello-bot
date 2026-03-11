import { expect, test } from '@playwright/test';

test.describe('authenticated console flow', () => {
  test('renders the current assistant, admin, and settings navigation', async ({
    page,
  }) => {
    await page.goto('/app');

    await expect(
      page.getByRole('heading', { name: 'What should the agent do next?' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Assistant' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sessions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Workspaces' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    await page.getByRole('link', { name: 'Sessions' }).click();

    await expect(page).toHaveURL(/\/app\/sessions$/);
    await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Session directory' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Sign out everywhere' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Workspaces' }).click();

    await expect(page).toHaveURL(/\/app\/workspaces$/);
    await expect(
      page.getByRole('heading', { name: 'Workspace', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Workspace directory' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create Workspace' }),
    ).toBeVisible();
  });

  test('updates the profile against the backend from the settings surface', async ({
    page,
  }) => {
    const displayName = `Profile ${Date.now().toString(36)}`;

    await page.goto('/app');
    await page.getByRole('link', { name: 'Settings' }).click();

    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(
      page.getByRole('heading', { name: 'Profile' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Update personal details' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Avatar' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Reset Password' }),
    ).toBeVisible();

    await page.getByLabel('Display Name').fill(displayName);
    await page.getByLabel('Timezone').fill('Asia/Shanghai');
    await page.getByLabel('Bio').fill('Updated from the Playwright suite.');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect(page.getByText('Profile updated')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: displayName }),
    ).toBeVisible();
    await expect(page.getByText('Asia/Shanghai')).toBeVisible();
  });
});

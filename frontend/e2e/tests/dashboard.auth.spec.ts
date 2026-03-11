import { expect, test } from '@playwright/test';

test.describe('authenticated dashboard flow', () => {
  test('renders the real dashboard and updates the profile against the backend', async ({
    page,
  }) => {
    const displayName = `Profile ${Date.now().toString(36)}`;

    await page.goto('/app');

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByText('Visible tenants')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Security sessions' }),
    ).toBeVisible();

    await page.getByRole('link', { name: 'Manage profile' }).click();

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

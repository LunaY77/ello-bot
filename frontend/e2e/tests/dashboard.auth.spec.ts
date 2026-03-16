import { expect, test } from '@playwright/test';

test.describe('authenticated console flow', () => {
  test('renders the rewritten single-user navigation', async ({
    page,
  }) => {
    await page.goto('/app');

    await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sessions' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();

    await page.getByRole('link', { name: 'Sessions' }).click();

    await expect(page).toHaveURL(/\/app\/sessions$/);
    await expect(page.getByRole('heading', { name: 'Sessions' })).toBeVisible();
    await expect(
      page.getByText('Session directory'),
    ).toBeVisible();
    await expect(
      page.getByText('Sign out everywhere'),
    ).toBeVisible();
  });

  test('updates the profile against the backend from the settings surface', async ({
    page,
  }) => {
    const displayName = `Profile ${Date.now().toString(36)}`;

    await page.goto('/app');
    await page.getByRole('link', { name: 'Profile' }).click();

    await expect(page).toHaveURL(/\/app\/profile$/);
    await expect(
      page.getByRole('heading', { name: 'Profile' }),
    ).toBeVisible();
    await expect(
      page.getByText('Update personal details'),
    ).toBeVisible();

    await page.getByLabel('Display Name').fill(displayName);
    await page.getByLabel('Timezone').fill('Asia/Shanghai');
    await page.getByLabel('Bio').fill('Updated from the Playwright suite.');
    await page.getByRole('button', { name: 'Save profile' }).click();

    await expect(page.getByText('Profile updated')).toBeVisible();
    await expect(page.getByText('Asia/Shanghai')).toBeVisible();
  });
});

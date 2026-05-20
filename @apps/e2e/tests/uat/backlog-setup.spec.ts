import { test, expect } from '@playwright/test';
import { loginViaApi, createProjectViaApi, loginViaUI, setCurrentProject } from './helpers';

test.describe.serial('Backlog setup', () => {
  test.beforeAll(async ({ request }) => {
    const { accessToken, userId } = await loginViaApi(request);
    await createProjectViaApi(request, accessToken, userId, 'UAT Backlog Project');
  });

  test('create an epic via UI', async ({ page }) => {
    await loginViaUI(page);
    await setCurrentProject(page, 'UAT Backlog Project');
    await page.goto('/backlog');

    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.locator('[data-test-add-item-modal]')).toBeVisible();
    await page.locator('[data-test-add-item-type="epic"]').click();
    await expect(page.locator('[data-test-add-epic-modal]')).toBeVisible();

    await page.fill('#epic-title', 'UAT Epic Alpha');
    await page.getByRole('button', { name: 'Create Epic' }).click();
    await expect(page.locator('[data-test-add-epic-modal]')).not.toBeVisible({ timeout: 5000 });
  });

  test('create 3 user stories via UI', async ({ page }) => {
    await loginViaUI(page);
    await setCurrentProject(page, 'UAT Backlog Project');
    await page.goto('/backlog');

    for (const title of ['US - Authentication', 'US - Dashboard', 'US - Reporting']) {
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.locator('[data-test-add-item-modal]')).toBeVisible();
      await page.locator('[data-test-add-item-type="user-story"]').click();
      await expect(page.locator('[data-test-add-user-story-modal]')).toBeVisible();

      await page.fill('#us-title', title);
      await page.getByRole('button', { name: 'Create User Story' }).click();
      await expect(page.locator('[data-test-add-user-story-modal]')).not.toBeVisible({
        timeout: 5000,
      });
    }
  });
});

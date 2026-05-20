import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test.describe.serial('Project lifecycle', () => {
  test('login redirects to dashboard', async ({ page }) => {
    await loginViaUI(page);
    await expect(page).toHaveURL('/');
  });

  test('create a project via UI', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/projects');

    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.locator('[data-test-add-item-modal]')).toBeVisible();

    await page.locator('[data-test-add-item-type="project"]').click();
    await expect(page.locator('[data-test-add-project-modal]')).toBeVisible();

    await page.fill('#proj-name', 'UAT Lifecycle Project');
    await page.waitForSelector('#proj-responsible option[value="user-claire"]');
    await page.selectOption('#proj-responsible', 'user-claire');

    await page.getByRole('button', { name: 'Create project' }).click();
    await expect(page.locator('[data-test-add-project-modal]')).not.toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[data-test-project-card]').filter({ hasText: 'UAT Lifecycle Project' }),
    ).toBeVisible();
  });

  test('open project detail and navigate to kanban', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/projects');

    await page
      .locator('[data-test-project-card]')
      .filter({ hasText: 'UAT Lifecycle Project' })
      .click();
    await expect(page.locator('[data-test-project-detail-modal]')).toBeVisible();

    await page.getByRole('button', { name: 'View Kanban' }).click();
    await expect(page).toHaveURL('/kanban');
  });
});

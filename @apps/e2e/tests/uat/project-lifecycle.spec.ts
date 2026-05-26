import { test, expect } from '@playwright/test';
import { loginViaApi, createProjectViaApi, loginViaUI } from './helpers';

test.describe.serial('Project lifecycle', () => {
  let projectId: string;

  test('login redirects to dashboard', async ({ page }) => {
    await loginViaUI(page);
    await expect(page).toHaveURL('/');
  });

  test('create a project via UI', async ({ page }) => {
    await loginViaUI(page);
    await page.goto('/projects');

    await page.getByRole('button', { name: /^(Add|Ajouter)$/i }).click();
    await expect(page.locator('[data-test-add-item-modal]')).toBeVisible();

    await page.locator('[data-test-add-item-type="project"]').click();
    await expect(page.locator('[data-test-project-form-modal]')).toBeVisible();

    await page.fill('#proj-name', 'UAT Lifecycle Project');
    await page.waitForSelector('#proj-responsible option[value="user-claire"]', {
      state: 'attached',
    });
    await page.selectOption('#proj-responsible', 'user-claire');

    await page
      .getByRole('button', { name: /Create project|Créer le projet/i })
      .click();
    await expect(page.locator('[data-test-project-form-modal]')).not.toBeVisible({ timeout: 5000 });
    await expect(
      page.locator('[data-test-project-card]').filter({ hasText: 'UAT Lifecycle Project' }).first(),
    ).toBeVisible();
  });

  test('click project card navigates directly to kanban', async ({ request, page }) => {
    const { accessToken, userId } = await loginViaApi(request);
    projectId = await createProjectViaApi(
      request,
      accessToken,
      userId,
      'UAT Kanban Project',
    );

    await loginViaUI(page);
    await page.goto('/projects');

    // Click the card body (not a button) — should navigate directly to kanban
    await page
      .locator('[data-test-project-card]')
      .filter({ hasText: 'UAT Kanban Project' })
      .first()
      .click();

    await expect(page).toHaveURL('/kanban', { timeout: 10000 });
  });
});

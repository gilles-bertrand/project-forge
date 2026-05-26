import { test, expect } from '@playwright/test';
import { loginViaApi, createProjectViaApi, loginViaUI } from './helpers';

test.describe.serial('Project editing', () => {
  test('edit project name from card pencil icon', async ({ request, page }) => {
    const { accessToken, userId } = await loginViaApi(request);
    await createProjectViaApi(
      request,
      accessToken,
      userId,
      'Edit From Card Test',
    );

    await loginViaUI(page);
    await page.goto('/projects');

    const card = page
      .locator('[data-test-project-card]')
      .filter({ hasText: 'Edit From Card Test' })
      .first();

    // Hover to reveal the pencil icon, then click it
    await card.hover();
    await page.locator('[data-test-project-card-edit]').first().click();

    await expect(page.locator('[data-test-project-form-modal]')).toBeVisible();
    await expect(
      page.locator('[data-test-project-form-mode="edit"]'),
    ).toBeVisible();

    await page.fill('#proj-name', 'Edited From Card');
    await page.locator('[data-test-project-form-modal] button[type="submit"]').click();

    await expect(
      page.locator('[data-test-project-form-modal]'),
    ).not.toBeVisible({ timeout: 5000 });
    await expect(
      page
        .locator('[data-test-project-card]')
        .filter({ hasText: 'Edited From Card' })
        .first(),
    ).toBeVisible({ timeout: 5000 });
  });

  test('click card body navigates to kanban (no detail modal)', async ({
    request,
    page,
  }) => {
    const { accessToken, userId } = await loginViaApi(request);
    await createProjectViaApi(
      request,
      accessToken,
      userId,
      'Click To Kanban Test',
    );

    await loginViaUI(page);
    await page.goto('/projects');

    // Click the card body — should navigate directly to kanban, no detail modal
    await page
      .locator('[data-test-project-card]')
      .filter({ hasText: 'Click To Kanban Test' })
      .first()
      .click();

    await expect(page).toHaveURL('/kanban', { timeout: 10000 });
  });
});

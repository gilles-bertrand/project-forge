import { test, expect } from '@playwright/test';
import { loginViaUI } from './helpers';

test('after project creation, redirect to kanban and set current project', async ({
  page,
}) => {
  await loginViaUI(page);
  await page.goto('/projects');

  await page.locator('[data-test-new-project]').click();
  await expect(page.locator('[data-test-project-form-modal]')).toBeVisible();
  await expect(
    page.locator('[data-test-project-form-mode="create"]'),
  ).toBeVisible();

  await page.fill('#proj-name', 'UAT Kanban Redirect Project');

  await page.waitForSelector(
    '#proj-responsible option[value]:not([value=""])',
    { state: 'attached', timeout: 5000 },
  );
  const firstOption = await page
    .locator('#proj-responsible option[value]:not([value=""])')
    .first()
    .getAttribute('value');
  if (firstOption) {
    await page.selectOption('#proj-responsible', firstOption);
  }

  await page.locator('[data-test-project-form-modal] button[type="submit"]').click();

  await expect(page).toHaveURL('/kanban', { timeout: 10000 });

  const currentProjectId = await page.evaluate(() =>
    localStorage.getItem('sprintforge:current-project'),
  );
  expect(currentProjectId).toBeTruthy();
});

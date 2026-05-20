import { test, expect } from '@playwright/test';
import {
  loginViaApi,
  createProjectViaApi,
  createTaskViaApi,
  loginViaUI,
  setCurrentProject,
} from './helpers';

test.describe.serial('Time tracking', () => {
  let taskId: string;

  test.beforeAll(async ({ request }) => {
    const { accessToken, userId } = await loginViaApi(request);
    const projectId = await createProjectViaApi(
      request,
      accessToken,
      userId,
      'UAT Time Project',
    );
    taskId = await createTaskViaApi(request, accessToken, projectId, 'UAT Task for time entry');
  });

  test('log a time entry via UI', async ({ page }) => {
    await loginViaUI(page);
    await setCurrentProject(page, 'UAT Time Project');
    await page.goto('/time-tracking');

    await page.getByRole('button', { name: 'Log time' }).click();
    await expect(page.locator('[data-test-log-time-modal]')).toBeVisible();

    await page.fill('#log-time-task', taskId);
    await page.fill('#log-time-hours', '2');
    await page.fill('#log-time-date', new Date().toISOString().slice(0, 10));
    await page.getByRole('button', { name: 'Log Time' }).click();
    await expect(page.locator('[data-test-log-time-modal]')).not.toBeVisible({ timeout: 5000 });
  });
});

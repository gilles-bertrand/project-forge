import { test, expect } from '@playwright/test';
import {
  loginViaApi,
  createProjectViaApi,
  createEpicViaApi,
  createUserStoryViaApi,
  loginViaUI,
  setCurrentProject,
} from './helpers';

test.describe.serial('Task management', () => {
  test.beforeAll(async ({ request }) => {
    const { accessToken, userId } = await loginViaApi(request);
    const projectId = await createProjectViaApi(request, accessToken, userId, 'UAT Task Project');
    const epicId = await createEpicViaApi(request, accessToken, projectId);
    await Promise.all([
      createUserStoryViaApi(request, accessToken, projectId, epicId, 'US - Feature A'),
      createUserStoryViaApi(request, accessToken, projectId, epicId, 'US - Feature B'),
      createUserStoryViaApi(request, accessToken, projectId, epicId, 'US - Feature C'),
    ]);
  });

  test('create 3 tasks via UI', async ({ page }) => {
    await loginViaUI(page);
    await setCurrentProject(page, 'UAT Task Project');
    await page.goto('/backlog');

    for (const title of ['Task - API endpoint', 'Task - UI component', 'Task - Unit tests']) {
      await page.getByRole('button', { name: 'Add' }).click();
      await expect(page.locator('[data-test-add-item-modal]')).toBeVisible();
      await page.locator('[data-test-add-item-type="task"]').click();
      await expect(page.locator('[data-test-add-task-modal]')).toBeVisible();

      await page.fill('#task-title', title);
      await page.getByRole('button', { name: 'Create task' }).click();
      await expect(page.locator('[data-test-add-task-modal]')).not.toBeVisible({ timeout: 5000 });
    }
  });
});

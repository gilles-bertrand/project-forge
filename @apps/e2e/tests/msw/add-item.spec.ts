import { test, expect } from '@playwright/test';
import { loginMSW } from './helpers';

test('Add button opens AddItem modal', async ({ page }) => {
  await loginMSW(page);
  const initialUrl = page.url();

  const addButton = page.getByRole('button', { name: /^add$|^ajouter$/i }).first();
  await expect(addButton).toBeVisible({ timeout: 5000 });
  await addButton.click();

  await expect(page.locator('[data-test-add-item-modal]')).toBeVisible({ timeout: 3000 });
});

test('Selecting "Projet" opens ProjectFormModal without changing route', async ({ page }) => {
  await loginMSW(page);
  const initialUrl = page.url();

  const addButton = page.getByRole('button', { name: /^add$|^ajouter$/i }).first();
  await addButton.click();
  await expect(page.locator('[data-test-add-item-modal]')).toBeVisible({ timeout: 3000 });

  // Click "Projet" option in the choice modal
  await page.locator('[data-test-add-item-type="project"]').click();

  // The choice modal should close
  await expect(page.locator('[data-test-add-item-modal]')).not.toBeVisible({ timeout: 2000 });

  // The ProjectFormModal should be visible (not the choice modal)
  await expect(page.locator('[data-test-project-form-modal]')).toBeVisible({ timeout: 3000 });
  // Should open in create mode
  await expect(
    page.locator('[data-test-project-form-mode="create"]')
  ).toBeVisible({ timeout: 1000 });

  // URL must not have changed
  expect(page.url()).toBe(initialUrl);
});

test('Selecting "Tâche" opens AddTaskModal without changing route', async ({ page }) => {
  await loginMSW(page);
  const initialUrl = page.url();

  const addButton = page.getByRole('button', { name: /^add$|^ajouter$/i }).first();
  await addButton.click();
  await page.locator('[data-test-add-item-type="task"]').click();

  await expect(page.locator('[data-test-add-item-modal]')).not.toBeVisible({ timeout: 2000 });
  await expect(page.locator('[data-test-add-task-modal]')).toBeVisible({ timeout: 3000 });
  expect(page.url()).toBe(initialUrl);
});

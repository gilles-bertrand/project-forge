import { test, expect } from '@playwright/test';
import { loginMSW } from './helpers';

test('Add button opens AddItem modal', async ({ page }) => {
  await loginMSW(page);
  // Find and click the Add button
  const addButton = page.getByRole('button', { name: /^add$|^ajouter$/i }).first();
  await expect(addButton).toBeVisible({ timeout: 5000 });
  await addButton.click();
  // Verify AddItem modal opens
  await expect(page.locator('[data-test-add-item-modal]')).toBeVisible({ timeout: 3000 });
  // Click "Projet" option
  await page.getByRole('button', { name: /project|projet/i }).first().click();
  // Verify navigation to projects page
  await expect(page).toHaveURL(/\/projects/, { timeout: 5000 });
});

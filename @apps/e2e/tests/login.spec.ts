import { test, expect } from '@playwright/test';

test('can login', async ({ page }) => {
  await page.goto('/login');
  await page
    .locator('[data-test-tpk-prefab-email-container="email"] input')
    .fill('claire.dubois@sprintforge.com');
  await page
    .locator('[data-test-tpk-prefab-password-container="password"] input')
    .fill('123456789');
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL('/');
});

import { test, expect } from '@playwright/test';
import { loginMSW } from './helpers';

test('dashboard renders KPI cards and sprint tasks', async ({ page }) => {
  await loginMSW(page);
  // Check dashboard title
  await expect(page.locator('[data-test-title], h1').first()).toBeVisible();
  // Check KPI cards (3 visible stats)
  const kpiCards = page.locator('.card').filter({ hasText: /tasks|hours|points/i });
  await expect(kpiCards.first()).toBeVisible({ timeout: 5000 });
  // Navigate to Sprints via sidebar
  await page.getByRole('link', { name: /sprints/i }).click();
  await expect(page).toHaveURL(/\/sprints/);
  await expect(page.locator('h1, [data-test-title]').first()).toBeVisible();
});

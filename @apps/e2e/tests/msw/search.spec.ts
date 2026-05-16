import { test, expect } from '@playwright/test';
import { loginMSW } from './helpers';

test('search bar shows results when typing', async ({ page }) => {
  await loginMSW(page);
  // Find search input in the header
  const searchInput = page.locator('input[type="search"], input[placeholder*="Search" i], input[placeholder*="Recherch" i]').first();
  await expect(searchInput).toBeVisible({ timeout: 5000 });
  // Type a search query
  await searchInput.fill('login');
  // Wait for dropdown to appear
  await expect(page.locator('[data-test-search-dropdown]')).toBeVisible({ timeout: 5000 });
  // Verify at least one result is visible
  const resultButtons = page.locator('[data-test-search-dropdown] button');
  await expect(resultButtons.first()).toBeVisible({ timeout: 5000 });
});

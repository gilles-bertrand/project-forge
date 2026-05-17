import type { Page } from '@playwright/test';

export async function loginMSW(page: Page) {
  await page.goto('/login');
  // Wait for the login form to be ready
  await page.waitForSelector('input[type="email"], input[name="email"], [placeholder*="email" i], [placeholder*="Email"]', { timeout: 5000 }).catch(() => {});
  // Try to fill - the MSW mock accepts any valid credentials
  const emailInput = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  await emailInput.fill('alice.martin@sprintforge.com');
  await passwordInput.fill('Password123!');
  await page.getByRole('button', { name: /sign in|login|connexion/i }).click();
  // Wait for redirect to dashboard
  await page.waitForURL('/', { timeout: 10_000 });
}

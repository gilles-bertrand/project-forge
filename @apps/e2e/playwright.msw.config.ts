import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/msw",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }], ["list"]],

  use: {
    baseURL: "http://localhost:4200",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm --filter @apps/front start",
    url: "http://localhost:4200",
    timeout: 120_000,
    reuseExistingServer: true,
    cwd: "../..",
  },
});

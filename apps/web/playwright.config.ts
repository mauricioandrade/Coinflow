import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for Coinflow Web E2E tests.
 *
 * Tests run against the local dev server (or a production build in CI).
 * All external API calls are intercepted via page.route() — no real
 * backend is required to run the suite.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  // Fail the build on CI if test.only is accidentally left in source.
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],

  webServer: {
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

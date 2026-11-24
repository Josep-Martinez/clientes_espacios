import { defineConfig, devices } from "@playwright/test";

const webPort = process.env.BOOKFIT_E2E_WEB_PORT ?? "5173";
const apiPort = process.env.BOOKFIT_E2E_API_PORT ?? "3001";
const baseURL =
  process.env.BOOKFIT_E2E_BASE_URL ?? `http://127.0.0.1:${webPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: process.env.CI ? "line" : "list",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "node --disable-warning=ExperimentalWarning --experimental-strip-types scripts/e2e-webserver.mjs",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...(process.env.BOOKFIT_TEST_DATABASE_URL
        ? { DATABASE_URL: process.env.BOOKFIT_TEST_DATABASE_URL }
        : {}),
      ...(process.env.BOOKFIT_E2E_API_PORT ? { API_PORT: apiPort } : {}),
      ...(process.env.BOOKFIT_E2E_WEB_PORT ? { VITE_PORT: webPort } : {}),
    },
    stdout: "pipe",
    stderr: "pipe",
  },
});

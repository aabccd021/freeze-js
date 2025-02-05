import { defineConfig, devices } from "@playwright/test";

// const timeout = 1_000_000;
const timeout = 5_000;

export default defineConfig({
  fullyParallel: true,
  // workers: 2,
  maxFailures: 1,
  repeatEach: 3,
  use: {
    baseURL: "http://127.0.0.1:8000",
  },
  webServer: {
    command: "serve",
    url: "http://127.0.0.1:8000",
    reuseExistingServer: true,
    timeout: 5_000,
    stderr: "ignore",
  },
  timeout,
  expect: { timeout: timeout / 2 },
  projects: [
    {
      name: "chromium-no-bfcache",
      testMatch: ["freeze-page.test.ts", "nobfcache.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: {
          ignoreDefaultArgs: ["--headless=old"],
          args: ["--headless"],
        },
      },
    },
    {
      name: "chromium-bfcache",
      testMatch: ["freeze-page.test.ts", "bfcache.test.ts"],
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium",
        launchOptions: {
          ignoreDefaultArgs: ["--disable-back-forward-cache", "--headless=old"],
          args: ["--headless"],
        },
      },
    },
  ],
});

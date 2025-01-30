import { defineConfig, devices } from "@playwright/test";

// const timeout = 1_000_000;
const timeout = 5_000;

export default defineConfig({
  fullyParallel: true,
  maxFailures: 1,
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
      testMatch: ["freeze-page.test.ts"],
      use: { ...devices["Desktop Chrome"] },
    },
    ...(process.env["IS_NIX_BUILD"] === "1"
      ? []
      : [
          {
            name: "chromium-bfcache",
            testMatch: ["freeze-page.test.ts"],
            use: {
              ...devices["Desktop Chrome"],
              channel: "chromium",
              headless: false,
              launchOptions: {
                ignoreDefaultArgs: ["--disable-back-forward-cache"],
              },
            },
          },
          {
            name: "firefox-no-bfcache",
            testMatch: ["freeze-page.test.ts"],
            use: { ...devices["Desktop Firefox"] },
          },
        ]),
  ],
});

import { defineConfig, devices } from "@playwright/test";

// const timeout = 1_000_000;
const timeout = 5_000;

const disableTestChromiumBfCache = process.env["DISABLE_TEST_CHROMIUM_BFCACHE"] === "1";
const disableTestFirefoxNoBfCache = process.env["DISABLE_TEST_FIREFOX_NOBFCACHE"] === "1";

const __dirname = new URL(".", import.meta.url).pathname;

export default defineConfig({
  fullyParallel: true,
  maxFailures: 1,
  // workers: 1,
  use: {
    baseURL: "http://127.0.0.1:8000",
  },
  webServer: {
    command: `httplz ${__dirname}/fixtures`,
    url: "http://127.0.0.1:8000",
    timeout: 5_000,
  },
  timeout,
  expect: { timeout: timeout / 2 },
  projects: [
    {
      name: "chromium-no-bfcache",
      use: { ...devices["Desktop Chrome"] },
    },
    disableTestChromiumBfCache
      ? {}
      : {
          name: "chromium-bfcache",
          use: {
            ...devices["Desktop Chrome"],
            channel: "chromium",
            headless: false,
            launchOptions: {
              ignoreDefaultArgs: ["--disable-back-forward-cache"],
            },
          },
        },
    disableTestFirefoxNoBfCache
      ? {}
      : {
          name: "firefox-no-bfcache",
          use: { ...devices["Desktop Firefox"] },
        },
  ],
});

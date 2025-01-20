import { execSync } from "node:child_process";
import { type Page, expect, test } from "@playwright/test";

async function expectClicked(page: Page, consoleMessages: string[], message: string): Promise<void> {
  consoleMessages.length = 0;
  await page.getByTestId("main").click();
  expect(consoleMessages).toEqual([message]);
}

async function expectStaticPage(page: Page, consoleMessages: string[]): Promise<void> {
  await expect(page.getByTestId("main")).toHaveText("Static");
  await expectClicked(page, consoleMessages, "click static");
  await expect(page).toHaveTitle("Static");
}

async function expectDynamicPage(page: Page, consoleMessages: string[]): Promise<void> {
  await expect(page.getByTestId("main")).toHaveText("Dynamic");
  await expectClicked(page, consoleMessages, "click dynamic");
  await expect(page).toHaveTitle("Dynamic");
}

async function expectIncrementPage(page: Page, consoleMessages: string[], step: string): Promise<void> {
  await expect(page.getByTestId("main")).toHaveText(step.slice(3));
  await expectClicked(page, consoleMessages, "click increment");
  await expect(page).toHaveTitle("Increment");
}

async function handleStep(page: Page, step: string, consoleMessages: string[]): Promise<void> {
  if (step.at(0) === "g") {
    if (step.at(1) === "s") {
      await page.goto("static.module.html");
      await expectStaticPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "d") {
      await page.goto("dynamic.module.html");
      await expectDynamicPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "i") {
      await page.goto("increment.module.html");
      await expectIncrementPage(page, consoleMessages, "gi_1");
      return;
    }
  }
  if (step.at(0) === "c") {
    if (step.at(1) === "s") {
      await page.getByText("Static").click();
      await expectStaticPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "d") {
      await page.getByText("Dynamic").click();
      await expectDynamicPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "i") {
      await page.getByText("Increment").click();
      await expectIncrementPage(page, consoleMessages, step);
      return;
    }
  }
  if (step.at(0) === "b") {
    await page.goBack({ waitUntil: "commit" });
    if (step.at(1) === "s") {
      await expectStaticPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "d") {
      await expectDynamicPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "i") {
      await expectIncrementPage(page, consoleMessages, step);
      return;
    }
  }
  if (step.at(0) === "r") {
    await page.reload();
    if (step.at(1) === "s") {
      await expectStaticPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "d") {
      await expectDynamicPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "i") {
      await expectIncrementPage(page, consoleMessages, "ri_1");
      return;
    }
  }

  throw new Error(`Unknown step: ${step}`);
}

type Test = [title: string, body: (args: { page: Page }) => Promise<void>];

const validTests: string[] = [];

export function fromSteps(steps: string[]): Test {
  const testName = steps.join(" ");
  for (const validTest of validTests) {
    const shorter = testName.length < validTest.length ? testName : validTest;
    const longer = testName.length < validTest.length ? validTest : testName;
    if (longer.startsWith(shorter)) {
      throw new Error(`redundant: "${shorter}" in "${longer}"`);
    }
  }
  validTests.push(testName);
  return [
    testName,
    async ({ page }) => {
      const errors: Error[] = [];
      page.on("pageerror", (error) => errors.push(error));

      let consoleMessages: string[] = [];
      page.on("console", (msg) => consoleMessages.push(msg.text()));

      // page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));

      for (const step of steps) {
        await handleStep(page, step, consoleMessages);
        consoleMessages = [];
        const cacheStr = await page.evaluate(() => sessionStorage.getItem("freeze-cache"));
        if (cacheStr !== null) {
          const cache = JSON.parse(cacheStr) as { cacheKey: string }[];
          const unwantedCache = cache.filter(
            (c) => c.cacheKey !== "/increment.module.html" && c.cacheKey !== "/dynamic.module.html",
          );
          expect(unwantedCache).toHaveLength(0);
        }
      }
      expect(errors).toHaveLength(0);
      expect(consoleMessages).toHaveLength(0);
      await page.close();
    },
  ];
}

test.beforeAll(() => {
  const __dirname = new URL(".", import.meta.url).pathname;
  execSync(
    `esbuild ${__dirname}/freeze.ts --target=es6 --format=esm --bundle --minify --outfile=${__dirname}/fixtures/freeze.mjs`,
    {
      stdio: "ignore",
    },
  );
});

test(...fromSteps(["gd", "ci_1", "cd", "ci_2"]));
test(...fromSteps(["gd", "ci_1", "cs", "ci_2"]));
test(...fromSteps(["gd", "ci_1", "gd", "ci_2"]));
test(...fromSteps(["gd", "ci_1", "gs", "ci_2"]));
test(...fromSteps(["gd", "ci_1", "ri"]));
test(...fromSteps(["gd", "cs", "cd"]));
test(...fromSteps(["gd", "cs", "cs"]));
test(...fromSteps(["gd", "cs", "gd"]));
test(...fromSteps(["gd", "cs", "gs"]));
test(...fromSteps(["gd", "gi", "cd"]));
test(...fromSteps(["gd", "gi", "cs"]));
test(...fromSteps(["gd", "gi", "gd"]));
test(...fromSteps(["gd", "gi", "gs"]));
test(...fromSteps(["gd", "gi", "ri"]));
test(...fromSteps(["gd", "gs", "cd"]));
test(...fromSteps(["gd", "gs", "cs"]));
test(...fromSteps(["gd", "gs", "gd"]));
test(...fromSteps(["gd", "gs", "gs"]));
test(...fromSteps(["gd", "rd", "cd"]));
test(...fromSteps(["gd", "rd", "cs"]));
test(...fromSteps(["gd", "rd", "gd"]));
test(...fromSteps(["gd", "rd", "gs"]));
test(...fromSteps(["gi", "cd", "cd"]));
test(...fromSteps(["gi", "cd", "ci_2"]));
test(...fromSteps(["gi", "cd", "cs"]));
test(...fromSteps(["gi", "cd", "gd"]));
test(...fromSteps(["gi", "cd", "gs"]));
test(...fromSteps(["gi", "cs", "bi_2"]));
test(...fromSteps(["gi", "cs", "cd"]));
test(...fromSteps(["gi", "cs", "ci_2", "bs", "bi_3"]));
test(...fromSteps(["gi", "cs", "ci_2", "bs", "ci_3", "bs", "bi_4"]));
test(...fromSteps(["gi", "cs", "ci_2", "cs", "bi_3"]));
test(...fromSteps(["gi", "cs", "ci_2", "cs", "ci_3", "cs", "bi_4"]));
test(...fromSteps(["gi", "cs", "cs"]));
test(...fromSteps(["gi", "cs", "gd"]));
test(...fromSteps(["gi", "cs", "gs"]));
test(...fromSteps(["gi", "gd", "cd"]));
test(...fromSteps(["gi", "gd", "ci_2"]));
test(...fromSteps(["gi", "gd", "cs"]));
test(...fromSteps(["gi", "gd", "gd"]));
test(...fromSteps(["gi", "gd", "gs"]));
test(...fromSteps(["gi", "gi"]));
test(...fromSteps(["gi", "gs", "cd"]));
test(...fromSteps(["gi", "gs", "ci_2"]));
test(...fromSteps(["gi", "gs", "cs"]));
test(...fromSteps(["gi", "gs", "gd"]));
test(...fromSteps(["gi", "gs", "gs"]));
test(...fromSteps(["gi", "ri", "cd"]));
test(...fromSteps(["gi", "ri", "cs"]));
test(...fromSteps(["gi", "ri", "gd"]));
test(...fromSteps(["gi", "ri", "gs"]));
test(...fromSteps(["gi", "ri", "ri"]));
test(...fromSteps(["gs", "cd", "cd"]));
test(...fromSteps(["gs", "cd", "ci_1", "cd", "ci_2", "cd", "ci_3", "cd", "ci_4", "bd", "bd", "bd"]));
test(...fromSteps(["gs", "cd", "cs", "cd", "cs", "cd", "cs", "cd", "bs", "bd", "bd", "bd", "bd", "bd", "bd"]));
test(...fromSteps(["gs", "cd", "gd"]));
test(...fromSteps(["gs", "cd", "gs"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "bs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "cd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "cs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "gd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "gs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "bd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "cd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "cs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "gd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "gs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "bs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "cd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "cs", "ci_3", "cs", "ci_4", "bs", "bi_5", "bi_6", "bi_7", "bi_8"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "cs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "gd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "gs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "bd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "cd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "cs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "gd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "gs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gi"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "bs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "cd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "cs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "gd", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "gs", "ci_3", "gi"]));
test(...fromSteps(["gs", "ci_1", "ri"]));
test(...fromSteps(["gs", "gd", "cd"]));
test(...fromSteps(["gs", "gd", "cs"]));
test(...fromSteps(["gs", "gd", "gd"]));
test(...fromSteps(["gs", "gd", "gs"]));
test(...fromSteps(["gs", "gi", "cd"]));
test(...fromSteps(["gs", "gi", "cs"]));
test(...fromSteps(["gs", "gi", "gd"]));
test(...fromSteps(["gs", "gi", "gs"]));
test(...fromSteps(["gs", "gi", "ri"]));
test(...fromSteps(["gs", "rs", "cd"]));
test(...fromSteps(["gs", "rs", "cs"]));
test(...fromSteps(["gs", "rs", "gd"]));
test(...fromSteps(["gs", "rs", "gs"]));

import { execSync } from "node:child_process";
import { test } from "@playwright/test";
import { type Page, expect } from "@playwright/test";

async function expectClicked(page: Page, consoleMessages: string[], message: string): Promise<void> {
  consoleMessages.length = 0;
  await page.getByTestId("main").click();
  expect(consoleMessages).toEqual([message]);
}

async function expectStaticPage(page: Page, consoleMessages: string[]): Promise<void> {
  await expect(page.getByTestId("main")).toHaveText("Static");
  await expectClicked(page, consoleMessages, "click static");
}

async function expectDynamicPage(page: Page, consoleMessages: string[]): Promise<void> {
  await expect(page.getByTestId("main")).toHaveText("Dynamic");
  await expectClicked(page, consoleMessages, "click dynamic");
}

async function expectIncrementPage(page: Page, consoleMessages: string[], step: string): Promise<void> {
  await expect(page.getByTestId("main")).toHaveText(step.slice(3));
  await expectClicked(page, consoleMessages, "click increment");
}

async function handleStep(page: Page, step: string, consoleMessages: string[]): Promise<void> {
  if (step.at(0) === "g") {
    if (step.at(1) === "s") {
      await page.goto("static.html");
      await expectStaticPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "d") {
      await page.goto("dynamic.html");
      await expectDynamicPage(page, consoleMessages);
      return;
    }
    if (step.at(1) === "i") {
      await page.goto("increment.html");
      await expectIncrementPage(page, consoleMessages, step);
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
        // console.log(step);
        await handleStep(page, step, consoleMessages);
        consoleMessages = [];
        const cacheStr = await page.evaluate(() => sessionStorage.getItem("freeze-cache"));
        if (cacheStr !== null) {
          const cache = JSON.parse(cacheStr) as { cacheKey: string }[];
          const unwantedCache = cache.filter((c) => c.cacheKey !== "/increment.html" && c.cacheKey !== "/dynamic.html");
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
    `esbuild ${__dirname}/freeze.ts --target=es6 --format=esm --bundle --outfile=${__dirname}/fixtures/freeze.js`,
    { stdio: "ignore" },
  );
});

test(...fromSteps(["gd", "ci_1", "cd", "ci_2"]));
test(...fromSteps(["gd", "ci_1", "cs", "ci_2"]));
test(...fromSteps(["gd", "ci_1", "gd", "ci_2"]));
test(...fromSteps(["gd", "ci_1", "gs", "ci_2"]));
test(...fromSteps(["gi_1", "cd", "ci_2"]));
test(...fromSteps(["gi_1", "cs", "bi_2"]));
test(...fromSteps(["gi_1", "cs", "ci_2", "bs", "bi_3"]));
test(...fromSteps(["gi_1", "cs", "ci_2", "bs", "ci_3", "bs", "bi_4"]));
test(...fromSteps(["gi_1", "cs", "ci_2", "cs", "bi_3"]));
test(...fromSteps(["gi_1", "cs", "ci_2", "cs", "ci_3", "cs", "bi_4"]));
test(...fromSteps(["gi_1", "gd", "ci_2"]));
test(...fromSteps(["gi_1", "gi_1"]));
test(...fromSteps(["gi_1", "gs", "ci_2"]));
test(...fromSteps(["gs", "cd", "ci_1", "cd", "ci_2", "cd", "ci_3", "cd", "ci_4", "bd", "bd", "bd"]));
test(...fromSteps(["gs", "cd", "cs", "cd", "cs", "cd", "cs", "cd", "bs", "bd", "bd", "bd", "bd", "bd", "bd"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "bs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "cd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "cs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "gd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "bs", "ci_2", "gs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "bd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "cd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "cs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "gd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cd", "ci_2", "gs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "bs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "cd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "cs", "ci_3", "cs", "ci_4", "bs", "bi_5", "bi_5", "bi_6", "bi_6"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "cs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "gd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "cs", "ci_2", "gs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "bd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "cd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "cs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "gd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gd", "ci_2", "gs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "bs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "cd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "cs", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "gd", "ci_3", "gi_1"]));
test(...fromSteps(["gs", "ci_1", "gs", "ci_2", "gs", "ci_3", "gi_1"]));

import { type Page, expect } from "@playwright/test";

async function expectClicked(
  page: Page,
  consoleMessages: string[],
  message: string,
): Promise<void> {
  consoleMessages.length = 0;
  await page.getByTestId("main").click();
  expect(consoleMessages).toEqual([message]);
}

async function handleStep(
  page: Page,
  step: string,
  consoleMessages: string[],
): Promise<void> {
  if (step.at(0) === "g") {
    if (step.at(1) === "s") {
      await page.goto("static.html");
      await expect(page.getByTestId("main")).toHaveText("Static");
      await expectClicked(page, consoleMessages, "click static");
      return;
    }
    if (step.at(1) === "d") {
      await page.goto("dynamic.html");
      await expect(page.getByTestId("main")).toHaveText("Dynamic");
      await expectClicked(page, consoleMessages, "click dynamic");
      return;
    }
    if (step.at(1) === "i") {
      await page.goto("increment.html");
      await expect(page.getByTestId("main")).toHaveText(step.slice(3));
      await expectClicked(page, consoleMessages, "click increment");
      return;
    }
  }
  if (step.at(0) === "c") {
    if (step.at(1) === "s") {
      await page.getByText("Static").click();
      await expect(page.getByTestId("main")).toHaveText("Static");
      await expectClicked(page, consoleMessages, "click static");
      return;
    }
    if (step.at(1) === "d") {
      await page.getByText("Dynamic").click();
      await expect(page.getByTestId("main")).toHaveText("Dynamic");
      await expectClicked(page, consoleMessages, "click dynamic");
      return;
    }
    if (step.at(1) === "i") {
      await page.getByText("Increment").click();
      await expect(page.getByTestId("main")).toHaveText(step.slice(3));
      await expectClicked(page, consoleMessages, "click increment");
      return;
    }
  }
  if (step.at(0) === "b") {
    // await page.goBack();
    await page.goBack({ waitUntil: "commit" });

    if (step.at(1) === "s") {
      await expect(page.getByTestId("main")).toHaveText("Static");
      await expectClicked(page, consoleMessages, "click static");
      return;
    }
    if (step.at(1) === "d") {
      await expect(page.getByTestId("main")).toHaveText("Dynamic");
      await expectClicked(page, consoleMessages, "click dynamic");
      return;
    }
    if (step.at(1) === "i") {
      await expect(page.getByTestId("main")).toHaveText(step.slice(3));
      await expectClicked(page, consoleMessages, "click increment");
      return;
    }
  }

  throw new Error(`Unknown step: ${step}`);
}

type Test = [title: string, body: (args: { page: Page }) => Promise<void>];

export function fromSteps(steps: string[]): Test {
  return [
    steps.join(" "),
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
        // const value = await page.evaluate(() =>
        //   sessionStorage.getItem("freeze-cache"),
        // );
        // console.log(JSON.parse(value));
      }
      expect(errors).toHaveLength(0);
      expect(consoleMessages).toHaveLength(0);
      await page.close();
    },
  ];
}

// function checkRedundantSteps(arr1: string[], arr2: string[]): void {
//   const smaller = arr1.length < arr2.length ? arr1 : arr2;
//   for (let i = 0; i < smaller.length; i++) {
//     if (arr1[i] === arr2[i]) {
//       continue;
//     }
//     return;
//   }
//   if (arr1.length === arr2.length) {
//     return;
//   }
//   const arr1Str = arr1.map((s) => `"${s}"`).join(", ");
//   const arr2Str = arr2.map((s) => `"${s}"`).join(", ");
//   const smallerStr = arr1.length < arr2.length ? arr1Str : arr2Str;
//   const largerStr = arr1.length < arr2.length ? arr2Str : arr1Str;
//   throw new Error(`redundant: [${smallerStr}] in [${largerStr}]`);
// }

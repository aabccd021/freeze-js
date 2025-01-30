import { type Page, expect } from "@playwright/test";

export async function bfCacheTest({ page }: { page: Page }): Promise<void> {
  const consoleMessages: string[] = [];
  page.on("console", (msg) => consoleMessages.push(msg.text()));
  await page.goto("page1.html");
  await page.goto("page2.html");
  await page.goBack({ waitUntil: "commit" });
  expect(consoleMessages).toEqual(["hello", "hello", "pagehide"]);
}

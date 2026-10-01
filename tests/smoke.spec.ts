import { test, expect } from "@playwright/test";
import { loadAppConfig } from "../src/config/loader.js";
import { locate, runInputFocusProbe } from "../src/exploration/actions.js";
import { attachRuntimeOracles, assertNoRuntimeErrors } from "../src/exploration/oracles.js";

test("smoke: app loads and exposes the primary interaction surface", async ({ page }) => {
  const app = await loadAppConfig();
  const runtime = attachRuntimeOracles(page, app.ignoredConsoleErrorPatterns);
  await page.goto(app.baseUrl, { waitUntil: "domcontentloaded" });
  await expect(locate(page, app.locators.primaryInput)).toBeVisible({ timeout: 15000 });
  if (process.env.DEMO_PAUSE === "true") await page.pause();
  runtime.detach();
  assertNoRuntimeErrors(runtime.errors);
});

test("smoke: primary input survives focus changes", async ({ page }) => {
  const app = await loadAppConfig();
  await page.goto(app.baseUrl, { waitUntil: "domcontentloaded" });
  await runInputFocusProbe(page, app);
});

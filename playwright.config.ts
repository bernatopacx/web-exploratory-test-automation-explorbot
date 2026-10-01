import fs from "node:fs";
import { defineConfig } from "@playwright/test";
import { loadAppConfig, resolveFromRoot } from "./src/config/loader.js";

const app = JSON.parse(fs.readFileSync(resolveFromRoot(`apps/${process.env.APP_ID ?? "chatbotapp"}.json`), "utf8")) as { baseUrl: string; auth?: { storageState?: string } };
const storageState = process.env.AUTH_STORAGE_STATE ?? app.auth?.storageState;

export default defineConfig({
  testDir: "./tests",
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }], ["json", { outputFile: "artifacts/playwright-report.json" }]],
  use: {
    baseURL: process.env.APP_BASE_URL ?? app.baseUrl,
    storageState: storageState && fs.existsSync(resolveFromRoot(storageState)) ? resolveFromRoot(storageState) : undefined,
    headless: process.env.HEADED !== "true",
    trace: "on",
    screenshot: "on",
    video: "on"
  }
});

import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { loadAppConfig, resolveFromRoot } from "../src/config/loader.js";
import type { CaseDocument, GeneratedCase } from "../src/cases/types.js";
import { runSafeMonkey } from "../src/exploration/monkey.js";
import { locate, runInputFocusProbe, openSidebar } from "../src/exploration/actions.js";
import { attachRuntimeOracles, assertNoRuntimeErrors } from "../src/exploration/oracles.js";

function loadCases(): CaseDocument {
  const issueKey = process.env.JIRA_ISSUE_KEY?.trim().toLowerCase();
  const fileName = issueKey ? `artifacts/task-${issueKey}.json` : "artifacts/generated-cases.json";
  if (!fs.existsSync(resolveFromRoot(fileName))) {
    return { generatedFor: { projectKey: "unknown", sprintName: "unknown", sprintId: 0 }, sourceIssueCount: 0, codeIntelligence: { status: "unavailable", repository: "unknown", baseRef: "unknown", headRef: "unknown", changedFiles: [], signals: [] }, cases: [] };
  }
  return JSON.parse(fs.readFileSync(resolveFromRoot(fileName), "utf8")) as CaseDocument;
}

const cases = loadCases().cases;

for (const generatedCase of cases) {
  test(`${generatedCase.category}: ${generatedCase.title}`, async ({ page }) => {
    const app = await loadAppConfig();
    const runtime = attachRuntimeOracles(page, app.ignoredConsoleErrorPatterns);
    await page.goto(app.baseUrl, { waitUntil: "domcontentloaded" });
    await expect(locate(page, app.locators.primaryInput)).toBeVisible({ timeout: 15000 });
    if (generatedCase.category === "monkey") await runSafeMonkey(page, app);
    if (generatedCase.tags.includes("input")) await runInputFocusProbe(page, app);
    if (generatedCase.tags.includes("navigation")) await openSidebar(page, app);
    await expect(page.locator("body")).not.toHaveText("Application error", { timeout: 3000 });
    runtime.detach();
    assertNoRuntimeErrors(runtime.errors);
  });
}

test.describe("generated case inventory", () => {
  test("has a generated document when discovery has run", async () => {
    expect(loadCases().generatedFor.projectKey).not.toBe("unknown");
  });
});

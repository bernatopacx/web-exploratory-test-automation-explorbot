import type { Locator, Page } from "@playwright/test";
import type { AppConfig, LocatorConfig } from "../config/types.js";

export function locate(page: Page, config: LocatorConfig): Locator {
  if (config.kind === "placeholder") return page.getByPlaceholder(config.value ?? "");
  if (config.kind === "role") return page.getByRole(config.role as "button" | "textbox", { name: config.name });
  if (config.kind === "text") return page.getByText(config.value ?? "", { exact: false });
  return page.locator(config.value ?? "");
}

export async function openSidebar(page: Page, app: AppConfig): Promise<void> {
  if (app.locators.sidebarButton) await locate(page, app.locators.sidebarButton).click({ timeout: 3000 }).catch(() => undefined);
}

export async function runInputFocusProbe(page: Page, app: AppConfig): Promise<void> {
  const input = locate(page, app.locators.primaryInput);
  await input.waitFor({ state: "visible", timeout: 10000 });
  await input.focus();
  await page.mouse.click(20, 20);
  await input.focus();
  await input.fill("EXPLORATORY_FOCUS_MARKER");
  if ((await input.inputValue()) !== "EXPLORATORY_FOCUS_MARKER") throw new Error("Primary input lost its value after focus changes.");
  await input.fill("");
}

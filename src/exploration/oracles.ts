import type { Page } from "@playwright/test";

export function attachRuntimeOracles(page: Page, ignoredConsoleErrorPatterns: string[] = []): { errors: string[]; detach: () => void } {
  const errors: string[] = [];
  const onPageError = (error: Error) => errors.push(`pageerror: ${error.message}`);
  const onConsole = (message: { type(): string; text(): string }) => {
    const text = message.text();
    const ignored = ignoredConsoleErrorPatterns.some(pattern => text.includes(pattern));
    if (message.type() === "error" && !ignored) errors.push(`console: ${text}`);
  };
  page.on("pageerror", onPageError);
  page.on("console", onConsole);
  return { errors, detach: () => { page.off("pageerror", onPageError); page.off("console", onConsole); } };
}

export function assertNoRuntimeErrors(errors: string[]): void {
  if (errors.length) throw new Error(errors.join("\n"));
}

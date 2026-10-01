import type { Page } from "@playwright/test";
import type { AppConfig } from "../config/types.js";

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 0x100000000;
  };
}

export async function runSafeMonkey(page: Page, config: AppConfig): Promise<void> {
  const random = seededRandom(Number(process.env.MONKEY_SEED ?? 20260916));
  const endAt = Date.now() + config.exploration.maxDurationMs;
  for (let action = 0; action < config.exploration.maxActions && Date.now() < endAt; action += 1) {
    const controls = page.locator("button:visible, a:visible, input:visible, textarea:visible");
    const count = await controls.count();
    if (!count) break;
    const index = Math.floor(random() * count);
    const control = controls.nth(index);
    const tag = await control.evaluate(element => element.tagName.toLowerCase()).catch(() => "");
    if (tag === "input" || tag === "textarea") {
      await control.focus().catch(() => undefined);
      await page.keyboard.press(random() > 0.5 ? "Tab" : "Escape").catch(() => undefined);
    } else {
      await control.click({ timeout: 500, noWaitAfter: true }).catch(() => undefined);
    }
    await page.waitForTimeout(50);
    const pathname = new URL(page.url()).pathname;
    if (!config.exploration.safePathPrefixes.some(prefix => pathname.startsWith(prefix))) {
      await page.goBack({ waitUntil: "domcontentloaded", timeout: 2000 }).catch(() => undefined);
    }
  }
}

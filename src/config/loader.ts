import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "./types.js";

const root = process.cwd();

export async function loadAppConfig(appId = process.env.APP_ID ?? "chatbotapp"): Promise<AppConfig> {
  const file = path.join(root, "apps", `${appId}.json`);
  const config = JSON.parse(await fs.readFile(file, "utf8")) as AppConfig;
  if (process.env.APP_BASE_URL) config.baseUrl = process.env.APP_BASE_URL;
  if (process.env.ALLOW_GENERATION_TESTS === "true") config.exploration.allowGeneration = true;
  if (process.env.MONKEY_MAX_ACTIONS) config.exploration.maxActions = Number(process.env.MONKEY_MAX_ACTIONS);
  return config;
}

export function resolveFromRoot(relativePath: string): string {
  return path.join(root, relativePath);
}

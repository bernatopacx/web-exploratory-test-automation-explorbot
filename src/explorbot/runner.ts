import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { resolveFromRoot } from "../config/loader.js";
import type { ExplorbotMission, ExplorbotRunSummary } from "./types.js";

function hasProviderKey(): boolean {
  return ["EXPLORBOT_AI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"].some((name) => Boolean(process.env[name]));
}

async function writeSummary(summary: ExplorbotRunSummary): Promise<void> {
  await fs.mkdir(resolveFromRoot("artifacts/explorbot"), { recursive: true });
  await fs.writeFile(resolveFromRoot("artifacts/explorbot/run-summary.json"), JSON.stringify(summary, null, 2));
}

export async function runExplorbot(mission: ExplorbotMission): Promise<ExplorbotRunSummary> {
  const startedAt = new Date().toISOString();
  const outputDirectory = resolveFromRoot("artifacts/explorbot/output");
  await fs.mkdir(outputDirectory, { recursive: true });

  if (process.env.EXPLORBOT_ENABLED !== "true") {
    const summary: ExplorbotRunSummary = { status: "skipped", reason: "EXPLORBOT_ENABLED is not true", targetPath: mission.target.path, startedAt, finishedAt: new Date().toISOString() };
    await writeSummary(summary);
    return summary;
  }
  if (!mission.target.path) {
    const summary: ExplorbotRunSummary = { status: "skipped", reason: "Target path is unresolved. Set EXPLORBOT_TARGET_PATH before running.", targetPath: mission.target.path, startedAt, finishedAt: new Date().toISOString() };
    await writeSummary(summary);
    return summary;
  }
  if (!process.env.EXPLORBOT_AI_PROVIDER) {
    const summary: ExplorbotRunSummary = { status: "skipped", reason: "EXPLORBOT_AI_PROVIDER is missing", targetPath: mission.target.path, startedAt, finishedAt: new Date().toISOString() };
    await writeSummary(summary);
    return summary;
  }
  if (!hasProviderKey()) {
    const summary: ExplorbotRunSummary = { status: "skipped", reason: "No supported Explorbot provider key is present in the environment", targetPath: mission.target.path, startedAt, finishedAt: new Date().toISOString() };
    await writeSummary(summary);
    return summary;
  }

  const stdoutFile = path.join(outputDirectory, "stdout.log");
  const stderrFile = path.join(outputDirectory, "stderr.log");
  const command = `npx --no-install explorbot explore ${mission.target.path} --max-tests ${mission.budget.maxTests}`;
  const child = spawn("npx", ["--no-install", "explorbot", "explore", mission.target.path, "--max-tests", String(mission.budget.maxTests)], {
    cwd: process.cwd(),
    env: { ...process.env, EXPLORBOT_URL: mission.app.baseUrl, EXPLORBOT_KNOWLEDGE: resolveFromRoot(mission.knowledgeFile) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout: Buffer[] = [];
  const stderr: Buffer[] = [];
  child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
  child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  await fs.writeFile(stdoutFile, Buffer.concat(stdout));
  await fs.writeFile(stderrFile, Buffer.concat(stderr));

  const summary: ExplorbotRunSummary = {
    status: exitCode === 0 ? "passed" : "failed",
    command,
    targetPath: mission.target.path,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode,
    outputDirectory,
    stdoutFile,
    stderrFile,
  };
  await writeSummary(summary);
  return summary;
}

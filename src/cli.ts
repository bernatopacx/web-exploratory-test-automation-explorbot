import "dotenv/config";
import fs from "node:fs/promises";
import { loadAppConfig, resolveFromRoot } from "./config/loader.js";
import { discoverActiveSprintSnapshot, fetchIssue } from "./jira/client.js";
import { generateCases, generateTaskCases } from "./cases/generator.js";
import { renderCaseHtml, renderCaseSummary } from "./cases/report.js";
import { analyzeSourceRepository } from "./code-intelligence/analyzer.js";
import { buildExplorbotMission, writeExplorbotMission } from "./explorbot/mission.js";
import { runExplorbot } from "./explorbot/runner.js";

async function main(): Promise<void> {
  const command = process.argv[2] ?? "generate";
  const config = await loadAppConfig();
  const projectKey = process.env.JIRA_PROJECT_KEY ?? config.jira.projectKey;
  const boardId = Number(process.env.JIRA_BOARD_ID ?? config.jira.boardId);

  if (!["discover", "generate", "explore"].includes(command)) throw new Error(`Unknown command: ${command}. Use discover, generate, or explore.`);
  const snapshot = await discoverActiveSprintSnapshot(projectKey, boardId);
  await fs.writeFile(resolveFromRoot("artifacts/active-sprint.json"), JSON.stringify(snapshot, null, 2));
  console.log(`Discovered ${snapshot.issues.length} issue(s) from ${snapshot.sprint.name}.`);
  const source = config.sourceRepository;
  const code = await analyzeSourceRepository({
    sourcePath: process.env.SOURCE_REPO_PATH ?? source?.path,
    repository: process.env.SOURCE_REPO ?? source?.repository,
    baseRef: process.env.SOURCE_REPO_DIFF_BASE ?? source?.diffBase ?? "origin/main",
    headRef: process.env.SOURCE_REPO_DIFF_HEAD ?? source?.headRef ?? "HEAD"
  });
  await fs.writeFile(resolveFromRoot("artifacts/code-intelligence.json"), JSON.stringify(code, null, 2));
  console.log(`Code intelligence: ${code.status}; ${code.changedFiles.length} changed file(s), ${code.signals.length} risk signal(s).`);
  if (command === "generate" || command === "explore") {
    const document = generateCases(snapshot, code);
    await fs.writeFile(resolveFromRoot("artifacts/generated-cases.json"), JSON.stringify(document, null, 2));
    await fs.writeFile(resolveFromRoot("artifacts/generated-cases.md"), renderCaseSummary(document));
    await fs.writeFile(resolveFromRoot("artifacts/generated-cases.html"), renderCaseHtml(document));
    console.log(`Generated ${document.cases.length} smoke/exploratory/monkey case(s).`);

    const issueKey = process.env.JIRA_ISSUE_KEY?.trim();
    let taskDocument = document;
    let issue;
    if (issueKey) {
      issue = await fetchIssue(issueKey);
      taskDocument = generateTaskCases(snapshot, issue, code);
      const taskName = issue.key.toLowerCase();
      await fs.writeFile(resolveFromRoot(`artifacts/task-${taskName}.json`), JSON.stringify(taskDocument, null, 2));
      await fs.writeFile(resolveFromRoot(`artifacts/task-${taskName}.md`), renderCaseSummary(taskDocument));
      await fs.writeFile(resolveFromRoot(`artifacts/task-${taskName}.html`), renderCaseHtml(taskDocument));
      console.log(`Generated ${taskDocument.cases.length} task-specific case(s) for ${issue.key}.`);
    }

    const mission = buildExplorbotMission({ app: config, snapshot, code, issue, cases: taskDocument.cases });
    await writeExplorbotMission(mission);
    console.log(`Explorbot mission: ${mission.target.path ? `ready for ${mission.target.path}` : "target path unresolved; set EXPLORBOT_TARGET_PATH before running"}.`);
    if (command === "explore") {
      const run = await runExplorbot(mission);
      console.log(`Explorbot run: ${run.status}${run.reason ? ` (${run.reason})` : ""}.`);
    }
  }
}

try {
  await fs.mkdir(resolveFromRoot("artifacts"), { recursive: true });
  await main();
} catch (error) {
  const failure = { message: error instanceof Error ? error.message : String(error), failedAt: new Date().toISOString() };
  await fs.mkdir(resolveFromRoot("artifacts"), { recursive: true });
  await fs.writeFile(resolveFromRoot("artifacts/run-failure.json"), JSON.stringify(failure, null, 2));
  console.error(error);
  process.exitCode = 1;
}

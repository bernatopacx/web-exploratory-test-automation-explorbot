import fs from "node:fs/promises";
import { resolveFromRoot } from "../config/loader.js";
import type { AppConfig } from "../config/types.js";
import type { GeneratedCase } from "../cases/types.js";
import type { CodeIntelligenceDocument } from "../code-intelligence/analyzer.js";
import type { JiraIssue, SprintSnapshot } from "../jira/types.js";
import type { ExplorbotMission, MissionInputs } from "./types.js";

function targetPathFor(app: AppConfig): { path: string; source: ExplorbotMission["target"]["pathSource"] } {
  const environmentPath = process.env.EXPLORBOT_TARGET_PATH?.trim();
  if (environmentPath) return { path: environmentPath, source: "environment" };
  const profilePath = app.explorbot?.targetPath?.trim();
  if (profilePath) return { path: profilePath, source: "app-profile" };
  return { path: "", source: "unresolved" };
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export function buildExplorbotMission({ app, snapshot, code, issue, cases }: MissionInputs): ExplorbotMission {
  const target = targetPathFor(app);
  const task = issue;
  const riskTags = unique(cases.flatMap((generatedCase) => generatedCase.tags));
  const acceptanceCriteria = task?.acceptanceCriteria ?? [];
  const issueKey = task?.key;
  const scope = issueKey ? "task" : "sprint";
  const maxTests = Number(process.env.EXPLORBOT_MAX_TESTS ?? app.explorbot?.maxTests ?? 3);

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    app: { id: app.id, displayName: app.displayName, baseUrl: app.baseUrl },
    scope,
    target: { url: app.baseUrl, path: target.path, pathSource: target.source },
    jira: {
      projectKey: snapshot.projectKey,
      sprintName: snapshot.sprint.name,
      sprintId: snapshot.sprint.id,
      issueKey,
      issueSummary: task?.summary,
      issueUrl: task?.url,
      acceptanceCriteria,
    },
    objective: issueKey
      ? `Explore ${issueKey} (${task?.summary ?? "selected Jira task"}) and challenge its acceptance criteria and code-derived risks.`
      : `Explore the active ${snapshot.sprint.name} surface and challenge the sprint's code-derived risks.`,
    riskTags,
    generatedCaseIds: cases.map((generatedCase) => generatedCase.id),
    codeIntelligence: {
      status: code.status,
      repository: code.repository,
      changedFileCount: code.changedFiles.length,
      signals: unique(code.signals.map((signal) => signal.tag)),
    },
    budget: { maxTests: Number.isFinite(maxTests) && maxTests > 0 ? maxTests : 3, maxDurationMinutes: 10 },
    safety: {
      environment: "dev-or-staging-only",
      jiraWrites: false,
      destructiveActions: "blocked-by-default",
      allowedActions: app.explorbot?.allowedActions ?? ["navigate", "open-modal", "type", "click", "scroll", "refresh", "go-back"],
    },
    knowledgeFile: app.explorbot?.knowledgeFile ?? "artifacts/explorbot/knowledge.md",
  };
}

export function renderExplorbotKnowledge(mission: ExplorbotMission): string {
  const criteria = mission.jira.acceptanceCriteria.length
    ? mission.jira.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")
    : "- No acceptance criteria were returned by Jira; use the risk tags and generated cases as the exploration charter.";
  const risks = mission.riskTags.length ? mission.riskTags.map((risk) => `- ${risk}`).join("\n") : "- No code-derived risk tag was detected.";
  return `# Explorbot Mission Knowledge

## Objective
${mission.objective}

## Target
- URL: ${mission.target.url}
- Path: ${mission.target.path || "UNRESOLVED: do not start until a target path is supplied"}
- Scope: ${mission.scope}

## Jira acceptance criteria
${criteria}

## Code-derived risk tags
${risks}

## Guardrails
- Run only against development or staging data.
- Jira is read-only; do not create issues, comments, transitions, or assignments.
- Do not delete, publish, purchase, send external messages, or mutate production data.
- Prefer bounded exploration with reproducible steps and evidence.
`;
}

export async function writeExplorbotMission(mission: ExplorbotMission): Promise<void> {
  const directory = resolveFromRoot("artifacts/explorbot");
  await fs.mkdir(directory, { recursive: true });
  await fs.writeFile(resolveFromRoot("artifacts/explorbot/mission.json"), JSON.stringify(mission, null, 2));
  await fs.writeFile(resolveFromRoot(mission.knowledgeFile), renderExplorbotKnowledge(mission));
}

import type { AppConfig } from "../config/types.js";
import type { GeneratedCase } from "../cases/types.js";
import type { CodeIntelligenceDocument } from "../code-intelligence/analyzer.js";
import type { JiraIssue, SprintSnapshot } from "../jira/types.js";

export type ExplorbotMission = {
  schemaVersion: 1;
  generatedAt: string;
  app: { id: string; displayName: string; baseUrl: string };
  scope: "sprint" | "task";
  target: {
    url: string;
    path: string;
    pathSource: "environment" | "app-profile" | "unresolved";
  };
  jira: {
    projectKey: string;
    sprintName: string;
    sprintId: number;
    issueKey?: string;
    issueSummary?: string;
    issueUrl?: string;
    acceptanceCriteria: string[];
  };
  objective: string;
  riskTags: string[];
  generatedCaseIds: string[];
  codeIntelligence: {
    status: CodeIntelligenceDocument["status"];
    repository?: string;
    changedFileCount: number;
    signals: string[];
  };
  budget: { maxTests: number; maxDurationMinutes: number };
  safety: {
    environment: "dev-or-staging-only";
    jiraWrites: false;
    destructiveActions: "blocked-by-default";
    allowedActions: string[];
  };
  knowledgeFile: string;
};

export type ExplorbotRunSummary = {
  status: "skipped" | "passed" | "failed";
  reason?: string;
  command?: string;
  targetPath: string;
  startedAt: string;
  finishedAt: string;
  exitCode?: number | null;
  outputDirectory?: string;
  stdoutFile?: string;
  stderrFile?: string;
};

export type MissionInputs = {
  app: AppConfig;
  snapshot: SprintSnapshot;
  code: CodeIntelligenceDocument;
  issue?: JiraIssue;
  cases: GeneratedCase[];
};

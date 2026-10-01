import type { JiraIssue } from "../jira/types.js";
import type { CodeIntelligenceDocument } from "../code-intelligence/analyzer.js";

export type CaseCategory = "smoke" | "exploratory" | "monkey";

export type GeneratedCase = {
  id: string;
  category: CaseCategory;
  title: string;
  priority: "P0" | "P1" | "P2";
  sourceIssues: string[];
  sourceCodeFiles: string[];
  rationale: string;
  steps: string[];
  oracles: string[];
  tags: string[];
};

export type TaskContext = {
  key: string;
  summary: string;
  description: string;
  acceptanceCriteria: string[];
  issueType: string;
  status: string;
  priority?: string;
  url: string;
};

export type CaseDocument = {
  generatedFor: { projectKey: string; sprintName: string; sprintId: number };
  sourceIssueCount: number;
  scope?: "sprint" | "task";
  task?: TaskContext;
  codeIntelligence: Pick<CodeIntelligenceDocument, "status" | "repository" | "baseRef" | "headRef" | "headSha" | "changedFiles" | "signals">;
  cases: GeneratedCase[];
};

export type IssueSignal = {
  issue: JiraIssue;
  signals: string[];
};

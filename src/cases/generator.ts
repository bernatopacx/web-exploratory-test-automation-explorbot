import type { JiraIssue, SprintSnapshot } from "../jira/types.js";
import type { CodeIntelligenceDocument, CodeSignal } from "../code-intelligence/analyzer.js";
import type { CaseDocument, GeneratedCase, IssueSignal, TaskContext } from "./types.js";

const rules: Array<{ tag: string; words: string[] }> = [
  { tag: "navigation", words: ["navigation", "menu", "icon", "route", "sayfa", "page"] },
  { tag: "async", words: ["loading", "asenkron", "async", "response", "generation", "generate"] },
  { tag: "image", words: ["image", "görsel", "images", "erase", "brush"] },
  { tag: "input", words: ["input", "chatbox", "focus", "textarea", "keyboard", "yaz"] },
  { tag: "modal", words: ["modal", "popup", "warning", "uyarı", "dialog"] },
  { tag: "persistence", words: ["history", "persist", "kaydet", "memory", "localstorage", "session"] },
  { tag: "responsive", words: ["responsive", "mobile", "desktop", "viewport", "ekran"] },
  { tag: "auth", words: ["login", "logout", "register", "password", "auth"] },
  { tag: "share", words: ["share", "paylaş", "clipboard", "copy link", "linkedin", "telegram", "social"] }
];

function signalsFor(issue: IssueSignal["issue"]): IssueSignal {
  const haystack = `${issue.summary} ${issue.description}`.toLocaleLowerCase("tr");
  return { issue, signals: rules.filter(rule => rule.words.some(word => haystack.includes(word))).map(rule => rule.tag) };
}

function id(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function caseFor(tag: string, source: IssueSignal[], codeSource: CodeSignal[]): GeneratedCase {
  const keys = source.map(item => item.issue.key);
  const codeFiles = [...new Set(codeSource.flatMap(item => item.files))];
  const titles: Record<string, string> = {
    navigation: "Rapid navigation preserves route, state, and recoverability",
    async: "In-flight response remains recoverable during interruption",
    image: "Image generation and preview states survive interruption",
    input: "Chat input retains focus and text after arbitrary clicks",
    modal: "Modal open, close, escape, and background interactions remain coherent",
    persistence: "Refresh, back, and new-session transitions preserve expected state",
    responsive: "Critical controls remain reachable across viewport boundaries",
    auth: "Expired or interrupted authentication recovers without a dead end",
    share: "Share modal, preview, and copy-link actions remain correct"
  };
  const steps: Record<string, string[]> = {
    navigation: ["Open the app", "Open the sidebar", "Click each safe navigation target quickly", "Return to the originating view"],
    async: ["Start a bounded generation only when explicitly enabled", "While the request is in progress, navigate between safe views", "Return to the originating chat", "Wait for completion or failure"],
    image: ["Open the image surface", "Start a bounded image action only when explicitly enabled", "Open a new chat while the image is loading", "Return to the image result"],
    input: ["Focus the primary input", "Click outside the input and click the chat surface", "Type a short marker", "Use keyboard navigation and submit only when enabled"],
    modal: ["Open a modal or dialog", "Close it with the close control", "Repeat with Escape and outside click", "Reopen it and verify the underlying page is usable"],
    persistence: ["Create a short marker state", "Refresh the page", "Use back and forward navigation", "Open the same item from history if available"],
    responsive: ["Check desktop viewport", "Check a narrow mobile viewport", "Resize across the breakpoint", "Verify controls do not overlap or disappear"],
    auth: ["Open an auth-protected path", "Interrupt the flow and return", "Refresh the page", "Verify the user can recover without duplicated modals"],
    share: ["Open a conversation with content", "Open the Share action", "Verify the preview and each available share control", "Copy the share link and return to the conversation"]
  };
  const oracles: Record<string, string[]> = {
    navigation: ["URL and visible screen agree", "No blank greeting screen replaces the selected chat", "No uncaught page error occurs"],
    async: ["Loading state is bounded", "Result, error, or retry state is visible", "The original context remains recoverable"],
    image: ["Image result is visible or an actionable error is shown", "New chat does not destroy the image state"],
    input: ["Typed marker is not lost", "Input is usable after arbitrary focus changes"],
    modal: ["Only the intended modal closes", "Focus returns to a usable control", "No invisible overlay blocks the page"],
    persistence: ["State is consistent after refresh and back/forward", "History does not point to an empty or unrelated screen"],
    responsive: ["Primary controls are visible and clickable", "No horizontal overflow hides required actions"],
    auth: ["The app lands in a recoverable authenticated or unauthenticated state", "No repeated login loop occurs"],
    share: ["The modal shows the selected conversation", "Share controls expose the expected action", "Copy link gives visible success or error feedback", "Closing the modal leaves the conversation usable"]
  };
  return {
    id: `exploratory-${id(tag)}`,
    category: "exploratory",
    title: titles[tag] ?? `Risk exploration: ${tag}`,
    priority: ["navigation", "input", "async", "auth"].includes(tag) ? "P0" : "P1",
    sourceIssues: keys,
    sourceCodeFiles: codeFiles,
    rationale: `The active sprint and/or the development diff contains ${tag}-related change signals. The generated case probes integration and failure boundaries without asserting the feature implementation itself.`,
    steps: steps[tag] ?? ["Open the app", "Interact with the affected surface", "Interrupt and recover"],
    oracles: oracles[tag] ?? ["No uncaught page error occurs", "The app remains usable"],
    tags: [tag, ...(keys.length ? ["sprint-derived"] : []), ...(codeFiles.length ? ["code-derived"] : []), "edge-case"]
  };
}

function taskCaseFor(tag: string, source: IssueSignal, codeSource: CodeSignal[]): GeneratedCase {
  const generated = caseFor(tag, [source], codeSource);
  return {
    ...generated,
    id: `task-${id(source.issue.key)}-${id(tag)}`,
    sourceIssues: [source.issue.key],
    rationale: `${source.issue.key} (${source.issue.summary}) contains ${tag}-related risk signals. This case probes the task's affected surface and recovery boundaries without turning the acceptance criteria into brittle implementation assertions.`,
    tags: [tag, "task-derived", ...(codeSource.length ? ["code-derived"] : []), "edge-case"]
  };
}

function taskFallback(issue: JiraIssue, code: CodeIntelligenceDocument): GeneratedCase {
  return {
    id: `task-${id(issue.key)}-primary-risk`,
    category: "exploratory",
    title: `${issue.key}: affected user flow remains recoverable`,
    priority: "P1",
    sourceIssues: [issue.key],
    sourceCodeFiles: code.changedFiles.slice(0, 20).map(file => file.path),
    rationale: `${issue.key} did not map to a named risk rule, so the task is covered with a bounded exploratory pass over its primary user-facing surface.`,
    steps: ["Open the configured application", "Navigate to the surface implied by the task", "Exercise the main action with valid and interrupted states", "Return to the originating view"],
    oracles: ["The affected surface is reachable", "The primary action has visible success or error feedback", "The page remains usable after interruption"],
    tags: ["task-derived", "edge-case"]
  };
}

export function generateCases(snapshot: SprintSnapshot, code: CodeIntelligenceDocument): CaseDocument {
  const signaled = snapshot.issues.map(signalsFor);
  const cases: GeneratedCase[] = [
    {
      id: "smoke-app-load-and-primary-input",
      category: "smoke",
      title: "App loads and exposes the primary interaction surface",
      priority: "P0",
      sourceIssues: [],
      sourceCodeFiles: [],
      rationale: "Baseline health check for every supported web app.",
      steps: ["Open the configured base URL", "Wait for the first stable UI", "Locate the primary input or configured entry control"],
      oracles: ["No fatal page error", "Primary interaction surface is visible", "No unexpected redirect loop"],
      tags: ["baseline", "smoke"]
    },
    {
      id: "monkey-safe-navigation-and-focus",
      category: "monkey",
      title: "Safe random interactions do not break the current page",
      priority: "P1",
      sourceIssues: [],
      sourceCodeFiles: [],
      rationale: "A bounded, reproducible monkey pass targets state and focus corruption.",
      steps: ["Open the configured base URL", "Randomly click safe controls and navigation targets", "Use Escape, Tab, and short focus changes", "Stop after the configured action budget"],
      oracles: ["No uncaught exception or console error", "No blank page", "URL remains within configured safe paths", "At least one usable control remains"],
      tags: ["monkey", "focus", "navigation", "smoke"]
    }
  ];
  const byTag = new Map<string, IssueSignal[]>();
  for (const item of signaled) for (const tag of item.signals) byTag.set(tag, [...(byTag.get(tag) ?? []), item]);
  const codeByTag = new Map(code.signals.map(signal => [signal.tag, signal]));
  for (const tag of new Set([...byTag.keys(), ...codeByTag.keys()])) {
    cases.push(caseFor(tag, byTag.get(tag) ?? [], codeByTag.has(tag) ? [codeByTag.get(tag)!] : []));
  }
  return {
    generatedFor: { projectKey: snapshot.projectKey, sprintName: snapshot.sprint.name, sprintId: snapshot.sprint.id },
    sourceIssueCount: snapshot.issues.length,
    codeIntelligence: {
      status: code.status,
      repository: code.repository,
      baseRef: code.baseRef,
      headRef: code.headRef,
      headSha: code.headSha,
      changedFiles: code.changedFiles,
      signals: code.signals
    },
    cases
  };
}

export function generateTaskCases(snapshot: SprintSnapshot, issue: JiraIssue, code: CodeIntelligenceDocument): CaseDocument {
  const signal = signalsFor(issue);
  const taskTags = new Set(signal.signals);
  const codeByTag = new Map(code.signals.map(item => [item.tag, item]));
  const cases = signal.signals.map(tag => taskCaseFor(tag, signal, codeByTag.has(tag) ? [codeByTag.get(tag)!] : []));
  if (!cases.length) cases.push(taskFallback(issue, code));
  const task: TaskContext = {
    key: issue.key,
    summary: issue.summary,
    description: issue.description,
    acceptanceCriteria: issue.acceptanceCriteria,
    issueType: issue.issueType,
    status: issue.status,
    priority: issue.priority,
    url: issue.url
  };
  return {
    generatedFor: { projectKey: snapshot.projectKey, sprintName: snapshot.sprint.name, sprintId: snapshot.sprint.id },
    sourceIssueCount: 1,
    scope: "task",
    task,
    codeIntelligence: {
      status: code.status,
      repository: code.repository,
      baseRef: code.baseRef,
      headRef: code.headRef,
      headSha: code.headSha,
      changedFiles: code.changedFiles,
      signals: code.signals.filter(item => taskTags.has(item.tag))
    },
    cases
  };
}

import type { ActiveSprint, JiraIssue, SprintSnapshot } from "./types.js";

type JiraResponse = {
  values?: Array<Record<string, unknown>>;
  issues?: Array<Record<string, unknown>>;
  key?: string;
  fields?: Record<string, unknown>;
  names?: Record<string, string>;
  isLast?: boolean;
  nextPageToken?: string;
};

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Add it to .env or the CI secrets.`);
  return value;
}

function authHeaders(): Record<string, string> {
  const email = requiredEnv("JIRA_EMAIL");
  const token = requiredEnv("JIRA_API_TOKEN");
  return {
    Accept: "application/json",
    Authorization: `Basic ${Buffer.from(`${email}:${token}`).toString("base64")}`
  };
}

function jiraBaseUrl(): string {
  return (process.env.JIRA_BASE_URL ?? "").replace(/\/$/, "");
}

const retryDelaysMs = [1000, 3000];
const requestTimeoutMs = Number(process.env.JIRA_REQUEST_TIMEOUT_MS ?? 15000);

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchBody(url: URL, path: string): Promise<{ response: Response; body: string }> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`Jira request timed out after ${requestTimeoutMs}ms for ${path}`));
    }, requestTimeoutMs);
  });
  try {
    const response = await Promise.race([
      fetch(url, { headers: authHeaders(), signal: controller.signal }),
      timeout
    ]);
    const body = await Promise.race([response.text(), timeout]);
    return { response, body };
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function get(path: string, params: Record<string, string> = {}): Promise<JiraResponse> {
  const url = new URL(`${jiraBaseUrl()}${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    let canRetry = true;
    try {
      const { response, body } = await fetchBody(url, path);
      if (response.ok) {
        try {
          return JSON.parse(body) as JiraResponse;
        } catch (error) {
          canRetry = false;
          throw new Error(`Jira returned invalid JSON for ${path}: ${String(error)}`);
        }
      }
      const retryable = response.status === 429 || response.status >= 500;
      canRetry = retryable;
      lastError = new Error(`Jira ${response.status} ${response.statusText} for ${path}: ${body.slice(0, 1000)}`);
      if (!retryable || attempt === retryDelaysMs.length) throw lastError;
      const retryAfter = Number(response.headers.get("retry-after"));
      await wait(Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : retryDelaysMs[attempt]);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      lastError = message.startsWith("Jira ")
        ? error instanceof Error ? error : new Error(message)
        : new Error(`Jira request failed for ${path}: ${message}`);
      if (!canRetry || attempt === retryDelaysMs.length) throw lastError;
      await wait(retryDelaysMs[attempt]);
    }
  }
  throw lastError ?? new Error(`Jira request failed: ${url}`);
}

function textFrom(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(textFrom).join(" ");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return [record.text, record.content, record.value].map(textFrom).filter(Boolean).join(" ");
  }
  return String(value);
}

function acceptanceCriteriaFrom(description: string, fields: Record<string, unknown>, names: Record<string, string> = {}): string[] {
  const namedField = Object.entries(fields).find(([key, value]) => {
    const fieldName = names[key] ?? key;
    return /acceptance|criteria|acceptance criteria/i.test(fieldName) && Boolean(textFrom(value).trim());
  });
  let source = namedField ? textFrom(namedField[1]) : description;
  const marker = source.search(/acceptance criteria/i);
  if (marker >= 0) source = source.slice(marker + "acceptance criteria".length);
  const dependencies = source.search(/\bdependencies\b/i);
  if (dependencies >= 0) source = source.slice(0, dependencies);
  const lines = source.match(/[^.!?]+[.!?]?/g) ?? source.split(/\r?\n/);
  return lines
    .map(line => line.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").trim())
    .filter(line => line.length >= 12)
    .filter((line, index, values) => values.indexOf(line) === index)
    .slice(0, 20);
}

function normalizeIssue(item: Record<string, unknown>, names: Record<string, string> = {}): JiraIssue {
  const fields = (item.fields ?? {}) as Record<string, unknown>;
  const issueType = (fields.issuetype ?? {}) as Record<string, unknown>;
  const status = (fields.status ?? {}) as Record<string, unknown>;
  const priority = (fields.priority ?? {}) as Record<string, unknown>;
  const description = textFrom(fields.description);
  return {
    key: String(item.key),
    summary: String(fields.summary ?? item.key),
    description,
    issueType: String(issueType.name ?? "Unknown"),
    status: String(status.name ?? "Unknown"),
    priority: priority.name ? String(priority.name) : undefined,
    labels: Array.isArray(fields.labels) ? fields.labels.map(String) : [],
    acceptanceCriteria: acceptanceCriteriaFrom(description, fields, names),
    url: `${jiraBaseUrl()}/browse/${item.key}`
  };
}

export async function fetchActiveSprint(boardId: number): Promise<ActiveSprint> {
  const result = await get(`/rest/agile/1.0/board/${boardId}/sprint`, { state: "active", maxResults: "10" });
  const sprint = result.values?.[0];
  if (!sprint) {
    if (!process.env.JIRA_PROJECT_KEY) throw new Error(`No active sprint found on board ${boardId}.`);
    return { id: 0, name: "openSprints() fallback", state: "ACTIVE" };
  }
  return {
    id: Number(sprint.id),
    name: String(sprint.name),
    state: String(sprint.state),
    startDate: sprint.startDate ? String(sprint.startDate) : undefined,
    endDate: sprint.endDate ? String(sprint.endDate) : undefined
  };
}

export async function fetchIssuesForSprint(projectKey: string, sprint: ActiveSprint): Promise<JiraIssue[]> {
  const jql = sprint.id
    ? `project = ${projectKey} AND sprint = ${sprint.id} ORDER BY Rank ASC`
    : `project = ${projectKey} AND sprint in openSprints() ORDER BY Rank ASC`;
  let nextPageToken: string | undefined;
  const seenPageTokens = new Set<string>();
  const issues: JiraIssue[] = [];
  do {
    const params = {
      jql,
      maxResults: "100",
      fields: "summary,description,issuetype,status,priority,labels",
      ...(nextPageToken ? { nextPageToken } : {})
    };
    const result = await get("/rest/api/3/search/jql", {
      ...params
    });
    for (const issue of result.issues ?? []) issues.push(normalizeIssue(issue, result.names));
    nextPageToken = result.nextPageToken;
    if (nextPageToken) {
      if (seenPageTokens.has(nextPageToken)) throw new Error(`Jira pagination repeated token for ${projectKey}.`);
      seenPageTokens.add(nextPageToken);
    }
  } while (nextPageToken);
  return issues;
}

export async function discoverActiveSprintSnapshot(projectKey: string, boardId: number): Promise<SprintSnapshot> {
  const sprint = await fetchActiveSprint(boardId);
  const issues = await fetchIssuesForSprint(projectKey, sprint);
  return { projectKey, boardId, sprint, issues, fetchedAt: new Date().toISOString() };
}

export async function fetchIssue(issueKey: string): Promise<JiraIssue> {
  const result = await get(`/rest/api/3/issue/${encodeURIComponent(issueKey)}`, { expand: "names" });
  if (!result.key || !result.fields) throw new Error(`Jira issue ${issueKey} was not found.`);
  return normalizeIssue({ key: result.key, fields: result.fields }, result.names);
}

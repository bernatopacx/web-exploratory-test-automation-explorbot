import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type CodeSignal = {
  tag: string;
  files: string[];
  evidence: string[];
};

export type CodeChange = {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  signals: string[];
  changedExcerpt: string;
};

export type CodeIntelligenceDocument = {
  status: "ready" | "empty" | "unavailable";
  repository: string;
  sourcePath: string;
  baseRef: string;
  headRef: string;
  headSha?: string;
  changedFiles: CodeChange[];
  signals: CodeSignal[];
  generatedAt: string;
  message?: string;
};

export type RepositoryAnalysisInput = AnalyzerOptions & { id: string };

type AnalyzerOptions = {
  sourcePath?: string;
  repository?: string;
  baseRef?: string;
  headRef?: string;
};

const rules: Array<{ tag: string; path: RegExp; code: RegExp }> = [
  { tag: "navigation", path: /(route|router|navigation|sidebar|menu|page|layout)/i, code: /(useNavigate|navigate\(|router\.|history\.|push\(|redirect|href=)/i },
  { tag: "async", path: /(api|client|service|request|query|mutation|hook)/i, code: /(fetch\(|axios|useQuery|useMutation|Promise|async |await |loading|pending|retry)/i },
  { tag: "image", path: /(image|media|upload|attachment|preview)/i, code: /(image|upload|preview|FileReader|Blob|createObjectURL)/i },
  { tag: "input", path: /(input|textarea|form|composer|editor|chat)/i, code: /(input|textarea|contentEditable|onChange|onSubmit|focus\(|keyboard|placeholder)/i },
  { tag: "modal", path: /(modal|dialog|drawer|popover|popup|sheet)/i, code: /(dialog|modal|drawer|popover|portal|Escape|onClose)/i },
  { tag: "persistence", path: /(store|state|history|persist|cache|storage|session)/i, code: /(localStorage|sessionStorage|persist|hydrate|history|cache|zustand|redux)/i },
  { tag: "responsive", path: /(responsive|breakpoint|mobile|desktop|viewport|layout)/i, code: /(matchMedia|viewport|breakpoint|sm:|md:|lg:|window\.innerWidth)/i },
  { tag: "auth", path: /(auth|login|logout|session|password|token|account)/i, code: /(signIn|signOut|login|logout|token|session|refreshToken|401|403)/i }
];

const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".css", ".scss", ".less", ".json"]);
const ignoredDirectories = new Set([".git", "node_modules", "dist", "build", "coverage", ".next", ".turbo", "playwright-report", "test-results"]);

async function git(sourcePath: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", args, { cwd: sourcePath, maxBuffer: 10 * 1024 * 1024 });
  return result.stdout.trim();
}

function resolveRef(ref: string, headRef: string): string {
  return ref.replace(/\bHEAD\b/g, headRef);
}

function changedLines(diff: string): string {
  const additions = diff.split("\n").filter(line => line.startsWith("+") && !line.startsWith("+++"));
  return (additions.length ? additions.map(line => line.slice(1)) : diff.split("\n")).join("\n").slice(0, 12000);
}

function signalsFor(filePath: string, text: string): string[] {
  return rules.filter(rule => rule.path.test(filePath) || rule.code.test(text)).map(rule => rule.tag);
}

function parseNameStatus(output: string): Array<{ status: string; path: string }> {
  return output.split("\n").filter(Boolean).map(line => {
    const [status, ...parts] = line.split("\t");
    return { status, path: parts.at(-1) ?? "" };
  }).filter(item => item.path);
}

function parseNumstat(output: string): Map<string, { additions: number; deletions: number }> {
  const result = new Map<string, { additions: number; deletions: number }>();
  for (const line of output.split("\n").filter(Boolean)) {
    const [additions, deletions, ...parts] = line.split("\t");
    const filePath = parts.at(-1);
    if (!filePath) continue;
    result.set(filePath, {
      additions: Number.isNaN(Number(additions)) ? 0 : Number(additions),
      deletions: Number.isNaN(Number(deletions)) ? 0 : Number(deletions)
    });
  }
  return result;
}

async function collectSourceFiles(root: string, current = root): Promise<string[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name)) {
      files.push(...await collectSourceFiles(root, path.join(current, entry.name)));
    } else if (entry.isFile() && sourceExtensions.has(path.extname(entry.name).toLowerCase())) {
      files.push(path.relative(root, path.join(current, entry.name)));
    }
  }
  return files;
}

async function analyzeFilesystem(sourcePath: string, repository: string): Promise<CodeIntelligenceDocument> {
  const changedFiles: CodeChange[] = [];
  for (const relativePath of (await collectSourceFiles(sourcePath)).sort().slice(0, 1000)) {
    const absolutePath = path.join(sourcePath, relativePath);
    const stats = await fs.stat(absolutePath);
    if (stats.size > 512 * 1024) continue;
    const content = await fs.readFile(absolutePath, "utf8");
    const excerpt = content.slice(0, 12000);
    changedFiles.push({
      path: relativePath,
      status: "local-scan",
      additions: content.split("\n").length,
      deletions: 0,
      signals: signalsFor(relativePath, excerpt),
      changedExcerpt: excerpt
    });
  }
  const grouped = new Map<string, CodeSignal>();
  for (const file of changedFiles) for (const tag of file.signals) {
    const current = grouped.get(tag) ?? { tag, files: [], evidence: [] };
    current.files.push(file.path);
    current.evidence.push(`${file.path}: ${file.changedExcerpt.replace(/\s+/g, " ").slice(0, 240)}`);
    grouped.set(tag, current);
  }
  return {
    status: changedFiles.length ? "ready" : "empty",
    repository,
    sourcePath,
    baseRef: "local-filesystem",
    headRef: "working-tree",
    changedFiles,
    signals: [...grouped.values()],
    generatedAt: new Date().toISOString(),
    message: "No git metadata found; analyzed the local source tree instead of a git diff."
  };
}

export async function analyzeSourceRepository(options: AnalyzerOptions): Promise<CodeIntelligenceDocument> {
  const sourcePath = options.sourcePath ? path.resolve(options.sourcePath) : "";
  const repository = options.repository ?? "unconfigured";
  const baseRef = options.baseRef ?? "HEAD~1";
  const headRef = options.headRef ?? "HEAD";
  const unavailable = (message: string): CodeIntelligenceDocument => ({
    status: "unavailable", repository, sourcePath, baseRef, headRef, changedFiles: [], signals: [], generatedAt: new Date().toISOString(), message
  });

  if (!sourcePath) return unavailable("SOURCE_REPO_PATH is not configured; code intelligence was skipped.");
  try {
    await fs.access(sourcePath);
    await git(sourcePath, ["rev-parse", "--is-inside-work-tree"]);
  } catch {
    try {
      return await analyzeFilesystem(sourcePath, repository);
    } catch {
      return unavailable(`Source repository path is not readable: ${sourcePath}`);
    }
  }

  try {
    const resolvedHead = await git(sourcePath, ["rev-parse", headRef]);
    const resolvedBase = await git(sourcePath, ["rev-parse", resolveRef(baseRef, resolvedHead)]);
    const nameStatus = await git(sourcePath, ["diff", "--find-renames", "--name-status", resolvedBase, resolvedHead]);
    const numstat = await git(sourcePath, ["diff", "--numstat", resolvedBase, resolvedHead]);
    const stats = parseNumstat(numstat);
    const changedFiles: CodeChange[] = [];
    for (const item of parseNameStatus(nameStatus)) {
      const diff = await git(sourcePath, ["diff", "--unified=20", resolvedBase, resolvedHead, "--", item.path]).catch(() => "");
      const excerpt = changedLines(diff);
      changedFiles.push({
        path: item.path,
        status: item.status,
        additions: stats.get(item.path)?.additions ?? 0,
        deletions: stats.get(item.path)?.deletions ?? 0,
        signals: signalsFor(item.path, excerpt),
        changedExcerpt: excerpt
      });
    }
    const grouped = new Map<string, CodeSignal>();
    for (const file of changedFiles) for (const tag of file.signals) {
      const current = grouped.get(tag) ?? { tag, files: [], evidence: [] };
      if (!current.files.includes(file.path)) current.files.push(file.path);
      const evidence = `${file.path}: ${file.changedExcerpt.replace(/\s+/g, " ").slice(0, 240)}`;
      if (!current.evidence.includes(evidence)) current.evidence.push(evidence);
      grouped.set(tag, current);
    }
    return {
      status: changedFiles.length ? "ready" : "empty", repository, sourcePath, baseRef, headRef, headSha: resolvedHead,
      changedFiles, signals: [...grouped.values()], generatedAt: new Date().toISOString(),
      message: changedFiles.length ? undefined : "No file changes found between the configured refs."
    };
  } catch (error) {
    return unavailable(`Unable to analyze source repository refs ${baseRef}..${headRef}: ${String(error)}`);
  }
}

export async function analyzeSourceRepositories(inputs: RepositoryAnalysisInput[]): Promise<CodeIntelligenceDocument> {
  if (!inputs.length) {
    return {
      status: "unavailable",
      repository: "unconfigured",
      sourcePath: "",
      baseRef: "unconfigured",
      headRef: "unconfigured",
      changedFiles: [],
      signals: [],
      generatedAt: new Date().toISOString(),
      message: "No source repositories are configured."
    };
  }
  const documents = await Promise.all(inputs.map(input => analyzeSourceRepository(input)));
  const grouped = new Map<string, CodeSignal>();
  const changedFiles: CodeChange[] = [];
  for (const [index, document] of documents.entries()) {
    const source = inputs[index];
    for (const file of document.changedFiles) changedFiles.push({ ...file, path: `${source.id}/${file.path}` });
    for (const signal of document.signals) {
      const current = grouped.get(signal.tag) ?? { tag: signal.tag, files: [], evidence: [] };
      for (const file of signal.files) {
        const qualified = `${source.id}/${file}`;
        if (!current.files.includes(qualified)) current.files.push(qualified);
      }
      for (const evidence of signal.evidence) current.evidence.push(`${source.id}/${evidence}`);
      grouped.set(signal.tag, current);
    }
  }
  const ready = documents.some(document => document.status === "ready");
  const empty = documents.some(document => document.status === "empty");
  return {
    status: ready ? "ready" : empty ? "empty" : "unavailable",
    repository: documents.map(document => document.repository).join(", "),
    sourcePath: documents.map(document => document.sourcePath).join(", "),
    baseRef: "configured-repositories",
    headRef: "configured-repositories",
    changedFiles,
    signals: [...grouped.values()],
    generatedAt: new Date().toISOString(),
    message: documents.map(document => document.message).filter(Boolean).join(" ") || undefined
  };
}

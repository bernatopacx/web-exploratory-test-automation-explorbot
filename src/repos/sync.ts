import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { AppConfig } from "../config/types.js";
import { resolveFromRoot } from "../config/loader.js";
import type { RepositoryManifest, RepositorySnapshot, SourceRepositoryConfig } from "./types.js";

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await execFileAsync("git", args, { cwd, maxBuffer: 10 * 1024 * 1024 });
  return result.stdout.trim();
}

function envName(id: string, suffix: string): string {
  return `${id.replace(/[^a-z0-9]+/gi, "_").toUpperCase()}_${suffix}`;
}

function configuredSources(app: AppConfig): SourceRepositoryConfig[] {
  if (app.sourceRepositories?.length) {
    return app.sourceRepositories.map(source => ({
      ...source,
      repository: process.env[envName(source.id, "REPOSITORY")] ?? source.repository,
      ref: process.env[envName(source.id, "REF")] ?? source.ref,
      path: process.env[envName(source.id, "SOURCE_REPO_PATH")] ?? source.path
    }));
  }
  const legacy = app.sourceRepository;
  if (!legacy) return [];
  return [{
    id: "frontend",
    repository: process.env.SOURCE_REPO ?? legacy.repository,
    ref: process.env.SOURCE_REPO_REF ?? legacy.baseRef,
    path: process.env.SOURCE_REPO_PATH ?? legacy.path ?? "work/repos/frontend",
    diffBase: legacy.diffBase,
    headRef: legacy.headRef
  }];
}

function normalizedRef(ref: string): string {
  return ref.replace(/^refs\/heads\//, "");
}

async function isGitRepository(repositoryPath: string): Promise<boolean> {
  try {
    return (await git(repositoryPath, ["rev-parse", "--is-inside-work-tree"])) === "true";
  } catch {
    return false;
  }
}

async function isDirty(repositoryPath: string): Promise<boolean> {
  return Boolean(await git(repositoryPath, ["status", "--porcelain"]));
}

async function snapshotSource(source: SourceRepositoryConfig, syncRequested: boolean): Promise<RepositorySnapshot> {
  const fetchedAt = new Date().toISOString();
  const repositoryPath = path.resolve(resolveFromRoot(source.path));
  const ref = normalizedRef(source.ref);
  const explicitlyProvidedPath = Boolean(process.env[envName(source.id, "SOURCE_REPO_PATH")] || (source.id === "frontend" && process.env.SOURCE_REPO_PATH));
  try {
    await fs.mkdir(path.dirname(repositoryPath), { recursive: true });
    if (!(await isGitRepository(repositoryPath))) {
      if (!syncRequested || explicitlyProvidedPath) {
        return { id: source.id, repository: source.repository, requestedRef: ref, path: repositoryPath, status: "missing", fetchedAt, message: "Repository checkout is missing; provide a checkout or enable sync for the managed path." };
      }
      await execFileAsync("git", ["clone", "--depth", "50", "--branch", ref, "--single-branch", `https://github.com/${source.repository}.git`, repositoryPath], { maxBuffer: 10 * 1024 * 1024 });
    }
    const dirty = await isDirty(repositoryPath);
    if (dirty) {
      return { id: source.id, repository: source.repository, requestedRef: ref, path: repositoryPath, status: "dirty", headSha: await git(repositoryPath, ["rev-parse", "HEAD"]), headRef: await git(repositoryPath, ["branch", "--show-current"]), fetchedAt, message: "Local changes detected; the checkout was not changed." };
    }
    if (syncRequested && !explicitlyProvidedPath) {
      await git(repositoryPath, ["fetch", "--prune", "origin", ref]);
      await git(repositoryPath, ["checkout", "--detach", `origin/${ref}`]);
    }
    return { id: source.id, repository: source.repository, requestedRef: ref, path: repositoryPath, status: "ready", headSha: await git(repositoryPath, ["rev-parse", "HEAD"]), headRef: await git(repositoryPath, ["branch", "--show-current"]), fetchedAt };
  } catch (error) {
    return { id: source.id, repository: source.repository, requestedRef: ref, path: repositoryPath, status: "unavailable", fetchedAt, message: String(error) };
  }
}

export function resolveSourceRepositories(app: AppConfig): SourceRepositoryConfig[] {
  return configuredSources(app);
}

export async function syncSourceRepositories(app: AppConfig, syncRequested: boolean): Promise<RepositoryManifest> {
  const sources = configuredSources(app);
  const repositories = await Promise.all(sources.map(source => snapshotSource(source, syncRequested)));
  const manifest: RepositoryManifest = { schemaVersion: 1, generatedAt: new Date().toISOString(), syncRequested, repositories };
  await fs.mkdir(resolveFromRoot("artifacts"), { recursive: true });
  await fs.writeFile(resolveFromRoot("artifacts/source-repositories.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}

export type SourceRepositoryConfig = {
  id: string;
  repository: string;
  ref: string;
  path: string;
  diffBase?: string;
  headRef?: string;
};

export type RepositorySnapshot = {
  id: string;
  repository: string;
  requestedRef: string;
  path: string;
  status: "ready" | "missing" | "dirty" | "unavailable";
  headSha?: string;
  headRef?: string;
  fetchedAt: string;
  message?: string;
};

export type RepositoryManifest = {
  schemaVersion: 1;
  generatedAt: string;
  syncRequested: boolean;
  repositories: RepositorySnapshot[];
};

export type LocatorConfig = {
  kind: "placeholder" | "role" | "text" | "css";
  value?: string;
  role?: string;
  name?: string;
};

export type AppConfig = {
  id: string;
  displayName: string;
  baseUrl: string;
  jira: { projectKey: string; boardId: number };
  sourceRepository?: { repository: string; baseRef: string; diffBase?: string; headRef?: string; path?: string };
  capabilities: string[];
  auth: { required: boolean; storageState?: string };
  ignoredConsoleErrorPatterns?: string[];
  locators: {
    primaryInput: LocatorConfig;
    sendButton: LocatorConfig;
    sidebarButton?: LocatorConfig;
    sidebarLinks?: string[];
  };
  exploration: {
    allowGeneration: boolean;
    maxActions: number;
    maxDurationMs: number;
    safePathPrefixes: string[];
  };
  explorbot?: {
    targetPath?: string;
    maxTests?: number;
    knowledgeFile?: string;
    allowedActions?: string[];
  };
};

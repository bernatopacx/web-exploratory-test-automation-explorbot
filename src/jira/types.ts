export type JiraIssue = {
  key: string;
  summary: string;
  description: string;
  issueType: string;
  status: string;
  priority?: string;
  labels: string[];
  acceptanceCriteria: string[];
  url: string;
};

export type ActiveSprint = {
  id: number;
  name: string;
  state: string;
  startDate?: string;
  endDate?: string;
};

export type SprintSnapshot = {
  projectKey: string;
  boardId: number;
  sprint: ActiveSprint;
  issues: JiraIssue[];
  fetchedAt: string;
};

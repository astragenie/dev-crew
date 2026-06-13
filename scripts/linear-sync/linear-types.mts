// @ts-nocheck — scripts/linear-sync/ is outside tsc rootDir; Bun runs directly.

export interface LinearWebhookPayload {
  type: "Issue" | "Comment" | "IssueLabel" | string;
  action: "create" | "update" | "remove" | string;
  organizationId: string;
  webhookTimestamp: string;
  data: LinearIssueData | LinearCommentData;
}

export interface LinearIssueData {
  id: string;
  identifier: string; // e.g. "ENG-123"
  title: string;
  description?: string;
  url: string;
  team: { id: string; name: string };
  assignee?: { id: string; name: string; email: string };
  state?: { name: string };
}

export interface LinearCommentData {
  id: string;
  body: string;
  url: string;
  issue: { id: string; identifier: string; title: string };
  user?: { id: string; name: string; email: string };
}

export type CrewCommand = "triage" | "build" | "status";

export interface CrewMention {
  command: CrewCommand;
  issueId: string;
  issueIdentifier: string;
  rawText: string;
}

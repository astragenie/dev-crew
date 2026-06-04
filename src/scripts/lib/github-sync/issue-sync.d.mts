// Ambient types for scripts/lib/github-sync/issue-sync.mjs.

export function ensureLabels(repo: string, opts?: any): any;
export function createFeatureIssue(
  repo: string,
  feat: any,
  milestoneTitle: string | null,
  opts?: any
): number | string | null;
export function updateIssueStatus(
  repo: string,
  issueNumber: number | string,
  newStatus: string,
  opts?: any
): any;
export function closeIssue(repo: string, issueNumber: number | string, opts?: any): any;

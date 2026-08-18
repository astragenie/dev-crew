// Ambient types for scripts/lib/github-sync/subissue-sync.mjs.

export function createSliceIssue(repo: string, slice: any, opts?: any): number | string;
export function attachSubIssue(
  repo: string,
  parentNumber: number | string,
  childNumber: number | string,
  opts?: any
): any;
export function closeSliceIssue(repo: string, issueNumber: number | string, opts?: any): any;

// Ambient types for the runtime-only github-sync orchestrator at
// scripts/lib/github-sync.mjs. Source is plain JS; types stay `any`
// because callers already bind through `await import(...)` + destructure
// without leaning on inferred shapes.

export function publishAll(repoPath: string, opts?: any): Promise<any>;
export function publishFeat(repoPath: string, featId: string, opts?: any): Promise<any>;
export function publishSlice(
  repoPath: string,
  sliceId: string,
  featId: string,
  opts?: any
): Promise<any>;
export function syncPull(repoPath: string, opts?: any): Promise<any>;
export function checkSyncDrift(repoPath: string, opts?: any): Promise<any>;
export function postSliceComment(...args: any[]): Promise<any>;
export function updateIssueStatus(...args: any[]): Promise<any>;
export function syncMilestones(repoPath: string, opts?: any): Promise<any>;
export function setupGithubSync(repoPath: string, opts?: any): Promise<any>;
export function bootstrapFromGithub(repoPath: string, opts?: any): Promise<any>;

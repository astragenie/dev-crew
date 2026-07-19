// src/scripts/lib/wave/types.mts
// Shared types for wave-mode runner and submodules.

export type TouchesFilesConfidence = "declared" | "inferred" | "missing";

export type TouchesFilesResult = {
  paths: string[];
  confidence: TouchesFilesConfidence;
};

export type SlicePriority = "P0" | "P1" | "P2" | "P3";

export type SliceCandidate = {
  sliceId: string;
  featureId: string;
  slicePath: string;
  priority: SlicePriority;
  compositeScore: number;
  strategicFit: number;
  touches: TouchesFilesResult;
  pmRiskLevel: number;
  autonomousSafe: boolean;
  retryCount: number;
  pendingFix: boolean;
  dependsOn: string[];
  helpRequestOpen: boolean;
};

export type WavePlanItem = {
  sliceId: string;
  featureId: string;
  worktreeBranch: string;
  sliceCommand: string;
  // FEAT-205: classify-slice-shape.mts shape, computed from touches.paths at
  // pack time. Drives resolveWaveDispatchModel() at prepare time so trivial
  // shapes (doc-update, config-tweak, test-only, single-module-edit) route to
  // the mid tier instead of inheriting whatever the "build" phase resolves
  // to. Optional (not "none") so existing WavePlanItem fixtures pre-dating
  // FEAT-205 stay valid; real-deps.mts treats an absent shape as "none".
  shape?: string;
};

export type WaveRejection = {
  sliceId: string;
  reason: string;
};

export type WavePlan = {
  waveId: string;
  size: number;
  items: WavePlanItem[];
  rejected: WaveRejection[];
  config: { waveSize: number; sliceCommand: string };
};

export type WorktreeStatus = "PASS" | "FAIL" | "timeout" | "agent_error";

export type WorktreeResult = {
  sliceId: string;
  branch: string;
  worktreePath: string;
  status: WorktreeStatus;
  marker: unknown;
  artifacts: string[];
};

export type PostMergeTestStatus = "PASS" | "FAIL" | "skipped";

export type WaveResult = {
  waveId: string;
  plan: WavePlan;
  worktreeResults: WorktreeResult[];
  mergedBranches: string[];
  failedBranches: string[];
  postMergeTest: { ran: boolean; status: PostMergeTestStatus; logPath?: string };
  failurePivots: FailurePivot[];
  durationMs: number;
};

export type FailureKind = "worktree_fail" | "merge_conflict" | "timeout" | "agent_error";

export type FailurePivot = {
  sliceId: string;
  featureId: string;
  originalWaveId: string;
  failureKind: FailureKind;
  failureArtifactPath: string;
  worktreePath: string | null;
  retryCount: number;
  fixCommand: string;
  fixDispatchPrompt: string;
};

export type WaveConfig = {
  size: number;
  sliceCommand: string;
  sliceCommandFallback: string;
  fixCommand: string;
  maxParallel: number;
  dispatchTimeoutMs: number;
  postMergeTestCmd: string;
  maxWaveAttempts: number;
  subagentType: string;
  artifactsRoot: string;
};

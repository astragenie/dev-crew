// FEAT-020 SLICE-1 — Types + error classes (foundation module).
// Spec: docs/superpowers/specs/2026-06-09-feat020-hierarchical-dispatch-design.md

export type DispatchStatus = "DONE" | "FAILED" | "BLOCKED" | "CONFLICTED";

export type DispatchPlan = {
  id: string;
  priority: number;
  agentType: string;
  prompt: string;
  branch?: string;
};

export type DispatchResult = {
  id: string;
  status: DispatchStatus;
  branch: string;
  worktreePath: string;
  childResults?: DispatchResult[];
  artifactPath?: string;
  error?: string;
  costUsd?: number | null;
};

export type DispatchOptions = {
  parentBranch: string;
  repoRoot: string;
  depth?: number;
  configPath?: string;
  onChildFailure?: "continue";
};

export type DispatchConfig = {
  maxDepth: number;
  maxChildrenPerBatch: number;
  worktreeRoot: string | null;
  pruneStaleAfterDays: number;
};

export class DispatchDepthExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchDepthExceeded";
  }
}

export class DispatchFanoutExceeded extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchFanoutExceeded";
  }
}

export class DispatchWorktreeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchWorktreeError";
  }
}

export class DispatchConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DispatchConfigError";
  }
}

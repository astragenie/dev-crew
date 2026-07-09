// watch/types.mts — canonical shapes for the watcher subsystem (FEAT-242).
// Pinned by .claude/artifacts/crew/contracts/20260709-feat242-watcher-contracts.md
// §5. Do not redefine these shapes elsewhere — watch/*.mts import from here.

export interface RegistryEntry {
  path: string;
  ghSlug: string;
  shard: number;
  tier: 1 | 2;
  checks?: string[];
  tenantId: string;
  appId: string;
}

export interface RegistryFile {
  controlRepoPath: string;
  entries: RegistryEntry[];
}

export interface ClaimEntry {
  findingId: string; // e.g. "issue:123", "pr:45", "run:987"
  claimedAt: string; // ISO timestamp
  ttlSeconds: number; // expiry window; expired = stealable (COND-1)
  label: string; // e.g. "loop-claimed"
}

export interface SkippedCeilingEntry {
  findingId: string;
  reason: "concurrency-cap" | "cost-ceiling";
  at: string;
}

export interface TickState {
  lastSeenIssue: number | null;
  lastFailedRunIds: number[];
  lastPrShas: Record<string, string>; // prNumber -> last-seen head sha
  lastTickAt: string;
  claims: Record<string, ClaimEntry>; // keyed by findingId
  skippedCeiling: SkippedCeilingEntry[];
}

export interface ReactionState {
  attemptCounts: Record<string, number>; // keyed by findingId
  costSpent: Record<string, number>; // keyed by findingId, USD
  totalCostSpentUsd: number;
}

export type FindingKind = "issue" | "failed-run" | "red-pr";

export interface Finding {
  kind: FindingKind;
  findingId: string;
  ghSlug: string;
}

export type TickResult =
  | { outcome: "swept"; findingsCount: number; spawnedCount: number; skippedCount: number }
  | { outcome: "lock-held" };

export interface SpawnGateConfig {
  maxConcurrentReactions: number; // default 3, machine-wide (COND-4)
  maxCostUsdPerWindow: number; // machine-wide cost ceiling (COND-4)
}

export type SpawnGateDecision =
  | { allow: true }
  | { allow: false; reason: "concurrency-cap" | "cost-ceiling" };

export type ReactionAction = "intake" | "pr-fix" | "crew-fix" | "issue-broker-file";

export interface ReactionSpawn {
  finding: Finding;
  action: ReactionAction;
  command: string; // the `claude -p "..."` invocation string
  cwd: string; // RegistryEntry.path
}

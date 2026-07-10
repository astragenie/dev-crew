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
  // Per-repo override for the claim TTL (COND-1 self-heal window), seconds.
  // Falls back to claims.mts::DEFAULT_CLAIM_TTL_SECONDS when absent — most
  // repos want the machine-wide default; a repo whose reactions routinely
  // run long (e.g. a slow test suite in pr-fix) can widen its own window
  // without changing the default for every other watched repo.
  claimTtlSeconds?: number;
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

// B3 AC-2 / AC-2b — classifies a gh failure encountered while sweeping a
// registry entry so an unreachable / insufficient-scope repo is
// distinguishable from a genuinely deleted one or a transient network blip.
export type SweepErrorKind = "insufficient-scope" | "not-found" | "other";

export interface SweepErrorState {
  kind: SweepErrorKind;
  message: string;
  at: string; // ISO timestamp
  consecutiveCount: number; // consecutive failed sweeps for this entry
}

export interface TickState {
  lastSeenIssue: number | null;
  lastFailedRunIds: number[];
  lastPrShas: Record<string, string>; // prNumber -> last-seen head sha
  lastTickAt: string;
  claims: Record<string, ClaimEntry>; // keyed by findingId
  skippedCeiling: SkippedCeilingEntry[];
  // Tick-owned (COND-2): set when the gh detection calls for this entry
  // fail; cleared back to null on the next successful sweep.
  lastSweepError: SweepErrorState | null;
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
  | {
      outcome: "swept";
      findingsCount: number;
      spawnedCount: number;
      skippedCount: number;
      errorCount: number; // entries whose gh detection failed this tick
    }
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
  command: string; // human-readable display/audit string, e.g. `claude -p "..."`
  // Exact `-p` argument text for a real headless spawn — no shell quoting,
  // passed as a single argv element (watch/reaction-spawn.mts). Empty for
  // "issue-broker-file" (tier-2, watch-only — never a real spawn).
  promptArg: string;
  cwd: string; // RegistryEntry.path
}

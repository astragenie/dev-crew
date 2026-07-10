// Backlog state-change emitter (M5 / L5-3).
//
// Fans out a `loop.backlog_state_changed` envelope when a FEAT file moves
// between backlog state directories (pending → triaged → in-progress → done).
// No JSONL on disk — the on-disk move IS the durable record. We only emit
// the webhook envelope so the runner can react in real time.
//
// Fail-silent: any fanout failure is swallowed by `fanoutEnvelope`. Caller
// is `backlog-writer::moveFeature` and any future direct-mover paths.

import { fanoutEnvelope } from "./webhook-fanout.mjs";

/** Closed-set of backlog states a FEAT can transition between. */
export type BacklogState = "pending" | "triaged" | "in-progress" | "done";

/** Category classification for DORA CFR signal. */
export type FeatCategory = "feat" | "fix" | "chore";

/** Input for `emitBacklogStateChanged`. */
export interface BacklogStateChangedInput {
  /** Feature id, e.g. "FEAT-200". */
  featId: string;
  /** Source state (the directory the file came from). */
  fromState: BacklogState | string;
  /** Destination state (the directory the file landed in). */
  toState: BacklogState | string;
  /** Optional ISO timestamp override (test seam). */
  timestamp?: string;
  /** DORA: priority tier (P0..P4). Required for MTTR P0 detection. */
  priority?: string | null;
  /**
   * DORA: category classification. FEAT frontmatter `category` is freeform
   * (e.g. "bugfix", "architecture", "feature") — `FeatCategory` names the
   * subset the CFR aggregation recognizes, but any string is forwarded
   * as-is rather than narrowed/validated here.
   */
  category?: FeatCategory | string | null;
  /** DORA: linked FEAT this fixes (CFR linking). */
  relates_to?: string | null;
  /** DORA: creation timestamp (lead-time start anchor). */
  createdAt?: string | null;
}

/**
 * Emit a `loop.backlog_state_changed` envelope. Best-effort — `fanoutEnvelope`
 * already swallows network errors and gracefully skips when no webhook is
 * configured.
 */
export async function emitBacklogStateChanged(
  repoPath: string,
  input: BacklogStateChangedInput
): Promise<void> {
  const ts = input.timestamp ?? new Date().toISOString();
  const payload: Record<string, unknown> = {
    featId: input.featId,
    fromState: input.fromState,
    toState: input.toState,
    ts
  };
  if (input.priority !== undefined) payload.priority = input.priority;
  if (input.category !== undefined) payload.category = input.category;
  if (input.relates_to !== undefined) payload.relates_to = input.relates_to;
  if (input.createdAt !== undefined) payload.createdAt = input.createdAt;
  await fanoutEnvelope(repoPath, "loop.backlog_state_changed", payload);
}

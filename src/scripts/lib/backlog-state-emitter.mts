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
  await fanoutEnvelope(repoPath, "loop.backlog_state_changed", {
    featId: input.featId,
    fromState: input.fromState,
    toState: input.toState,
    ts
  });
}

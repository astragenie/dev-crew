// Spec-created emitter (FEAT-494 unblock — DORA lead-time signal, spec anchor).
//
// Fans out a `spec.created` envelope when a new SPEC-NNN.md file is first
// written. No JSONL on disk — the on-disk file IS the durable record. We only
// emit the webhook envelope so astrarunner can react in real time.
//
// Fail-silent: any fanout failure is swallowed by `fanoutEnvelope`. Caller is
// `spec-parser::addSpec` — the sole spec-file creation point (see
// nextSpecId / fs.writeFile in that module).

import { fanoutEnvelope } from "./webhook-fanout.mjs";

/** Input for `emitSpecCreated`. */
export interface SpecCreatedInput {
  /** Spec id, e.g. "SPEC-011". */
  specId: string;
  /** Feature this spec is already linked to, when known at creation time. */
  featId?: string | null;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
}

/**
 * Emit a `spec.created` envelope. Best-effort — `fanoutEnvelope` already
 * swallows network errors and gracefully skips when no webhook is configured.
 */
export async function emitSpecCreated(repoPath: string, input: SpecCreatedInput): Promise<void> {
  const payload: Record<string, unknown> = {
    specId: input.specId,
    createdAt: input.createdAt
  };
  if (input.featId !== undefined) payload.featId = input.featId;
  await fanoutEnvelope(repoPath, "spec.created", payload);
}

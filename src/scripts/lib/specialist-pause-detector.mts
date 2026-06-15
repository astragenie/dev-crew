// Specialist-pause detection + emission (M4 / L4-1).
//
// Surfaces the SOP pattern in `docs/sop/specialist-pause-handling.md`:
// when a dispatched subagent (builder / reviewer / validator) returns without
// writing its mandated artifact, emit a `specialist_pause` slice-event so the
// runner — and any other downstream consumer — sees the pause incident in
// real time instead of having to grep grade files after the fact.
//
// Detection reuses `error-pattern-registry::checkDispatchResult`, which
// already implements the pause-without-artifact signal. This module is the
// emission wrapper: it appends the slice-event (which in turn fans out via
// `webhook-fanout::fanoutEnvelope` as kind `slice.specialist_pause`).

import { appendSliceEvent, type SpecialistPauseEvent } from "./slice-events.mjs";
import { checkDispatchResult } from "./error-pattern-registry.mjs";

/** Inputs for `detectAndEmitSpecialistPause`. */
export interface SpecialistPauseProbeInput {
  /** Repository root used by `appendSliceEvent` and artifact resolution. */
  repoPath: string;
  /** Slice id the dispatch belongs to (e.g. "SLICE-128"). */
  sliceId: string;
  /** Optional feature id ("FEAT-NNN") — passed through to the event payload. */
  featureId?: string | null;
  /** Specialist role / agent name (e.g. "crew:fullstack-dev"). */
  agent: string;
  /** Raw textual output captured from the subagent dispatch. */
  builderOutput: string;
  /** Path the dispatcher expected the subagent to write. */
  expectedArtifactPath: string;
  /** Optional ISO timestamp override (test seam). Defaults to `new Date().toISOString()`. */
  timestamp?: string;
}

/**
 * Emit a `specialist_pause` slice-event directly.
 *
 * Use this when the caller already knows the dispatch paused (e.g. an
 * exception was thrown, or a heuristic outside the registry caught it) and
 * just needs to record + fan out the event.
 */
export async function emitSpecialistPause(
  repoPath: string,
  sliceId: string,
  agent: string,
  reason: string,
  options: { featureId?: string | null; expectedArtifactPath?: string; timestamp?: string } = {}
): Promise<void> {
  const event: SpecialistPauseEvent = {
    type: "specialist_pause",
    sliceId,
    featureId: options.featureId ?? null,
    timestamp: options.timestamp ?? new Date().toISOString(),
    agent,
    reason
  };
  if (options.expectedArtifactPath) {
    event.expectedArtifactPath = options.expectedArtifactPath;
  }
  await appendSliceEvent(repoPath, sliceId, event);
}

/**
 * Probe a dispatch result for the pause-without-artifact pattern and emit a
 * `specialist_pause` slice-event when detected.
 *
 * Returns `true` when an event was emitted, `false` otherwise. Never throws —
 * detection is best-effort and slice-event emission is fail-silent on its own.
 */
export async function detectAndEmitSpecialistPause(
  input: SpecialistPauseProbeInput
): Promise<boolean> {
  const result = await checkDispatchResult(
    input.builderOutput,
    input.expectedArtifactPath,
    input.repoPath
  );
  if (result === null) return false;
  if (result.pattern.id !== "pause-without-artifact") return false;

  await emitSpecialistPause(input.repoPath, input.sliceId, input.agent, result.evidence, {
    featureId: input.featureId ?? null,
    expectedArtifactPath: input.expectedArtifactPath,
    timestamp: input.timestamp
  });
  return true;
}

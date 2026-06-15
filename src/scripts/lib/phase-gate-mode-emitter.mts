// Phase-gate mode emitter (M5 / L5-2).
//
// Emits a `phase_gate_mode_detected` slice-event after `runPhaseGate` returns,
// recording whether the parallel or serial execution path ran. The runner
// uses this to surface mode utilization in real time without having to parse
// artifact filenames after the fact.
//
// SliceId is resolved best-effort from the crew workflow-state currentRun.
// When no slice is currently open (CLI invocation outside a slice context),
// we skip emission — the event is slice-scoped by contract.

import { appendSliceEvent, type PhaseGateModeDetectedEvent } from "./slice-events.mjs";
import { readCrewWorkflowState } from "./crew-workflow-reader.mjs";

/** Input for `emitPhaseGateModeDetected`. */
export interface PhaseGateModeInput {
  /** Slice id this gate run belongs to. When null, emission is skipped. */
  sliceId: string | null;
  /** Optional feature id, passed through to the payload. */
  featureId?: string | null;
  /** Which execution path ran. */
  mode: "parallel" | "serial";
  /** Optional ISO timestamp override (test seam). */
  timestamp?: string;
}

/**
 * Resolve the current sliceId from the crew workflow-state file. Returns
 * null when no slice is open or the file is missing / unparseable.
 */
export async function resolveCurrentSliceId(repoPath: string): Promise<string | null> {
  const state = (await readCrewWorkflowState(repoPath)) as
    | { currentRun?: { sliceId?: string } }
    | null;
  const sliceId = state?.currentRun?.sliceId;
  return typeof sliceId === "string" && sliceId.length > 0 ? sliceId : null;
}

/**
 * Emit a `phase_gate_mode_detected` slice-event.
 *
 * Best-effort by virtue of `appendSliceEvent` — never throws. Skips when
 * sliceId is null (no slice context).
 */
export async function emitPhaseGateModeDetected(
  repoPath: string,
  input: PhaseGateModeInput
): Promise<void> {
  if (!input.sliceId) return;
  const event: PhaseGateModeDetectedEvent = {
    type: "phase_gate_mode_detected",
    sliceId: input.sliceId,
    featureId: input.featureId ?? null,
    timestamp: input.timestamp ?? new Date().toISOString(),
    mode: input.mode
  };
  await appendSliceEvent(repoPath, input.sliceId, event);
}

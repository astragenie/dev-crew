// Shape-classified event emitter (M5 / L5-1).
//
// Wraps `appendSliceEvent` for the `shape_classified` slice-event type so the
// runner gets a structured payload at the moment classify-slice-shape decides
// the slice's shape + inline-path verdict. Mirrors the specialist-pause
// emitter pattern: thin wrapper, fail-silent inside `appendSliceEvent`,
// fan-out to webhook envelope kind `slice.shape_classified` handled by
// `slice-events::appendSliceEvent` itself.

import { appendSliceEvent, type ShapeClassifiedEvent } from "./slice-events.mjs";

/** Input for `emitShapeClassified`. */
export interface ShapeClassifiedInput {
  /** Optional feature id ("FEAT-NNN") — passed through to the event payload. */
  featureId?: string | null;
  /** Classified shape (e.g. "doc-update", "config-tweak", "none"). */
  shape: string;
  /** Human-readable rationale from `classifySliceShape`. */
  rationale: string;
  /** Whether the orchestrator will use the inline path for this slice. */
  inlinePathUsed: boolean;
  /** Optional ISO timestamp override (test seam). Defaults to `new Date().toISOString()`. */
  timestamp?: string;
}

/**
 * Emit a `shape_classified` slice-event.
 *
 * Best-effort by virtue of `appendSliceEvent` — never throws.
 */
export async function emitShapeClassified(
  repoPath: string,
  sliceId: string,
  input: ShapeClassifiedInput
): Promise<void> {
  const event: ShapeClassifiedEvent = {
    type: "shape_classified",
    sliceId,
    featureId: input.featureId ?? null,
    timestamp: input.timestamp ?? new Date().toISOString(),
    shape: input.shape,
    rationale: input.rationale,
    inlinePathUsed: input.inlinePathUsed
  };
  await appendSliceEvent(repoPath, sliceId, event);
}

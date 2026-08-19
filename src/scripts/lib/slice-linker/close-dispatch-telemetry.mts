// close-dispatch-telemetry.mts — FEAT-275 / SLICE-178.
//
// Wires pause-telemetry.mts's recordDispatchOutcome/recordPauseEvent into the
// slice-close ceremony. dispatch.mts (this module's sibling) only assembles
// a prompt string — it never awaits or observes a specialist's resolution,
// so it cannot be the source of a per-dispatch outcome. The real resolution
// signal available here is the gate derivation close-slice.mts already
// computes at close time (review-gate.mts / validation-gate.mts).
//
// SCOPE (post-review, FEAT-275 narrowed per reviewer finding #2): this module
// only ever sees the reviewer/validator TIER, derived from a gate's already-
// resolved state at close time. It has NO visibility into builder-tier
// dispatches (devcrew:fullstack-dev/frontend-dev/backend-dev) in the default
// (non-wave) orchestrator mode — docs/sop/specialist-pause-handling.md's own
// reproduction table shows THAT is the dominant, still-open pause case, and
// closing that gap requires a real-time signal (a SubagentStop report-gate
// hook — FEAT-259 slice 1, not built yet), not a retroactive gate read. The
// "Pause rate" snapshot bullet's wording (memory-snapshot.mts) says so
// explicitly so it never overstates coverage as fleet-wide.
//
// PAIRING DISCIPLINE (post-review, finding #1): `summarizePauseRate`'s
// `resumeSuccessRate` divides pause_event(kind=resume_success) by
// pause_event(kind=pause) over full history. The SOP's manual convention
// always writes those as a matched pair (detect, then resolve). This module
// only ever observes ONE snapshot in time (the gate's final state at close)
// — it never independently witnesses both a detection instant and a
// resolution instant. Emitting a "resume_success" here without ever having
// emitted a matching "pause" would inflate that ratio without bound (the
// reviewed bug). So this module NEVER emits kind: "resume_success" — a
// skip-badge resolution (Option B) is recorded as a "paused" dispatch_outcome
// only (real signal: this dispatch needed the fallback path), with no
// pause_event at all, since we didn't witness the fresh detection either.
// The one case that DOES emit a pause_event (kind: "pause") is a gate that is
// outright unsatisfied with no badge/artifact at all — that unresolved state
// is genuinely being witnessed right now, at close time, and recording it
// only grows the denominator (a conservative, never-inflating direction).
//
// Deliberately conservative: gate outcomes with no real evidence either way
// (an explicit `requires_review`/`requires_validation: false` waiver, the
// review-gate's absence-tolerant "unproven" fallthrough, the validation
// gate's review-delegation shortcut, or a skip-badge whose note does not
// actually cite a pause per reviewer finding #3 below) are NOT recorded —
// recording them would fabricate a dispatch that never happened.

import type { ReviewGateResult } from "../review-gate.mjs";
import type { DispatchOutcome, PauseDetection } from "../pause-telemetry.mjs";

export interface GateTelemetryDecision {
  /** False when the gate outcome carries no real dispatch evidence either way. */
  record: boolean;
  outcome: DispatchOutcome;
  /** True when a pause_event(kind="pause") should also be written (never "resume_success" — see module header). */
  emitPauseEvent: boolean;
}

const SKIPPED_BADGE_PREFIX_RE = /^workflow-state gate: (review|validation)_skipped/;

// FEAT-275 review finding #3: `*_skipped` is a general gate-skip escape
// valve — CLAUDE.md's reviewer-ladder docs and this repo's own
// `explicit-waiver:` branch confirm non-pause, policy-based skips exist too.
// Only count a skip badge as pause evidence when its note actually cites a
// pause, per docs/sop/specialist-pause-handling.md's own required-note
// schema (Section 1a's "paused"/"no artifact" framing, and the "Required
// --note content" section's expectation that a skip cites what was checked
// and why the skip is safe — a policy skip's note reads like that, not like
// a pause report).
const PAUSE_NOTE_KEYWORDS = [
  "paus", // paused / pausing / pause
  "no artifact",
  "no handoff",
  "stalled",
  "idle",
  "mid-sentence",
  "mid sentence",
  "did not return",
  "no response"
];

function noteIndicatesPause(reason: string): boolean {
  const lower = reason.toLowerCase();
  return PAUSE_NOTE_KEYWORDS.some((kw) => lower.includes(kw));
}

// FEAT-275 review finding #4: cheap detection-kind tightening — a skip
// badge's note occasionally echoes the SOP's own detection vocabulary
// (Section 1's "scaffold_in_progress"/"mid_sentence" symptoms); prefer that
// over the "no_artifact" default when the note actually says so. Anything
// else (including the gate-generated technical reasons like "no validation
// artifact under...") has no better fit than "no_artifact".
function detectionFromReason(reason: string): PauseDetection {
  const lower = reason.toLowerCase();
  if (lower.includes("scaffold")) return "scaffold_in_progress";
  if (lower.includes("mid-sentence") || lower.includes("mid sentence")) return "mid_sentence";
  return "no_artifact";
}

/**
 * Maps a review-gate/validation-gate result onto a pause-telemetry decision.
 * Pure function — no I/O — so the classification rules are unit-testable
 * without spinning up the full close ceremony.
 */
export function classifyGateForTelemetry(
  gate: Pick<ReviewGateResult, "satisfied" | "reason" | "unproven">
): GateTelemetryDecision {
  if (gate.reason.startsWith("explicit-waiver:")) {
    return { record: false, outcome: "completed", emitPauseEvent: false };
  }
  if (gate.unproven === true) {
    return { record: false, outcome: "completed", emitPauseEvent: false };
  }
  if (gate.reason.startsWith("review-badge:")) {
    // Validation delegated to an evidenced review approval — no validator
    // dispatch happened; the review gate's own classification already
    // records that dispatch separately.
    return { record: false, outcome: "completed", emitPauseEvent: false };
  }
  if (SKIPPED_BADGE_PREFIX_RE.test(gate.reason)) {
    if (!noteIndicatesPause(gate.reason)) {
      // Policy-based skip (e.g. scope waiver via mark-badge, not a pause) —
      // no dispatch evidence either way, same treatment as explicit-waiver.
      return { record: false, outcome: "completed", emitPauseEvent: false };
    }
    // Resolved-pause badge: record the "paused" outcome (this dispatch did
    // need the fallback path) but no pause_event — see module header on
    // pairing discipline (never emit an unpaired resume_success).
    return { record: true, outcome: "paused", emitPauseEvent: false };
  }
  if (gate.satisfied) {
    return { record: true, outcome: "completed", emitPauseEvent: false };
  }
  // Outright unsatisfied, no badge/artifact at all — a real unresolved state
  // witnessed right now; safe to record a "pause" (denominator-only, never
  // paired with a synthetic resume_success).
  return { record: true, outcome: "paused", emitPauseEvent: true };
}

/**
 * Records dispatch telemetry for one specialist role given its derived gate.
 * Best-effort per call — a telemetry write failure never blocks the close
 * ceremony (matches this file's own regenerateSnapshot precedent).
 */
export async function recordGateDispatchTelemetry(
  repoPath: string,
  sliceId: string,
  agentRole: string,
  gate: Pick<ReviewGateResult, "satisfied" | "reason" | "unproven">
): Promise<void> {
  const decision = classifyGateForTelemetry(gate);
  if (!decision.record) return;
  try {
    const { recordDispatchOutcome, recordPauseEvent } = await import("../pause-telemetry.mjs");
    await recordDispatchOutcome(repoPath, {
      sliceId,
      agentRole,
      outcome: decision.outcome
    });
    if (decision.emitPauseEvent) {
      await recordPauseEvent(repoPath, {
        sliceId,
        agentRole,
        kind: "pause",
        detection: detectionFromReason(gate.reason),
        notes: gate.reason.slice(0, 200)
      });
    }
  } catch (err) {
    console.warn(
      `[close-dispatch-telemetry] recording failed for ${agentRole} on ${sliceId} (non-fatal): ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
  }
}

/**
 * Derives the review + validation gates for a slice and records dispatch
 * telemetry for both specialist roles (devcrew:reviewer / devcrew:verifier).
 * Called once per single-shot close (closeSlice's --grade-yaml path) —
 * that is the actual "specialist dispatch completes" moment for the
 * ceremony. Never throws.
 */
export async function recordCloseDispatchTelemetry(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null,
  sliceFm: Record<string, any> | null
): Promise<void> {
  try {
    const { deriveReviewGate } = await import("../review-gate.mjs");
    const { deriveValidationGate } = await import("../validation-gate.mjs");

    const reviewGate = await deriveReviewGate(repoPath, sliceId, { sliceFm });
    await recordGateDispatchTelemetry(repoPath, sliceId, "devcrew:reviewer", reviewGate);

    const validationGate = await deriveValidationGate(repoPath, sliceId, { sliceFm, config });
    await recordGateDispatchTelemetry(repoPath, sliceId, "devcrew:verifier", validationGate);
  } catch (err) {
    console.warn(
      `[close-dispatch-telemetry] gate derivation failed for ${sliceId} (non-fatal): ` +
        `${err instanceof Error ? err.message : String(err)}`
    );
  }
}

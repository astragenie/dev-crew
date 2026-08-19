// GEPA trainset capture (FEAT-235, replaces memory-bridge.mts's emit()).
//
// Fire-and-forget consumer of the astramem capture surface for GEPA-shaped
// telemetry (slice close, phase-gate failure, slice start, recall usage).
// Provider-only: the CLI-spawn fallback that used to live in
// memory-bridge.mts's emit() was retired per FEAT-235 Decision 1 —
// @astragenie/astramem-client's resolveWireProvider() is a verified strict
// superset of the retired resolveCli() discovery chain (same
// CLAUDE_PLUGIN_ROOT_MEMORY env read, same where/which PATH probe gated by
// the same ASTRAMEM_DISABLE_PATH_PROBE flag, plus two earlier dep-mode
// strategies resolveCli() never had). See DEC-072.
//
// Fail-silent contract: emitGepaEvent() NEVER throws and NEVER blocks past
// its capMs (default DEFAULT_MEMORY_CAP_MS, DEC-071's shared cap policy —
// never a locally re-hardcoded literal). No provider discoverable -> no-op.
//
// FEAT-235 / DEC-072 also fixes a live bug: the pre-migration provider-path
// send set `type: payload.event` (a free GEPA vocabulary string —
// slice_close|phase_gate_fail|slice_started|triage_shift|recall_used),
// contradicting the #365 Q4 decision that the closed MemoryKind enum
// (decision|lesson|note|failure, memory-sink.mts's vocabulary) wins on the
// wire. GEPA_KIND_MAP below is the explicit, documented mapping.
//
// IMPORTANT — --metadata (buildGepaMetadata's output) is WRITE-ONLY.
// astramem's RecallHitSchema has no `metadata` field, so nothing placed here
// ever comes back out via recall, for any consumer. This is fine for GEPA's
// purpose: the GEPA optimizer reads its own local JSONL store (gepa-core
// file-store), never astramem, so recall fidelity through astramem was never
// required here. Do not "fix" recall later expecting these fields to
// reappear — that round trip does not exist.
//
// FEAT-263 follow-up (docs/sop/memory-bridge.md): GepaPayload gains optional
// `project`/`agent` fields so hook-independent (non-memory-sink) captures can
// attribute per-role too. Mirrors memory-sink.mts's CANARY-REVIEWER-8801
// tagging convention — sent both top-level (what a provider reading flat
// request fields sees) and mirrored into metadata (back-compat for providers
// that only read metadata). Additive only: existing callers that never set
// these fields see identical wire payloads to before this change.

import { randomUUID } from "node:crypto";

import type { MemoryKind } from "./memory-sink.mjs";
import { sanitizeArg, sanitizeContent } from "./memory-sanitize.mjs";
import { DEFAULT_MEMORY_CAP_MS, sendViaProvider } from "./memory-transport.mjs";

/** GEPA-shaped payload for memory ingestion (trainset-ready day 1). */
export interface GepaPayload {
  /** ISO 8601 timestamp. */
  ts: string;
  slice_id: string;
  feat_id: string;
  source: "close" | "phase-gate" | "start" | "triage" | "recall";
  event: "slice_close" | "phase_gate_fail" | "slice_started" | "triage_shift" | "recall_used";
  /** Composite grade score in range 0..1. */
  score: number;
  /** Human-readable lessons, surprises, or failing check summary. */
  feedback: string;
  /** Structured input context (AC text, dispatch instruction, etc.). */
  input: Record<string, unknown>;
  /** Structured output context (changed files, decisions, exit code, etc.). */
  output: Record<string, unknown>;
  /** Git sha7 of the dispatched agent file. */
  prompt_version: string;
  // ---------------------------------------------------------------------------
  // Scaffold for deferred reviewer + verifier hooks (runner-plugin#290).
  // Fields are optional — no callers in this slice. Reserved for the follow-up
  // dev-team integration described in docs/sop/cross-plugin-memory-hooks.md.
  // ---------------------------------------------------------------------------
  /** Agent id of the reviewer that produced a spec_review event (deferred). */
  reviewer_id?: string;
  /** Agent id of the verifier that produced a verify event (deferred). */
  verifier_id?: string;
  /** Per-AC pass/fail verdicts from a verifier run (deferred). */
  ac_results?: Array<{
    ac_id: string;
    status: "PASS" | "FAIL";
    evidence_file_line?: string;
  }>;
  // ---------------------------------------------------------------------------
  // FEAT-263 follow-up: optional project/agent attribution (see file header).
  // ---------------------------------------------------------------------------
  /** Astramem project tag (e.g. loop.json's memory.project / productName). */
  project?: string;
  /** Producing-agent role tag (e.g. "devcrew:builder", "devcrew:fullstack-dev"). */
  agent?: string;
}

/**
 * GepaPayload.event -> MemoryKind (FEAT-235 / DEC-072). Derived from each
 * call site's actual content, not just the event name:
 *   slice_close     -> lesson   (buildCloseFeedback is dominated by
 *                                lessons_learned/surprises)
 *   phase_gate_fail -> failure  (direct semantic match)
 *   slice_started   -> note     (purely informational bookkeeping)
 *   recall_used     -> note     (telemetry, not a decision/lesson/failure)
 *   triage_shift     -> decision (zero current callers — forward-compat only)
 */
const GEPA_KIND_MAP: Record<GepaPayload["event"], MemoryKind> = {
  slice_close: "lesson",
  phase_gate_fail: "failure",
  slice_started: "note",
  recall_used: "note",
  triage_shift: "decision"
};

// Caps for the summarized `input`/`output` blocks folded into metadata.
// Both fields are caller-supplied `Record<string, unknown>` of unbounded
// shape (AC text, changed-file lists, dispatch instructions, ...); these
// caps keep the summarized JSON bounded regardless of what a caller passes.
const METADATA_STRING_CAP = 300;
const METADATA_ARRAY_CAP = 10;
const METADATA_KEY_CAP = 20;
const METADATA_DEPTH_CAP = 3;

/** Recursively cap a structured value (payload.input / payload.output) so an
 * arbitrarily large caller-supplied object can never blow up the metadata
 * payload: strings are sanitized + capped, arrays/objects are capped by
 * length/key-count, and depth bottoms out at a truncation marker rather than
 * recursing unbounded. */
function summarizeStructured(value: unknown, depth = 0): unknown {
  if (depth >= METADATA_DEPTH_CAP) return "[capped: max depth]";
  if (typeof value === "string") return sanitizeContent(value, METADATA_STRING_CAP);
  if (Array.isArray(value)) {
    return value.slice(0, METADATA_ARRAY_CAP).map((item) => summarizeStructured(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>).slice(
      0,
      METADATA_KEY_CAP
    )) {
      out[sanitizeArg(key, 64)] = summarizeStructured(val, depth + 1);
    }
    return out;
  }
  return value; // number | boolean | null | undefined pass through as-is.
}

/** Bounded GEPA metadata block sent alongside the mapped MemoryKind. Pure —
 * no I/O. */
export function buildGepaMetadata(payload: GepaPayload): Record<string, unknown> {
  return {
    sliceId: payload.slice_id,
    featId: payload.feat_id,
    score: payload.score,
    phase: payload.event,
    source: payload.source,
    prompt_version: payload.prompt_version,
    input: summarizeStructured(payload.input),
    output: summarizeStructured(payload.output),
    ...(payload.project ? { project: sanitizeArg(payload.project) } : {}),
    ...(payload.agent ? { agent: sanitizeArg(payload.agent) } : {})
  };
}

/**
 * Emit a GEPA payload to astramem via the shared provider transport.
 * Fire-and-forget, capped at `capMs` (default DEFAULT_MEMORY_CAP_MS, the
 * DEC-071 shared cap policy). Swallows ALL errors — resolution failure,
 * provider rejection, cap exceeded, serialisation. Never throws.
 */
export async function emitGepaEvent(payload: GepaPayload, capMs?: number): Promise<void> {
  try {
    await sendViaProvider(
      {
        id: randomUUID(),
        type: GEPA_KIND_MAP[payload.event],
        text: sanitizeContent(payload.feedback),
        metadata: buildGepaMetadata(payload),
        ...(payload.project ? { project: sanitizeArg(payload.project) } : {}),
        ...(payload.agent ? { agent: sanitizeArg(payload.agent) } : {})
      },
      capMs ?? DEFAULT_MEMORY_CAP_MS
    );
  } catch {
    // Fail-silent: any error (including serialisation) is swallowed.
  }
}

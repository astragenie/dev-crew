// Close-time structured memory capture (FEAT-263 program: T2 structured
// learnings + Phase 3b outcome-weighted batch credit — see
// docs/sop/memory-bridge.md "Structured learnings + outcome-weighted credit
// at close" and .claude/artifacts/crew/runs/20260716T110000Z-plan-memory-credit-loop-ceremony-neutral.md).
//
// Two independent, fail-silent, ceremony-neutral capture paths invoked from
// completeSlice() near its other best-effort memory touchpoints
// (submitSliceProfileFeedback):
//
//   - captureStructuredLearnings: an operator/orchestrator-supplied
//     `--learnings <file.json>` (array of {type, text, why?}, cap 3) is
//     validated defensively and written through memory-sink.mts's existing
//     recordMemory() core — inherits project/agent/scope:team tagging and
//     the noise guard (PRs #515/#517) for free. Fires regardless of slice
//     outcome: capturing an insight is valuable even on a FAIL.
//   - submitCloseMemoryCredit: an operator/orchestrator-supplied
//     `--memories-used <file.json>` (array of memory ids) is credited via
//     the shared @astragenie/astramem-client feedbackSilent() seam, ONE
//     shared wallclock budget for the whole batch (never per-id re-granted).
//     Outcome-weighted: skipped entirely on a FAIL slice so memories that
//     steered a bad outcome are never reinforced.
//
// Both respect the `memory.enabled: "never"` kill switch (via
// memory-sink.mts's readMemoryConfig — consumed, never modified) and never
// throw or block the close ceremony.

import fs from "node:fs/promises";

import type { AgentType, MemoryKind, RecordResult } from "../memory-sink.mjs";
import { pickBuilderVariant, type BuilderVariant } from "./dispatch.mjs";

// ---------------------------------------------------------------------------
// T2 — structured learnings capture
// ---------------------------------------------------------------------------

export type LearningType = "lesson" | "decision" | "fact";

export interface LearningEntry {
  type: LearningType;
  text: string;
  why?: string;
}

/** Cap on structured learnings per close (T2 contract). */
export const MAX_LEARNINGS = 3;

const VALID_LEARNING_TYPES = new Set<LearningType>(["lesson", "decision", "fact"]);

// T2 has no dedicated "fact" kind on memory-sink's closed MemoryKind wire
// vocabulary (decision|lesson|note|failure) — facts are informational,
// closest to "note" (mirrors memory-gepa.mts's GEPA_KIND_MAP treatment of
// purely-informational events). Design judgment call, documented in the SOP.
const LEARNING_KIND_MAP: Record<LearningType, MemoryKind> = {
  lesson: "lesson",
  decision: "decision",
  fact: "note"
};

/** Validates + normalizes a single raw learnings-array item. Returns null for
 * anything malformed (wrong/missing type, empty/non-string text) — extracted
 * out of readLearningsFile to keep its own complexity low. */
function parseLearningEntry(item: unknown): LearningEntry | null {
  if (!item || typeof item !== "object") return null;
  const { type, text, why } = item as Record<string, unknown>;
  if (typeof type !== "string" || !VALID_LEARNING_TYPES.has(type as LearningType)) return null;
  if (typeof text !== "string" || text.trim().length === 0) return null;
  return {
    type: type as LearningType,
    text,
    ...(typeof why === "string" && why.trim().length > 0 ? { why } : {})
  };
}

/**
 * Reads + validates a `--learnings` JSON file. Fail-silent: a missing file,
 * unparseable JSON, or a non-array body all resolve to `[]` rather than
 * throwing. Invalid individual entries (wrong type, empty/non-string text)
 * are skipped rather than rejecting the whole file. Silently caps at
 * MAX_LEARNINGS entries (first N wins) rather than rejecting an oversized
 * array outright — the cap is enforcement, not a validation failure.
 */
export async function readLearningsFile(filePath: string): Promise<LearningEntry[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const valid: LearningEntry[] = [];
    for (const item of parsed) {
      if (valid.length >= MAX_LEARNINGS) break;
      const entry = parseLearningEntry(item);
      if (entry) valid.push(entry);
    }
    return valid;
  } catch {
    return [];
  }
}

/** Mirrors memory-sink.mts's private traceTag() — kept local rather than
 * exported from the forbidden-to-modify memory-sink.mts. */
function buildTraceTag(featureId?: string | null, sliceId?: string | null): string {
  const parts = [featureId, sliceId].filter(
    (p): p is string => typeof p === "string" && p.length > 0
  );
  return parts.length > 0 ? ` [${parts.join("/")}]` : "";
}

export interface CaptureStructuredLearningsOptions {
  repoPath: string;
  sliceId: string;
  featureId?: string | null;
  /** Path to a `--learnings <file.json>` input. Null/absent -> no-op. */
  learningsPath?: string | null;
  /** Producing-agent attribution (--learnings-agent, or a derived default). */
  agentType?: AgentType | null;
  /** Raw resolved loop.json-shaped config (same object completeSlice already
   * threads to sibling best-effort calls) — read once via readMemoryConfig. */
  resolvedConfig?: Record<string, any> | null;
}

export interface CaptureStructuredLearningsResult {
  recorded: number;
  skipped: number;
  /** Per-entry outcome, for test visibility into skip reasons (e.g. "noise"). */
  results: Array<{ type: LearningType; recordResult: RecordResult }>;
}

/**
 * Capture structured learnings supplied at slice close. Fires regardless of
 * gate/grade outcome (a lesson from a FAIL is still worth keeping). Never
 * throws; any failure resolves to a zero/empty result.
 */
export async function captureStructuredLearnings(
  opts: CaptureStructuredLearningsOptions
): Promise<CaptureStructuredLearningsResult> {
  const empty: CaptureStructuredLearningsResult = { recorded: 0, skipped: 0, results: [] };
  try {
    if (!opts.learningsPath) return empty;
    const entries = await readLearningsFile(opts.learningsPath);
    if (entries.length === 0) return empty;

    const { readMemoryConfig, recordMemory } = await import("../memory-sink.mjs");
    const memCfg = await readMemoryConfig(opts.repoPath, opts.resolvedConfig ?? null);

    let recorded = 0;
    let skipped = 0;
    const results: CaptureStructuredLearningsResult["results"] = [];
    for (const entry of entries) {
      const content = `${entry.text}${entry.why ? ` — ${entry.why}` : ""}${buildTraceTag(
        opts.featureId,
        opts.sliceId
      )}`;
      const recordResult = await recordMemory(opts.repoPath, {
        kind: LEARNING_KIND_MAP[entry.type],
        content,
        agentType: opts.agentType ?? undefined,
        config: memCfg
      });
      results.push({ type: entry.type, recordResult });
      if (recordResult.recorded) recorded += 1;
      else skipped += 1;
    }
    return { recorded, skipped, results };
  } catch {
    return empty;
  }
}

// ---------------------------------------------------------------------------
// Builder-role attribution default (T2 "--learnings-agent, else derive")
// ---------------------------------------------------------------------------

const VARIANT_TO_AGENT: Partial<Record<BuilderVariant, string>> = {
  frontend: "crew:frontend-dev",
  backend: "crew:backend-dev",
  fullstack: "crew:fullstack-dev",
  "parallel-fe-be": "crew:fullstack-dev"
};

/**
 * Best-effort default for the producing-agent attribution when
 * `--learnings-agent` is not supplied: derive from the slice's own
 * frontmatter tags via the same pickBuilderVariant() dispatch.mts already
 * uses at dispatch time. Returns null (omit attribution) for "unknown" —
 * dispatch.mts treats "unknown" as a safe superset fallback to fullstack,
 * not a confirmed signal, so defaulting attribution off it would misattribute.
 */
export function deriveDefaultLearningsAgent(
  sliceFm: Record<string, any> | null | undefined,
  loopConfig: Record<string, any> | null = null
): string | null {
  try {
    const variant = pickBuilderVariant(sliceFm?.tags ?? null, loopConfig);
    return VARIANT_TO_AGENT[variant] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 3b — outcome-weighted batch credit
// ---------------------------------------------------------------------------

/** Default shared wallclock budget (ms) for the WHOLE --memories-used batch —
 * not re-granted per id. Overridable via `memory.creditBatchCapMs`. */
export const DEFAULT_CREDIT_BATCH_CAP_MS = 5000;

async function readIdsFile(filePath: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const ids = parsed.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    return Array.from(new Set(ids));
  } catch {
    return [];
  }
}

export interface SubmitCloseMemoryCreditOptions {
  repoPath: string;
  sliceId: string;
  /** Path to a `--memories-used <file.json>` input. Null/absent -> no-op. */
  memoriesUsedPath?: string | null;
  /** True only when the slice closed with a clean grade/gate outcome. */
  passed: boolean;
  resolvedConfig?: Record<string, any> | null;
}

export type CreditSkipReason = "outcome-fail" | "disabled" | "empty";

export interface SubmitCloseMemoryCreditResult {
  credited: string[];
  skippedReason?: CreditSkipReason;
}

/**
 * Batch-credit `--memories-used` ids at close, outcome-weighted: on a FAIL
 * slice, crediting is skipped entirely (memories that steered a bad outcome
 * must never be reinforced) — this is a hard skip, not a down-weight, v1.
 * All ids share ONE deadline envelope (DEFAULT_CREDIT_BATCH_CAP_MS by
 * default) so an unresponsive daemon can never make the batch cost grow
 * with id count. Never throws.
 */
export async function submitCloseMemoryCredit(
  opts: SubmitCloseMemoryCreditOptions
): Promise<SubmitCloseMemoryCreditResult> {
  try {
    if (!opts.memoriesUsedPath) return { credited: [], skippedReason: "empty" };
    if (!opts.passed) return { credited: [], skippedReason: "outcome-fail" };

    const { readMemoryConfig } = await import("../memory-sink.mjs");
    const memCfg = await readMemoryConfig(opts.repoPath, opts.resolvedConfig ?? null);
    if (memCfg.mode === "off") return { credited: [], skippedReason: "disabled" };

    const ids = await readIdsFile(opts.memoriesUsedPath);
    if (ids.length === 0) return { credited: [], skippedReason: "empty" };

    const budgetMs =
      typeof opts.resolvedConfig?.memory?.creditBatchCapMs === "number" &&
      opts.resolvedConfig.memory.creditBatchCapMs > 0
        ? opts.resolvedConfig.memory.creditBatchCapMs
        : DEFAULT_CREDIT_BATCH_CAP_MS;
    const deadline = Date.now() + budgetMs;

    const { feedbackSilent } = await import("@astragenie/astramem-client");
    const credited: string[] = [];
    for (const id of ids) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      try {
        const ok = await feedbackSilent(id, { capMs: remaining });
        if (ok) credited.push(id);
      } catch {
        // per-id fail-silent — one bad id must not abort the batch
      }
    }
    return { credited };
  } catch {
    return { credited: [] };
  }
}

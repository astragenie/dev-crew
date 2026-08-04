import fs from "node:fs/promises";
import path from "node:path";

import { appendJsonl } from "./jsonl-append.mjs";

// pause-telemetry.mts — structured pause/retry telemetry (FEAT-212).
//
// Two event kinds share one append-only JSONL file:
//   - "pause_event"     — one row per detection/resolution step of the
//                          specialist-pause SOP (docs/sop/specialist-pause-handling.md).
//   - "dispatch_outcome" — one row per specialist dispatch, whether it
//                          completed cleanly or paused. This is the
//                          denominator that makes pauseRate a real rate
//                          (per-dispatch) rather than a per-slice incidence
//                          count (see FEAT-212 Problem statement).
//
// Read side (summarizePauseRate) is tail-safe: a missing file or malformed
// lines never throw — callers (brief/snapshot rendering) treat "no data"
// as "omit the section", never as an error.

export type PauseEventKind = "pause" | "resume" | "resume_success" | "pickup";
export type PauseDetection = "no_artifact" | "scaffold_in_progress" | "mid_sentence";
export type DispatchOutcome = "completed" | "paused";

export interface PauseEventInput {
  ts?: string;
  sliceId?: string;
  agentRole: string;
  dispatchId?: string;
  kind: PauseEventKind;
  detection: PauseDetection;
  notes?: string;
}

export interface DispatchOutcomeInput {
  ts?: string;
  agentRole: string;
  sliceId?: string;
  outcome: DispatchOutcome;
}

export interface PauseEventRecord
  extends Required<Pick<PauseEventInput, "ts" | "agentRole" | "kind" | "detection">> {
  type: "pause_event";
  sliceId?: string;
  dispatchId?: string;
  notes?: string;
}

export interface DispatchOutcomeRecord
  extends Required<Pick<DispatchOutcomeInput, "ts" | "agentRole" | "outcome">> {
  type: "dispatch_outcome";
  sliceId?: string;
}

export type PauseTelemetryRecord = PauseEventRecord | DispatchOutcomeRecord;

export interface PauseRateSummary {
  dispatches: number;
  pauses: number;
  pauseRate: number;
  resumeSuccessRate: number;
}

const PAUSE_EVENTS_RELATIVE = [".claude", "artifacts", "loop", "pause-events.jsonl"];

export function pauseEventsPath(repoPath: string): string {
  return path.join(repoPath, ...PAUSE_EVENTS_RELATIVE);
}

/** Append one pause/resolution-step event (SOP detection step, Section 1-2). */
export async function recordPauseEvent(repoPath: string, event: PauseEventInput): Promise<void> {
  const record: PauseEventRecord = {
    type: "pause_event",
    ts: event.ts ?? new Date().toISOString(),
    agentRole: event.agentRole,
    kind: event.kind,
    detection: event.detection,
    ...(event.sliceId !== undefined ? { sliceId: event.sliceId } : {}),
    ...(event.dispatchId !== undefined ? { dispatchId: event.dispatchId } : {}),
    ...(event.notes !== undefined ? { notes: event.notes } : {})
  };
  await appendJsonl(pauseEventsPath(repoPath), record);
}

/** Append one per-dispatch outcome — the denominator for a real pause rate. */
export async function recordDispatchOutcome(
  repoPath: string,
  event: DispatchOutcomeInput
): Promise<void> {
  const record: DispatchOutcomeRecord = {
    type: "dispatch_outcome",
    ts: event.ts ?? new Date().toISOString(),
    agentRole: event.agentRole,
    outcome: event.outcome,
    ...(event.sliceId !== undefined ? { sliceId: event.sliceId } : {})
  };
  await appendJsonl(pauseEventsPath(repoPath), record);
}

// Tail-safe read: missing file -> []; malformed lines skipped individually
// rather than failing the whole read (mirrors telemetry.mts:readEvents).
async function readPauseTelemetry(repoPath: string): Promise<PauseTelemetryRecord[]> {
  let content: string;
  try {
    content = await fs.readFile(pauseEventsPath(repoPath), "utf8");
  } catch {
    return [];
  }
  const records: PauseTelemetryRecord[] = [];
  for (const line of content.split("\n")) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line);
      if (parsed && (parsed.type === "pause_event" || parsed.type === "dispatch_outcome")) {
        records.push(parsed as PauseTelemetryRecord);
      }
    } catch {
      /* skip malformed line */
    }
  }
  return records;
}

// Exported tail-safe reader — FEAT-221's FailureClassifier needs the raw
// event stream (not just the pauseRate aggregate) to build per-signal
// failure clusters. Same missing-file/malformed-line tolerance as the
// private summarizePauseRate path above.
export async function listPauseTelemetry(repoPath: string): Promise<PauseTelemetryRecord[]> {
  return readPauseTelemetry(repoPath);
}

/**
 * Summarize the pause rate over the last `windowN` dispatch outcomes
 * (default: all). `pauseRate` = paused dispatches / total dispatches in
 * the window. `resumeSuccessRate` = resume_success pause-events / pause
 * pause-events, over the full event history (not windowed — resolution
 * steps are sparse enough that windowing by dispatch count would starve
 * the denominator).
 */
// FEAT-275 / SLICE-178: staleness guard for the "Pause rate" snapshot bullet.
// Mirrors blocked-badge-staleness.mts's shape (a `loop.<name>` numeric-days
// config field, resolved with a fallback default, age computed from a
// record timestamp) — the only existing timestamp-age staleness convention
// in this codebase; there is no dedicated "cost-trajectory" time-based
// staleness to reuse, only a count-window (see memory-snapshot.mts's
// PAUSE_RATE_WINDOW comment). Default mirrors `loop.dispatch.pruneStaleAfterDays`
// (7d), the other "how stale is too stale" constant already rendered
// alongside this bullet in the same Loop telemetry section.
export const DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface PauseTelemetryStaleness {
  /** True when there is no data at all, or the newest record is older than the threshold. */
  stale: boolean;
  /** ISO timestamp of the newest record, or null when no records exist. */
  newestTs: string | null;
  thresholdDays: number;
}

/** Reads `loop.pauseTelemetryStaleAfterDays` off an already-resolved config object. */
export function resolvePauseTelemetryStaleAfterDays(config: Record<string, any> | null): number {
  const raw = config?.loop?.pauseTelemetryStaleAfterDays;
  return typeof raw === "number" && Number.isFinite(raw) && raw > 0
    ? raw
    : DEFAULT_PAUSE_TELEMETRY_STALE_AFTER_DAYS;
}

/**
 * Tail-safe (mirrors summarizePauseRate's contract, module header above): a
 * missing/empty/malformed pause-events.jsonl never throws — it returns
 * `{ stale: true, newestTs: null }`, which callers render as "no data"
 * rather than a fabricated rate. Only checked when the caller already knows
 * dispatch data exists (memory-snapshot.mts gates on `dispatches > 0` first)
 * so this "no records" branch is a defensive fallback, not the primary path.
 */
export async function evaluatePauseTelemetryStaleness(
  repoPath: string,
  config: Record<string, any> | null,
  now: number = Date.now()
): Promise<PauseTelemetryStaleness> {
  const thresholdDays = resolvePauseTelemetryStaleAfterDays(config);
  const records = await readPauseTelemetry(repoPath);
  if (records.length === 0) {
    return { stale: true, newestTs: null, thresholdDays };
  }
  let newestTs = records[0]!.ts;
  for (const r of records) {
    if (r.ts > newestTs) newestTs = r.ts;
  }
  const newestMs = Date.parse(newestTs);
  if (Number.isNaN(newestMs)) {
    return { stale: true, newestTs, thresholdDays };
  }
  const ageDays = (now - newestMs) / MS_PER_DAY;
  return { stale: ageDays >= thresholdDays, newestTs, thresholdDays };
}

export async function summarizePauseRate(
  repoPath: string,
  windowN?: number
): Promise<PauseRateSummary> {
  const records = await readPauseTelemetry(repoPath);

  const outcomes = records.filter((r): r is DispatchOutcomeRecord => r.type === "dispatch_outcome");
  const windowed = typeof windowN === "number" && windowN > 0 ? outcomes.slice(-windowN) : outcomes;

  const dispatches = windowed.length;
  const pauses = windowed.filter((r) => r.outcome === "paused").length;
  const pauseRate = dispatches === 0 ? 0 : pauses / dispatches;

  const pauseEvents = records.filter((r): r is PauseEventRecord => r.type === "pause_event");
  const pauseKindCount = pauseEvents.filter((r) => r.kind === "pause").length;
  const resumeSuccessCount = pauseEvents.filter((r) => r.kind === "resume_success").length;
  const resumeSuccessRate = pauseKindCount === 0 ? 0 : resumeSuccessCount / pauseKindCount;

  return { dispatches, pauses, pauseRate, resumeSuccessRate };
}

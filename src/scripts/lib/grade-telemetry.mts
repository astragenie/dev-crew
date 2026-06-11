import fs from "node:fs/promises";
import path from "node:path";

import { detectSerialReviewer } from "./reviewer-timing.mjs";

// Telemetry helpers for grade frontmatter timing.* fields (FEAT-184 / SLICE-92).
//
// All reads are best-effort: missing files or malformed data produce null
// rather than throwing. Callers (grade-writer) should treat null as "not
// measured yet" and leave the frontmatter field as-is (null placeholder from
// SLICE-91).

// --------------------------------------------------------------------------
// Wall-clock seconds: time from "slice start" log event to now.
// --------------------------------------------------------------------------

export async function computeWallClockSeconds(
  repoPath: string,
  sliceId: string
): Promise<number | null> {
  const logPath = path.join(repoPath, ".claude", "logs", "loop.jsonl");
  let content: string;
  try {
    content = await fs.readFile(logPath, "utf8");
  } catch {
    return null;
  }
  const lines = content.split("\n").filter((l) => l.trim());
  let lastStartTs: number | null = null;
  for (const line of lines) {
    let event: Record<string, unknown>;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.command === "slice start" && event.slice === sliceId) {
      const ts = typeof event.timestamp === "string" ? Date.parse(event.timestamp) : NaN;
      if (!Number.isNaN(ts)) lastStartTs = ts;
    }
  }
  if (lastStartTs === null) return null;
  return (Date.now() - lastStartTs) / 1000;
}

// --------------------------------------------------------------------------
// Phase-gate parallel: was the phase gate run in parallel mode?
// --------------------------------------------------------------------------

export async function readPhaseGateParallel(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<boolean | null> {
  const artifactDir = path.resolve(
    repoPath,
    config?.loop?.phaseGateArtifactDir ?? ".claude/artifacts/crew/validations"
  );
  // Derive filename slug from sliceId using the same transform as phase-gate.mts
  const slug = sliceId.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const filename = `phase${slug}-gate.md`;
  const target = path.join(artifactDir, filename);
  let first: string;
  try {
    const raw = await fs.readFile(target, "utf8");
    first = raw.split("\n")[0]?.trim() ?? "";
  } catch {
    return null;
  }
  if (first.startsWith("# Phase Gate Report (parallel)")) return true;
  if (first.startsWith("# Phase Gate Report")) return false;
  return null;
}

// --------------------------------------------------------------------------
// Reviewer span: wraps detectSerialReviewer.
// --------------------------------------------------------------------------

export type ReviewerSpanResult = {
  spanMs: number;
  serial: boolean;
};

export async function computeReviewerSpan(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<ReviewerSpanResult> {
  const thresholdMs = config?.reviewers?.serialTimingThresholdMs ?? 90000;
  const result = await detectSerialReviewer(repoPath, sliceId, { thresholdMs });
  return { spanMs: result.spanMs, serial: result.serial };
}

// --------------------------------------------------------------------------
// Telemetry aggregate.
// --------------------------------------------------------------------------

export type GradeTelemetry = {
  wall_clock_seconds: number | null;
  phase_gate_parallel: boolean | null;
  reviewer_span_ms: number | null;
  serial_reviewer_warning: boolean | null;
};

export async function computeTelemetry(
  repoPath: string,
  sliceId: string,
  config: Record<string, any> | null
): Promise<GradeTelemetry> {
  const [wallClock, phaseGateParallel, reviewerSpan] = await Promise.all([
    computeWallClockSeconds(repoPath, sliceId),
    readPhaseGateParallel(repoPath, sliceId, config),
    computeReviewerSpan(repoPath, sliceId, config)
  ]);
  return {
    wall_clock_seconds: wallClock,
    phase_gate_parallel: phaseGateParallel,
    reviewer_span_ms: reviewerSpan.spanMs > 0 ? reviewerSpan.spanMs : null,
    serial_reviewer_warning: reviewerSpan.spanMs > 0 ? reviewerSpan.serial : null
  };
}

// --------------------------------------------------------------------------
// Apply telemetry into frontmatter.timing map (idempotent).
// Only overwrites null / missing fields — never clobbers an existing value.
// --------------------------------------------------------------------------

export function applyTelemetry(
  timing: Record<string, unknown>,
  telemetry: GradeTelemetry
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...timing };
  for (const [key, value] of Object.entries(telemetry)) {
    if (value !== null && value !== undefined) {
      // Only write when current value is unset (null, undefined) or is the
      // boolean template seed (false). The grade template seeds boolean timing
      // fields as `false` — not `null` — as a YAML placeholder. We treat that
      // seed as "not yet measured" and overwrite it once. A populated numeric
      // value or an already-computed `true` is never clobbered (idempotency).
      const current = out[key];
      const isUnset = current === null || current === undefined || current === false;
      if (isUnset) {
        out[key] = value;
      }
    }
  }
  return out;
}

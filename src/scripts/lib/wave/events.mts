// src/scripts/lib/wave/events.mts
// Append-only event stream per wave run. Lands at
// .claude/artifacts/loop/waves/<waveId>/events.jsonl.
// Parallel to slice-events.mts but at wave granularity, so dashboards
// can chart wave throughput / failure rate / time-to-finalize without
// stitching together the JSON snapshots.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

export type WaveEventType =
  | "wave_started"
  | "plan_built"
  | "wave_dispatched"
  | "wave_finalized"
  | "post_merge_test"
  | "wave_pivoted"
  | "wave_completed";

export interface WaveEventBase {
  type: WaveEventType;
  waveId: string;
  timestamp: string;
}

export interface WaveStartedEvent extends WaveEventBase {
  type: "wave_started";
}

export interface PlanBuiltEvent extends WaveEventBase {
  type: "plan_built";
  size: number;
  rejectedCount: number;
}

export interface WaveDispatchedEvent extends WaveEventBase {
  type: "wave_dispatched";
  runId: string;
  sliceIds: string[];
}

export interface WaveFinalizedEvent extends WaveEventBase {
  type: "wave_finalized";
  merged: string[];
  conflicts: string[];
  failed: string[];
}

export interface PostMergeTestEvent extends WaveEventBase {
  type: "post_merge_test";
  status: "PASS" | "FAIL" | "skipped";
}

export interface WavePivotedEvent extends WaveEventBase {
  type: "wave_pivoted";
  pivots: Array<{ sliceId: string; kind: string }>;
}

export interface WaveCompletedEvent extends WaveEventBase {
  type: "wave_completed";
  haltReason: string | null;
  durationMs: number;
  passCount: number;
  failCount: number;
}

export type WaveEvent =
  | WaveStartedEvent
  | PlanBuiltEvent
  | WaveDispatchedEvent
  | WaveFinalizedEvent
  | PostMergeTestEvent
  | WavePivotedEvent
  | WaveCompletedEvent;

export function waveEventsPath(repoRoot: string, artifactsRoot: string, waveId: string): string {
  return join(repoRoot, artifactsRoot, waveId, "events.jsonl");
}

/**
 * Append one wave event to the run's events.jsonl. Never throws — telemetry
 * must not crash the wave runner.
 */
export function appendWaveEvent(
  repoRoot: string,
  artifactsRoot: string,
  event: WaveEvent
): boolean {
  try {
    const path = waveEventsPath(repoRoot, artifactsRoot, event.waveId);
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(path, JSON.stringify(event) + "\n", "utf8");
    return true;
  } catch {
    return false;
  }
}

export function readWaveEvents(
  repoRoot: string,
  artifactsRoot: string,
  waveId: string
): WaveEvent[] {
  const path = waveEventsPath(repoRoot, artifactsRoot, waveId);
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as WaveEvent);
}

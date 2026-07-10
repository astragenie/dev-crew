// src/scripts/lib/wave/events.mts
// Append-only event stream per wave run. Lands at
// .claude/artifacts/loop/waves/<waveId>/events.jsonl.
// Parallel to slice-events.mts but at wave granularity, so dashboards
// can chart wave throughput / failure rate / time-to-finalize without
// stitching together the JSON snapshots.

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { appendJsonlSync } from "../jsonl-append.mjs";
import { fanoutEnvelope } from "../webhook-fanout.mjs";

export type WaveEventType =
  | "wave_started"
  | "plan_built"
  | "wave_dispatched"
  | "wave_finalized"
  | "post_merge_test"
  | "wave_pivoted"
  | "wave_completed"
  | "wave_member_slice"
  | "worktree_cleaned"
  | "merge_conflict_detail";

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

export interface WaveMemberSliceEvent extends WaveEventBase {
  type: "wave_member_slice";
  sliceId: string;
  position: number; // 0-based position within the wave
}

export interface WorktreeCleanedEvent extends WaveEventBase {
  type: "worktree_cleaned";
  sliceId: string;
  branch: string;
  path: string;
  status: "ok" | "force_removed" | "skipped";
}

export interface MergeConflictDetailEvent extends WaveEventBase {
  type: "merge_conflict_detail";
  sliceId: string;
  conflictedPaths: string[];
  baseSha?: string;
  headSha?: string;
}

export type WaveEvent =
  | WaveStartedEvent
  | PlanBuiltEvent
  | WaveDispatchedEvent
  | WaveFinalizedEvent
  | PostMergeTestEvent
  | WavePivotedEvent
  | WaveCompletedEvent
  | WaveMemberSliceEvent
  | WorktreeCleanedEvent
  | MergeConflictDetailEvent;

export function waveEventsPath(repoRoot: string, artifactsRoot: string, waveId: string): string {
  return join(repoRoot, artifactsRoot, waveId, "events.jsonl");
}

/**
 * Append one wave event to the run's events.jsonl. Never throws — telemetry
 * must not crash the wave runner. After the JSONL write, also fans the
 * event out to the runner webhook (M2). Returns true when the JSONL write
 * succeeded; webhook fanout is fire-and-forget and never affects the return.
 */
export async function appendWaveEvent(
  repoRoot: string,
  artifactsRoot: string,
  event: WaveEvent
): Promise<boolean> {
  let ok = true;
  try {
    const path = waveEventsPath(repoRoot, artifactsRoot, event.waveId);
    appendJsonlSync(path, event);
  } catch {
    ok = false;
  }

  // M2: also fan out to runner via webhook if configured. Fail-silent.
  const kind = `wave.${event.type}`;
  const { type: _t, ...payload } = event;
  await fanoutEnvelope(repoRoot, kind, payload as Record<string, unknown>);

  return ok;
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

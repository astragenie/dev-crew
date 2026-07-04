import fs from "node:fs/promises";
import path from "node:path";
import { TRAJECTORY_DIR } from "./trajectory-writer.mjs";
import { fanoutEnvelope } from "./webhook-fanout.mjs";

export type WorkflowState = "building" | "reviewing" | "validating" | "done" | "blocked";
export type GateName =
  | "review"
  | "validation"
  | "deployment"
  | "blocked"
  | "simplify"
  | "test-adequacy";
export type GateState = "open" | "passed" | "failed" | "skipped";
export type SliceEventType =
  | "workflow_state_changed"
  | "gate_transition"
  | "agent_dispatched"
  | "agent_completed"
  | "agent_error"
  | "specialist_pause"
  | "shape_classified"
  | "phase_gate_mode_detected"
  | "slice_force_closed";

export interface SliceEventBase {
  type: SliceEventType;
  sliceId: string;
  featureId: string | null;
  timestamp: string;
}

export interface WorkflowStateChangedEvent extends SliceEventBase {
  type: "workflow_state_changed";
  from: WorkflowState | null;
  to: WorkflowState;
}

export interface GateTransitionEvent extends SliceEventBase {
  type: "gate_transition";
  gate: GateName;
  from: string | null;
  to: GateState;
  reason?: string;
}

export interface AgentDispatchedEvent extends SliceEventBase {
  type: "agent_dispatched";
  agent: string;
  parentCommand: string;
  /** ISO timestamp at moment of dispatch — populated by emit sites (M3 / L3-1). */
  dispatchedAt?: string;
}

export interface AgentCompletedEvent extends SliceEventBase {
  type: "agent_completed";
  agent: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  durationMs: number;
  /** ISO timestamp of first observable output (if available) — M3 / L3-1. */
  firstOutputAt?: string;
  /** Number of tool calls the agent made during the dispatch — M3 / L3-1. */
  toolCalls?: number;
}

export interface AgentErrorEvent extends SliceEventBase {
  type: "agent_error";
  agent: string;
  error: string;
  reason?: string;
}

/**
 * Specialist subagent (builder / reviewer / validator) paused without writing
 * its mandated artifact. Surfaces the SOP pattern in `docs/sop/specialist-pause-handling.md`
 * so the runner can observe pause incidents in real time. Emitted by
 * `lib/specialist-pause-detector.mts::emitSpecialistPause`.
 */
export interface SpecialistPauseEvent extends SliceEventBase {
  type: "specialist_pause";
  agent: string;
  reason: string;
  /** Optional artifact path that was expected but missing. */
  expectedArtifactPath?: string;
}

/**
 * Shape classification emitted at slice start after `shape-markers/<sliceId>.json`
 * is written. Surfaces the classify-slice-shape verdict (shape + rationale +
 * inline-path decision) on the slice-event stream so the runner can show shape
 * chips alongside lifecycle events. Emitted by
 * `lib/shape-event-emitter.mts::emitShapeClassified`.
 */
export interface ShapeClassifiedEvent extends SliceEventBase {
  type: "shape_classified";
  shape: string;
  rationale: string;
  inlinePathUsed: boolean;
}

/**
 * Phase-gate mode emitted at validator completion (i.e. after `runPhaseGate`
 * returns). Records whether the parallel or serial execution path ran so the
 * runner can surface mode utilization without parsing artifact filenames.
 * Emitted by `lib/phase-gate-mode-emitter.mts::emitPhaseGateModeDetected`.
 */
export interface PhaseGateModeDetectedEvent extends SliceEventBase {
  type: "phase_gate_mode_detected";
  mode: "parallel" | "serial";
}

/**
 * P1.4 (D1): forceClose past a failed/unsatisfied gate is kept as an escape
 * hatch but is fully audited — slice frontmatter gets `force_closed: true`,
 * this event lands on the slice event stream, and the webhook fan-out
 * surfaces it on the dashboard halt-badge tape.
 */
export interface SliceForceClosedEvent extends SliceEventBase {
  type: "slice_force_closed";
  /** Gate reasons that were overridden by the force close. */
  overriddenGates: string[];
  reason: string;
}

export type SliceEvent =
  | WorkflowStateChangedEvent
  | GateTransitionEvent
  | AgentDispatchedEvent
  | AgentCompletedEvent
  | AgentErrorEvent
  | SpecialistPauseEvent
  | ShapeClassifiedEvent
  | PhaseGateModeDetectedEvent
  | SliceForceClosedEvent;

/** Absolute path to the events file for a slice. */
export function eventsPath(repoRoot: string, sliceId: string): string {
  return path.join(repoRoot, TRAJECTORY_DIR, `${sliceId}-events.jsonl`);
}

/**
 * Append one event to the slice events JSONL.
 * Creates file + directory on first call. Never throws — best-effort.
 */
export async function appendSliceEvent(
  repoRoot: string,
  sliceId: string,
  event: SliceEvent
): Promise<void> {
  try {
    const filePath = eventsPath(repoRoot, sliceId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.appendFile(filePath, JSON.stringify(event) + "\n");
  } catch (err) {
    console.warn(
      `[slice-events] write failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // M1: also fan out to runner via webhook if configured. Fail-silent.
  const kind = `slice.${event.type}`;
  const { type: _t, ...payload } = event;
  await fanoutEnvelope(repoRoot, kind, payload as Record<string, unknown>);
}

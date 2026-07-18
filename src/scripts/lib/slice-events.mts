import path from "node:path";
import { appendJsonl } from "./jsonl-append.mjs";
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
  | "slice_force_closed"
  | "slice_renumber"
  | "qa_gate_artifact_written";

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

/**
 * FEAT-257 SLICE-B (DEC-079): a residual slice-id allocation-race collision
 * was remediated by `bun loop.mts backlog slice-renumber`. `sliceId` is the
 * new (winning) id per SliceEventBase; `fromId` is the id it was renumbered
 * from. Emitted by `lib/slice-renumber.mts::renumberSlice` — routes the
 * ledger append through this typed helper (rather than a hand-rolled JSONL
 * line) so the existing webhook fan-out surfaces the renumber on dashboards
 * too.
 */
export interface SliceRenumberedEvent extends SliceEventBase {
  type: "slice_renumber";
  fromId: string;
}

/**
 * FEAT-264 SLICE-3 (AC-3, #527): pre-build QA-gate test-plan artifact write
 * seam. `runner:start` never calls `Agent()` itself (architect C.7), so the
 * actual `crew:qa-expert` write happens out-of-process — this event is a
 * ready-made emission point for whichever caller observes the artifact
 * landing (`qa-gate-preflight.mts::emitQaGateArtifactWritten`), not yet
 * wired into the in-process `startSlice` flow. AC-3's ordering requirement
 * (test-plan-write timestamp < `workflow_state_changed`:building timestamp)
 * is evidenced against this event on the same per-slice
 * `trajectories/<sliceId>-events.jsonl` stream.
 */
export interface QaGateArtifactWrittenEvent extends SliceEventBase {
  type: "qa_gate_artifact_written";
  artifactPath: string;
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
  | SliceForceClosedEvent
  | SliceRenumberedEvent
  | QaGateArtifactWrittenEvent;

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
  // FEAT-247 / A2: dual-emit canonical `ts` alongside the legacy `timestamp`
  // field for one release cycle — always equal to `timestamp`.
  const enriched = { ...event, ts: event.timestamp };

  try {
    const filePath = eventsPath(repoRoot, sliceId);
    await appendJsonl(filePath, enriched);
  } catch (err) {
    console.warn(
      `[slice-events] write failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // M1: also fan out to runner via webhook if configured. Fail-silent.
  const kind = `slice.${event.type}`;
  const { type: _t, ...payload } = enriched;
  await fanoutEnvelope(repoRoot, kind, payload as Record<string, unknown>);
}

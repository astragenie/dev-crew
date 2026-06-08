import fs from "node:fs/promises";
import path from "node:path";
import { TRAJECTORY_DIR } from "./trajectory-writer.mjs";

export type WorkflowState = "building" | "reviewing" | "validating" | "done" | "blocked";
export type GateName = "review" | "validation" | "deployment" | "blocked" | "simplify" | "test-adequacy";
export type GateState = "open" | "passed" | "failed" | "skipped";
export type SliceEventType =
  | "workflow_state_changed"
  | "gate_transition"
  | "agent_dispatched"
  | "agent_completed"
  | "agent_error";

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
}

export interface AgentCompletedEvent extends SliceEventBase {
  type: "agent_completed";
  agent: string;
  status: "ok" | "skipped" | "error";
  reason?: string;
  durationMs: number;
}

export interface AgentErrorEvent extends SliceEventBase {
  type: "agent_error";
  agent: string;
  error: string;
  reason?: string;
}

export type SliceEvent =
  | WorkflowStateChangedEvent
  | GateTransitionEvent
  | AgentDispatchedEvent
  | AgentCompletedEvent
  | AgentErrorEvent;

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
  } catch {
    // best-effort — never blocks callers
  }
}

// Session drift detector (SLICE-54 / FEAT-056).
//
// Mirrors cost-regression.mts — a fail-open evaluator that returns a
// structured signal when the current CLAUDE_SESSION_ID differs from the
// sessionId stored in the workflow-state currentRun at slice-start time.
//
// Fail-open rules (returns null):
//   - CLAUDE_SESSION_ID env var is not set
//   - workflow-state is missing or unparseable
//   - currentRun.sessionId is absent (no session was pinned)
//   - currentRun.sessionId === CLAUDE_SESSION_ID (same session)
//
// Returns a SessionDriftSignal when:
//   - currentRun.sessionId is set AND !== current CLAUDE_SESSION_ID

import fs from "node:fs/promises";
import path from "node:path";
import {
  readWorkflowStateForWrite,
  WorkflowStateCorruptError,
  WorkflowStateSchemaMismatchError
} from "./workflow-state-guard.mjs";

/** Signal returned by checkSessionDrift when sessions differ. */
export interface SessionDriftSignal {
  triggered: true;
  /** The sessionId stored in currentRun at slice-start. */
  sessionIdAtStart: string;
  /** The current CLAUDE_SESSION_ID env var value. */
  sessionIdNow: string;
}

const STATE_PATH = [".claude", "state", "crew", "workflow-state.json"];

async function readWorkflowState(repoPath: string): Promise<any | null> {
  try {
    const raw = await fs.readFile(path.join(repoPath, ...STATE_PATH), "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Fail-open evaluator for the session-drift gate.
 *
 * Returns null when:
 *   - CLAUDE_SESSION_ID env var is not set (fail-open)
 *   - no workflow-state / no currentRun.sessionId stored (no pin yet)
 *   - stored sessionId matches current sessionId (same session)
 *
 * Returns a SessionDriftSignal when stored sessionId !== current sessionId.
 */
export async function checkSessionDrift(repoPath: string): Promise<SessionDriftSignal | null> {
  const sessionIdNow = process.env.CLAUDE_SESSION_ID;
  if (!sessionIdNow) return null;

  const state = await readWorkflowState(repoPath);
  const sessionIdAtStart = state?.currentRun?.sessionId;

  // No pin stored → fail-open
  if (!sessionIdAtStart) return null;

  // Same session → no drift
  if (sessionIdAtStart === sessionIdNow) return null;

  return { triggered: true, sessionIdAtStart, sessionIdNow };
}

/**
 * Writes the current CLAUDE_SESSION_ID into workflow-state.json currentRun.
 * Called from slice-start to pin the session. No-op when:
 *   - CLAUDE_SESSION_ID is not set
 *
 * When workflow-state.json is missing, creates it with the minimal schema
 * `{ version: "1.0", currentRun: { sessionId } }` so the pin survives the
 * very first slice of a fresh repo (before crew has had a chance to write
 * its own state).
 *
 * Fail-open by design (DEC-018): best-effort — never blocks slice-start.
 * DEC-060 / FEAT-209: a schemaVersion mismatch or corrupt workflow-state.json
 * is caught specifically (not folded into the generic best-effort catch) so
 * the refusal is logged loudly via console.error instead of silently
 * discarding the file's existing content — slice-start still proceeds
 * without the write.
 */
export async function writeSessionIdToWorkflowState(repoPath: string): Promise<void> {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  if (!sessionId) return;

  const statePath = path.join(repoPath, ...STATE_PATH);
  let state: any;
  try {
    ({ state } = await readWorkflowStateForWrite(statePath));
  } catch (err: unknown) {
    if (
      err instanceof WorkflowStateSchemaMismatchError ||
      err instanceof WorkflowStateCorruptError
    ) {
      console.error(`[session-drift] refusing session-pin write: ${err.name}: ${err.message}`);
      return;
    }
    // Unexpected error shape — fall back to minimal scaffold, best-effort as before.
    state = { version: "1.0", currentRun: {} };
  }

  if (!state.currentRun) state.currentRun = {};
  state.currentRun.sessionId = sessionId;
  state.updatedAt = new Date().toISOString();

  try {
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
  } catch {
    // Best-effort — never block slice-start
  }
}

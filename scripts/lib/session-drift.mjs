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
const STATE_PATH = [".claude", "state", "crew", "workflow-state.json"];
async function readWorkflowState(repoPath) {
    try {
        const raw = await fs.readFile(path.join(repoPath, ...STATE_PATH), "utf8");
        return JSON.parse(raw);
    }
    catch {
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
export async function checkSessionDrift(repoPath) {
    const sessionIdNow = process.env.CLAUDE_SESSION_ID;
    if (!sessionIdNow)
        return null;
    const state = await readWorkflowState(repoPath);
    const sessionIdAtStart = state?.currentRun?.sessionId;
    // No pin stored → fail-open
    if (!sessionIdAtStart)
        return null;
    // Same session → no drift
    if (sessionIdAtStart === sessionIdNow)
        return null;
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
 * Best-effort: any error is swallowed so slice-start is never blocked.
 */
export async function writeSessionIdToWorkflowState(repoPath) {
    const sessionId = process.env.CLAUDE_SESSION_ID;
    if (!sessionId)
        return;
    const statePath = path.join(repoPath, ...STATE_PATH);
    let state = { version: "1.0", currentRun: {} };
    try {
        const raw = await fs.readFile(statePath, "utf8");
        state = JSON.parse(raw);
    }
    catch {
        // File missing or unparseable — start from minimal state shape.
    }
    if (!state.currentRun)
        state.currentRun = {};
    state.currentRun.sessionId = sessionId;
    state.updatedAt = new Date().toISOString();
    try {
        await fs.mkdir(path.dirname(statePath), { recursive: true });
        await fs.writeFile(statePath, JSON.stringify(state, null, 2), "utf8");
    }
    catch {
        // Best-effort — never block slice-start
    }
}

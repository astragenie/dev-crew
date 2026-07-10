import fs from "node:fs/promises";
import path from "node:path";

// Read the crew plugin's workflow-state.json from inside the loop
// runtime. Crew owns the file; loop is a downstream consumer of
// its badge state (FEAT-006 introduced `blocked` + `escalated_to_human`).
//
// Returns null when the file is missing or unparseable; callers must treat
// that as "no signal", not as "all clear".

const STATE_PATH = [".claude", "state", "crew", "workflow-state.json"];
const LEGACY_STATE_PATH = [".claude", "state", "engineering-os", "workflow-state.json"];

async function readJsonOrNull(filePath: string) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * @param {string} repoPath
 * @returns {Promise<object | null>}
 */
export async function readCrewWorkflowState(repoPath: string) {
  const primary = await readJsonOrNull(path.join(repoPath, ...STATE_PATH));
  if (primary) return primary;
  return readJsonOrNull(path.join(repoPath, ...LEGACY_STATE_PATH));
}

/** The primary workflow-state.json path — used in operator-facing gate messages. */
export function workflowStatePath(repoPath: string): string {
  return path.join(repoPath, ...STATE_PATH);
}

/**
 * Returns the blocked / escalation gate snapshot from the current crew run.
 *
 * @param {string} repoPath
 * @returns {Promise<{
 *   blocked: { status: string, note?: string, blockedBy?: string|null, updatedAt?: string } | null,
 *   escalated: { status: string, note?: string, updatedAt?: string } | null
 * }>}
 */
export async function readCrewBlockingGates(repoPath: string) {
  const state = await readCrewWorkflowState(repoPath);
  const gates = state?.currentRun?.gates || {};
  const blocked = gates.blocked?.status === "blocked" ? gates.blocked : null;
  const escalated = gates.escalation?.status === "escalated" ? gates.escalation : null;
  return { blocked, escalated };
}

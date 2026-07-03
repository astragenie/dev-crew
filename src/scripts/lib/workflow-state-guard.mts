// Shared read-guard for crew's workflow-state.json (DEC-060 / FEAT-209).
//
// Both loop-owned write sites — session-drift.mts::writeSessionIdToWorkflowState
// and slice-linker/start-slice.mts::writeWorktreePathToState /
// rollbackWorktreePathInState — duplicated an inline read -> JSON.parse ->
// mutate -> fs.writeFile block, and both silently substituted a blank
// `{ version: "1.0", currentRun: {} }` state on ANY parse failure —
// indistinguishable from "file missing." That conflation is the corruption
// class behind the 2026-06-10 session-hang rebuild (FEAT177/SLICE88).
//
// readWorkflowStateForWrite replaces that duplicated block with three
// distinct outcomes:
//   - file missing (ENOENT)              -> minimal scaffold, existed: false
//   - file present but JSON.parse throws -> WorkflowStateCorruptError (loud)
//   - schemaVersion > supported          -> WorkflowStateSchemaMismatchError
//   - otherwise                          -> { state, existed: true }
//
// schemaVersion is additive: absent is treated as implicit v1 (AC-1) so
// every file on disk today, and every file crew writes before it adopts the
// upstream request, keeps working with zero migration.
//
// Callers choose their own propagation policy — this module never decides
// fail-open vs. fail-loud. See DEC-060 "Decision" for the per-call-site split.

import fs from "node:fs/promises";

/** Highest workflow-state schemaVersion this loop release understands. */
export const LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION = 1;

/** Thrown when workflow-state.json's schemaVersion exceeds what loop supports. */
export class WorkflowStateSchemaMismatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowStateSchemaMismatchError";
  }
}

/** Thrown when workflow-state.json exists but is not parseable JSON. */
export class WorkflowStateCorruptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowStateCorruptError";
  }
}

/**
 * Reads workflow-state.json in preparation for a write, replacing the
 * duplicated inline read block at both loop-owned write sites.
 *
 * - Missing file (ENOENT): returns the minimal DEC-018 scaffold
 *   `{ version: "1.0", currentRun: {} }` with `existed: false` — unchanged
 *   create-on-absent behavior.
 * - Present but unparseable: throws WorkflowStateCorruptError naming
 *   `statePath`, the parse error, and a repair hint — never silently
 *   discards existing content (recentRuns, etc.) by falling back to blank.
 * - Present, parses, `schemaVersion` (default 1) greater than
 *   LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION: throws
 *   WorkflowStateSchemaMismatchError naming `statePath`, the file's
 *   schemaVersion, and the version loop supports.
 * - Otherwise: returns `{ state, existed: true }`.
 */
export async function readWorkflowStateForWrite(
  statePath: string
): Promise<{ state: any; existed: boolean }> {
  let raw: string;
  try {
    raw = await fs.readFile(statePath, "utf8");
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === "ENOENT") {
      return { state: { version: "1.0", currentRun: {} }, existed: false };
    }
    throw err;
  }

  let state: any;
  try {
    state = JSON.parse(raw);
  } catch (err: unknown) {
    const parseMessage = err instanceof Error ? err.message : String(err);
    throw new WorkflowStateCorruptError(
      `workflow-state.json is not valid JSON (${statePath}): ${parseMessage}. ` +
        "Repair or delete the file manually, or restore from git/backup, then retry."
    );
  }

  const schemaVersion: number = state?.schemaVersion ?? 1;
  if (schemaVersion > LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION) {
    throw new WorkflowStateSchemaMismatchError(
      `workflow-state.json schemaVersion ${schemaVersion} is newer than this loop release ` +
        `supports (${LOOP_SUPPORTED_WORKFLOW_STATE_SCHEMA_VERSION}) (${statePath}). ` +
        "Upgrade the loop plugin, or coordinate a compatible write with the writer that " +
        "produced this schemaVersion."
    );
  }

  return { state, existed: true };
}

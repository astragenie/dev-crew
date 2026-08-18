// gh-rate-limiter.mts
// Prevents concurrent @crew dispatches for the same PR.
//
// State is persisted as JSON at the given stateFile path.
// The default path is `.github/crew-dispatch-state.json`.
//
// State schema:
//   { [prNumber: string]: { dispatchId: string; acquiredAt: string } }
//
// A PR is "blocked" when it already has an active dispatch in the state.
// acquireDispatch writes a lock; releaseDispatch removes it.
//
// Export surface:
//   checkRateLimit(prNumber, stateFile)  → { blocked, activeDispatchId? }
//   acquireDispatch(prNumber, dispatchId, stateFile) → void
//   releaseDispatch(prNumber, stateFile) → void
//
// _internals export — for testability only. Do not use in production code.

import fs from "node:fs/promises";
import path from "node:path";

export const DEFAULT_STATE_FILE = ".github/crew-dispatch-state.json";

interface DispatchEntry {
  dispatchId: string;
  acquiredAt: string;
}

type DispatchState = Record<string, DispatchEntry>;

export interface RateLimitResult {
  blocked: boolean;
  activeDispatchId?: string;
}

// ---------------------------------------------------------------------------
// Internal I/O helpers — extracted for testability via _internals.
// ---------------------------------------------------------------------------

async function readState(stateFile: string): Promise<DispatchState> {
  const resolved = path.resolve(stateFile);
  try {
    const raw = await fs.readFile(resolved, "utf-8");
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as DispatchState;
    }
    return {};
  } catch {
    // File absent or unparseable — start with empty state.
    return {};
  }
}

async function writeState(stateFile: string, state: DispatchState): Promise<void> {
  const resolved = path.resolve(stateFile);
  const dir = path.dirname(resolved);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(resolved, JSON.stringify(state, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether a PR already has an active dispatch.
 *
 * @param prNumber  — PR number (integer)
 * @param stateFile — path to the JSON state file
 * @returns { blocked: true, activeDispatchId } when a lock exists,
 *          { blocked: false } otherwise.
 */
export async function checkRateLimit(
  prNumber: number,
  stateFile: string = DEFAULT_STATE_FILE
): Promise<RateLimitResult> {
  const state = await readState(stateFile);
  const key = String(prNumber);
  const entry = state[key];
  if (entry !== undefined) {
    return { blocked: true, activeDispatchId: entry.dispatchId };
  }
  return { blocked: false };
}

/**
 * Acquire a dispatch lock for the given PR.
 * Overwrites any existing entry (caller is responsible for calling
 * checkRateLimit first if concurrent exclusion is required).
 *
 * @param prNumber   — PR number (integer)
 * @param dispatchId — unique identifier for this dispatch (e.g. a UUID or run id)
 * @param stateFile  — path to the JSON state file
 */
export async function acquireDispatch(
  prNumber: number,
  dispatchId: string,
  stateFile: string = DEFAULT_STATE_FILE
): Promise<void> {
  const state = await readState(stateFile);
  const key = String(prNumber);
  state[key] = { dispatchId, acquiredAt: new Date().toISOString() };
  await writeState(stateFile, state);
}

/**
 * Release the dispatch lock for the given PR.
 * No-op if no lock exists.
 *
 * @param prNumber  — PR number (integer)
 * @param stateFile — path to the JSON state file
 */
export async function releaseDispatch(
  prNumber: number,
  stateFile: string = DEFAULT_STATE_FILE
): Promise<void> {
  const state = await readState(stateFile);
  const key = String(prNumber);
  delete state[key];
  await writeState(stateFile, state);
}

// ---------------------------------------------------------------------------
// _internals — exposes I/O helpers for unit tests.
// Tests import this to inject controlled fs behaviour.
// ---------------------------------------------------------------------------
export const _internals = {
  readState,
  writeState
};

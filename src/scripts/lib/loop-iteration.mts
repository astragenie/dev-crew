import fs from "node:fs/promises";
import path from "node:path";

// Iteration counter for the loop plugin. Persists count in
// .claude/state/loop/iteration.json to track progress and
// halt before unbounded token burn.

const STATE_DIR = ".claude/state/loop";
const ITERATION_FILE = "iteration.json";

async function getIterationPath(repoPath: string) {
  return path.join(repoPath, STATE_DIR, ITERATION_FILE);
}

async function ensureStateDir(repoPath: string) {
  const stateDir = path.join(repoPath, STATE_DIR);
  await fs.mkdir(stateDir, { recursive: true });
}

// Read current iteration state. Returns { count: number, initializedAt: string } or null.
async function readIterationState(repoPath: string) {
  try {
    const filePath = await getIterationPath(repoPath);
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (error: unknown) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

// Write iteration state. Returns the written state.
async function writeIterationState(repoPath: string, state: Record<string, unknown>) {
  await ensureStateDir(repoPath);
  const filePath = await getIterationPath(repoPath);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2) + "\n");
  return state;
}

// Initialize iteration counter if not present. Idempotent.
// Called at loop install.
export async function initializeIterationCounter(repoPath: string) {
  const existing = await readIterationState(repoPath);
  if (existing) {
    return existing;
  }
  const initial = {
    count: 0,
    initializedAt: new Date().toISOString()
  };
  return writeIterationState(repoPath, initial);
}

// Increment iteration counter by 1. Returns the new state.
// Called at end of each phase gate completion.
export async function incrementIteration(repoPath: string) {
  const state = await readIterationState(repoPath);
  if (!state) {
    // Auto-init if counter doesn't exist (should not happen in normal flow,
    // but graceful fallback for first-run or state corruption).
    await initializeIterationCounter(repoPath);
    return incrementIteration(repoPath);
  }
  const next = {
    ...state,
    count: (state.count as number) + 1,
    lastIncrementedAt: new Date().toISOString()
  };
  return writeIterationState(repoPath, next);
}

// Get current iteration state and cap. Returns { count, cap, exhausted }.
// Used by stop-conditions to decide halt.
export async function getIterationStatus(repoPath: string, maxIterations = 25) {
  const state = await readIterationState(repoPath);
  const count = Number(state?.count ?? 0);
  const exhausted = count >= maxIterations;
  return { count, cap: maxIterations, exhausted };
}

// Reset counter to 0. Called when loop ends cleanly (final-synthesis).
export async function resetIterationCounter(repoPath: string) {
  return writeIterationState(repoPath, {
    count: 0,
    resetAt: new Date().toISOString()
  });
}

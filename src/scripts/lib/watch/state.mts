// watch/state.mts — per-repo state I/O + tick lockfile.
//
// Write-ownership split (contract §2, COND-2): tick.json and reaction.json
// are separate files so the tick-vs-reaction lost-update race is impossible
// by construction — each writer only ever opens its own file. The narrower
// same-writer race (two concurrent writers to the SAME file) is bounded by
// a short-lived mkdir-based lock held only across the read-mutate-write
// critical section (never across a gh/claude call).
//
// Atomic write = write to a pid+random tmp file, fsync, then rename over
// the target (rename is atomic on both NTFS and POSIX).

import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type { ReactionState, TickState } from "./types.mjs";

export function defaultWatchHome(): string {
  return process.env.LOOP_WATCH_HOME ?? path.join(os.homedir(), ".claude", "watch");
}

export function ghSlugHash(ghSlug: string): string {
  return crypto.createHash("sha256").update(ghSlug).digest("hex").slice(0, 16);
}

export function tickStatePath(watchHome: string, ghSlug: string): string {
  return path.join(watchHome, "state", `${ghSlugHash(ghSlug)}.tick.json`);
}

export function reactionStatePath(watchHome: string, ghSlug: string): string {
  return path.join(watchHome, "state", `${ghSlugHash(ghSlug)}.reaction.json`);
}

export function tickLockPath(watchHome: string): string {
  return path.join(watchHome, "tick.lock");
}

const DEFAULT_TICK_STATE: TickState = {
  lastSeenIssue: null,
  lastFailedRunIds: [],
  lastPrShas: {},
  lastTickAt: "",
  claims: {},
  skippedCeiling: []
};

const DEFAULT_REACTION_STATE: ReactionState = {
  attemptCounts: {},
  costSpent: {},
  totalCostSpentUsd: 0
};

const LOCK_RETRY_MS = 25;
const LOCK_MAX_ATTEMPTS = 200; // ~5s worst case for the (now cross-process-only) RMW critical-section lock

async function acquireLockDir(lockDir: string): Promise<void> {
  for (let attempt = 0; attempt < LOCK_MAX_ATTEMPTS; attempt++) {
    try {
      await fs.mkdir(lockDir);
      return;
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException)?.code;
      if (code !== "EEXIST") throw err;
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
  throw new Error(
    `[watch/state] could not acquire lock ${lockDir} after ${LOCK_MAX_ATTEMPTS} attempts`
  );
}

async function releaseLockDir(lockDir: string): Promise<void> {
  await fs.rm(lockDir, { recursive: true, force: true });
}

async function readJsonOrDefault<T>(filePath: string, defaultValue: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return structuredClone(defaultValue);
  }
}

async function writeAtomic(filePath: string, data: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tmp = path.join(
    dir,
    `.tmp-${path.basename(filePath)}-${process.pid}-${crypto.randomBytes(4).toString("hex")}`
  );
  const handle = await fs.open(tmp, "w");
  try {
    await handle.writeFile(JSON.stringify(data, null, 2), "utf-8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmp, filePath);
}

// In-process mutex, keyed by filePath. The mkdir-based lock below exists for
// cross-process safety (a separate watch-tick invocation vs a separate
// reaction process); it was never meant to also arbitrate same-process
// concurrency. Under load, N same-process callers polling that lock every
// LOCK_RETRY_MS could collectively exceed LOCK_MAX_ATTEMPTS and throw, even
// though nothing was actually deadlocked — just queued too slowly. Chaining
// same-process callers on an in-memory promise removes that polling entirely
// for the common (same-process) case; only genuine cross-process contention
// ever touches the filesystem lock's retry loop.
const inProcessChains = new Map<string, Promise<unknown>>();

/**
 * Atomic read-modify-write against a single state file, guarded by a
 * sibling mkdir-based lock (`<path>.lock/`) held only across this critical
 * section — never across a gh/claude call (contract §2).
 */
export async function updateStateAtomic<T>(
  filePath: string,
  defaultState: T,
  mutator: (current: T) => T
): Promise<T> {
  const prior = inProcessChains.get(filePath) ?? Promise.resolve();
  const run = prior
    .catch(() => {})
    .then(() => updateStateAtomicLocked(filePath, defaultState, mutator));
  inProcessChains.set(filePath, run);
  try {
    return await run;
  } finally {
    if (inProcessChains.get(filePath) === run) {
      inProcessChains.delete(filePath);
    }
  }
}

async function updateStateAtomicLocked<T>(
  filePath: string,
  defaultState: T,
  mutator: (current: T) => T
): Promise<T> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const lockDir = `${filePath}.lock`;
  await acquireLockDir(lockDir);
  try {
    const current = await readJsonOrDefault(filePath, defaultState);
    const next = mutator(current);
    await writeAtomic(filePath, next);
    return next;
  } finally {
    await releaseLockDir(lockDir);
  }
}

export async function readTickState(watchHome: string, ghSlug: string): Promise<TickState> {
  return readJsonOrDefault(tickStatePath(watchHome, ghSlug), DEFAULT_TICK_STATE);
}

export async function updateTickState(
  watchHome: string,
  ghSlug: string,
  mutator: (current: TickState) => TickState
): Promise<TickState> {
  return updateStateAtomic(tickStatePath(watchHome, ghSlug), DEFAULT_TICK_STATE, mutator);
}

export async function readReactionState(watchHome: string, ghSlug: string): Promise<ReactionState> {
  return readJsonOrDefault(reactionStatePath(watchHome, ghSlug), DEFAULT_REACTION_STATE);
}

export async function updateReactionState(
  watchHome: string,
  ghSlug: string,
  mutator: (current: ReactionState) => ReactionState
): Promise<ReactionState> {
  return updateStateAtomic(reactionStatePath(watchHome, ghSlug), DEFAULT_REACTION_STATE, mutator);
}

/**
 * AC-2: whole-tick exclusivity lock. Single mkdir attempt, no retry — a
 * second tick that finds the lock held exits immediately, it never waits.
 * Stale-lock reap (crashed process leaves the lock dir behind) is an open
 * trade-off flagged in the contract, not specified further here — follow-up.
 */
export async function acquireTickLock(watchHome: string): Promise<boolean> {
  await fs.mkdir(watchHome, { recursive: true });
  try {
    await fs.mkdir(tickLockPath(watchHome));
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "EEXIST") return false;
    throw err;
  }
}

export async function releaseTickLock(watchHome: string): Promise<void> {
  await fs.rm(tickLockPath(watchHome), { recursive: true, force: true });
}

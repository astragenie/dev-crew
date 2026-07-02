// Marathon session-scope checkpoint (FEAT-181).
//
// Bounds unobserved drift on long autonomous backlog walks. The
// AgentOps coherent-arc rule allows 2-4 atomic arcs per session; at
// >=5 a post-mortem checkpoint becomes mandatory. Loop marathon mode
// is otherwise unbounded.
//
// Signal levels:
//   - "warn"  — closesSinceCheckpoint >= every  (advisory; loop continues)
//   - "hard"  — closesSinceCheckpoint >= 2 * every (stop-condition fires)
//
// A "checkpoint" = any retrospective artifact under retrospectivesRoot
// (default `.claude/artifacts/loop/retrospectives/`). The counter is
// the number of grade files written AFTER the newest retrospective.
//
// Also evaluates dispatch-worktree-accretion: advisory badge emitted when
// the oldest runId age exceeds 2 * pruneStaleAfterDays.
//
// Fail-open: returns null on missing directories or unreadable files.

import fs from "node:fs/promises";
import path from "node:path";
import { gradesRoot, retroRoot } from "./paths.mjs";

export const DEFAULT_MARATHON_CHECKPOINT_EVERY = 4;
export const MARATHON_CHECKPOINT_HARD_MULTIPLIER = 2;

export interface MarathonCheckpointSignal {
  level: "warn" | "hard";
  closesSinceCheckpoint: number;
  every: number;
  hardThreshold: number;
  lastRetroPath: string | null;
}

export interface DispatchAccretionBadge {
  badge: "dispatch-worktree-accretion";
  level: "advisory";
  oldestRunAgeDays: number;
  pruneStaleAfterDays: number;
  threshold: number;
}

function resolveEvery(config: Record<string, any> | null): number {
  const raw = config?.loop?.marathonCheckpointEvery;
  return typeof raw === "number" && Number.isInteger(raw) && raw > 0
    ? raw
    : DEFAULT_MARATHON_CHECKPOINT_EVERY;
}

async function newestMtimeUnder(
  dir: string,
  filter: (name: string) => boolean
): Promise<{ mtimeMs: number; absPath: string } | null> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return null;
  }
  let newest: { mtimeMs: number; absPath: string } | null = null;
  for (const name of entries) {
    if (!filter(name)) continue;
    const absPath = path.join(dir, name);
    try {
      const stat = await fs.stat(absPath);
      if (!stat.isFile()) continue;
      if (!newest || stat.mtimeMs > newest.mtimeMs) {
        newest = { mtimeMs: stat.mtimeMs, absPath };
      }
    } catch {
      /* ignore unreadable entries */
    }
  }
  return newest;
}

async function countFilesSince(
  dir: string,
  filter: (name: string) => boolean,
  sinceMs: number
): Promise<number> {
  let entries: string[];
  try {
    entries = await fs.readdir(dir);
  } catch {
    return 0;
  }
  let count = 0;
  for (const name of entries) {
    if (!filter(name)) continue;
    const absPath = path.join(dir, name);
    try {
      const stat = await fs.stat(absPath);
      if (!stat.isFile()) continue;
      if (stat.mtimeMs > sinceMs) count += 1;
    } catch {
      /* ignore unreadable entries */
    }
  }
  return count;
}

const GRADE_FILE_RE = /-grade\.md$/;
const RETRO_FILE_RE = /\.md$/;

/**
 * Check dispatch worktree accretion. Returns an advisory badge when the
 * oldest runId is older than 2 * pruneStaleAfterDays. Non-blocking: the
 * walker continues regardless. Returns null when condition does not hold.
 *
 * Fail-open: returns null on any I/O error.
 */
export async function checkDispatchAccretion(
  repoPath: string,
  config: Record<string, any> | null
): Promise<DispatchAccretionBadge | null> {
  const pruneStaleAfterDays: number =
    typeof config?.loop?.dispatch?.pruneStaleAfterDays === "number"
      ? (config.loop.dispatch.pruneStaleAfterDays as number)
      : 7;
  const threshold = pruneStaleAfterDays * 2;

  try {
    const { readDispatchTreeSnapshot } = await import("./dispatch-tree-snapshot.mjs");
    const snap = await readDispatchTreeSnapshot(repoPath);
    if (snap.oldestRunAgeDays === null) return null;
    if (snap.oldestRunAgeDays <= threshold) return null;
    return {
      badge: "dispatch-worktree-accretion",
      level: "advisory",
      oldestRunAgeDays: snap.oldestRunAgeDays,
      pruneStaleAfterDays,
      threshold
    };
  } catch {
    return null;
  }
}

/**
 * Compute the marathon-checkpoint signal for the current repo state.
 *
 * Returns:
 *   - null  when fewer than `every` grades have been written since the
 *     newest retrospective (no signal — loop continues quietly).
 *   - { level: "warn" }  when >= every but < hardThreshold.
 *   - { level: "hard" }  when >= hardThreshold (= 2 * every).
 *
 * Fail-open: returns null on missing directories.
 */
export async function checkMarathonCheckpoint(
  repoPath: string,
  config: Record<string, any> | null
): Promise<MarathonCheckpointSignal | null> {
  const every = resolveEvery(config);
  const hardThreshold = every * MARATHON_CHECKPOINT_HARD_MULTIPLIER;

  const gradesDir = gradesRoot(repoPath, config);
  const retrosDir = retroRoot(repoPath, config);

  const newestRetro = await newestMtimeUnder(retrosDir, (n) => RETRO_FILE_RE.test(n));
  // When no retrospective exists yet, anchor the counter at the start
  // of unix epoch (0) so every grade counts. This makes the gate fire
  // exactly when the team has shipped enough slices without ever
  // running a retro to warrant one.
  const sinceMs = newestRetro ? newestRetro.mtimeMs : 0;

  const closes = await countFilesSince(gradesDir, (n) => GRADE_FILE_RE.test(n), sinceMs);

  if (closes < every) return null;

  return {
    level: closes >= hardThreshold ? "hard" : "warn",
    closesSinceCheckpoint: closes,
    every,
    hardThreshold,
    lastRetroPath: newestRetro?.absPath ?? null
  };
}

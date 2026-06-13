// Pause / resume lifecycle for async waits (FEAT-128 / SLICE-118).
//
// The operator writes `.claude/state/loop/paused.json` via:
//   bun src/scripts/loop.mts pause --reason "..." [--repo <path>]
// and removes it via:
//   bun src/scripts/loop.mts resume [--repo <path>]
//
// The stop-check gate reads this file on every iteration. When the file
// is present and valid, it fires `pausedForExternalEvent` in the halt-badge
// snapshot, stopping the autonomous walker until the operator resumes.
//
// Fail-open: returns null on missing file, malformed JSON, or missing
// `triggered: true` so a partial or corrupt file never permanently blocks
// the walker.

import fs from "node:fs/promises";
import path from "node:path";

export interface PausedForExternalEventSignal {
  triggered: true;
  reason: string;
  resumeHint: string;
  pausedAt: string;
}

const PAUSED_FILE_REL = path.join(".claude", "state", "loop", "paused.json");

function pausedFilePath(repoPath: string): string {
  return path.join(repoPath, PAUSED_FILE_REL);
}

/**
 * Check whether the operator has paused the loop for an external event.
 *
 * Returns:
 *   - null  when the paused.json file is absent (fail-open).
 *   - null  when the file exists but JSON is malformed (fail-open).
 *   - null  when the file exists but does not have `triggered: true` (fail-open).
 *   - PausedForExternalEventSignal  when the file exists and is valid.
 */
export async function checkPausedForExternalEvent(
  repoPath: string
): Promise<PausedForExternalEventSignal | null> {
  const filePath = pausedFilePath(repoPath);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    // File absent or unreadable — fail-open.
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Malformed JSON — fail-open.
    return null;
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    (parsed as Record<string, unknown>).triggered !== true
  ) {
    // Missing or non-true triggered flag — fail-open.
    return null;
  }

  const obj = parsed as Record<string, unknown>;
  return {
    triggered: true,
    reason: typeof obj.reason === "string" ? obj.reason : "",
    resumeHint:
      typeof obj.resumeHint === "string"
        ? obj.resumeHint
        : "Run: bun src/scripts/loop.mts resume --repo .",
    pausedAt: typeof obj.pausedAt === "string" ? obj.pausedAt : ""
  };
}

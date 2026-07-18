// artifact-lock-writer.mts — writer side of the cross-plugin artifact-lock
// contract (FEAT-264 SLICE-4, AC-4, #527).
//
// Schema mirrored FIELD-FOR-FIELD from dev-team#262's consumer hook
// (`hooks/lib/pre-tool-use-artifact-lock.ts`, PreToolUse Write|Edit), whose
// contract is specified in
// docs/upstream-requests/2026-07-18-crew-artifact-lock-hook-contract.md
// (option A — state file). One JSON file per active slice under
// `.claude/state/loop/artifact-locks/<sliceId>.json`:
//
//   {
//     "sliceId": "SLICE-NNN",
//     "lockedPaths": [".claude/artifacts/crew/validations/<plan-file>.md"],
//     "lockedBy": "qa-gate",
//     "createdAt": "<ISO>",
//     "expiresAt": "<ISO>"
//   }
//
// Lifecycle ownership: runner-plugin (this module) is the SOLE writer —
// the crew-side hook only ever reads (per the upstream doc's "Lifecycle
// ownership" note). `writeArtifactLock` is called once a test-plan
// artifact's path becomes known
// (`qa-gate-preflight.mts::emitQaGateArtifactWritten`). `removeArtifactLock`
// is called at `runner:close` (`close-slice.mts`) and at dispatch-prune's
// orphan reap path — both idempotent no-ops when no lock file exists. The
// dev-team hook's own 48h default TTL (`isLockExpired`, mirrored here as
// `LOCK_TTL_MS`) is the orphan backstop when a removal call is missed.
//
// Fail-soft by design: a lock is an enforcement ENHANCEMENT layered on top
// of the ceremony's prompt-level FORBIDDEN order, not a correctness
// dependency the ceremony itself needs to succeed. Every public function
// here swallows its own errors (logs via console.warn) and never throws —
// a lock-directory permission hiccup must never break slice-start or
// slice-close.

import fs from "node:fs/promises";
import path from "node:path";

const LOCK_DIR_SEGMENTS = [".claude", "state", "loop", "artifact-locks"] as const;

/** 48h — mirrors dev-team#262's `DEFAULT_TTL_MS` in `pre-tool-use-artifact-lock.ts`. */
export const LOCK_TTL_MS = 48 * 60 * 60 * 1000;

export interface ArtifactLock {
  sliceId: string;
  lockedPaths: string[];
  lockedBy: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Normalize path separators to forward slash and strip a leading "./" —
 * mirrors dev-team#262's `normalizeLockPath` verbatim so the writer and
 * reader agree byte-for-byte on the comparison key (a Windows-authored
 * backslash path must still match the hook's POSIX-normalized
 * `tool_input.file_path` comparison).
 */
export function normalizeLockPath(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

function lockDir(repoPath: string): string {
  return path.join(repoPath, ...LOCK_DIR_SEGMENTS);
}

function lockFilePath(repoPath: string, sliceId: string): string {
  return path.join(lockDir(repoPath), `${sliceId}.json`);
}

/**
 * Write (or overwrite) the artifact lock for `sliceId`. `lockedPaths` are
 * normalized to repo-relative, forward-slash paths before persisting.
 * `expiresAt` is stamped `createdAt + LOCK_TTL_MS` (48h) — the same window
 * dev-team#262's hook falls back to when a lock is read without a
 * caller-supplied TTL, kept explicit here so the writer's on-disk record is
 * self-describing rather than relying on the reader's default.
 *
 * Fail-soft: any error (missing repo dir, permission failure, ...) is
 * logged via `console.warn` and swallowed — never thrown.
 */
export async function writeArtifactLock(
  repoPath: string,
  sliceId: string,
  lockedPaths: string[],
  lockedBy: string
): Promise<void> {
  try {
    const dir = lockDir(repoPath);
    await fs.mkdir(dir, { recursive: true });
    const createdAtMs = Date.now();
    const lock: ArtifactLock = {
      sliceId,
      lockedPaths: lockedPaths.map(normalizeLockPath),
      lockedBy,
      createdAt: new Date(createdAtMs).toISOString(),
      expiresAt: new Date(createdAtMs + LOCK_TTL_MS).toISOString()
    };
    await fs.writeFile(
      lockFilePath(repoPath, sliceId),
      `${JSON.stringify(lock, null, 2)}\n`,
      "utf8"
    );
  } catch (err) {
    console.warn(`[artifact-lock-writer] failed to write lock for ${sliceId}: ${String(err)}`);
  }
}

/**
 * Remove the artifact lock for `sliceId`, if present. Idempotent — a
 * missing lock file (never created, already removed, or reaped past its
 * TTL by the consumer hook) is a silent no-op, not an error. Called from
 * `runner:close` (`close-slice.mts`) and `dispatch-prune.mts`'s orphan
 * reap path.
 *
 * Fail-soft: any non-"already gone" error is logged via `console.warn` and
 * swallowed — never thrown.
 */
export async function removeArtifactLock(repoPath: string, sliceId: string): Promise<void> {
  try {
    await fs.rm(lockFilePath(repoPath, sliceId), { force: true });
  } catch (err) {
    console.warn(`[artifact-lock-writer] failed to remove lock for ${sliceId}: ${String(err)}`);
  }
}

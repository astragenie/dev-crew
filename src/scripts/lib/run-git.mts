// Central git-spawn wrapper over @astragenie/plugin-std/git (issue #449, W2b
// slice S3). Consolidates the hand-rolled execFile/spawn-based git helpers
// scattered across the repo onto one primitive, while preserving each call
// site's existing throw-vs-tolerate contract exactly (see the three helpers
// below — pick whichever matches what the call site already did).
//
// plugin-std's `runGit` never throws on a non-zero git exit (that comes back
// as `{ok: false, status, stderr}`); it throws `TransientError` on a genuine
// spawn failure and `DeterministicError` on a `maxBuffer` overflow. Node's
// `promisify(execFile)` — what most of this repo's call sites used — rejects
// on ALL three of those cases. `gitTextOrThrow` restores that rejecting
// contract for sites that relied on it; `gitText` / `gitOk` restore the
// try/catch-to-tolerant-default contract used everywhere else.
//
// Sync call sites (execFileSync/spawnSync backing an exported *synchronous*
// function signature) are intentionally NOT migrated here — plugin-std's
// `runGit` is async-only, and swapping them would turn a sync export into an
// async one, which is an exported-signature change forbidden by this slice's
// governing constraint. See the migration report for the specific files left
// local for this reason.

import {
  runGit as runGitStd,
  type RunGitOptions,
  type RunGitResult
} from "@astragenie/plugin-std/git";

export type { RunGitOptions, RunGitResult };

/** Raw passthrough to plugin-std's `runGit` for callers that need the full result. */
export { runGitStd as runGit };

/**
 * Run git and return trimmed stdout on a clean exit, or `null` on any
 * failure — non-zero exit, spawn failure, or maxBuffer overflow. Mirrors the
 * `try { ... } catch { return null/false }` pattern used by most of this
 * repo's hand-rolled execFile git helpers.
 */
export async function gitText(args: string[], opts: RunGitOptions = {}): Promise<string | null> {
  try {
    const result = await runGitStd(args, opts);
    return result.ok ? result.stdout.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Run git and return whether it exited 0. Never throws — spawn failures and
 * maxBuffer overflows fold into `false`, matching call sites that only care
 * about success/failure and already swallow every error into a boolean.
 */
export async function gitOk(args: string[], opts: RunGitOptions = {}): Promise<boolean> {
  try {
    const result = await runGitStd(args, opts);
    return result.ok;
  } catch {
    return false;
  }
}

/**
 * Run git and THROW on a non-zero exit, mirroring `promisify(execFile)`'s
 * rejection contract. `promisify(execFile)`'s custom promisifier attaches
 * `stdout`/`stderr`/`code` onto the rejected Error (Node does this for every
 * execFile rejection, including a non-zero exit) — several migrated call
 * sites read `err?.stderr` off that shape to populate structured error
 * fields (e.g. `MergeError.gitStderr`, `WorktreeError.gitStderr`), so this
 * must attach the same three properties rather than throw a bare Error.
 *
 * Re-throws plugin-std's own `TransientError` (spawn failure) /
 * `DeterministicError` (maxBuffer overflow) largely unchanged — those
 * already reject under the old `execFile` contract too — but backfills
 * `stdout`/`stderr` with `""` on them as well, since Node's rejection always
 * has those two properties defined (as empty strings when the process never
 * produced output), and callers read them with `err?.stderr` unconditionally.
 */
export async function gitTextOrThrow(
  args: string[],
  opts: RunGitOptions = {}
): Promise<{ stdout: string; stderr: string }> {
  let result: RunGitResult;
  try {
    result = await runGitStd(args, opts);
  } catch (err) {
    if (err instanceof Error) {
      const augmented = err as Error & { stdout?: string; stderr?: string };
      augmented.stdout ??= "";
      augmented.stderr ??= "";
    }
    throw err;
  }
  if (!result.ok) {
    const error = new Error(
      `git ${args.join(" ")} exited ${result.status}: ${result.stderr}`
    ) as Error & {
      stdout: string;
      stderr: string;
      code: number;
    };
    error.stdout = result.stdout;
    error.stderr = result.stderr;
    error.code = result.status;
    throw error;
  }
  return { stdout: result.stdout, stderr: result.stderr };
}

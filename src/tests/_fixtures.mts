// Shared test fixtures: constants + helpers extracted from repeated literals
// across the suite. Import from here instead of re-hardcoding ids, paths, and
// repo-setup boilerplate. The `sonarjs/no-duplicate-string` lint rule guards
// against new duplication creeping back in.
//
// Path constants reuse the production source of truth (`PATH_DEFAULTS` in
// `paths.mts`) rather than re-declaring ".claude/artifacts/loop/..." strings.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { beforeEach, afterEach } from "bun:test";
import { PATH_DEFAULTS } from "../scripts/lib/paths.mjs";

const run = promisify(execFile);

// Re-export so tests reference canonical loop artifact paths from one place.
export { PATH_DEFAULTS };

// Path to the loop CLI entry (run under Bun).
export const LOOP_CLI = path.resolve("src/scripts/loop.mts");

// Loop config file, relative to repo root.
export const LOOP_JSON_REL = ".claude/loop.json";

// Common test ids.
export const SLICE_01 = "SLICE-01";
export const SLICE_02 = "SLICE-02";
export const SLICE_03 = "SLICE-03";
export const FEAT_001 = "FEAT-001";

// Backlog state directory names (mirror the loop backlog state machine).
export const BACKLOG_STATES = {
  pending: "pending",
  triaged: "triaged",
  inProgress: "in-progress",
  done: "done"
} as const;

// Preset name used across resolver/preset tests.
export const PRESET_DOTNET = "dotnet-python";

// A FEAT body with a `## Acceptance criteria` section for seeding test FEATs.
// `addFeature` prepends the `# FEAT-NN: <title>` heading only when the body
// does NOT start with `#`, so the body opens with a plain description line
// (not the `##` AC heading) — otherwise the title heading would be skipped.
// Passing this as the `body` option yields a FEAT that satisfies the
// acceptance-criteria gate in `sliceFromFeature` (placeholder AC
// auto-generation was removed — AC-less FEATs now hard-error).
export const AC_SECTION_BODY = [
  "Seeded test feature body.",
  "",
  "## Acceptance criteria",
  "",
  "- [ ] AC-1: seeded acceptance criterion for test scaffolding",
  "- [ ] AC-2: second seeded acceptance criterion",
  ""
].join("\n");

// A FEAT body whose single AC is an unfilled placeholder. It extracts as one
// AC (so `sliceFromFeature` scaffolds a slice) but the resulting slice trips
// the `startSlice` AC linter's placeholder detection — used to exercise that
// gate now that the scaffolder no longer fabricates placeholder ACs. Opens
// with a plain line so `addFeature` still prepends the title heading.
export const AC_PLACEHOLDER_BODY = [
  "Seeded test feature body.",
  "",
  "## Acceptance criteria",
  "",
  "- [ ] AC-1: <replace with a concrete, testable acceptance criterion>",
  ""
].join("\n");

/** Create an isolated tmp repo with a `.claude/` subdir. Returns its path. */
export async function makeTmpRepo(prefix = "loop-test-"): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

/** Write `.claude/loop.json` into an existing repo with the standard envelope. */
export async function writeLoopJson(repo: string, loop: Record<string, unknown>): Promise<void> {
  await fs.writeFile(
    path.join(repo, ".claude", "loop.json"),
    JSON.stringify({ schemaVersion: 1, loop })
  );
}

/**
 * Initialize a git repo (main branch, test identity, gpg signing off) with an
 * initial empty commit. The commit matters as much as `git init` itself:
 * without a real repo boundary + a commit on `main`, git subprocesses invoked
 * by code under test (e.g. crew-bridge's cost-report git diff/log calls, or
 * `git worktree add`) can walk up past the tmp dir to whatever ancestor repo
 * the OS temp path lives under (e.g. a git-initialized home directory) —
 * which can make a test scan/lock far more than its own tmp dir and
 * hang/time out under concurrent load even though it passes in isolation.
 */
export async function initGitRepo(repo: string): Promise<void> {
  await run("git", ["init", "-b", "main"], { cwd: repo });
  await run("git", ["config", "user.email", "test@test.com"], { cwd: repo });
  await run("git", ["config", "user.name", "Test"], { cwd: repo });
  await run("git", ["config", "commit.gpgsign", "false"], { cwd: repo });
  await run("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });
}

/**
 * Registers bun:test `beforeEach`/`afterEach` hooks that point
 * `CREW_MARKETPLACE_NAME` at a marketplace name that cannot resolve to a real
 * plugin cache dir, for the duration of every test in the calling file. This
 * makes `findCrewCli()` (plugin-identity.mts) short-circuit to null, so every
 * crew-bridge call inside `completeSlice` (tryWriteCostReport,
 * markValidationSkippedBadge, etc.) becomes an instant `{ skipped }` no-op
 * instead of shelling out to a real, unmocked crew CLI on the host machine.
 * On a dev box that actually has the crew plugin cached, that real subprocess
 * call can run far longer than a unit test's timeout budget — deterministic
 * and fast regardless of what's installed on the host running the test.
 *
 * Call once at module scope in any `*.test.mts` file whose tests call
 * `completeSlice()`. Save/restore is scoped per-test (not per-file) so it
 * can't leak into other test files' assertions about the real env var.
 */
export function isolateCrewCli(): void {
  let saved: string | undefined;
  beforeEach(() => {
    saved = process.env.CREW_MARKETPLACE_NAME;
    process.env.CREW_MARKETPLACE_NAME = "al-test-isolated-no-such-marketplace";
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.CREW_MARKETPLACE_NAME;
    else process.env.CREW_MARKETPLACE_NAME = saved;
  });
}

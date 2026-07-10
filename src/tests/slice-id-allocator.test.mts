// FEAT-257 SLICE-A (DEC-079) — collision-proof slice-ID allocation.
//
// allocateNextSliceId combines a local filesystem scan of slicesRoot with a
// best-effort remote scan of origin/main (git fetch + git ls-tree, no
// checkout) and returns max(localMax, remoteMax) + 1. These tests cover the
// four scenarios DEC-079's AC map assigns to SLICE-A:
//   - local-only fallback when there is no origin remote at all (offline)
//   - remote-max-wins when origin/main has a higher slice id than local
//   - identical local == remote max (no double-increment)
//   - a configured-but-empty origin remote (missing origin/main ref) still
//     degrades cleanly instead of throwing
import { exec as execCb } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, test } from "bun:test";

import { allocateNextSliceId } from "../scripts/lib/backlog-store/slice-id-allocator.mjs";

function exec(cmd: string, opts: Record<string, unknown>) {
  return promisify(execCb)(cmd, { timeout: 15_000, ...opts });
}

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@test.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@test.com"
};

// Relative path shared by every tmp repo below, so a remote-side commit and
// a local-side write land under the exact same repo-relative pathspec that
// allocateNextSliceId's `git ls-tree ... -- <slicesRootRel>` scans.
const SLICES_ROOT_REL = ".claude/artifacts/loop/ai-loop/slices";

const cleanupDirs: string[] = [];

afterEach(async () => {
  while (cleanupDirs.length > 0) {
    const dir = cleanupDirs.pop() as string;
    await fs.rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

async function tmpDir(prefix: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  cleanupDirs.push(dir);
  return dir;
}

async function initGitRepo(dir: string): Promise<void> {
  const run = (cmd: string) => exec(cmd, { cwd: dir, env: GIT_ENV });
  await run("git init -b main");
  await run("git config user.email test@test.com");
  await run("git config user.name Test");
  // gpg signing off: mirrors auto-merge.test.mts / start-slice tests — avoids
  // a machine-configured signing key hanging the commit under concurrent load.
  await run("git config commit.gpgsign false");
  await fs.writeFile(path.join(dir, "README.md"), "# test");
  await run("git add -A");
  await run("git commit -m initial");
}

async function writeSliceFile(repoDir: string, sliceId: string): Promise<void> {
  const dir = path.join(repoDir, SLICES_ROOT_REL, "pending");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${sliceId.replace("-", "_")}_TEST_SLICE.md`),
    `---\nid: ${sliceId}\nstatus: pending\n---\n# ${sliceId}: test slice\n`
  );
}

function slicesRootOf(repoDir: string): string {
  return path.join(repoDir, SLICES_ROOT_REL);
}

async function withWarnSpy<T>(fn: () => Promise<T>): Promise<{ result: T; warnings: string[] }> {
  const warnings: string[] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  try {
    const result = await fn();
    return { result, warnings };
  } finally {
    console.warn = original;
  }
}

test("allocateNextSliceId: no origin remote configured falls back to local-only max, with a warning logged", async () => {
  const repo = await tmpDir("sid-offline-");
  await initGitRepo(repo);
  await writeSliceFile(repo, "SLICE-05");

  const { result: nextId, warnings } = await withWarnSpy(() =>
    allocateNextSliceId(repo, slicesRootOf(repo))
  );

  assert.equal(nextId, 6, "no remote configured -> falls back to local max (5) + 1");
  assert.ok(
    warnings.some((w) => w.includes("[slice-id-allocator]")),
    "logs a warning when the remote scan cannot run"
  );
});

test("allocateNextSliceId: remote max wins when origin/main has a higher slice id than local", async () => {
  const origin = await tmpDir("sid-origin-");
  await exec(`git init --bare "${origin}"`, { env: GIT_ENV });

  const publisher = await tmpDir("sid-pub-");
  await initGitRepo(publisher);
  await writeSliceFile(publisher, "SLICE-10");
  await exec(`git -C "${publisher}" remote add origin "${origin}"`, { env: GIT_ENV });
  await exec(`git -C "${publisher}" add -A`, { env: GIT_ENV });
  await exec(`git -C "${publisher}" commit -m "add SLICE-10"`, { env: GIT_ENV });
  await exec(`git -C "${publisher}" push origin main`, { env: GIT_ENV });

  const local = await tmpDir("sid-local-");
  await exec(`git init -b main "${local}"`, { env: GIT_ENV });
  await exec(`git -C "${local}" remote add origin "${origin}"`, { env: GIT_ENV });
  await writeSliceFile(local, "SLICE-03");

  const nextId = await allocateNextSliceId(local, slicesRootOf(local));

  assert.equal(nextId, 11, "remote max (10) beats local max (3) -> 10 + 1");
});

test("allocateNextSliceId: identical local and remote max does not double-increment", async () => {
  const origin = await tmpDir("sid-origin-eq-");
  await exec(`git init --bare "${origin}"`, { env: GIT_ENV });

  const publisher = await tmpDir("sid-pub-eq-");
  await initGitRepo(publisher);
  await writeSliceFile(publisher, "SLICE-07");
  await exec(`git -C "${publisher}" remote add origin "${origin}"`, { env: GIT_ENV });
  await exec(`git -C "${publisher}" add -A`, { env: GIT_ENV });
  await exec(`git -C "${publisher}" commit -m "add SLICE-07"`, { env: GIT_ENV });
  await exec(`git -C "${publisher}" push origin main`, { env: GIT_ENV });

  const local = await tmpDir("sid-local-eq-");
  await exec(`git init -b main "${local}"`, { env: GIT_ENV });
  await exec(`git -C "${local}" remote add origin "${origin}"`, { env: GIT_ENV });
  await writeSliceFile(local, "SLICE-07");

  const nextId = await allocateNextSliceId(local, slicesRootOf(local));

  assert.equal(nextId, 8, "max(7, 7) + 1 = 8, not 7 + 7 + 1");
});

test("allocateNextSliceId: configured origin with no main ref degrades cleanly (no throw)", async () => {
  const origin = await tmpDir("sid-origin-empty-");
  await exec(`git init --bare "${origin}"`, { env: GIT_ENV });

  const local = await tmpDir("sid-local-empty-");
  await exec(`git init -b main "${local}"`, { env: GIT_ENV });
  await exec(`git -C "${local}" remote add origin "${origin}"`, { env: GIT_ENV });
  await writeSliceFile(local, "SLICE-04");

  const { result: nextId, warnings } = await withWarnSpy(() =>
    allocateNextSliceId(local, slicesRootOf(local))
  );

  assert.equal(nextId, 5, "empty origin (no main ref yet) -> local-only max (4) + 1");
  assert.ok(
    warnings.some((w) => w.includes("[slice-id-allocator]")),
    "logs a warning when origin/main cannot be resolved"
  );
});

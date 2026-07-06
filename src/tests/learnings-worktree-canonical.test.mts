// FEAT-188 / S1b — AC-1 root-cause fix.
//
// `slice close` / `slice grade-write` resolve their effective cwd to the
// active per-slice worktree (effective-cwd.mts) whenever a wave/worktree-mode
// run is in flight. Before this fix, logLearning/searchLearnings/etc. keyed
// the learnings.jsonl location off whatever repoPath they were handed —
// so a capture fired from inside a linked worktree landed in
// `<worktree>/.claude/artifacts/loop/learnings.jsonl`, a copy that never
// reaches main once the worktree branch is merged and the worktree pruned
// (confirmed dormant in production: zero "grade-write"-sourced entries ever
// reached the main repo's store, and grades.jsonl shows the identical
// 1-line-despite-115-grades symptom). resolveCanonicalRepoRoot fixes this by
// resolving to the MAIN worktree root before touching the store.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { logLearning, searchLearnings, learningsPath } from "../scripts/lib/learnings.mjs";

function exec(cmd: string, opts: Record<string, any>) {
  return promisify(execCb)(cmd, { timeout: 15000, ...opts });
}

const GIT_ENV = {
  ...process.env,
  GIT_AUTHOR_NAME: "Test",
  GIT_AUTHOR_EMAIL: "test@test.com",
  GIT_COMMITTER_NAME: "Test",
  GIT_COMMITTER_EMAIL: "test@test.com"
};

async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

/**
 * Create a temporary main repo plus one linked worktree off it — mirrors the
 * wave-mode per-slice worktree topology (worktree-manager.mts /
 * effective-cwd.mts) that production `slice close` runs inside.
 */
async function setupRepoWithWorktree(label: string): Promise<{ repo: string; worktree: string }> {
  const repo = await tmpDir(`lw-repo-${label}-`);
  const run = (cmd: string, cwd: string) => exec(cmd, { cwd, env: GIT_ENV });
  await run("git init -q -b main", repo);
  await run("git config user.email test@test.com", repo);
  await run("git config user.name Test", repo);
  await fs.writeFile(path.join(repo, "README.md"), "# test");
  await run("git add -A", repo);
  await run("git commit -q -m init", repo);

  const worktree = path.join(await tmpDir(`lw-wtroot-${label}-`), "slice-worktree");
  await exec(`git -C "${repo}" worktree add -b "slice/${label}" "${worktree}" main`, {
    env: GIT_ENV
  });

  return { repo, worktree };
}

async function readLearnings(repo: string) {
  try {
    const raw = await fs.readFile(learningsPath(repo), "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

test("logLearning called from inside a linked worktree writes to the MAIN repo's learnings.jsonl, not the worktree's", async () => {
  const { repo, worktree } = await setupRepoWithWorktree("write");

  await logLearning(worktree, {
    key: "from-worktree",
    insight: "captured while cwd is a worktree"
  });

  const mainEntries = await readLearnings(repo);
  assert.equal(mainEntries.length, 1, "entry must land in the main repo's store");
  assert.equal(mainEntries[0].key, "from-worktree");

  const worktreeLocalEntries = await readLearnings(worktree);
  assert.equal(
    worktreeLocalEntries.length,
    0,
    "the worktree's own .claude/artifacts/loop/learnings.jsonl must stay untouched"
  );
});

test("searchLearnings called from a worktree sees entries captured earlier from the main repo (single canonical store)", async () => {
  const { repo, worktree } = await setupRepoWithWorktree("search");

  await logLearning(repo, {
    key: "seen-from-main",
    insight: "written directly against the main repo"
  });
  const { items } = await searchLearnings(worktree, "seen-from-main");

  assert.equal(items.length, 1);
  assert.equal(items[0].insight, "written directly against the main repo");
});

test("logLearning called from the main repo path itself (no active worktree) is unaffected — regression guard", async () => {
  const { repo } = await setupRepoWithWorktree("noop");

  await logLearning(repo, { key: "main-repo-direct", insight: "no redirection should occur" });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].key, "main-repo-direct");
});

test("logLearning against a plain non-git directory falls back to repoPath unchanged (test-fixture safety)", async () => {
  const plain = await tmpDir("lw-plain-");

  await logLearning(plain, { key: "plain-dir", insight: "no git repo involved at all" });

  const entries = await readLearnings(plain);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].key, "plain-dir");
});

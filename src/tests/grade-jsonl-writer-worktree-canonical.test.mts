// runner-plugin#326 — root-cause fix mirroring FEAT-188 S1b (learnings.jsonl).
//
// `slice close` / `slice grade-write` resolve their effective cwd to the
// active per-slice worktree (effective-cwd.mts) whenever a wave/worktree-mode
// run is in flight. Before this fix, appendGradeEvent keyed the grades.jsonl
// location off whatever repoPath it was handed — so a capture fired from
// inside a linked worktree landed in `<worktree>/.claude/artifacts/loop/
// grades.jsonl`, a copy that never reaches main once the worktree branch is
// merged and the worktree pruned. Reuses the existing
// resolveCanonicalRepoRoot helper (learnings.mts, S1b) rather than
// duplicating it.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { exec as execCb } from "node:child_process";
import { promisify } from "node:util";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { appendGradeEvent, GRADE_JSONL_RELATIVE } from "../scripts/lib/grade-jsonl-writer.mjs";

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
  const repo = await tmpDir(`gw-repo-${label}-`);
  const run = (cmd: string, cwd: string) => exec(cmd, { cwd, env: GIT_ENV });
  await run("git init -q -b main", repo);
  await run("git config user.email test@test.com", repo);
  await run("git config user.name Test", repo);
  await fs.writeFile(path.join(repo, "README.md"), "# test");
  await run("git add -A", repo);
  await run("git commit -q -m init", repo);

  const worktree = path.join(await tmpDir(`gw-wtroot-${label}-`), "slice-worktree");
  await exec(`git -C "${repo}" worktree add -b "slice/${label}" "${worktree}" main`, {
    env: GIT_ENV
  });

  return { repo, worktree };
}

async function readGrades(repo: string) {
  try {
    const raw = await fs.readFile(path.join(repo, GRADE_JSONL_RELATIVE), "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

test("appendGradeEvent called from inside a linked worktree writes to the MAIN repo's grades.jsonl, not the worktree's", async () => {
  const { repo, worktree } = await setupRepoWithWorktree("write");

  await appendGradeEvent(worktree, {
    sliceId: "SLICE-1",
    recordedAt: "2026-07-06T00:00:00.000Z",
    scores: { reliability: 0.9 }
  });

  const mainEntries = await readGrades(repo);
  assert.equal(mainEntries.length, 1, "entry must land in the main repo's store");
  assert.equal(mainEntries[0].sliceId, "SLICE-1");

  const worktreeLocalEntries = await readGrades(worktree);
  assert.equal(
    worktreeLocalEntries.length,
    0,
    "the worktree's own .claude/artifacts/loop/grades.jsonl must stay untouched"
  );
});

test("appendGradeEvent called from the main repo path itself (no active worktree) is unaffected — regression guard", async () => {
  const { repo } = await setupRepoWithWorktree("noop");

  await appendGradeEvent(repo, {
    sliceId: "SLICE-2",
    recordedAt: "2026-07-06T00:00:00.000Z",
    scores: { reliability: 0.8 }
  });

  const entries = await readGrades(repo);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sliceId, "SLICE-2");
});

test("appendGradeEvent against a plain non-git directory falls back to repoPath unchanged (test-fixture safety)", async () => {
  const plain = await tmpDir("gw-plain-");

  await appendGradeEvent(plain, {
    sliceId: "SLICE-3",
    recordedAt: "2026-07-06T00:00:00.000Z",
    scores: { reliability: 0.7 }
  });

  const entries = await readGrades(plain);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].sliceId, "SLICE-3");
});

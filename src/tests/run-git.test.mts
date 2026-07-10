// Tests for src/scripts/lib/run-git.mts (issue #449, W2b S3).
//
// Exercises the error contract that the review flagged: gitTextOrThrow must
// attach stdout/stderr/code onto the thrown Error, mirroring what
// promisify(execFile) attached on the sites this wrapper replaced. Uses a
// real temp git repo for setup (repo precedent: checkpoint-commit.test.mts,
// doctor.test.mts) rather than mocking child_process.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { gitOk, gitText, gitTextOrThrow, runGit } from "../scripts/lib/run-git.mjs";

function execFile(file: string, args: string[], opts?: Record<string, unknown>) {
  return promisify(execFileCallback)(file, args, { timeout: 10000, ...opts });
}

async function initGitRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await execFile("git", ["init", "--quiet"], { cwd: repo });
  await execFile("git", ["config", "user.email", "t@e"], { cwd: repo });
  await execFile("git", ["config", "user.name", "t"], { cwd: repo });
  await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: repo });
  await fs.writeFile(path.join(repo, "base.txt"), "initial", "utf8");
  await execFile("git", ["add", "base.txt"], { cwd: repo });
  await execFile("git", ["commit", "-m", "initial"], { cwd: repo });
  return repo;
}

// ---------------------------------------------------------------------------
// runGit — raw passthrough
// ---------------------------------------------------------------------------

test("runGit: ok exit returns {ok: true, status: 0} with trimmed-newline stdout", async () => {
  const repo = await initGitRepo("rg-raw-ok-");
  const result = await runGit(["rev-parse", "HEAD"], { cwd: repo });
  assert.equal(result.ok, true);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^[0-9a-f]{40}$/);
});

test("runGit: non-zero exit returns {ok: false} without throwing", async () => {
  const repo = await initGitRepo("rg-raw-fail-");
  const result = await runGit(["rev-parse", "--verify", "no-such-branch"], { cwd: repo });
  assert.equal(result.ok, false);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /fatal/i);
});

// ---------------------------------------------------------------------------
// gitText — try/catch -> null contract
// ---------------------------------------------------------------------------

test("gitText: ok exit returns trimmed stdout", async () => {
  const repo = await initGitRepo("rg-text-ok-");
  const sha = await gitText(["rev-parse", "HEAD"], { cwd: repo });
  assert.ok(sha !== null);
  assert.match(sha, /^[0-9a-f]{40}$/);
});

test("gitText: non-zero exit returns null", async () => {
  const repo = await initGitRepo("rg-text-fail-");
  const out = await gitText(["rev-parse", "--verify", "no-such-branch"], { cwd: repo });
  assert.equal(out, null);
});

test("gitText: spawn failure (nonexistent cwd) returns null, does not throw", async () => {
  const out = await gitText(["status"], { cwd: path.join(os.tmpdir(), "rg-does-not-exist-xyz") });
  assert.equal(out, null);
});

// ---------------------------------------------------------------------------
// gitOk — try/catch -> boolean contract
// ---------------------------------------------------------------------------

test("gitOk: ok exit returns true", async () => {
  const repo = await initGitRepo("rg-ok-true-");
  assert.equal(await gitOk(["rev-parse", "--verify", "HEAD"], { cwd: repo }), true);
});

test("gitOk: non-zero exit returns false", async () => {
  const repo = await initGitRepo("rg-ok-false-");
  assert.equal(await gitOk(["rev-parse", "--verify", "no-such-branch"], { cwd: repo }), false);
});

test("gitOk: spawn failure (nonexistent cwd) returns false, does not throw", async () => {
  const ok = await gitOk(["status"], { cwd: path.join(os.tmpdir(), "rg-does-not-exist-xyz") });
  assert.equal(ok, false);
});

// ---------------------------------------------------------------------------
// gitTextOrThrow — rejects on non-zero exit, mirroring promisify(execFile)
// ---------------------------------------------------------------------------

test("gitTextOrThrow: ok exit returns {stdout, stderr}, does not throw", async () => {
  const repo = await initGitRepo("rg-throw-ok-");
  const { stdout, stderr } = await gitTextOrThrow(["rev-parse", "HEAD"], { cwd: repo });
  assert.match(stdout.trim(), /^[0-9a-f]{40}$/);
  assert.equal(stderr.trim(), "");
});

test("gitTextOrThrow: non-zero exit throws with .stdout/.stderr/.code populated", async () => {
  const repo = await initGitRepo("rg-throw-fail-");
  await assert.rejects(
    gitTextOrThrow(["rev-parse", "--verify", "no-such-branch"], { cwd: repo }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      const e = err as Error & { stdout?: string; stderr?: string; code?: number };
      // The review's core requirement: callers doing `err?.stderr ?? ""` must
      // get the real git diagnostic, not undefined.
      assert.equal(e.stdout, "");
      assert.match(e.stderr ?? "", /fatal/i);
      assert.equal(typeof e.code, "number");
      assert.notEqual(e.code, 0);
      return true;
    }
  );
});

test("gitTextOrThrow: spawn failure (nonexistent cwd) throws with .stdout/.stderr backfilled to ''", async () => {
  await assert.rejects(
    gitTextOrThrow(["status"], { cwd: path.join(os.tmpdir(), "rg-does-not-exist-xyz") }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      const e = err as Error & { stdout?: string; stderr?: string };
      // TransientError itself carries no stdout/stderr — gitTextOrThrow must
      // backfill both to "" so an unconditional `err?.stderr` read never sees
      // `undefined`.
      assert.equal(e.stdout, "");
      assert.equal(e.stderr, "");
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// maxBuffer forwarding (spot-check — several migrated sites pass this)
// ---------------------------------------------------------------------------

test("gitText: forwards maxBuffer option through to plugin-std", async () => {
  const repo = await initGitRepo("rg-maxbuf-");
  // A tiny maxBuffer on ordinary output should overflow -> gitText swallows
  // the resulting DeterministicError into null, same as any other failure.
  const out = await gitText(["log", "-1"], { cwd: repo, maxBuffer: 1 });
  assert.equal(out, null);
});

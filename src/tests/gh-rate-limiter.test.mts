import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  checkRateLimit,
  acquireDispatch,
  releaseDispatch
} from "../scripts/lib/gh-rate-limiter.mjs";

// ---------------------------------------------------------------------------
// Helper: create a temp directory + return a unique stateFile path.
// ---------------------------------------------------------------------------
async function tmpStateFile(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "gh-rate-limiter-test-"));
  return path.join(dir, "crew-dispatch-state.json");
}

// ---------------------------------------------------------------------------
// checkRateLimit
// ---------------------------------------------------------------------------

test("checkRateLimit returns blocked:false when state file does not exist", async () => {
  const stateFile = await tmpStateFile();
  // Do NOT create the file — simulates first-ever run.
  const result = await checkRateLimit(42, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("checkRateLimit returns blocked:false for a PR with no active dispatch", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(99, "dispatch-abc", stateFile);
  // PR 42 has no entry; PR 99 does.
  const result = await checkRateLimit(42, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("checkRateLimit returns blocked:true with activeDispatchId after acquire", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(7, "dispatch-xyz", stateFile);
  const result = await checkRateLimit(7, stateFile);
  assert.equal(result.blocked, true);
  assert.equal(result.activeDispatchId, "dispatch-xyz");
});

// ---------------------------------------------------------------------------
// acquireDispatch
// ---------------------------------------------------------------------------

test("acquireDispatch creates the state file when absent", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(1, "d1", stateFile);
  const raw = await fs.readFile(stateFile, "utf-8");
  const parsed: unknown = JSON.parse(raw);
  assert.ok(typeof parsed === "object" && parsed !== null);
});

test("acquireDispatch stores dispatchId and acquiredAt for the PR", async () => {
  const stateFile = await tmpStateFile();
  const before = new Date();
  await acquireDispatch(5, "run-1234", stateFile);
  const result = await checkRateLimit(5, stateFile);
  assert.equal(result.blocked, true);
  assert.equal(result.activeDispatchId, "run-1234");
  // acquiredAt should be a parseable ISO string close to now.
  const raw = JSON.parse(await fs.readFile(stateFile, "utf-8")) as Record<
    string,
    { acquiredAt: string }
  >;
  const acquiredAt = new Date(raw["5"]!.acquiredAt);
  assert.ok(acquiredAt >= before);
});

test("acquireDispatch overwrites an existing entry for the same PR", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(3, "first-dispatch", stateFile);
  await acquireDispatch(3, "second-dispatch", stateFile);
  const result = await checkRateLimit(3, stateFile);
  assert.equal(result.activeDispatchId, "second-dispatch");
});

// ---------------------------------------------------------------------------
// releaseDispatch
// ---------------------------------------------------------------------------

test("releaseDispatch removes the PR entry so checkRateLimit returns blocked:false", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(10, "d-release", stateFile);
  await releaseDispatch(10, stateFile);
  const result = await checkRateLimit(10, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("releaseDispatch is a no-op when no entry exists", async () => {
  const stateFile = await tmpStateFile();
  // Should not throw even if the file / entry is absent.
  await releaseDispatch(999, stateFile);
  const result = await checkRateLimit(999, stateFile);
  assert.deepEqual(result, { blocked: false });
});

test("releaseDispatch only removes the target PR, leaving others intact", async () => {
  const stateFile = await tmpStateFile();
  await acquireDispatch(20, "d-a", stateFile);
  await acquireDispatch(21, "d-b", stateFile);
  await releaseDispatch(20, stateFile);
  const r20 = await checkRateLimit(20, stateFile);
  const r21 = await checkRateLimit(21, stateFile);
  assert.deepEqual(r20, { blocked: false });
  assert.equal(r21.blocked, true);
  assert.equal(r21.activeDispatchId, "d-b");
});

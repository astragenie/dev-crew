// Tests for artifact-lock-writer.mts — FEAT-264 SLICE-4 (AC-4, #527).
//
// Covers: lock-file schema matches the cross-plugin contract field-for-field
// (docs/upstream-requests/2026-07-18-crew-artifact-lock-hook-contract.md,
// golden-fixture-checked against dev-team#262's `isWellFormedLock` parser
// expectations), expiresAt = createdAt + 48h, posix path normalization
// (backslashes in, forward slashes out; leading "./" stripped),
// removeArtifactLock idempotency, and fail-soft behavior on write errors.

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  writeArtifactLock,
  removeArtifactLock,
  normalizeLockPath,
  LOCK_TTL_MS,
  type ArtifactLock
} from "../scripts/lib/slice-linker/artifact-lock-writer.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function lockPath(repo: string, sliceId: string): string {
  return path.join(repo, ".claude", "state", "loop", "artifact-locks", `${sliceId}.json`);
}

/**
 * Mirrors dev-team#262's `isWellFormedLock` parser (hooks/lib/pre-tool-use-artifact-lock.ts)
 * field-for-field: sliceId:string, lockedPaths:string[], lockedBy:string,
 * createdAt:string, expiresAt:string|undefined. Duplicated here (rather than
 * imported cross-repo) as the golden-fixture assertion this test suite's
 * schema conformance is checked against.
 */
function isWellFormedLock(obj: unknown): obj is ArtifactLock {
  if (typeof obj !== "object" || obj === null) return false;
  const o = obj as Record<string, unknown>;
  return (
    typeof o["sliceId"] === "string" &&
    Array.isArray(o["lockedPaths"]) &&
    o["lockedPaths"].every((p) => typeof p === "string") &&
    typeof o["lockedBy"] === "string" &&
    typeof o["createdAt"] === "string" &&
    (o["expiresAt"] === undefined || typeof o["expiresAt"] === "string")
  );
}

// ---------------------------------------------------------------------------
// writeArtifactLock — schema conformance
// ---------------------------------------------------------------------------

test("writeArtifactLock: writes a well-formed lock matching the cross-plugin contract schema", async () => {
  const repo = await tmpRepo("alw-schema-");
  await writeArtifactLock(
    repo,
    "SLICE-42",
    [".claude/artifacts/crew/validations/plan.md"],
    "qa-gate"
  );

  const raw = await fs.readFile(lockPath(repo, "SLICE-42"), "utf8");
  const parsed = JSON.parse(raw);

  assert.ok(isWellFormedLock(parsed), "lock must satisfy dev-team#262's isWellFormedLock shape");
  assert.equal(parsed.sliceId, "SLICE-42");
  assert.deepEqual(parsed.lockedPaths, [".claude/artifacts/crew/validations/plan.md"]);
  assert.equal(parsed.lockedBy, "qa-gate");
  assert.ok(
    !Number.isNaN(Date.parse(parsed.createdAt)),
    "createdAt must be a parseable ISO string"
  );
  assert.ok(
    !Number.isNaN(Date.parse(parsed.expiresAt)),
    "expiresAt must be a parseable ISO string"
  );
});

test("writeArtifactLock: expiresAt is exactly createdAt + 48h (LOCK_TTL_MS)", async () => {
  const repo = await tmpRepo("alw-ttl-");
  const before = Date.now();
  await writeArtifactLock(repo, "SLICE-43", ["a.md"], "qa-gate");
  const after = Date.now();

  const raw = await fs.readFile(lockPath(repo, "SLICE-43"), "utf8");
  const parsed: ArtifactLock = JSON.parse(raw);

  const createdMs = Date.parse(parsed.createdAt);
  const expiresMs = Date.parse(parsed.expiresAt);
  assert.ok(createdMs >= before && createdMs <= after, "createdAt must be within the call window");
  assert.equal(
    expiresMs - createdMs,
    LOCK_TTL_MS,
    "expiresAt must be createdAt + LOCK_TTL_MS exactly"
  );
  assert.equal(LOCK_TTL_MS, 48 * 60 * 60 * 1000, "LOCK_TTL_MS must be 48h, mirroring dev-team#262");
});

// ---------------------------------------------------------------------------
// posix path normalization
// ---------------------------------------------------------------------------

test("normalizeLockPath: backslashes in, forward slashes out; leading ./ stripped", () => {
  assert.equal(
    normalizeLockPath(".claude\\artifacts\\crew\\validations\\plan.md"),
    ".claude/artifacts/crew/validations/plan.md"
  );
  assert.equal(normalizeLockPath("./relative/path.md"), "relative/path.md");
  assert.equal(normalizeLockPath("already/posix.md"), "already/posix.md");
});

test("writeArtifactLock: normalizes lockedPaths to posix before persisting", async () => {
  const repo = await tmpRepo("alw-normalize-");
  await writeArtifactLock(
    repo,
    "SLICE-44",
    [".claude\\artifacts\\crew\\validations\\plan.md", "./another\\path.md"],
    "qa-gate"
  );

  const raw = await fs.readFile(lockPath(repo, "SLICE-44"), "utf8");
  const parsed: ArtifactLock = JSON.parse(raw);
  assert.deepEqual(parsed.lockedPaths, [
    ".claude/artifacts/crew/validations/plan.md",
    "another/path.md"
  ]);
});

// ---------------------------------------------------------------------------
// removeArtifactLock — idempotency
// ---------------------------------------------------------------------------

test("removeArtifactLock: removes an existing lock file", async () => {
  const repo = await tmpRepo("alw-remove-");
  await writeArtifactLock(repo, "SLICE-45", ["a.md"], "qa-gate");
  assert.ok(
    await fs
      .access(lockPath(repo, "SLICE-45"))
      .then(() => true)
      .catch(() => false),
    "lock file exists before removal"
  );

  await removeArtifactLock(repo, "SLICE-45");
  assert.ok(
    !(await fs
      .access(lockPath(repo, "SLICE-45"))
      .then(() => true)
      .catch(() => false)),
    "lock file gone after removal"
  );
});

test("removeArtifactLock: idempotent — calling twice does not throw", async () => {
  const repo = await tmpRepo("alw-remove-twice-");
  await writeArtifactLock(repo, "SLICE-46", ["a.md"], "qa-gate");
  await removeArtifactLock(repo, "SLICE-46");
  await removeArtifactLock(repo, "SLICE-46"); // second call — must not throw
  assert.ok(true, "second removeArtifactLock call did not throw");
});

test("removeArtifactLock: no-op (does not throw) when no lock file was ever written", async () => {
  const repo = await tmpRepo("alw-remove-missing-");
  await removeArtifactLock(repo, "SLICE-NEVER-LOCKED");
  assert.ok(true, "removing a never-created lock did not throw");
});

// ---------------------------------------------------------------------------
// Fail-soft behavior
// ---------------------------------------------------------------------------

test("writeArtifactLock: fail-soft — a repoPath that cannot hold the lock dir does not throw", async () => {
  const repo = await tmpRepo("alw-failsoft-");
  // Create a FILE (not a directory) at the ".claude" path segment so
  // fs.mkdir(recursive) for the lock dir fails with ENOTDIR.
  await fs.writeFile(path.join(repo, ".claude"), "not a directory");

  await writeArtifactLock(repo, "SLICE-47", ["a.md"], "qa-gate"); // must not throw
  assert.ok(true, "writeArtifactLock swallowed the mkdir failure instead of throwing");
});

test("removeArtifactLock: fail-soft on an unwritable path shape does not throw", async () => {
  const repo = await tmpRepo("alw-remove-failsoft-");
  await fs.writeFile(path.join(repo, ".claude"), "not a directory");

  await removeArtifactLock(repo, "SLICE-48"); // must not throw
  assert.ok(true, "removeArtifactLock swallowed the failure instead of throwing");
});

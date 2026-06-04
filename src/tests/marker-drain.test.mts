// @ts-nocheck
// Unit tests: marker-drain module (FEAT-034 / SLICE-30)
//
// Test isolation: all fixtures use os.tmpdir() + fs.mkdtemp.
// The real .claude/artifacts/loop/pending-dispatch/ directory is never touched.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseMarkerTimestamp,
  drainPendingDispatchMarkers,
  DEFAULT_TTL_MS
} from "../scripts/lib/marker-drain.mjs";

const PENDING_DISPATCH_REL = ".claude/artifacts/loop/pending-dispatch";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  return repo;
}

async function makeDispatchDir(repo: string): Promise<string> {
  const dir = path.join(repo, PENDING_DISPATCH_REL);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function writeMarker(dir: string, filename: string, content = "{}"): Promise<string> {
  const p = path.join(dir, filename);
  await fs.writeFile(p, content, "utf8");
  return p;
}

// ---------------------------------------------------------------------------
// parseMarkerTimestamp
// ---------------------------------------------------------------------------

test("parseMarkerTimestamp: valid marker returns numeric timestamp", () => {
  const result = parseMarkerTimestamp("1234567890123-loop-researcher.json");
  assert.equal(result, 1234567890123);
});

test("parseMarkerTimestamp: non-marker filename returns null", () => {
  assert.equal(parseMarkerTimestamp("not-a-marker.json"), null);
});

test("parseMarkerTimestamp: timestamp shorter than 13 digits returns null", () => {
  assert.equal(parseMarkerTimestamp("123-too-short.json"), null);
});

test("parseMarkerTimestamp: uppercase agent identifier returns null", () => {
  assert.equal(parseMarkerTimestamp("1234567890123-AGENT.json"), null);
});

// ---------------------------------------------------------------------------
// drainPendingDispatchMarkers
// ---------------------------------------------------------------------------

test("drain: deletes file older than TTL, keeps file inside TTL", async () => {
  const repo = await tmpRepo("drain-ttl-");
  const dir = await makeDispatchDir(repo);

  const now = Date.now();
  const oldTs = now - 48 * 60 * 60 * 1000; // 48h ago
  const newTs = now - 1 * 60 * 60 * 1000; // 1h ago

  const oldFile = `${oldTs}-loop-test.json`;
  const newFile = `${newTs}-loop-test.json`;

  await writeMarker(dir, oldFile);
  await writeMarker(dir, newFile);

  const result = await drainPendingDispatchMarkers(repo, { now });

  assert.equal(result.scanned, 2, "should scan 2 matching files");
  assert.equal(result.deleted, 1, "should delete 1 old file");
  assert.equal(result.kept, 1, "should keep 1 new file");
  assert.equal(result.errors.length, 0, "no errors expected");

  // Old file gone, new file present
  await assert.rejects(() => fs.access(path.join(dir, oldFile)), "old file should be deleted");
  await fs.access(path.join(dir, newFile)); // must still exist
});

test("drain: missing directory returns zero counts without error", async () => {
  const repo = await tmpRepo("drain-missing-dir-");
  // Do NOT create the pending-dispatch dir

  const result = await drainPendingDispatchMarkers(repo);

  assert.deepEqual(result, { scanned: 0, deleted: 0, kept: 0, errors: [] });
});

test("drain: skips files not matching pattern (random.json, .txt extension)", async () => {
  const repo = await tmpRepo("drain-skip-pattern-");
  const dir = await makeDispatchDir(repo);

  await writeMarker(dir, "random.json");
  await writeMarker(dir, "1234567890123-loop-researcher.txt"); // wrong extension
  await writeMarker(dir, "README.md");

  const result = await drainPendingDispatchMarkers(repo, { now: Date.now() + DEFAULT_TTL_MS * 2 });

  // None match the pattern, so scanned=0, nothing deleted
  assert.equal(result.scanned, 0, "no files should match pattern");
  assert.equal(result.deleted, 0, "no files should be deleted");
  assert.equal(result.errors.length, 0);

  // All non-matching files still on disk
  await fs.access(path.join(dir, "random.json"));
  await fs.access(path.join(dir, "1234567890123-loop-researcher.txt"));
  await fs.access(path.join(dir, "README.md"));
});

test("drain: returns errors[] entry on unlink failure but continues scan", async () => {
  const repo = await tmpRepo("drain-unlink-fail-");
  const dir = await makeDispatchDir(repo);

  const now = Date.now();
  const oldTs = now - 48 * 60 * 60 * 1000;

  // Write two old markers
  const file1 = `${oldTs}-loop-test.json`;
  const file2 = `${oldTs + 1}-loop-test.json`;

  await writeMarker(dir, file1);
  await writeMarker(dir, file2);

  // Remove dir read permissions by deleting one file first, then monkey-patch unlink
  // We simulate failure by making the file read-only on Windows (rename trick):
  // Instead, we import the module and intercept via a direct approach —
  // create a subdir named like a marker to cause EISDIR on unlink.
  await fs.rm(path.join(dir, file1));
  await fs.mkdir(path.join(dir, file1)); // directory with marker name → unlink will fail

  const result = await drainPendingDispatchMarkers(repo, { now });

  // file1 (dir) triggers an error, file2 succeeds
  assert.equal(result.scanned, 2, "both matched pattern");
  assert.equal(result.deleted, 1, "file2 was deleted");
  assert.equal(result.errors.length, 1, "one error for file1");
  assert.equal(result.errors[0].file, file1);

  // Cleanup — remove the directory we created
  await fs.rmdir(path.join(dir, file1)).catch(() => {});
});

test("drain: result counts scanned/deleted/kept/errors are accurate", async () => {
  const repo = await tmpRepo("drain-counts-");
  const dir = await makeDispatchDir(repo);

  const now = Date.now();
  const oldBase = now - 48 * 60 * 60 * 1000;
  const newBase = now - 1 * 60 * 60 * 1000;

  // 2 old files to delete, 2 new files to keep, 1 non-matching to skip
  await writeMarker(dir, `${oldBase}-loop-a.json`);
  await writeMarker(dir, `${oldBase + 1}-loop-b.json`);
  await writeMarker(dir, `${newBase}-loop-c.json`);
  await writeMarker(dir, `${newBase + 1}-loop-d.json`);
  await writeMarker(dir, "random.json"); // skipped

  const result = await drainPendingDispatchMarkers(repo, { now });

  assert.equal(result.scanned, 4, "4 files match pattern");
  assert.equal(result.deleted, 2, "2 old files deleted");
  assert.equal(result.kept, 2, "2 new files kept");
  assert.equal(result.errors.length, 0, "no errors");

  // Verify DEFAULT_TTL_MS is exported and is 24h
  assert.equal(DEFAULT_TTL_MS, 24 * 60 * 60 * 1000, "DEFAULT_TTL_MS must be 24h in ms");
});

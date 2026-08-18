import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  appendCitation,
  updateUtilityScoreInStore,
  _internals
} from "../scripts/lib/learnings-citations.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LEARNINGS_FILENAME = "learnings.jsonl";

async function makeTmpDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), "citations-test-"));
}

function parseCitationsFile(raw: string): any[] {
  return raw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

function makeStoreFile(entries: any[]): string {
  return entries.map((e) => JSON.stringify(e)).join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// appendCitation tests
// ---------------------------------------------------------------------------

// Test 1 — append creates file when absent
test("appendCitation: creates citations.jsonl when absent", async () => {
  const dir = await makeTmpDir();
  await appendCitation("SLICE-001", ["id-1", "id-2"], dir);
  const raw = await fs.readFile(path.join(dir, "citations.jsonl"), "utf8");
  const records = parseCitationsFile(raw);
  assert.equal(records.length, 1);
  assert.equal(records[0]!.sliceId, "SLICE-001");
  assert.deepEqual(records[0]!.learningIds, ["id-1", "id-2"]);
  assert.ok(typeof records[0]!.retrievedAt === "string");
  await fs.rm(dir, { recursive: true });
});

// Test 2 — 3 sequential appends produce 3 lines
test("appendCitation: 3 sequential appends produce 3 lines", async () => {
  const dir = await makeTmpDir();
  await appendCitation("SLICE-001", ["a"], dir);
  await appendCitation("SLICE-002", ["b"], dir);
  await appendCitation("SLICE-003", ["c"], dir);
  const raw = await fs.readFile(path.join(dir, "citations.jsonl"), "utf8");
  const records = parseCitationsFile(raw);
  assert.equal(records.length, 3);
  assert.equal(records[0]!.sliceId, "SLICE-001");
  assert.equal(records[1]!.sliceId, "SLICE-002");
  assert.equal(records[2]!.sliceId, "SLICE-003");
  await fs.rm(dir, { recursive: true });
});

// ---------------------------------------------------------------------------
// updateUtilityScoreInStore tests
// ---------------------------------------------------------------------------

// Test 3 — pass increments utility_score by +1
test("updateUtilityScoreInStore: pass increments utility_score by +1", async () => {
  const dir = await makeTmpDir();
  const storeFile = path.join(dir, LEARNINGS_FILENAME);
  const entries = [{ id: "abc", text: "foo", sliceId: "S1", createdAt: 0, utility_score: 3 }];
  await fs.writeFile(storeFile, makeStoreFile(entries), "utf8");

  await updateUtilityScoreInStore("abc", "pass", storeFile);

  const raw = await fs.readFile(storeFile, "utf8");
  const updated = parseCitationsFile(raw);
  assert.equal(updated[0]!.utility_score, 4);
  await fs.rm(dir, { recursive: true });
});

// Test 4 — fail decrements by -2
test("updateUtilityScoreInStore: fail decrements utility_score by -2", async () => {
  const dir = await makeTmpDir();
  const storeFile = path.join(dir, LEARNINGS_FILENAME);
  const entries = [{ id: "abc", text: "foo", sliceId: "S1", createdAt: 0, utility_score: 5 }];
  await fs.writeFile(storeFile, makeStoreFile(entries), "utf8");

  await updateUtilityScoreInStore("abc", "fail", storeFile);

  const raw = await fs.readFile(storeFile, "utf8");
  const updated = parseCitationsFile(raw);
  assert.equal(updated[0]!.utility_score, 3);
  await fs.rm(dir, { recursive: true });
});

// Test 5 — floor at 0 (fail when utility_score = 1 → 0, not -1)
test("updateUtilityScoreInStore: fail floors at 0", async () => {
  const dir = await makeTmpDir();
  const storeFile = path.join(dir, LEARNINGS_FILENAME);
  const entries = [{ id: "abc", text: "foo", sliceId: "S1", createdAt: 0, utility_score: 1 }];
  await fs.writeFile(storeFile, makeStoreFile(entries), "utf8");

  await updateUtilityScoreInStore("abc", "fail", storeFile);

  const raw = await fs.readFile(storeFile, "utf8");
  const updated = parseCitationsFile(raw);
  assert.equal(updated[0]!.utility_score, 0);
  await fs.rm(dir, { recursive: true });
});

// Test 6 — unknown id is no-op (file unchanged)
test("updateUtilityScoreInStore: unknown id is a no-op", async () => {
  const dir = await makeTmpDir();
  const storeFile = path.join(dir, LEARNINGS_FILENAME);
  const entries = [{ id: "abc", text: "foo", sliceId: "S1", createdAt: 0, utility_score: 2 }];
  const original = makeStoreFile(entries);
  await fs.writeFile(storeFile, original, "utf8");

  await updateUtilityScoreInStore("nonexistent", "pass", storeFile);

  const raw = await fs.readFile(storeFile, "utf8");
  // utility_score should be unchanged
  const updated = parseCitationsFile(raw);
  assert.equal(updated[0]!.utility_score, 2);
  await fs.rm(dir, { recursive: true });
});

// Test 7 — missing utility_score field treated as 0, pass gives 1
test("updateUtilityScoreInStore: missing utility_score treated as 0 for pass", async () => {
  const dir = await makeTmpDir();
  const storeFile = path.join(dir, LEARNINGS_FILENAME);
  const entries = [{ id: "xyz", text: "bar", sliceId: "S2", createdAt: 0 }];
  await fs.writeFile(storeFile, makeStoreFile(entries), "utf8");

  await updateUtilityScoreInStore("xyz", "pass", storeFile);

  const raw = await fs.readFile(storeFile, "utf8");
  const updated = parseCitationsFile(raw);
  assert.equal(updated[0]!.utility_score, 1);
  await fs.rm(dir, { recursive: true });
});

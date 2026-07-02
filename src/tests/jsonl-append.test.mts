import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  appendJsonl,
  appendJsonlBatch,
  appendJsonlSync,
  _internals
} from "../scripts/lib/jsonl-append.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function readLines(filePath: string): Promise<unknown[]> {
  const raw = await fs.readFile(filePath, "utf8");
  return raw
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

// ---------------------------------------------------------------------------
// appendJsonl (async, single record)
// ---------------------------------------------------------------------------

test("appendJsonl creates parent dir and file when absent", async () => {
  const repo = await tmpRepo("jsonl-create-");
  const target = path.join(repo, "nested", "dir", "log.jsonl");
  await appendJsonl(target, { a: 1 });
  const lines = await readLines(target);
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], { a: 1 });
});

test("appendJsonl appends a second line on a subsequent call", async () => {
  const repo = await tmpRepo("jsonl-append2-");
  const target = path.join(repo, "log.jsonl");
  await appendJsonl(target, { a: 1 });
  await appendJsonl(target, { a: 2 });
  const lines = await readLines(target);
  assert.equal(lines.length, 2);
  assert.deepEqual(lines[1], { a: 2 });
});

test("appendJsonl throws by default when the write fails", async () => {
  const repo = await tmpRepo("jsonl-throw-");
  const target = path.join(repo, "log.jsonl");
  await assert.rejects(() =>
    appendJsonl(target, { a: 1 }, {
      appendFile: async () => {
        throw new Error("disk full");
      }
    })
  );
});

test("appendJsonl swallows the error when swallowErrors is true", async () => {
  const repo = await tmpRepo("jsonl-swallow-");
  const target = path.join(repo, "log.jsonl");
  await appendJsonl(
    target,
    { a: 1 },
    {
      swallowErrors: true,
      appendFile: async () => {
        throw new Error("disk full");
      }
    }
  );
  // No throw — and no file written since appendFile always failed.
  await assert.rejects(() => fs.access(target));
});

test("appendJsonl honors mkdir/appendFile overrides (test-injection seam)", async () => {
  const calls: { mkdir: string[]; appendFile: string[] } = { mkdir: [], appendFile: [] };
  await appendJsonl(
    "/virtual/path/log.jsonl",
    { a: 1 },
    {
      mkdir: async (dir) => {
        calls.mkdir.push(dir);
      },
      appendFile: async (filePath) => {
        calls.appendFile.push(filePath);
      }
    }
  );
  assert.equal(calls.mkdir.length, 1);
  assert.equal(calls.appendFile.length, 1);
  assert.equal(calls.appendFile[0], "/virtual/path/log.jsonl");
});

// ---------------------------------------------------------------------------
// appendJsonlBatch
// ---------------------------------------------------------------------------

test("appendJsonlBatch writes multiple records in a single appendFile call", async () => {
  const repo = await tmpRepo("jsonl-batch-");
  const target = path.join(repo, "batch.jsonl");
  let appendCalls = 0;
  await appendJsonlBatch(target, [{ a: 1 }, { a: 2 }, { a: 3 }], {
    appendFile: async (filePath, data) => {
      appendCalls += 1;
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.appendFile(filePath, data, "utf8");
    }
  });
  assert.equal(appendCalls, 1, "expected exactly one appendFile call for the whole batch");
  const lines = await readLines(target);
  assert.equal(lines.length, 3);
  assert.deepEqual(lines, [{ a: 1 }, { a: 2 }, { a: 3 }]);
});

test("appendJsonlBatch is a no-op for an empty array", async () => {
  const repo = await tmpRepo("jsonl-batch-empty-");
  const target = path.join(repo, "batch.jsonl");
  await appendJsonlBatch(target, []);
  await assert.rejects(() => fs.access(target));
});

// ---------------------------------------------------------------------------
// appendJsonlSync
// ---------------------------------------------------------------------------

test("appendJsonlSync creates parent dir and file when absent", async () => {
  const repo = await tmpRepo("jsonl-sync-create-");
  const target = path.join(repo, "nested", "sync.jsonl");
  appendJsonlSync(target, { a: 1 });
  const lines = await readLines(target);
  assert.equal(lines.length, 1);
  assert.deepEqual(lines[0], { a: 1 });
});

test("appendJsonlSync appends a second line on a subsequent call", async () => {
  const repo = await tmpRepo("jsonl-sync-append2-");
  const target = path.join(repo, "sync.jsonl");
  appendJsonlSync(target, { a: 1 });
  appendJsonlSync(target, { a: 2 });
  const lines = await readLines(target);
  assert.equal(lines.length, 2);
});

test("appendJsonlSync throws by default when the target is unwritable", async () => {
  const repo = await tmpRepo("jsonl-sync-throw-");
  // Use a path whose parent segment is actually a file, forcing mkdirSync to throw.
  const blocker = path.join(repo, "blocker");
  await fs.writeFile(blocker, "x");
  const target = path.join(blocker, "cant-create-dir-here", "log.jsonl");
  assert.throws(() => appendJsonlSync(target, { a: 1 }));
});

test("appendJsonlSync swallows the error when swallowErrors is true", async () => {
  const repo = await tmpRepo("jsonl-sync-swallow-");
  const blocker = path.join(repo, "blocker");
  await fs.writeFile(blocker, "x");
  const target = path.join(blocker, "cant-create-dir-here", "log.jsonl");
  assert.doesNotThrow(() => appendJsonlSync(target, { a: 1 }, { swallowErrors: true }));
});

// ---------------------------------------------------------------------------
// Concurrent appends (no interleaving corruption within the batch API)
// ---------------------------------------------------------------------------

test("concurrent appendJsonl calls to the same file all land as separate valid lines", async () => {
  const repo = await tmpRepo("jsonl-concurrent-");
  const target = path.join(repo, "concurrent.jsonl");
  await Promise.all(
    Array.from({ length: 10 }, (_, i) => appendJsonl(target, { i }))
  );
  const lines = await readLines(target);
  assert.equal(lines.length, 10);
  const values = lines.map((l) => (l as { i: number }).i).sort((a, b) => a - b);
  assert.deepEqual(values, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

// ---------------------------------------------------------------------------
// Default _internals sanity (no overrides — real fs)
// ---------------------------------------------------------------------------

test("_internals.mkdir + _internals.appendFile are the default async primitives", async () => {
  const repo = await tmpRepo("jsonl-internals-");
  const target = path.join(repo, "default.jsonl");
  await _internals.mkdir(path.dirname(target));
  await _internals.appendFile(target, `${JSON.stringify({ x: true })}\n`);
  const lines = await readLines(target);
  assert.deepEqual(lines, [{ x: true }]);
});

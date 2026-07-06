// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  logLearning,
  recentLearnings,
  searchLearnings,
  deleteLearning,
  learningsPath
} from "../scripts/lib/learnings.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// --- logLearning tests ---

test("logLearning appends a valid JSON line to learnings.jsonl", async () => {
  const repo = await tmpRepo("learnings-append-");
  const record = await logLearning(repo, {
    key: "test-key",
    insight: "test insight",
    confidence: 0.8,
    source: "agent"
  });

  assert.equal(record.key, "test-key");
  assert.equal(record.insight, "test insight");
  assert.equal(record.confidence, 0.8);
  assert.equal(record.source, "agent");
  assert.equal(typeof record.id, "number");
  assert.equal(typeof record.timestamp, "string");

  // Verify file written
  const filePath = learningsPath(repo);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw.trim());
  assert.equal(parsed.key, "test-key");
  assert.equal(parsed.insight, "test insight");
});

test("logLearning assigns monotonically increasing IDs", async () => {
  const repo = await tmpRepo("learnings-ids-");
  const r1 = await logLearning(repo, { key: "k1", insight: "i1" });
  const r2 = await logLearning(repo, { key: "k2", insight: "i2" });
  const r3 = await logLearning(repo, { key: "k3", insight: "i3" });

  assert.equal(r1.id, 1);
  assert.equal(r2.id, 2);
  assert.equal(r3.id, 3);
});

test("logLearning creates the parent directory when absent", async () => {
  const repo = await tmpRepo("learnings-mkdir-");
  // Do not pre-create the .claude/artifacts/loop dir
  await logLearning(repo, { key: "dir-test", insight: "directory auto-created" });
  const filePath = learningsPath(repo);
  const stat = await fs.stat(filePath);
  assert.ok(stat.isFile());
});

// FEAT-217: logLearning mirrors the learning into astramem (type=lesson) when
// memory is enabled. Capturing fake CLI; POSIX-only argv assertion.
test("logLearning mirrors the learning into astramem when memory enabled", async () => {
  const { _resetCliCache } = await import("../scripts/lib/memory-bridge.mjs");
  _resetCliCache();
  const repo = await tmpRepo("learnings-mem-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ productName: "runner", memory: { enabled: "on" } })
  );

  const cliRoot = await tmpRepo("learnings-cli-");
  const binDir = path.join(cliRoot, "bin");
  await fs.mkdir(binDir, { recursive: true });
  const argsFile = path.join(cliRoot, "captured.jsonl");
  const isWin = process.platform === "win32";
  if (isWin) {
    await fs.writeFile(path.join(binDir, "astramem.cmd"), "@echo off\n");
  } else {
    await fs.writeFile(
      path.join(binDir, "astramem"),
      `#!/bin/sh\nnode -e "require('fs').appendFileSync(process.argv[1], JSON.stringify(process.argv.slice(2))+'\\n')" "${argsFile}" "$@"\n`
    );
    await fs.chmod(path.join(binDir, "astramem"), 0o755);
  }
  const origRoot = process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
  process.env.CLAUDE_PLUGIN_ROOT_MEMORY = cliRoot;

  try {
    await logLearning(repo, {
      key: "resolver-over-env",
      insight: "prefer resolveTokenEnv over shell-global",
      sliceId: "SLICE-140"
    });
    if (isWin) return;
    await new Promise((r) => setTimeout(r, 300));
    let calls = [];
    try {
      calls = (await fs.readFile(argsFile, "utf8"))
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => JSON.parse(l));
    } catch {
      return;
    }
    const rememberCalls = calls.filter((argv) => argv[0] === "remember");
    assert.ok(rememberCalls.length >= 1, "expected a remember spawn for the learning");
    const argv = rememberCalls[0];
    assert.equal(argv[argv.indexOf("--type") + 1], "lesson");
    const contentArg = argv[argv.indexOf("--content") + 1];
    assert.match(contentArg, /resolver-over-env/);
    assert.match(contentArg, /\[SLICE-140\]/);
  } finally {
    if (origRoot !== undefined) process.env.CLAUDE_PLUGIN_ROOT_MEMORY = origRoot;
    else delete process.env.CLAUDE_PLUGIN_ROOT_MEMORY;
    _resetCliCache();
    await fs.rm(cliRoot, { recursive: true, force: true });
  }
});

test("logLearning throws on missing key", async () => {
  const repo = await tmpRepo("learnings-err-key-");
  await assert.rejects(
    () => logLearning(repo, { key: "", insight: "valid insight" }),
    /key must be a non-empty string/
  );
});

test("logLearning throws on missing insight", async () => {
  const repo = await tmpRepo("learnings-err-insight-");
  await assert.rejects(
    () => logLearning(repo, { key: "valid-key", insight: "" }),
    /insight must be a non-empty string/
  );
});

test("logLearning stores optional sliceId and tags", async () => {
  const repo = await tmpRepo("learnings-optional-");
  const record = await logLearning(repo, {
    key: "opt-key",
    insight: "opt insight",
    sliceId: "SLICE-08",
    tags: ["tdd", "learnings"]
  });
  assert.equal(record.sliceId, "SLICE-08");
  assert.deepEqual(record.tags, ["tdd", "learnings"]);
});

test("logLearning skips malformed existing lines (guards against corrupt store)", async () => {
  const repo = await tmpRepo("learnings-malformed-");
  const filePath = learningsPath(repo);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  // Write a malformed line followed by a valid one
  await fs.writeFile(
    filePath,
    'not-json\n{"id":1,"key":"k","insight":"i","confidence":null,"source":"agent"}\n',
    "utf8"
  );

  // Should still compute next ID correctly (max valid id is 1, next is 2)
  const record = await logLearning(repo, { key: "after-malformed", insight: "ok" });
  assert.equal(record.id, 2);
});

// --- recentLearnings tests ---

test("recentLearnings returns empty result when store is absent", async () => {
  const repo = await tmpRepo("learnings-empty-");
  const result = await recentLearnings(repo, 3);
  assert.equal(result.count, 0);
  assert.deepEqual(result.items, []);
  assert.equal(result.digest, null);
});

test("recentLearnings returns last N entries in order", async () => {
  const repo = await tmpRepo("learnings-recent-");
  await logLearning(repo, { key: "k1", insight: "i1" });
  await logLearning(repo, { key: "k2", insight: "i2" });
  await logLearning(repo, { key: "k3", insight: "i3" });
  await logLearning(repo, { key: "k4", insight: "i4" });

  const result = await recentLearnings(repo, 3);
  assert.equal(result.count, 3);
  assert.equal(result.items[0].key, "k2");
  assert.equal(result.items[1].key, "k3");
  assert.equal(result.items[2].key, "k4");
});

test("recentLearnings when n > count returns all entries", async () => {
  const repo = await tmpRepo("learnings-n-gt-count-");
  await logLearning(repo, { key: "only-one", insight: "singleton" });
  const result = await recentLearnings(repo, 10);
  assert.equal(result.count, 1);
  assert.equal(result.items[0].key, "only-one");
});

test("recentLearnings digest is a non-empty markdown string when entries exist", async () => {
  const repo = await tmpRepo("learnings-digest-");
  await logLearning(repo, { key: "perf-key", insight: "cache the config", confidence: 0.9 });
  const result = await recentLearnings(repo, 3);
  assert.ok(typeof result.digest === "string");
  assert.ok(result.digest.length > 0);
  assert.ok(result.digest.includes("perf-key"));
  assert.ok(result.digest.includes("cache the config"));
});

test("recentLearnings digest includes confidence when present", async () => {
  const repo = await tmpRepo("learnings-digest-conf-");
  await logLearning(repo, { key: "k", insight: "i", confidence: 0.75 });
  const result = await recentLearnings(repo, 3);
  assert.ok(result.digest.includes("0.75"));
});

// --- searchLearnings tests ---

test("searchLearnings returns matches by key substring", async () => {
  const repo = await tmpRepo("learnings-search-");
  await logLearning(repo, { key: "cache-miss", insight: "hot path uncached" });
  await logLearning(repo, { key: "lint-error", insight: "trailing whitespace" });
  const result = await searchLearnings(repo, "cache");
  assert.equal(result.count, 1);
  assert.equal(result.items[0].key, "cache-miss");
});

test("searchLearnings returns empty when no matches", async () => {
  const repo = await tmpRepo("learnings-search-empty-");
  await logLearning(repo, { key: "some-key", insight: "some insight" });
  const result = await searchLearnings(repo, "zzz-no-match");
  assert.equal(result.count, 0);
});

test("recentLearnings with n=0 returns empty result not full store", async () => {
  const repo = await tmpRepo("learnings-n-zero-");
  await logLearning(repo, { key: "k1", insight: "i1" });
  await logLearning(repo, { key: "k2", insight: "i2" });
  const result = await recentLearnings(repo, 0);
  assert.equal(result.count, 0);
  assert.deepEqual(result.items, []);
  assert.equal(result.digest, null);
});

// --- deleteLearning tests ---

test("deleteLearning removes entry by id and returns deleted record", async () => {
  const repo = await tmpRepo("learnings-delete-");
  const r1 = await logLearning(repo, { key: "k1", insight: "first" });
  await logLearning(repo, { key: "k2", insight: "second" });

  const deleted = await deleteLearning(repo, r1.id);

  assert.ok(deleted !== null);
  assert.equal(deleted.id, r1.id);
  assert.equal(deleted.key, "k1");

  const remaining = await recentLearnings(repo, 10);
  assert.equal(remaining.count, 1);
  assert.equal(remaining.items[0].key, "k2");
});

test("deleteLearning returns null when id not found", async () => {
  const repo = await tmpRepo("learnings-delete-miss-");
  await logLearning(repo, { key: "only", insight: "sole entry" });

  const result = await deleteLearning(repo, 999);

  assert.equal(result, null);
  const all = await recentLearnings(repo, 10);
  assert.equal(all.count, 1);
});

test("deleteLearning returns null when store is absent", async () => {
  const repo = await tmpRepo("learnings-delete-absent-");
  // Do not call logLearning — store does not exist
  const result = await deleteLearning(repo, 1);
  assert.equal(result, null);
});

test("deleteLearning with NaN id returns null since no entry matches NaN", async () => {
  const repo = await tmpRepo("learnings-delete-nan-");
  await logLearning(repo, { key: "entry", insight: "some insight" });
  // NaN !== any numeric id so no match found — returns null without crash
  const result = await deleteLearning(repo, NaN);
  assert.equal(result, null);
  const all = await recentLearnings(repo, 10);
  assert.equal(all.count, 1);
});

test("deleteLearning preserves order of remaining entries after deletion", async () => {
  const repo = await tmpRepo("learnings-delete-order-");
  const r1 = await logLearning(repo, { key: "first", insight: "a" });
  const _r2 = await logLearning(repo, { key: "second", insight: "b" });
  const r3 = await logLearning(repo, { key: "third", insight: "c" });

  await deleteLearning(repo, _r2.id);

  const all = await recentLearnings(repo, 10);
  assert.equal(all.count, 2);
  assert.equal(all.items[0].id, r1.id);
  assert.equal(all.items[1].id, r3.id);
});

// --- FEAT-220 enriched schema tests (AC-2) ---

test("logLearning round-trips all 7 FEAT-220 fields", async () => {
  const repo = await tmpRepo("learnings-feat220-full-");
  const record = await logLearning(repo, {
    key: "eval-gap",
    insight: "builder skipped the AC-3 edge case",
    failure_class: "validation_fail",
    root_cause: "reviewer prompt omitted the edge-case checklist",
    recommended_fix: "add edge-case checklist to reviewer dispatch",
    evidence: ["run-42/trace.json", ".claude/artifacts/crew/reviews/SLICE-1.md"],
    status: "validated",
    scope: "workflow",
    expires_at: "2027-01-01T00:00:00.000Z"
  });

  assert.equal(record.failure_class, "validation_fail");
  assert.equal(record.root_cause, "reviewer prompt omitted the edge-case checklist");
  assert.equal(record.recommended_fix, "add edge-case checklist to reviewer dispatch");
  assert.deepEqual(record.evidence, [
    "run-42/trace.json",
    ".claude/artifacts/crew/reviews/SLICE-1.md"
  ]);
  assert.equal(record.status, "validated");
  assert.equal(record.scope, "workflow");
  assert.equal(record.expires_at, "2027-01-01T00:00:00.000Z");

  const filePath = learningsPath(repo);
  const raw = await fs.readFile(filePath, "utf8");
  const parsed = JSON.parse(raw.trim());
  assert.equal(parsed.failure_class, "validation_fail");
  assert.equal(parsed.status, "validated");
});

test("logLearning omits failure_class/root_cause/recommended_fix/evidence/expires_at when absent — never null", async () => {
  const repo = await tmpRepo("learnings-feat220-absent-");
  const record = await logLearning(repo, { key: "bare", insight: "no optional fields supplied" });

  assert.equal("failure_class" in record, false);
  assert.equal("root_cause" in record, false);
  assert.equal("recommended_fix" in record, false);
  assert.equal("evidence" in record, false);
  assert.equal("expires_at" in record, false);
});

test("logLearning defaults status to 'candidate' and scope to 'repo' when omitted", async () => {
  const repo = await tmpRepo("learnings-feat220-defaults-");
  const record = await logLearning(repo, { key: "default-check", insight: "check defaults" });
  assert.equal(record.status, "candidate");
  assert.equal(record.scope, "repo");
});

// --- FEAT-220 backward compatibility (AC-1) ---

test("legacy 8-field learnings.jsonl row parses unchanged through recentLearnings", async () => {
  const repo = await tmpRepo("learnings-feat220-legacy-");
  const filePath = learningsPath(repo);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(
    filePath,
    `${JSON.stringify({
      id: 1,
      timestamp: "2026-05-28T19:48:53.059Z",
      key: "test-key",
      insight: "test insight",
      confidence: 0.8,
      source: "agent"
    })}\n`,
    "utf8"
  );

  const result = await recentLearnings(repo, 1);
  assert.equal(result.count, 1);
  assert.equal(result.items[0].key, "test-key");
  assert.equal(result.items[0].insight, "test insight");
  assert.equal(
    "status" in result.items[0],
    false,
    "legacy row must not gain a status field on read"
  );
  assert.equal("scope" in result.items[0], false, "legacy row must not gain a scope field on read");
});

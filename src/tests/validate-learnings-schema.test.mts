// Tests for src/scripts/validate-learnings-schema.mts (FEAT-220 AC-5).
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  validateLearningEntry,
  validateLearningsSchema
} from "../scripts/validate-learnings-schema.mjs";
import { learningsPath } from "../scripts/lib/learnings.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeLearningsFile(repo: string, lines: string[]): Promise<void> {
  const filePath = learningsPath(repo);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, lines.length > 0 ? `${lines.join("\n")}\n` : "", "utf8");
}

// --- validateLearningEntry ---

test("validateLearningEntry: accepts an entry with no FEAT-220 fields (absent optionals tolerated)", () => {
  const errors = validateLearningEntry(
    {
      id: 1,
      timestamp: "2026-05-28T19:48:53.059Z",
      key: "k",
      insight: "i",
      confidence: 0.8,
      source: "agent"
    },
    "line 1"
  );
  assert.deepEqual(errors, []);
});

test("validateLearningEntry: accepts an entry with all 7 FEAT-220 fields populated with valid values", () => {
  const errors = validateLearningEntry(
    {
      id: 2,
      timestamp: "2026-07-01T00:00:00.000Z",
      key: "k",
      insight: "i",
      failure_class: "bad_patch",
      root_cause: "cause",
      recommended_fix: "fix",
      evidence: ["a", "b"],
      status: "promoted",
      scope: "global",
      expires_at: "2027-01-01T00:00:00.000Z"
    },
    "line 2"
  );
  assert.deepEqual(errors, []);
});

test("validateLearningEntry: rejects an invalid failure_class enum value", () => {
  const errors = validateLearningEntry(
    { key: "k", insight: "i", failure_class: "not-a-class" },
    "line 1"
  );
  assert.ok(errors.some((e) => e.includes("failure_class")));
});

test("validateLearningEntry: rejects an invalid status enum value", () => {
  const errors = validateLearningEntry({ key: "k", insight: "i", status: "archived" }, "line 1");
  assert.ok(errors.some((e) => e.includes("status")));
});

test("validateLearningEntry: rejects an invalid scope enum value", () => {
  const errors = validateLearningEntry({ key: "k", insight: "i", scope: "planet" }, "line 1");
  assert.ok(errors.some((e) => e.includes("scope")));
});

test("validateLearningEntry: rejects a non-string-array evidence field", () => {
  const errors = validateLearningEntry({ key: "k", insight: "i", evidence: [1, 2] }, "line 1");
  assert.ok(errors.some((e) => e.includes("evidence")));
});

test("validateLearningEntry: rejects an unparseable expires_at", () => {
  const errors = validateLearningEntry(
    { key: "k", insight: "i", expires_at: "not-a-date" },
    "line 1"
  );
  assert.ok(errors.some((e) => e.includes("expires_at")));
});

test("validateLearningEntry: rejects entries missing key or insight", () => {
  const errors = validateLearningEntry({ key: "", insight: "" }, "line 1");
  assert.ok(errors.some((e) => e.includes("key")));
  assert.ok(errors.some((e) => e.includes("insight")));
});

// --- validateLearningsSchema (file-level) ---

test("validateLearningsSchema: ok when learnings.jsonl is absent", async () => {
  const repo = await tmpRepo("validate-learnings-absent-");
  const result = validateLearningsSchema(repo);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
});

test("validateLearningsSchema: the 5 real legacy rows all pass unchanged", async () => {
  const repo = await tmpRepo("validate-learnings-legacy-");
  await writeLearningsFile(repo, [
    JSON.stringify({
      id: 1,
      timestamp: "2026-05-28T19:48:53.059Z",
      key: "test-key",
      insight: "test insight",
      confidence: 0.8,
      source: "agent"
    }),
    JSON.stringify({
      id: 2,
      timestamp: "2026-05-28T19:58:34.953Z",
      key: "test-key",
      insight: "test insight",
      confidence: 0.8,
      source: "agent"
    }),
    JSON.stringify({
      id: 3,
      timestamp: "2026-06-10T00:09:12.228Z",
      key: "specialist-pause-recurrence",
      insight: "Specialist-pause recurred 2026-06-10 during R-B.",
      confidence: 0.9,
      source: "agent"
    }),
    JSON.stringify({
      id: 4,
      timestamp: "2026-06-12T14:54:34.175Z",
      key: "deferred-tool-toolsearch-gap",
      insight: "Granting a deferred tool in agent frontmatter is necessary but not sufficient.",
      confidence: 0.9,
      source: "agent",
      sliceId: "SLICE-112"
    }),
    JSON.stringify({
      id: 5,
      timestamp: "2026-07-02T13:45:19.099Z",
      key: "aiplugin-dev-pause-rate",
      insight: "crew:aiplugin-dev pauses mid-run at ~80% rate.",
      confidence: 0.9,
      source: "wave-session-2026-07-02",
      tags: ["specialist-pause", "aiplugin-dev", "dispatch-reliability"]
    })
  ]);

  const result = validateLearningsSchema(repo);
  assert.equal(result.ok, true, `expected no errors, got: ${result.errors.join("; ")}`);
});

test("validateLearningsSchema: reports the offending line number for a malformed enum value", async () => {
  const repo = await tmpRepo("validate-learnings-bad-enum-");
  await writeLearningsFile(repo, [
    JSON.stringify({ id: 1, key: "ok", insight: "fine" }),
    JSON.stringify({ id: 2, key: "bad", insight: "bad row", failure_class: "made_up" })
  ]);

  const result = validateLearningsSchema(repo);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.startsWith("line 2:") && e.includes("failure_class")));
});

test("validateLearningsSchema: skips malformed JSON lines with a clear error, not a crash", async () => {
  const repo = await tmpRepo("validate-learnings-malformed-json-");
  await writeLearningsFile(repo, ["not-json", JSON.stringify({ key: "ok", insight: "fine" })]);

  const result = validateLearningsSchema(repo);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("malformed JSON")));
});

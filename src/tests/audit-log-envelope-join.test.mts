// Tests for audit-envelope-join.mts (SLICE-137)
// AC-7: ≥ 5 tests covering:
//   (a) audit entry sliceId round-trip via buildAuditEntry
//   (b) joinAuditToPairs picks nearest-preceding entry
//   (c) joinAuditToPairs LIFO consumption (consumed entry not re-used)
//   (d) joinAuditToPairs back-compat (audit entry without sliceId → no join)
//   (e) computeNextIterationIndex returns 0/1/2 sequence for repeated tuple

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test, describe } from "bun:test";
import assert from "node:assert/strict";

import {
  joinAuditToPairs,
  computeNextIterationIndex,
  type AuditEntryForJoin,
  type PairInput
} from "../scripts/lib/audit-envelope-join.mjs";
import { flushAuditLog, dispatchAgent } from "../scripts/lib/auto-dispatch.mjs";
import { readDispatchLog } from "../scripts/lib/cost-by-skill.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function auditLogPath(repoRoot: string): string {
  return path.join(repoRoot, ".claude", "artifacts", "loop", "auto-dispatch.jsonl");
}

// ---------------------------------------------------------------------------
// (a) AC-1 / AC-7a: sliceId round-trip through buildAuditEntry
// ---------------------------------------------------------------------------

describe("AC-7a: sliceId round-trip in audit entry", () => {
  test("dispatchAgent writes sliceId field to audit log", async () => {
    const repo = await tmpDir("ae-join-a-");
    try {
      await dispatchAgent({
        agent: "devcrew:builder",
        prompt: "build",
        parentCommand: "slice start",
        repoRoot: repo,
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 0
      });
      await flushAuditLog(repo);

      const entries = await readDispatchLog(auditLogPath(repo));
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.sliceId, "SLICE-137");
      assert.equal(entries[0]!.dispatchKind, "auto");
      assert.equal(entries[0]!.iterationIndex, 0);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("dispatchAgent writes sliceId: null when no sliceId provided", async () => {
    const repo = await tmpDir("ae-join-anull-");
    try {
      await dispatchAgent({
        agent: "devcrew:reviewer",
        prompt: "review",
        parentCommand: "slice review",
        repoRoot: repo,
        dispatchKind: "manual"
      });
      await flushAuditLog(repo);

      const entries = await readDispatchLog(auditLogPath(repo));
      assert.equal(entries.length, 1);
      assert.equal(entries[0]!.sliceId, null);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// (b) AC-7b: joinAuditToPairs picks nearest-preceding audit entry
// ---------------------------------------------------------------------------

describe("AC-7b: joinAuditToPairs nearest-preceding match", () => {
  test("returns dispatchKind + iterationIndex from matching audit entry", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 0
      }
    ];
    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:00:05.000Z" }];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    assert.equal(result.length, 1);
    assert.equal(result[0]!.dispatchKind, "auto");
    assert.equal(result[0]!.iterationIndex, 0);
  });

  test("picks latest entry before startTs when multiple candidates exist", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T09:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "manual",
        iterationIndex: 0
      },
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 1
      }
    ];
    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    // Should pick the 10:00 entry (latest before 10:05)
    assert.equal(result[0]!.dispatchKind, "auto");
    assert.equal(result[0]!.iterationIndex, 1);
  });

  test("returns null/0 when no entry precedes startTs", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T12:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 0
      }
    ];
    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:00:00.000Z" }];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    assert.equal(result[0]!.dispatchKind, null);
    assert.equal(result[0]!.iterationIndex, 0);
  });

  test("returns null/0 for pair with null startTs", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "wave",
        iterationIndex: 2
      }
    ];
    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: null }];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    assert.equal(result[0]!.dispatchKind, null);
    assert.equal(result[0]!.iterationIndex, 0);
  });
});

// ---------------------------------------------------------------------------
// (c) AC-7c: LIFO consumption — consumed entry not re-used
// ---------------------------------------------------------------------------

describe("AC-7c: joinAuditToPairs LIFO consumption", () => {
  test("each audit entry consumed at most once across multiple pairs", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 0
      }
    ];
    // Two pairs competing for the same audit entry
    const pairs: PairInput[] = [
      { agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" },
      { agentType: "devcrew:builder", startTs: "2026-07-01T10:10:00.000Z" }
    ];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    assert.equal(result.length, 2);
    // First pair consumes the entry
    assert.equal(result[0]!.dispatchKind, "auto");
    assert.equal(result[0]!.iterationIndex, 0);
    // Second pair gets null/0 (entry was consumed)
    assert.equal(result[1]!.dispatchKind, null);
    assert.equal(result[1]!.iterationIndex, 0);
  });

  test("second pair gets its own audit entry when two entries present", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 0
      },
      {
        timestamp: "2026-07-01T10:06:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 1
      }
    ];
    const pairs: PairInput[] = [
      { agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" },
      { agentType: "devcrew:builder", startTs: "2026-07-01T10:10:00.000Z" }
    ];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    assert.equal(result[0]!.iterationIndex, 0);
    assert.equal(result[1]!.iterationIndex, 1);
  });
});

// ---------------------------------------------------------------------------
// (d) AC-7d: back-compat — audit entry without sliceId → no join
// ---------------------------------------------------------------------------

describe("AC-7d: back-compat with v1 audit entries (no sliceId)", () => {
  test("entry without sliceId field is excluded from matching", () => {
    // Legacy v1 entry: sliceId is undefined (not null, not present)
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        // sliceId intentionally absent
        dispatchKind: "auto",
        iterationIndex: 0
      }
    ];
    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    // No match because entry.sliceId !== "SLICE-137" (undefined !== "SLICE-137")
    assert.equal(result[0]!.dispatchKind, null);
    assert.equal(result[0]!.iterationIndex, 0);
  });

  test("entry with sliceId: null is excluded from matching", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: null,
        dispatchKind: "manual",
        iterationIndex: 0
      }
    ];
    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    assert.equal(result[0]!.dispatchKind, null);
  });

  test("correctly filters by sliceId — different sliceId entry not matched", () => {
    const entries: AuditEntryForJoin[] = [
      {
        timestamp: "2026-07-01T10:00:00.000Z",
        agent: "devcrew:builder",
        sliceId: "SLICE-999",
        dispatchKind: "wave",
        iterationIndex: 5
      }
    ];
    const pairs: PairInput[] = [{ agentType: "devcrew:builder", startTs: "2026-07-01T10:05:00.000Z" }];

    const result = joinAuditToPairs(pairs, entries, "SLICE-137");
    assert.equal(result[0]!.dispatchKind, null);
    assert.equal(result[0]!.iterationIndex, 0);
  });
});

// ---------------------------------------------------------------------------
// (e) AC-7e: computeNextIterationIndex returns 0/1/2 sequence
// ---------------------------------------------------------------------------

describe("AC-7e: computeNextIterationIndex sequence", () => {
  test("returns 0 when no matching entries exist (first dispatch)", async () => {
    const repo = await tmpDir("ae-join-e0-");
    try {
      const logPath = auditLogPath(repo);
      // Ensure directory exists for the log
      await fs.mkdir(path.dirname(logPath), { recursive: true });
      await fs.writeFile(logPath, "", "utf8");

      const idx = await computeNextIterationIndex(logPath, "SLICE-137", "devcrew:builder");
      assert.equal(idx, 0);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("returns 0 when log file is missing", async () => {
    const idx = await computeNextIterationIndex(
      "/tmp/nonexistent-dir-99999/auto-dispatch.jsonl",
      "SLICE-137",
      "devcrew:builder"
    );
    assert.equal(idx, 0);
  });

  test("returns 1 after one dispatch with iterationIndex=0", async () => {
    const repo = await tmpDir("ae-join-e1-");
    try {
      await dispatchAgent({
        agent: "devcrew:builder",
        prompt: "build",
        parentCommand: "slice start",
        repoRoot: repo,
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 0
      });
      await flushAuditLog(repo);

      const logPath = auditLogPath(repo);
      const idx = await computeNextIterationIndex(logPath, "SLICE-137", "devcrew:builder");
      assert.equal(idx, 1);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("returns 2 after two dispatches (iterationIndex 0 and 1)", async () => {
    const repo = await tmpDir("ae-join-e2-");
    try {
      await dispatchAgent({
        agent: "devcrew:builder",
        prompt: "build",
        parentCommand: "slice start",
        repoRoot: repo,
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 0
      });
      await dispatchAgent({
        agent: "devcrew:builder",
        prompt: "build retry",
        parentCommand: "slice retry",
        repoRoot: repo,
        sliceId: "SLICE-137",
        dispatchKind: "auto",
        iterationIndex: 1
      });
      await flushAuditLog(repo);

      const logPath = auditLogPath(repo);
      const idx = await computeNextIterationIndex(logPath, "SLICE-137", "devcrew:builder");
      assert.equal(idx, 2);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("does not cross-contaminate different sliceIds", async () => {
    const repo = await tmpDir("ae-join-ecross-");
    try {
      await dispatchAgent({
        agent: "devcrew:builder",
        prompt: "build for 999",
        parentCommand: "slice start",
        repoRoot: repo,
        sliceId: "SLICE-999",
        dispatchKind: "auto",
        iterationIndex: 5
      });
      await flushAuditLog(repo);

      const logPath = auditLogPath(repo);
      // SLICE-137 has no entries — should return 0
      const idx = await computeNextIterationIndex(logPath, "SLICE-137", "devcrew:builder");
      assert.equal(idx, 0);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });

  test("does not cross-contaminate different agents", async () => {
    const repo = await tmpDir("ae-join-eagent-");
    try {
      await dispatchAgent({
        agent: "devcrew:reviewer",
        prompt: "review",
        parentCommand: "slice review",
        repoRoot: repo,
        sliceId: "SLICE-137",
        dispatchKind: "manual",
        iterationIndex: 3
      });
      await flushAuditLog(repo);

      const logPath = auditLogPath(repo);
      // devcrew:builder has no entries for SLICE-137 — should return 0
      const idx = await computeNextIterationIndex(logPath, "SLICE-137", "devcrew:builder");
      assert.equal(idx, 0);
    } finally {
      await fs.rm(repo, { recursive: true, force: true });
    }
  });
});

// ---------------------------------------------------------------------------
// AC-6 note: no retry loops exist in current codebase (single-shot dispatches
// only). computeNextIterationIndex is available as an opt-in helper for future
// retry FEATs. The 0/1/2 sequence tests above validate the helper independently.
// ---------------------------------------------------------------------------

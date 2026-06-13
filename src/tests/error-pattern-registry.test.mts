// @ts-nocheck — tests import from .mjs specifier resolved by Bun to .mts source
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  matchPatterns,
  checkDispatchResult,
  logPatternMatch
} from "../scripts/lib/error-pattern-registry.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

// ---------------------------------------------------------------------------
// matchPatterns — output-only detection
// ---------------------------------------------------------------------------

test("matchPatterns returns pause-without-artifact for output containing 'pausing'", () => {
  const result = matchPatterns("I am pausing because I need more information.");
  assert.ok(result !== null, "expected a pattern match");
  assert.equal(result.id, "pause-without-artifact");
  assert.equal(result.recovery, "re-dispatch");
});

test("matchPatterns returns pause-without-artifact for output containing 'waiting for'", () => {
  const result = matchPatterns("The agent is waiting for the user to provide a file path.");
  assert.ok(result !== null, "expected a pattern match");
  assert.equal(result.id, "pause-without-artifact");
});

test('matchPatterns returns pause-without-artifact for output containing "I\'ll wait"', () => {
  const result = matchPatterns("I'll wait until the artifact is available.");
  assert.ok(result !== null, "expected a pattern match");
  assert.equal(result.id, "pause-without-artifact");
});

test("matchPatterns returns budget-exceeded for output with 'budget exceeded'", () => {
  const result = matchPatterns("The tool budget exceeded the allowed limit; stopping now.");
  assert.ok(result !== null, "expected a pattern match");
  assert.equal(result.id, "budget-exceeded");
  assert.equal(result.recovery, "escalate");
});

test("matchPatterns returns budget-exceeded for output with 'budget' and 'limit'", () => {
  const result = matchPatterns("Budget limit reached. Cannot continue.");
  assert.ok(result !== null, "expected a pattern match");
  assert.equal(result.id, "budget-exceeded");
});

test("matchPatterns returns truncated-output for abruptly-ending long output without PASS/FAIL", () => {
  // Build output > 8000 chars that ends cleanly but has no verdict
  const longOutput = "A".repeat(8001) + ".";
  const result = matchPatterns(longOutput);
  assert.ok(result !== null, "expected truncated-output for long output without verdict");
  assert.equal(result.id, "truncated-output");
  assert.equal(result.recovery, "retry-with-inline");
});

test("matchPatterns returns truncated-output for short output ending without sentence-end character", () => {
  // Short output that ends abruptly (no period, }, or newline)
  const result = matchPatterns("The builder wrote some stuff and then");
  assert.ok(result !== null, "expected truncated-output");
  assert.equal(result.id, "truncated-output");
});

test("matchPatterns returns null for clean output ending with period", () => {
  const result = matchPatterns("All tasks complete. The artifact has been written.");
  assert.equal(result, null);
});

test("matchPatterns returns null for clean output ending with closing brace", () => {
  const result = matchPatterns('{"status":"ok","path":"/artifacts/handoff.md"}');
  assert.equal(result, null);
});

test("matchPatterns returns null for clean short output", () => {
  const result = matchPatterns("Done.\n");
  assert.equal(result, null);
});

test("matchPatterns prioritises budget-exceeded over pause when both keywords present", () => {
  const result = matchPatterns("Budget limit reached. I am pausing and waiting for instructions.");
  assert.ok(result !== null);
  assert.equal(result.id, "budget-exceeded", "budget-exceeded should take precedence");
});

// ---------------------------------------------------------------------------
// checkDispatchResult — artifact-aware checks
// ---------------------------------------------------------------------------

test("checkDispatchResult returns empty-artifact when artifact file is < 50 bytes", async () => {
  const repo = await tmpRepo("epr-empty-");
  try {
    const artifactPath = path.join(repo, "handoff.md");
    await writeFile(artifactPath, "tiny");

    const result = await checkDispatchResult("All done.\n", artifactPath, repo);
    assert.ok(result !== null, "expected a pattern match");
    assert.equal(result.pattern.id, "empty-artifact");
    assert.equal(result.pattern.recovery, "re-dispatch");
    assert.ok(result.evidence.includes("bytes"), "evidence should mention byte count");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("checkDispatchResult returns null when output is clean and artifact is substantial", async () => {
  const repo = await tmpRepo("epr-clean-");
  try {
    const artifactPath = path.join(repo, "handoff.md");
    const largeContent = "# Handoff\n" + "This is a valid handoff artifact.\n".repeat(5);
    await writeFile(artifactPath, largeContent);

    const result = await checkDispatchResult("Completed successfully.\n", artifactPath, repo);
    assert.equal(result, null);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("checkDispatchResult returns pause-without-artifact when output has pause keyword and artifact is missing", async () => {
  const repo = await tmpRepo("epr-pause-");
  try {
    const artifactPath = path.join(repo, "nonexistent-handoff.md");

    const result = await checkDispatchResult(
      "I am pausing until more context is provided.",
      artifactPath,
      repo
    );
    assert.ok(result !== null, "expected a pattern match");
    assert.equal(result.pattern.id, "pause-without-artifact");
    assert.equal(result.pattern.recovery, "re-dispatch");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("checkDispatchResult returns budget-exceeded from output even when artifact is missing", async () => {
  const repo = await tmpRepo("epr-budget-");
  try {
    const artifactPath = path.join(repo, "nonexistent-handoff.md");

    const result = await checkDispatchResult(
      "Budget exceeded; stopping operation now.",
      artifactPath,
      repo
    );
    assert.ok(result !== null, "expected a pattern match");
    assert.equal(result.pattern.id, "budget-exceeded");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("checkDispatchResult accepts absolute artifactPath", async () => {
  const repo = await tmpRepo("epr-abs-");
  try {
    const artifactPath = path.join(repo, "handoff.md");
    await writeFile(artifactPath, "tiny");

    // Pass absolute path directly; repoPath should be ignored for resolution
    const result = await checkDispatchResult("Done.\n", artifactPath, "/some/other/repo");
    assert.ok(result !== null);
    assert.equal(result.pattern.id, "empty-artifact");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// logPatternMatch — JSONL persistence
// ---------------------------------------------------------------------------

test("logPatternMatch appends a valid JSON line to learnings.jsonl", async () => {
  const repo = await tmpRepo("epr-log-");
  try {
    const fakeResult = {
      pattern: {
        id: "pause-without-artifact" as const,
        description: "test",
        recovery: "re-dispatch" as const
      },
      evidence: "output had pause keywords"
    };

    await logPatternMatch(fakeResult, "SLICE-999", repo);

    const logPath = path.join(repo, ".claude/artifacts/loop/learnings.jsonl");
    const raw = await fs.readFile(logPath, "utf8");
    const lines = raw
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0);
    assert.equal(lines.length, 1);

    const entry = JSON.parse(lines[0]!);
    assert.equal(entry.patternId, "pause-without-artifact");
    assert.equal(entry.sliceId, "SLICE-999");
    assert.equal(entry.recovery, "re-dispatch");
    assert.equal(entry.evidence, "output had pause keywords");
    assert.ok(typeof entry.timestamp === "string" && entry.timestamp.length > 0);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("logPatternMatch appends multiple lines on successive calls", async () => {
  const repo = await tmpRepo("epr-multi-");
  try {
    const makeResult = (id: "budget-exceeded" | "empty-artifact") => ({
      pattern: {
        id,
        description: "test",
        recovery: id === "budget-exceeded" ? ("escalate" as const) : ("re-dispatch" as const)
      },
      evidence: `evidence for ${id}`
    });

    await logPatternMatch(makeResult("budget-exceeded"), "SLICE-1", repo);
    await logPatternMatch(makeResult("empty-artifact"), "SLICE-2", repo);

    const logPath = path.join(repo, ".claude/artifacts/loop/learnings.jsonl");
    const raw = await fs.readFile(logPath, "utf8");
    const lines = raw
      .trim()
      .split("\n")
      .filter((l) => l.trim().length > 0);
    assert.equal(lines.length, 2);

    const first = JSON.parse(lines[0]!);
    const second = JSON.parse(lines[1]!);
    assert.equal(first.patternId, "budget-exceeded");
    assert.equal(second.patternId, "empty-artifact");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("logPatternMatch creates parent directories when learnings.jsonl dir does not exist", async () => {
  const repo = await tmpRepo("epr-mkdir-");
  try {
    const fakeResult = {
      pattern: {
        id: "truncated-output" as const,
        description: "test",
        recovery: "retry-with-inline" as const
      },
      evidence: "truncated"
    };

    // The .claude/artifacts/loop/ dir does not exist yet in a fresh tmp dir
    await logPatternMatch(fakeResult, "SLICE-0", repo);

    const logPath = path.join(repo, ".claude/artifacts/loop/learnings.jsonl");
    await fs.access(logPath); // must exist
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

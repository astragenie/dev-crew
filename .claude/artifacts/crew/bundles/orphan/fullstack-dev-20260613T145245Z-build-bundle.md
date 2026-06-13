---
slice: unknown
builder: fullstack-dev
run_id: 20260613T145245Z
feat: FEAT-174
files_touched: ["src/scripts/lib/error-pattern-registry.mts", "src/tests/error-pattern-registry.test.mts"]
files_read: []
diff_stat: { files: 0, additions: 0, deletions: 0 }
truncated: false
truncation_reason: null
schema_version: 1
---

## Handoff

# Task Handoff: SLICE-124: error-pattern registry with automatic recovery

- Created: 2026-06-13T14:52:45.726Z
- From: fullstack-dev
- To: lead
- Objective: Added error-pattern-registry.mts library with matchPatterns/checkDispatchResult/logPatternMatch; 19 tests all pass; committed 7f24580
- Allowed Scope: -
- Forbidden Scope: -
- Deliverable: -
- Changed Files:
  - src/scripts/lib/error-pattern-registry.mts
  - src/tests/error-pattern-registry.test.mts
- Confidence: high
- Risks: -
- Suggested Next Handoff: -


## Diff

```diff

```

## Files touched

### src/scripts/lib/error-pattern-registry.mts

```
// Registry of known error patterns for specialist dispatch failures.
// Provides detection, recovery hints, and JSONL logging for the autonomous loop.
// This module is a library — it does NOT wire into loop.mts or event-notifier.

import fs from "node:fs/promises";
import path from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatternId =
  | "pause-without-artifact"
  | "empty-artifact"
  | "truncated-output"
  | "budget-exceeded";

export type RecoveryAction = "retry-with-inline" | "re-dispatch" | "escalate";

export interface ErrorPattern {
  id: PatternId;
  description: string;
  recovery: RecoveryAction;
}

export interface DispatchCheckResult {
  pattern: ErrorPattern;
  evidence: string;
}

// ---------------------------------------------------------------------------
// Pattern registry (closed-set; new patterns require an explicit entry here)
// ---------------------------------------------------------------------------

const PATTERNS: ErrorPattern[] = [
  {
    id: "budget-exceeded",
    description: "Builder indicated its token or tool budget was exhausted.",
    recovery: "escalate"
  },
  {
    id: "pause-without-artifact",
    description: "Builder paused or is waiting for input but wrote no artifact.",
    recovery: "re-dispatch"
  },
  {
    id: "truncated-output",
    description: "Builder output appears cut off before a natural conclusion.",
    recovery: "retry-with-inline"
  },
  {
    id: "empty-artifact",
    description: "Builder wrote an artifact file, but it is too small to be valid.",
    recovery: "re-dispatch"
  }
];

// ---------------------------------------------------------------------------
// Detection helpers
// ---------------------------------------------------------------------------

/** True when the output looks like a budget-exceeded signal. */
function isBudgetExceeded(output: string): boolean {
  const lower = output.toLowerCase();
  return (
    lower.includes("budget") &&
    (lower.includes("exceeded") || lower.includes("limit") || lower.includes("stopping"))
  );
}

/** True when the output suggests the builder paused waiting for input. */
function isPauseWithoutArtifactOutput(output: string): boolean {
  const lower = output.toLowerCase();
  return lower.includes("pausing") || lower.includes("waiting for") || lower.includes("i'll wait");
}

/** True when the output appears to end abruptly without a natural conclusion. */
function isTruncatedOutput(output: string): boolean {
  const trimmed = output.trimEnd();
  if (trimmed.length === 0) return false;

  const lastChar = trimmed[trimmed.length - 1];
  const naturalEnd = lastChar === "." || lastChar === "}" || lastChar === "\n";

  if (!naturalEnd) return true;

  // Long output with no pass/fail verdict is also treated as truncated.
  if (trimmed.length > 8000) {
    const upper = trimmed.toUpperCase();
    return !upper.includes("PASS") && !upper.includes("FAIL");
  }

  return false;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Match builder output against known output-only patterns.
 * Checks are ordered by specificity: budget-exceeded > pause > truncated.
 * Returns the first matching pattern, or null when output looks clean.
 */
export function matchPatterns(output: string): ErrorPattern | null {
  if (isBudgetExceeded(output)) {
    return PATTERNS.find((p) => p.id === "budget-exceeded") ?? null;
  }
  if (isPauseWithoutArtifactOutput(output)) {
    return PATTERNS.find((p) => p.id === "pause-without-artifact") ?? null;
  }
  if (isTruncatedOutput(output)) {
    return PATTERNS.find((p) => p.id === "truncated-output") ?? null;
  }
  return null;
}

/**
 * Full dispatch-result check: matches output patterns first, then inspects
 * the artifact file on disk.
 *
 * - `pause-without-artifact`: output has pause keywords AND artifact is absent.
 * - `empty-artifact`: artifact exists but is < 50 bytes.
 * - Otherwise delegates to `matchPatterns` for output-only checks.
 *
 * Returns null when output is clean and artifact exists with substantial size.
 */
export async function checkDispatchResult(
  builderOutput: string,
  artifactPath: string,
  repoPath: string
): Promise<DispatchCheckResult | null> {
  const fullArtifactPath = path.isAbsolute(artifactPath)
    ? artifactPath
    : path.join(repoPath, artifactPath);

  // Check artifact existence
  let artifactStat: { size: number } | null = null;
  try {
    artifactStat = await fs.stat(fullArtifactPath);
  } catch {
    artifactStat = null;
  }

  const artifactMissing = artifactStat === null;
  const artifactEmpty = artifactStat !== null && artifactStat.size < 50;

  // pause-without-artifact: output signals a pause AND artifact is absent
  if (isPauseWithoutArtifactOutput(builderOutput) && artifactMissing) {
    const pattern = PATTERNS.find((p) => p.id === "pause-without-artifact")!;
    return {
      pattern,
      evidence: `Output contains pause keywords and artifact was not found at: ${fullArtifactPath}`
    };
  }

  // empty-artifact: artifact exists but undersized
  if (artifactEmpty) {
    const pattern = PATTERNS.find((p) => p.id === "empty-artifact")!;
    return {
      pattern,
      evidence: `Artifact at ${fullArtifactPath} is only ${artifactStat!.size} bytes (< 50 threshold).`
    };
  }

  // Delegate to output-only checks
  const outputPattern = matchPatterns(builderOutput);
  if (outputPattern !== null) {
    return {
      pattern: outputPattern,
      evidence: `Output-pattern match for '${outputPattern.id}'.`
    };
  }

  return null;
}

/**
 * Append one JSON line to `.claude/artifacts/loop/learnings.jsonl`.
 * Creates parent directories on first write.
 */
export async function logPatternMatch(
  result: DispatchCheckResult,
  sliceId: string,
  repoPath: string
): Promise<void> {
  const logPath = path.join(repoPath, ".claude/artifacts/loop/learnings.jsonl");
  await fs.mkdir(path.dirname(logPath), { recursive: true });

  const entry = {
    timestamp: new Date().toISOString(),
    patternId: result.pattern.id,
    sliceId,
    evidence: result.evidence,
    recovery: result.pattern.recovery
  };

  await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
}

```

### src/tests/error-pattern-registry.test.mts

```
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

```

## Files read


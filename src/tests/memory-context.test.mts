// Tests for src/scripts/lib/memory-context.mts
// buildMemoryContext() wraps the existing rank/lessons/decisions readers (plus
// optional astramem recall) into a single Markdown block for dispatch-prompt
// injection. FEAT-219 SLICE-2. Not wired into any dispatch site yet (SLICE-3).

import { test, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildMemoryContext } from "../scripts/lib/memory-context.mjs";
import { _resetCliCache } from "../scripts/lib/memory-bridge.mjs";

let tmpDir: string | null = null;
let brokenCliRoot: string | null = null;
let origPluginRoot: string | undefined;

// Every test neutralizes astramem resolution via a deliberately-broken CLI
// pinned through CLAUDE_PLUGIN_ROOT_MEMORY. This makes recallPrior's fallback
// path deterministic (fail-open, returns []) regardless of whether the real
// astramem CLI happens to be on the host PATH — matching AC-6's "astramem
// daemon unreachable" scenario without depending on host state or network I/O.
beforeEach(async () => {
  _resetCliCache();
  origPluginRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  brokenCliRoot = await makeBrokenAstramemCli();
  process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = brokenCliRoot;
});

afterEach(async () => {
  if (origPluginRoot !== undefined) {
    process.env["CLAUDE_PLUGIN_ROOT_MEMORY"] = origPluginRoot;
  } else {
    delete process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  }
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    tmpDir = null;
  }
  if (brokenCliRoot) {
    await fs.rm(brokenCliRoot, { recursive: true, force: true }).catch(() => undefined);
    brokenCliRoot = null;
  }
  _resetCliCache();
});

async function makeTmpRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memctx-repo-"));
  tmpDir = dir;
  await fs.mkdir(path.join(dir, ".claude", "artifacts", "loop"), { recursive: true });
  return dir;
}

async function writeLearningsJsonl(
  repoPath: string,
  entries: Record<string, unknown>[]
): Promise<void> {
  const filePath = path.join(repoPath, ".claude", "artifacts", "loop", "learnings.jsonl");
  const content = `${entries.map((e) => JSON.stringify(e)).join("\n")}\n`;
  await fs.writeFile(filePath, content, "utf8");
}

async function writeGradeFile(
  repoPath: string,
  sliceId: string,
  opts: { lessons?: string[]; surprises?: string[]; followups?: string[] } = {}
): Promise<void> {
  const gradesDir = path.join(repoPath, ".claude", "artifacts", "loop", "grades");
  await fs.mkdir(gradesDir, { recursive: true });
  const lessons = (opts.lessons ?? []).map((l) => `- ${l}`).join("\n");
  const surprises = (opts.surprises ?? []).map((s) => `- ${s}`).join("\n");
  const followups = (opts.followups ?? []).map((f) => `- ${f}`).join("\n");
  const content = `---
slice: ${sliceId}
graded_at: "2026-07-01"
---

## Scores

- architecture_quality: 0.9

## Lessons

${lessons}

## Surprises

${surprises}

## Followups

${followups}
`;
  await fs.writeFile(path.join(gradesDir, `${sliceId}-grade.md`), content, "utf8");
}

async function writeDecisionFile(
  repoPath: string,
  id: string,
  title: string,
  affectsFiles: string[],
  introducedBySlice: string
): Promise<void> {
  const decisionsDir = path.join(repoPath, ".claude", "artifacts", "loop", "decisions");
  await fs.mkdir(decisionsDir, { recursive: true });
  const affects = affectsFiles.map((f) => `  - ${f}`).join("\n");
  const content = `---
id: ${id}
title: "${title}"
status: accepted
introduced_by_slice: ${introducedBySlice}
introduced_at: "2026-07-01"
affects_files:
${affects}
---

# ${id}: ${title}

Body.
`;
  await fs.writeFile(path.join(decisionsDir, `${id}.md`), content, "utf8");
}

/**
 * Writes a deliberately-broken astramem CLI at the exact literal path
 * resolveCli() checks first (`<root>/bin/astramem`, no extension). fs.access
 * X_OK succeeds for any existing file on both POSIX and Windows (Windows
 * treats X_OK like F_OK per Node docs), so this always wins over the PATH
 * fallback. On POSIX it's a real executable that exits 1; on Windows,
 * spawning an extensionless file fails immediately (no shebang support) —
 * either way recallPrior's spawn error/non-zero path fires and it returns [].
 */
async function makeBrokenAstramemCli(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "memctx-cli-"));
  const binDir = path.join(dir, "bin");
  await fs.mkdir(binDir, { recursive: true });
  const cliPath = path.join(binDir, "astramem");
  await fs.writeFile(cliPath, "#!/bin/sh\nexit 1\n");
  await fs.chmod(cliPath, 0o755).catch(() => undefined);
  return dir;
}

// ---------------------------------------------------------------------------
// AC-5 — noop / byte-identical dispatch when memory is absent or disabled
// ---------------------------------------------------------------------------

test("buildMemoryContext returns '' when config is absent", async () => {
  const repoPath = await makeTmpRepo();
  const result = await buildMemoryContext({ repoPath });
  assert.equal(result, "");
});

test("buildMemoryContext returns '' when config is null", async () => {
  const repoPath = await makeTmpRepo();
  const result = await buildMemoryContext({ repoPath, config: null });
  assert.equal(result, "");
});

test("buildMemoryContext returns '' when memory.enabled is false", async () => {
  const repoPath = await makeTmpRepo();
  const result = await buildMemoryContext({ repoPath, config: { memory: { enabled: false } } });
  assert.equal(result, "");
});

test("buildMemoryContext returns '' when memory.enabled is 'off', even with data present", async () => {
  const repoPath = await makeTmpRepo();
  await writeLearningsJsonl(repoPath, [
    {
      id: 1,
      timestamp: "2026-07-01T00:00:00Z",
      key: "k",
      insight: "should not surface",
      sliceId: "SLICE-1"
    }
  ]);
  const result = await buildMemoryContext({ repoPath, config: { memory: { enabled: "off" } } });
  assert.equal(result, "");
});

test("buildMemoryContext returns '' when memory.enabled is 'never' (repo-wide alias)", async () => {
  const repoPath = await makeTmpRepo();
  const result = await buildMemoryContext({ repoPath, config: { memory: { enabled: "never" } } });
  assert.equal(result, "");
});

test("buildMemoryContext returns '' when memory is enabled but no source has any data", async () => {
  const repoPath = await makeTmpRepo();
  const result = await buildMemoryContext({ repoPath, config: { memory: { enabled: true } } });
  assert.equal(result, "");
});

// ---------------------------------------------------------------------------
// AC-4 — happy path: wraps rankLearnings + recentLessons + findRelevantDecisions
// ---------------------------------------------------------------------------

test("buildMemoryContext wraps learnings, lessons, and decisions into one Markdown block", async () => {
  const repoPath = await makeTmpRepo();
  await writeLearningsJsonl(repoPath, [
    {
      id: 1,
      timestamp: "2026-07-01T00:00:00Z",
      key: "token-budget",
      insight: "Always keep the injected block under the token cap.",
      sliceId: "SLICE-099",
      confidence: 0.9
    }
  ]);
  await writeGradeFile(repoPath, "SLICE-100", {
    lessons: ["Validate tag matching before wiring the reviewer fanout."],
    surprises: ["astramem was already reachable locally."]
  });
  await writeDecisionFile(
    repoPath,
    "DEC-050",
    "Memory context helper wraps existing readers only",
    ["src/scripts/lib/foo.mts"],
    "SLICE-100"
  );

  const result = await buildMemoryContext({
    repoPath,
    agentType: "reviewer",
    query: "token cap",
    tags: ["src/scripts/lib/foo.mts"],
    k: 5,
    tokenCap: 800,
    config: { memory: { enabled: true } }
  });

  assert.ok(result.startsWith("## Recent context (top-5)"), "must open with the required header");
  assert.ok(
    result.includes("[lesson] Always keep the injected block under the token cap. — SLICE-099"),
    "learnings entry must be wrapped in"
  );
  assert.ok(
    result.includes(
      "[lesson] Validate tag matching before wiring the reviewer fanout. — SLICE-100"
    ),
    "recentLessons entry must be wrapped in"
  );
  assert.ok(
    result.includes("[surprise] astramem was already reachable locally. — SLICE-100"),
    "recentLessons surprise must be wrapped in"
  );
  assert.ok(
    result.includes(
      "[decision] DEC-050: Memory context helper wraps existing readers only — SLICE-100"
    ),
    "findRelevantDecisions entry must be wrapped in"
  );
});

// ---------------------------------------------------------------------------
// Token cap enforcement — deterministic truncation, highest-ranked kept
// ---------------------------------------------------------------------------

test("buildMemoryContext never exceeds tokenCap and keeps the highest-ranked entries", async () => {
  const repoPath = await makeTmpRepo();
  const longText = "x".repeat(200);
  const entries = Array.from({ length: 20 }, (_, i) => ({
    id: i + 1,
    timestamp: "2026-07-01T00:00:00Z",
    key: `k${i}`,
    insight: `${longText}-${i}`,
    sliceId: `SLICE-${i}`,
    utility_score: 20 - i // entry 0 ranks highest, entry 19 lowest
  }));
  await writeLearningsJsonl(repoPath, entries);

  const tokenCap = 120;
  const result = await buildMemoryContext({
    repoPath,
    k: 20,
    tokenCap,
    config: { memory: { enabled: true } }
  });

  const cost = Math.ceil(result.length / 4);
  assert.ok(cost <= tokenCap, `rendered block cost ${cost} exceeded tokenCap ${tokenCap}`);
  assert.ok(
    result.includes("-0 — SLICE-0"),
    "highest-ranked entry (utility_score=20) must survive truncation"
  );
  assert.ok(
    !result.includes("-19 — SLICE-19"),
    "lowest-ranked entry must be trimmed under a tight tokenCap"
  );
});

// ---------------------------------------------------------------------------
// AC-6 — fail-open: astramem unreachable never breaks the other sources
// ---------------------------------------------------------------------------

test("buildMemoryContext stays fail-open when astramem is unreachable — other sources still surface", async () => {
  const repoPath = await makeTmpRepo();
  await writeLearningsJsonl(repoPath, [
    {
      id: 1,
      timestamp: "2026-07-01T00:00:00Z",
      key: "fail-open",
      insight: "recallPrior failure must not blank the whole block.",
      sliceId: "SLICE-200"
    }
  ]);

  const result = await buildMemoryContext({
    repoPath,
    agentType: "builder",
    project: "loop",
    config: { memory: { enabled: true } }
  });

  assert.notEqual(result, "", "must not be blank just because astramem is unreachable");
  assert.ok(
    result.includes("recallPrior failure must not blank the whole block. — SLICE-200"),
    "non-astramem sources must still surface"
  );
});

// ---------------------------------------------------------------------------
// FEAT-220 — enriched learnings schema surfaces through the real
// memory-context → toLearningEntry → rankLearnings call graph (not a
// fictional readAllEntries→rankLearnings pairing).
// ---------------------------------------------------------------------------

// AC-1: legacy rows (old 8 fields only, no FEAT-220 fields at all) rank in
// the same order they would have before this change — decayed confidence *
// utility_score, no boost/drop applied since neither status nor expires_at
// is present.
test("buildMemoryContext (AC-1): legacy rows keep pre-FEAT-220 ranking order", async () => {
  const repoPath = await makeTmpRepo();
  await writeLearningsJsonl(repoPath, [
    {
      id: 1,
      timestamp: "2026-05-28T19:48:53.059Z",
      key: "legacy-low",
      insight: "legacy-low insight",
      confidence: 0.2,
      source: "agent"
    },
    {
      id: 2,
      timestamp: "2026-05-28T19:48:53.059Z",
      key: "legacy-high",
      insight: "legacy-high insight",
      confidence: 0.9,
      source: "agent"
    }
  ]);

  const result = await buildMemoryContext({
    repoPath,
    k: 5,
    tokenCap: 800,
    config: { memory: { enabled: true } }
  });

  const highIdx = result.indexOf("legacy-high insight");
  const lowIdx = result.indexOf("legacy-low insight");
  assert.ok(highIdx >= 0 && lowIdx >= 0, "both legacy entries must surface");
  assert.ok(
    highIdx < lowIdx,
    "higher-confidence legacy entry must rank first, unchanged by FEAT-220"
  );
});

// AC-3: status=rejected excluded; status=validated ranks above an
// otherwise-equal candidate — exercised through buildMemoryContext.
test("buildMemoryContext (AC-3): rejected excluded, validated ranks above candidate", async () => {
  const repoPath = await makeTmpRepo();
  await writeLearningsJsonl(repoPath, [
    {
      id: 1,
      timestamp: "2026-07-01T00:00:00.000Z",
      key: "cand",
      insight: "candidate insight",
      confidence: 1.0,
      source: "agent",
      status: "candidate"
    },
    {
      id: 2,
      timestamp: "2026-07-01T00:00:00.000Z",
      key: "val",
      insight: "validated insight",
      confidence: 1.0,
      source: "agent",
      status: "validated"
    },
    {
      id: 3,
      timestamp: "2026-07-01T00:00:00.000Z",
      key: "rej",
      insight: "rejected insight",
      confidence: 1.0,
      source: "agent",
      status: "rejected"
    }
  ]);

  const result = await buildMemoryContext({
    repoPath,
    k: 5,
    tokenCap: 800,
    config: { memory: { enabled: true } }
  });

  assert.ok(!result.includes("rejected insight"), "rejected entries must be excluded entirely");
  const validIdx = result.indexOf("validated insight");
  const candIdx = result.indexOf("candidate insight");
  assert.ok(validIdx >= 0 && candIdx >= 0, "candidate and validated entries must both surface");
  assert.ok(validIdx < candIdx, "validated must rank above an otherwise-equal candidate");
});

// AC-4: a past expires_at hard-drops the entry from the rendered block.
test("buildMemoryContext (AC-4): entry with a past expires_at is dropped", async () => {
  const repoPath = await makeTmpRepo();
  await writeLearningsJsonl(repoPath, [
    {
      id: 1,
      timestamp: "2020-01-01T00:00:00.000Z",
      key: "stale",
      insight: "stale expired insight",
      confidence: 1.0,
      source: "agent",
      expires_at: "2020-02-01T00:00:00.000Z"
    },
    {
      id: 2,
      timestamp: "2026-07-01T00:00:00.000Z",
      key: "fresh",
      insight: "fresh unexpired insight",
      confidence: 1.0,
      source: "agent"
    }
  ]);

  const result = await buildMemoryContext({
    repoPath,
    k: 5,
    tokenCap: 800,
    config: { memory: { enabled: true } }
  });

  assert.ok(!result.includes("stale expired insight"), "expired entry must not surface");
  assert.ok(result.includes("fresh unexpired insight"), "unexpired entry must still surface");
});

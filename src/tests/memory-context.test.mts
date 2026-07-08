// Tests for src/scripts/lib/memory-context.mts
// buildMemoryContext() wraps the existing rank/lessons/decisions readers (plus
// optional astramem recall) into a single Markdown block for dispatch-prompt
// injection. FEAT-219 SLICE-2. Not wired into any dispatch site yet (SLICE-3).

import { test, beforeEach, afterEach } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { buildMemoryContext } from "../scripts/lib/memory-context.mjs";

let tmpDir: string | null = null;

// FEAT-231: buildMemoryContext's astramem source now goes through the shared
// @astragenie/astramem-client's recallSilent (same transport start-slice.mts
// uses), not the legacy CLI-spawn recallPrior. Every test neutralizes
// resolution via the client's own test seam so recall is deterministic
// (fail-open unless a test explicitly injects a provider) regardless of
// whether a real astramem plugin/daemon happens to be reachable on the host.
beforeEach(() => {
  _setWireProvider(null);
  _resetResolveCache();
});

afterEach(async () => {
  _setWireProvider(null);
  _resetResolveCache();
  if (tmpDir) {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => undefined);
    tmpDir = null;
  }
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
      insight: "astramem recall failure must not blank the whole block.",
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
    result.includes("astramem recall failure must not blank the whole block. — SLICE-200"),
    "non-astramem sources must still surface"
  );
});

test("buildMemoryContext stays fail-open when the resolved provider's recall() throws", async () => {
  const repoPath = await makeTmpRepo();
  await writeLearningsJsonl(repoPath, [
    {
      id: 1,
      timestamp: "2026-07-01T00:00:00Z",
      key: "fail-open-throw",
      insight: "a throwing provider must not blank the whole block.",
      sliceId: "SLICE-201"
    }
  ]);
  _setWireProvider({
    remember: async () => undefined,
    recall: async () => {
      throw new Error("boom");
    },
    health: async () => ({ ok: true })
  });

  const result = await buildMemoryContext({
    repoPath,
    agentType: "builder",
    config: { memory: { enabled: true } }
  });

  assert.notEqual(result, "", "must not be blank when the provider's recall() rejects");
  assert.ok(
    result.includes("a throwing provider must not blank the whole block. — SLICE-201"),
    "non-astramem sources must still surface"
  );
});

// ---------------------------------------------------------------------------
// FEAT-231 — astramem source is now recallSilent (@astragenie/astramem-client),
// not the legacy CLI-spawn recallPrior. AC-1: buildMemoryContext folds in
// hits from the shared transport, in the same "- [kind] summary — source"
// rendered shape the legacy recallPrior path produced.
// ---------------------------------------------------------------------------

test("buildMemoryContext folds in recallSilent hits from the shared astramem transport", async () => {
  const repoPath = await makeTmpRepo();
  _setWireProvider({
    remember: async () => undefined,
    recall: async () => ({
      hits: [
        {
          id: "h1",
          type: "lesson",
          text: "Recall now flows through the shared astramem-client.",
          score: 0.9,
          source: "SLICE-231"
        }
      ]
    }),
    health: async () => ({ ok: true })
  });

  const result = await buildMemoryContext({
    repoPath,
    agentType: "reviewer",
    config: { memory: { enabled: true } }
  });

  assert.ok(
    result.includes("[lesson] Recall now flows through the shared astramem-client. — SLICE-231"),
    "recallSilent hits must be wrapped in using the same rendered line format"
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

// @ts-nocheck
// Unit tests: completeSlice ceremony smoke tests (SLICE-69 / FEAT-069).
//
// The drainFn injection path was removed as part of the dead-code sweep in SLICE-69.
// These tests now verify that completeSlice succeeds on the basic ceremony path without
// the drain plumbing.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { completeSlice } from "../scripts/lib/slice-linker.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function createFeat(
  repo: string,
  featId: string,
  state: string,
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const fm = {
    id: featId,
    status: state,
    priority: "P1",
    created: "2026-06-01",
    updated: "2026-06-01",
    ...extraFm
  };
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push("---", "", `# ${featId}: Test feature`, "");
  const filePath = path.join(dir, `${featId}.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

async function createSlice(
  repo: string,
  sliceId: string,
  featId: string,
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(dir, { recursive: true });
  const fm = {
    id: sliceId,
    status: "pending",
    feature: featId,
    requires_validation: false,
    created: "2026-06-01",
    updated: "2026-06-01",
    ...extraFm
  };
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push(
    "---",
    "",
    `# ${sliceId}: Test slice`,
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: Feature behaves as expected per the slice objective",
    ""
  );
  const filePath = path.join(dir, `${sliceId}_test.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

// ---------------------------------------------------------------------------
// Test 1: completeSlice succeeds on the basic ceremony path (no-drain variant)
// ---------------------------------------------------------------------------

test("slice-complete ceremony: completeSlice returns success on basic path (no drain opts)", async () => {
  const repo = await tmpRepo("scmd-basic-");
  const featId = "FEAT-MD01";
  const sliceId = "SLICE-MD01";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, {
    noDocWriter: true
  });

  assert.ok(result?.slice?.id === sliceId, "ceremony returns success with correct slice id");
  assert.match(result.slice.to, /completed[\\/]/, "slice moved to completed/");
});

// ---------------------------------------------------------------------------
// Test 2: completeSlice with noMerge succeeds on basic path
// ---------------------------------------------------------------------------

test("slice-complete ceremony: completeSlice with noMerge returns success", async () => {
  const repo = await tmpRepo("scmd-nomerge-");
  const featId = "FEAT-MD02";
  const sliceId = "SLICE-MD02";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, {
    noDocWriter: true,
    noMerge: true
  });

  assert.ok(result?.slice?.id === sliceId, "ceremony returns success");
  assert.match(result.slice.to, /completed[\\/]/, "slice moved to completed/");
});

// ---------------------------------------------------------------------------
// Test 3: completeSlice does not throw on basic path
// ---------------------------------------------------------------------------

test("slice-complete ceremony: completeSlice does NOT throw on basic ceremony path", async () => {
  const repo = await tmpRepo("scmd-nothrow-");
  const featId = "FEAT-MD03";
  const sliceId = "SLICE-MD03";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  let thrown: unknown = null;
  let result: any;
  try {
    result = await completeSlice(repo, sliceId, {
      noDocWriter: true,
      noMerge: true
    });
  } catch (err) {
    thrown = err;
  }

  assert.equal(thrown, null, "completeSlice must NOT throw on basic path");
  assert.ok(result?.slice?.id === sliceId, "slice id present in result");
  assert.match(result.slice.to, /completed[\\/]/, "slice moved to completed/");
});

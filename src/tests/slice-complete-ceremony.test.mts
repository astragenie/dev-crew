// @ts-nocheck
// Unit tests: completeSlice ceremony smoke tests (SLICE-69 / FEAT-069).
//
// The drainFn injection path was removed as part of the dead-code sweep in SLICE-69.
// These tests now verify that completeSlice succeeds on the basic ceremony path without
// the drain plumbing.
//
// Task 11 (FEAT-277): also verifies that closeSlice returns the runner:close canonical
// payload shape { handoffPath, synthesisPath, costUsd, grades }.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { completeSlice } from "../scripts/lib/slice-linker.mjs";
import { closeSlice } from "../scripts/lib/slice-linker/close-slice.mjs";
import { initGitRepo } from "./_fixtures.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  await initGitRepo(repo);
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

// ---------------------------------------------------------------------------
// Test 4 (FEAT-277 Task 11): runner:close canonical payload
//
// Verifies that closeSlice (the backbone behind runner:close) returns the
// full payload shape specified in the design:
//   { handoffPath, synthesisPath, costUsd, grades }
//
// grades must be defined even in scaffold-only mode (where no grade YAML was
// supplied); in that case it holds the scaffolded grade path so the caller
// can fill it and run grade-write as a follow-up.
// ---------------------------------------------------------------------------

test("close ceremony returns canonical runner:close payload { handoffPath, synthesisPath, costUsd, grades }", async () => {
  const repo = await tmpRepo("scmd-close-payload-");
  const featId = "FEAT-MD04";
  const sliceId = "SLICE-MD04";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  const result = await closeSlice(repo, sliceId, {
    noDocWriter: true,
    noMerge: true,
    forceClose: true // pre-flight bypass: test fixture has unchecked ACs
  });

  // handoffPath — written by writeCrewHandoff inside completeSlice ceremony
  assert.ok(
    typeof result.handoffPath === "string" && result.handoffPath.length > 0,
    `handoffPath must be a non-empty string; got ${JSON.stringify(result.handoffPath)}`
  );

  // synthesisPath — written by writeCrewFinalSynthesis inside completeSlice ceremony
  assert.ok(
    typeof result.synthesisPath === "string" && result.synthesisPath.length > 0,
    `synthesisPath must be a non-empty string; got ${JSON.stringify(result.synthesisPath)}`
  );

  // costUsd — numeric (may be 0 when crew CLI is absent in test env)
  assert.ok(
    typeof result.costUsd === "number",
    `costUsd must be a number; got ${JSON.stringify(result.costUsd)}`
  );

  // grades — must be defined; scaffold-only path sets grades.scaffoldOnly = true
  assert.ok(
    result.grades !== undefined && result.grades !== null,
    `grades must be defined on the runner:close payload; got ${JSON.stringify(result.grades)}`
  );
});

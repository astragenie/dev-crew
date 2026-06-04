// @ts-nocheck
// Unit tests: fireMarkerDrain integration in slice-complete ceremony (FEAT-034 / SLICE-30)
//
// Test 1: --no-marker-drain flag set → injected drainFn is NOT called
// Test 2: Default (no flag) → injected drainFn IS called with correct repoPath
// Test 3: Drain throwing internally does NOT throw out of completeSlice

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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
// Test 1: --no-marker-drain → drainFn NOT called
// ---------------------------------------------------------------------------

test("slice-complete marker-drain: --no-marker-drain → injected drainFn is NOT called", async () => {
  const repo = await tmpRepo("scmd-no-drain-");
  const featId = "FEAT-MD01";
  const sliceId = "SLICE-MD01";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  let drainCallCount = 0;
  const mockDrain = async (_repo: string): Promise<any> => {
    drainCallCount++;
    return { scanned: 0, deleted: 0, kept: 0, errors: [] };
  };

  const result = await completeSlice(repo, sliceId, {
    noMarkerDrain: true,
    drainFn: mockDrain,
    // Suppress doc-writer too to keep test focused
    noDocWriter: true
  });

  assert.ok(result?.slice?.id === sliceId, "ceremony returns success");

  // Allow fire-and-forget async work to settle
  await new Promise((res) => setTimeout(res, 100));

  assert.equal(drainCallCount, 0, "drainFn must NOT be called when --no-marker-drain is set");
});

// ---------------------------------------------------------------------------
// Test 2: Default path → drainFn IS called with correct repoPath
// ---------------------------------------------------------------------------

test("slice-complete marker-drain: default path → drainFn called with correct repoPath", async () => {
  const repo = await tmpRepo("scmd-default-drain-");
  const featId = "FEAT-MD02";
  const sliceId = "SLICE-MD02";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  let drainCallCount = 0;
  let capturedRepoPath: string | null = null;

  const mockDrain = async (rp: string): Promise<any> => {
    drainCallCount++;
    capturedRepoPath = rp;
    return { scanned: 0, deleted: 0, kept: 0, errors: [] };
  };

  const result = await completeSlice(repo, sliceId, {
    drainFn: mockDrain,
    // Suppress doc-writer to isolate drain behavior
    noDocWriter: true
  });

  assert.ok(result?.slice?.id === sliceId, "ceremony returns success");

  // Allow fire-and-forget async work to settle
  await new Promise((res) => setTimeout(res, 100));

  assert.equal(drainCallCount, 1, "drainFn must be called once");
  assert.equal(capturedRepoPath, repo, "drainFn must receive the correct repoPath");
});

// ---------------------------------------------------------------------------
// Test 3: Drain throwing → ceremony still returns success
// ---------------------------------------------------------------------------

test("slice-complete marker-drain: drain throwing does NOT throw out of completeSlice", async () => {
  const repo = await tmpRepo("scmd-drain-throw-");
  const featId = "FEAT-MD03";
  const sliceId = "SLICE-MD03";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  const mockDrain = async (_rp: string): Promise<any> => {
    throw new Error("drain exploded");
  };

  let thrown: unknown = null;
  let result: any;
  try {
    result = await completeSlice(repo, sliceId, {
      drainFn: mockDrain,
      noDocWriter: true
    });
  } catch (err) {
    thrown = err;
  }

  assert.equal(thrown, null, "completeSlice must NOT throw when drain fails");
  assert.ok(result?.slice?.id === sliceId, "slice id present in result");
  assert.match(
    result.slice.to,
    /completed[\\/]/,
    "slice moved to completed/ despite drain failure"
  );
});

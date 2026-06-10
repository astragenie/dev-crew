// @ts-nocheck
// Unit tests: completeSlice multi-slice FEAT auto-detection (FEAT-026 / SLICE-12)
//
// Case 1: FEAT with slices:[SLICE-A, SLICE-B], only SLICE-A done
//         → FEAT stays in triaged/, slices_complete:[SLICE-A] written, skipped:true reason:'multi-slice'
// Case 2: Same FEAT after SLICE-B done
//         → slices_complete:[SLICE-A, SLICE-B], FEAT moves to done/
// Case 3: --force-close on multi-slice FEAT
//         → moves to done/ with force_closed:true and slices_remaining_at_close:[SLICE-B]
// Case 4: --keep-feature-open on fully complete FEAT
//         → stays triaged (existing behavior preserved)
// Case 5: Single-slice FEAT (slices:[SLICE-A])
//         → moves to done immediately after SLICE-A close
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { completeSlice } from "../scripts/lib/slice-linker.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

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

/**
 * Create a FEAT file in the given state with the specified frontmatter.
 * Returns the absolute file path.
 */
async function createFeat(
  repo: string,
  featId: string,
  state: string,
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  // backlogRoot defaults to ".claude/artifacts/loop/backlog" (not the backlogPath in loop.json)
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
    if (Array.isArray(v)) {
      lines.push(`${k}: [${(v as string[]).join(", ")}]`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---", "", `# ${featId}: Test feature`, "");
  const filePath = path.join(dir, `${featId}.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

/**
 * Create a slice file in slicesRoot/pending/ referencing featId.
 * Returns the absolute file path.
 */
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
    "- [ ] AC-2: Feature behaves as expected per the slice objective",
    ""
  );
  const filePath = path.join(dir, `${sliceId}_test.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

// ---------------------------------------------------------------------------
// Case 1: FEAT with slices:[SLICE-A, SLICE-B], only SLICE-A done
//         → FEAT stays in triaged/, slices_complete:[SLICE-A] appended, skipped:true
// ---------------------------------------------------------------------------

test("multi-slice Case 1: FEAT with 2 planned slices — first slice done → feature skipped, slices_complete written", async () => {
  const repo = await tmpRepo("ms-case1-");
  const featId = "FEAT-101";
  const sliceId = "SLICE-A";

  // FEAT has slices: [SLICE-A, SLICE-B], lives in triaged/
  await createFeat(repo, featId, "triaged", { slices: ["SLICE-A", "SLICE-B"] });
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, {});

  // Slice moved to completed/
  assert.match(result.slice.to, /completed[\\/]/);

  // Feature skipped (not moved to done/)
  assert.equal(result.feature?.skipped, true, "feature.skipped should be true");
  assert.match(
    result.feature.reason,
    /^multi-slice/,
    "feature.reason should start with 'multi-slice'"
  );
  assert.ok(
    Array.isArray(result.feature.remainingSlices),
    "feature.remainingSlices should be an array"
  );
  assert.deepEqual(result.feature.remainingSlices, ["SLICE-B"]);
  assert.deepEqual(result.feature.slicesComplete, ["SLICE-A"]);

  // FEAT file stays in triaged/
  const featFiles = await fs.readdir(path.join(repo, ".claude/artifacts/loop/backlog/triaged"));
  assert.ok(
    featFiles.some((f) => f.startsWith(featId)),
    "FEAT file should remain in triaged/"
  );

  // FEAT frontmatter has slices_complete: [SLICE-A]
  const featPath = path.join(repo, ".claude/artifacts/loop/backlog/triaged", `${featId}.md`);
  const featContent = await fs.readFile(featPath, "utf8");
  const { frontmatter: featFm } = parseFrontmatter(featContent);
  assert.deepEqual(featFm.slices_complete, ["SLICE-A"]);
});

// ---------------------------------------------------------------------------
// Case 2: Same FEAT after SLICE-B done (slices_complete already has SLICE-A)
//         → slices_complete:[SLICE-A, SLICE-B], FEAT moves to done/
// ---------------------------------------------------------------------------

test("multi-slice Case 2: all planned slices complete → feature moves to done with full slices_complete", async () => {
  const repo = await tmpRepo("ms-case2-");
  const featId = "FEAT-102";
  const sliceId = "SLICE-B";

  // FEAT has slices:[SLICE-A, SLICE-B] and slices_complete:[SLICE-A] already
  await createFeat(repo, featId, "triaged", {
    slices: ["SLICE-A", "SLICE-B"],
    slices_complete: ["SLICE-A"]
  });
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, {});

  // Slice moved
  assert.match(result.slice.to, /completed[\\/]/);

  // Feature should move to done (remaining = 0)
  assert.ok(result.feature?.to, "feature.to should be defined");
  assert.match(result.feature.to, /done[\\/]/);

  // FEAT file is under done/
  const featFiles = await fs.readdir(path.join(repo, ".claude/artifacts/loop/backlog/done"));
  assert.ok(
    featFiles.some((f) => f.startsWith(featId)),
    "FEAT file should be in done/"
  );

  // FEAT frontmatter has slices_complete: [SLICE-A, SLICE-B]
  const featPath = path.join(repo, ".claude/artifacts/loop/backlog/done", `${featId}.md`);
  const featContent = await fs.readFile(featPath, "utf8");
  const { frontmatter: featFm } = parseFrontmatter(featContent);
  assert.ok(Array.isArray(featFm.slices_complete), "slices_complete should be an array");
  assert.ok(featFm.slices_complete.includes("SLICE-A"));
  assert.ok(featFm.slices_complete.includes("SLICE-B"));
});

// ---------------------------------------------------------------------------
// Case 3: --force-close on multi-slice FEAT
//         → moves to done/ with force_closed:true and slices_remaining_at_close
// ---------------------------------------------------------------------------

test("multi-slice Case 3: --force-close moves multi-slice FEAT to done with audit fields", async () => {
  const repo = await tmpRepo("ms-case3-");
  const featId = "FEAT-103";
  const sliceId = "SLICE-A";

  // FEAT has slices:[SLICE-A, SLICE-B] — SLICE-B not yet done
  await createFeat(repo, featId, "triaged", { slices: ["SLICE-A", "SLICE-B"] });
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, { forceClose: true });

  // Slice moved
  assert.match(result.slice.to, /completed[\\/]/);

  // Feature moved to done/ despite remaining slices
  assert.ok(result.feature?.to, "feature.to should be defined");
  assert.match(result.feature.to, /done[\\/]/);

  // FEAT file is under done/
  const featFiles = await fs.readdir(path.join(repo, ".claude/artifacts/loop/backlog/done"));
  assert.ok(
    featFiles.some((f) => f.startsWith(featId)),
    "FEAT file should be in done/ when --force-close"
  );

  // FEAT frontmatter has audit fields
  const featPath = path.join(repo, ".claude/artifacts/loop/backlog/done", `${featId}.md`);
  const featContent = await fs.readFile(featPath, "utf8");
  const { frontmatter: featFm } = parseFrontmatter(featContent);
  assert.equal(featFm.force_closed, true, "force_closed should be true");
  assert.ok(
    Array.isArray(featFm.slices_remaining_at_close),
    "slices_remaining_at_close should be an array"
  );
  assert.deepEqual(featFm.slices_remaining_at_close, ["SLICE-B"]);
});

// ---------------------------------------------------------------------------
// Case 4: --keep-feature-open on fully complete FEAT → feature stays open
// ---------------------------------------------------------------------------

test("multi-slice Case 4: --keep-feature-open on fully-complete FEAT → feature stays open", async () => {
  const repo = await tmpRepo("ms-case4-");
  const featId = "FEAT-104";
  const sliceId = "SLICE-A";

  // All slices done already (single remaining slice), but operator passes --keep-feature-open
  await createFeat(repo, featId, "triaged", { slices: ["SLICE-A"] });
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, { keepFeatureOpen: true });

  // Slice moved
  assert.match(result.slice.to, /completed[\\/]/);

  // Feature kept open (keptOpen:true)
  assert.equal(result.feature?.keptOpen, true, "feature.keptOpen should be true");
  assert.match(result.feature.reason, /keep-feature-open/);

  // FEAT file still in triaged/
  const featFiles = await fs.readdir(path.join(repo, ".claude/artifacts/loop/backlog/triaged"));
  assert.ok(
    featFiles.some((f) => f.startsWith(featId)),
    "FEAT file should remain in triaged/ when --keep-feature-open"
  );
});

// ---------------------------------------------------------------------------
// Case 5: Single-slice FEAT (slices:[SLICE-A]) → moves to done immediately
// ---------------------------------------------------------------------------

test("multi-slice Case 5: single-slice FEAT → moves to done immediately after SLICE-A close", async () => {
  const repo = await tmpRepo("ms-case5-");
  const featId = "FEAT-105";
  const sliceId = "SLICE-A";

  // FEAT has slices:[SLICE-A] only — 1 planned, 1 completing now
  await createFeat(repo, featId, "triaged", { slices: ["SLICE-A"] });
  await createSlice(repo, sliceId, featId);

  const result = await completeSlice(repo, sliceId, {});

  // Slice moved
  assert.match(result.slice.to, /completed[\\/]/);

  // Feature moved to done/ (remaining == 0)
  assert.ok(result.feature?.to, "feature.to should be defined");
  assert.match(result.feature.to, /done[\\/]/);

  // FEAT file is under done/
  const featFiles = await fs.readdir(path.join(repo, ".claude/artifacts/loop/backlog/done"));
  assert.ok(
    featFiles.some((f) => f.startsWith(featId)),
    "FEAT file should be in done/ for single-slice FEAT"
  );
});

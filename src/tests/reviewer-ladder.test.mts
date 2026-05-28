import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildReviewLadder, extractFilesSection } from "../scripts/lib/reviewer-ladder.mjs";

async function tmpRepo(prefix) {
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
      stack: {},
      reviewers: { ladder: ["A", "B"] }
    })
  );
  return repo;
}

async function seedSlice(repo, sliceId, { feature = null, phase = null }: Record<string, unknown> = {}) {
  const dir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${sliceId.replace("-", "_")}_TEST.md`);
  const fm = ["---", `id: ${sliceId}`, "status: in-progress"];
  if (feature) fm.push(`feature: ${feature}`);
  if (phase !== null) fm.push(`phase: ${phase}`);
  fm.push("---", "", `# ${sliceId}: test`, "");
  await fs.writeFile(file, fm.join("\n"));
  return file;
}

test("buildReviewLadder prompt includes tight --title PHASE3 FEAT021 SLICE07", async () => {
  const repo = await tmpRepo("rl-feat-phase-");
  await seedSlice(repo, "SLICE-07", { feature: "FEAT-021", phase: "3" });
  const ladder = await buildReviewLadder(repo, "SLICE-07");
  assert.equal(ladder.tasks.length, 2);
  for (const task of ladder.tasks) {
    assert.match(
      task.prompt,
      /--title "PHASE3 FEAT021 SLICE07: <one-line summary>"/,
      "prompt names phase, feature, slice in tight wide→narrow order"
    );
  }
});

test("buildReviewLadder prompt omits PHASE tag when phase null", async () => {
  const repo = await tmpRepo("rl-no-phase-");
  await seedSlice(repo, "SLICE-08", { feature: "FEAT-021" });
  const ladder = await buildReviewLadder(repo, "SLICE-08");
  for (const task of ladder.tasks) {
    assert.match(
      task.prompt,
      /--title "FEAT021 SLICE08: <one-line summary>"/,
      "prompt has FEAT but no PHASE"
    );
    assert.doesNotMatch(task.prompt, /PHASE/, "no PHASE token");
  }
});

test("buildReviewLadder prompt drops FEAT tag when feature null", async () => {
  const repo = await tmpRepo("rl-bare-");
  await seedSlice(repo, "SLICE-09");
  const ladder = await buildReviewLadder(repo, "SLICE-09");
  for (const task of ladder.tasks) {
    assert.match(
      task.prompt,
      /--title "SLICE09: <one-line summary>"/,
      "prompt falls back to bare slice id"
    );
    // FEAT may appear in instructional body text; only the --title prefix
    // must omit the FEAT tag.
    assert.doesNotMatch(task.prompt, /--title "[^"]*FEAT/, "no FEAT token inside the title prefix");
  }
});

// --- extractFilesSection tests ---

test("extractFilesSection finds **Files:** block", () => {
  const content = "# Slice\n\n**Files:**\n- src/foo.mjs\n- src/bar.mjs\n\n## What to do\n";
  const result = extractFilesSection(content);
  assert.ok(result, "should return a string");
  assert.match(result, /src\/foo\.mjs/);
  assert.match(result, /src\/bar\.mjs/);
});

test("extractFilesSection finds ## Files heading", () => {
  const content = "# Slice\n\n## Files\n- src/foo.mjs\n- src/bar.mjs\n\n## What to do\n";
  const result = extractFilesSection(content);
  assert.ok(result, "should return a string");
  assert.match(result, /src\/foo\.mjs/);
});

test("extractFilesSection returns null when absent", () => {
  const content = "# Slice\n\n## Objective\nDo something.\n\n## Acceptance criteria\n- AC-1\n";
  const result = extractFilesSection(content);
  assert.equal(result, null);
});

// --- buildReviewLadder context injection tests ---

test("buildReviewLadder prompt includes files block when slice has Files section", async () => {
  const repo = await tmpRepo("rl-files-block-");
  const dir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, "SLICE_10_TEST.md");
  await fs.writeFile(
    file,
    [
      "---",
      "id: SLICE-10",
      "status: in-progress",
      "---",
      "# SLICE-10: test",
      "",
      "**Files:**",
      "- src/lib/foo.mjs",
      "- tests/foo.test.mjs",
      "",
      "## Acceptance criteria",
      "- AC-1"
    ].join("\n")
  );
  const ladder = await buildReviewLadder(repo, "SLICE-10");
  for (const task of ladder.tasks) {
    assert.match(task.prompt, /src\/lib\/foo\.mjs/, "prompt includes files from Files block");
    assert.match(task.prompt, /pre-loaded/, "prompt includes pre-loaded hint");
  }
});

test("buildReviewLadder prompt always includes Diff stat header", async () => {
  const repo = await tmpRepo("rl-diff-stat-");
  await seedSlice(repo, "SLICE-11");
  const ladder = await buildReviewLadder(repo, "SLICE-11");
  for (const task of ladder.tasks) {
    assert.match(task.prompt, /Diff stat/, "prompt always includes Diff stat header");
  }
});

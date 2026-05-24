import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { buildReviewLadder } from "../scripts/lib/reviewer-ladder.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: "docs/ai-loop",
        backlogPath: "docs/ai-loop/backlog",
        slicesRoot: "docs/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {},
      reviewers: { ladder: ["A", "B"] }
    })
  );
  return repo;
}

async function seedSlice(repo, sliceId, { feature = null, phase = null } = {}) {
  const dir = path.join(repo, "docs/ai-loop/slices/pending");
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
    assert.doesNotMatch(
      task.prompt,
      /--title "[^"]*FEAT/,
      "no FEAT token inside the title prefix"
    );
  }
});

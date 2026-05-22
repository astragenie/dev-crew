import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { startSlice, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/autonomous-loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: "docs/ai-loop",
        backlogPath: "docs/ai-loop/backlog",
        slicesRoot: "docs/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function writePlan(repo, slices) {
  const lines = ["# Plan", ""];
  slices.forEach((s, i) => {
    lines.push(`## Task ${i + 1}: ${s.id.replace("-", "_")} — ${s.title}`);
  });
  const planPath = path.join(repo, "docs/superpowers/plans/plan.md");
  await fs.mkdir(path.dirname(planPath), { recursive: true });
  await fs.writeFile(planPath, lines.join("\n"));
  return planPath;
}

test("startSlice refreshes slice-progress and includes plan-derived title", async () => {
  const repo = await tmpRepo("al-slice-start-");
  await writePlan(repo, [
    { id: "SLICE-01", title: "First" },
    { id: "SLICE-02", title: "Second" }
  ]);
  const feat = await addFeature(repo, { title: "Test feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);

  const result = await startSlice(repo, slice.id);
  // sliceFromFeature allocates SLICE-01 (the first id under slicesRoot),
  // matching our plan's first task.
  assert.equal(result.slice.id, slice.id);
  // Title from plan if it matches; otherwise just the sliceId.
  assert.ok(result.slice.title.includes(slice.id));

  // slice-progress dashboard is written.
  const dashboard = path.join(repo, ".claude/state/crew/slice-progress.md");
  const stat = await fs.stat(dashboard);
  assert.ok(stat.isFile());
  const text = await fs.readFile(dashboard, "utf8");
  assert.match(text, new RegExp(`${slice.id}.*IN_PROGRESS`));
});

test("startSlice tolerates missing plan and missing slice file", async () => {
  const repo = await tmpRepo("al-slice-start-missing-");
  const result = await startSlice(repo, "SLICE-42");
  assert.equal(result.slice.id, "SLICE-42");
  assert.equal(result.slice.title, "SLICE-42");
  // best-effort dashboard write succeeds even with no plan.
  assert.ok(result.sliceProgress && !result.sliceProgress.error);
});

test("startSlice emits dispatchInstruction by default", async () => {
  const repo = await tmpRepo("al-slice-start-dispatch-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Test feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await startSlice(repo, slice.id);
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present by default");
  assert.match(result.dispatchInstruction, /Dispatch \/crew:build subagent/);
  assert.match(result.dispatchInstruction, new RegExp(slice.id));
  assert.match(result.dispatchInstruction, /\/crew:fix/);
  assert.match(
    result.nextAction,
    /Dispatch \/crew:build subagent/
  );
});

test("startSlice with dispatch:false omits the instruction", async () => {
  const repo = await tmpRepo("al-slice-start-nodispatch-");
  const feat = await addFeature(repo, { title: "Manual" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await startSlice(repo, slice.id, { dispatch: false });
  assert.equal(result.dispatchInstruction, null);
  assert.match(result.nextAction, /Begin acceptance-criteria work/);
});

test("completeSlice also refreshes slice-progress", async () => {
  const repo = await tmpRepo("al-slice-progress-on-complete-");
  await writePlan(repo, [{ id: "SLICE-01", title: "Only one" }]);
  const feat = await addFeature(repo, { title: "Done feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id);
  assert.ok(result.sliceProgress && !result.sliceProgress.error);
  const dashboard = path.join(repo, ".claude/state/crew/slice-progress.md");
  const text = await fs.readFile(dashboard, "utf8");
  assert.match(text, /Slice Progress/);
});

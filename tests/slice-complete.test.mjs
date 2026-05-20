import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { sliceFromFeature, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature, findFeatureById } from "../scripts/lib/backlog-writer.mjs";
import { addSpec, updateSpecFrontmatter, findSpecById } from "../scripts/lib/spec-parser.mjs";
import { decomposeSpec } from "../scripts/lib/spec-decomposer.mjs";
import { listBacklog } from "../scripts/lib/backlog-parser.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

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

test("completeSlice moves slice to completed/ and feature to done/", async () => {
  const repo = await tmpRepo("al-slice-complete-");
  const feat = await addFeature(repo, { title: "Test work" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id);
  // Slice moved
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  const sliceContent = await fs.readFile(result.slice.to, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  assert.equal(sliceFm.status, "completed");
  assert.ok(sliceFm.completed_at);
  // Feature moved + completed_at stamped
  assert.equal(result.feature.id, feat.id);
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  const featContent = await fs.readFile(result.feature.to, "utf8");
  const { frontmatter: featFm } = parseFrontmatter(featContent);
  assert.equal(featFm.status, "done");
  assert.ok(featFm.completed_at);
});

test("completeSlice auto-rolls parent spec to satisfied when all features done", async () => {
  const repo = await tmpRepo("al-slice-complete-spec-");
  const spec = await addSpec(repo, { type: "prd", title: "Parent PRD" });
  await updateSpecFrontmatter(spec.filePath, { status: "approved" });
  await decomposeSpec(repo, spec.id, ["Single feature"]);
  const [feat] = await listBacklog(repo);
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id);
  // Spec should now be satisfied (only had 1 feature, which moved to done)
  const specStatuses = result.specStatusChanges.map((c) => c.to);
  assert.ok(specStatuses.includes("satisfied"));
  const updatedSpec = await findSpecById(repo, spec.id);
  assert.equal(updatedSpec.frontmatter.status, "satisfied");
});

test("completeSlice is idempotent — re-running on a completed slice doesn't error", async () => {
  const repo = await tmpRepo("al-slice-complete-idem-");
  const feat = await addFeature(repo, { title: "Idempotent" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await completeSlice(repo, slice.id);
  const second = await completeSlice(repo, slice.id);
  // Feature is already done — completeSlice reports alreadyDone
  assert.ok(second.feature.alreadyDone);
});

test("completeSlice throws when slice not found", async () => {
  const repo = await tmpRepo("al-slice-complete-missing-");
  await assert.rejects(() => completeSlice(repo, "SLICE-999"), /Slice file not found/);
});

test("moveFeature stamps started_at on first in-progress entry", async () => {
  const repo = await tmpRepo("al-feature-lifecycle-");
  const feat = await addFeature(repo, { title: "Lifecycle test" });
  const { moveFeature } = await import("../scripts/lib/backlog-writer.mjs");
  await moveFeature(feat.filePath, "triaged");
  const triaged = await findFeatureById(repo, feat.id);
  assert.equal(triaged.frontmatter.started_at, undefined);
  await moveFeature(triaged.filePath, "in-progress");
  const inProgress = await findFeatureById(repo, feat.id);
  assert.ok(inProgress.frontmatter.started_at);
  await moveFeature(inProgress.filePath, "done");
  const done = await findFeatureById(repo, feat.id);
  assert.ok(done.frontmatter.completed_at);
  // started_at preserved across done move
  assert.equal(done.frontmatter.started_at, inProgress.frontmatter.started_at);
});

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
import { writeFeatureEndCeremony, featureEnd } from "../scripts/lib/ceremonies.mjs";

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

test("completeSlice blocked when featureEnd ceremony has simplifyRan: false", async () => {
  const repo = await tmpRepo("al-slice-simplify-blocked-");
  const feat = await addFeature(repo, { title: "Simplify gate test" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Write a ceremony with simplifyRan: false
  const ceremony = featureEnd(
    { id: feat.id, title: "Simplify gate test", phase: "2" },
    { simplifyRan: false }
  );
  await writeFeatureEndCeremony(repo, ceremony);
  const result = await completeSlice(repo, slice.id);
  // Slice still moves but feature is blocked
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  assert.equal(result.feature.skipped, true);
  assert.ok(
    result.feature.reason.includes("simplify-gate"),
    `expected simplify-gate in reason, got: ${result.feature.reason}`
  );
});

test("completeSlice allowed when featureEnd ceremony has simplifyRan: true", async () => {
  const repo = await tmpRepo("al-slice-simplify-allowed-");
  const feat = await addFeature(repo, { title: "Simplify passed" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Write a ceremony with simplifyRan: true
  const ceremony = featureEnd(
    { id: feat.id, title: "Simplify passed", phase: "2" },
    { simplifyRan: true }
  );
  await writeFeatureEndCeremony(repo, ceremony);
  const result = await completeSlice(repo, slice.id);
  // Feature should move to done normally
  assert.ok(!result.feature.skipped, "feature should not be skipped");
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
});

test("completeSlice allowed when no featureEnd ceremony exists", async () => {
  const repo = await tmpRepo("al-slice-simplify-no-ceremony-");
  const feat = await addFeature(repo, { title: "No ceremony" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // No ceremony written — feature is still in-progress
  const result = await completeSlice(repo, slice.id);
  // Should complete normally (no ceremony = no gate)
  assert.ok(!result.feature.skipped, "no ceremony should not block");
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
});

// FEAT-020: multi-slice support — feature stays in-progress when explicitly opted out

test("completeSlice keeps feature in-progress when feature_complete: false in frontmatter", async () => {
  const repo = await tmpRepo("al-keep-fm-");
  const feat = await addFeature(repo, { title: "Multi-slice work" });
  // Set feature_complete: false in the feature frontmatter
  const { mergeFrontmatter } = await import("../scripts/lib/frontmatter.mjs");
  const featContent = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(feat.filePath, mergeFrontmatter(featContent, { feature_complete: false }));
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id);
  // Slice still completed
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  // Feature kept open
  assert.equal(result.feature.keptOpen, true);
  assert.match(result.feature.reason, /feature_complete: false/);
  // File still in in-progress/
  const stillInProgress = await findFeatureById(repo, feat.id);
  assert.equal(stillInProgress.state, "in-progress");
});

test("completeSlice keeps feature in-progress when keepFeatureOpen runtime flag passed", async () => {
  const repo = await tmpRepo("al-keep-flag-");
  const feat = await addFeature(repo, { title: "Multi-slice work via flag" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, { keepFeatureOpen: true });
  // Slice still completed
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  // Feature kept open
  assert.equal(result.feature.keptOpen, true);
  assert.match(result.feature.reason, /--keep-feature-open/);
  // File still in in-progress/
  const stillInProgress = await findFeatureById(repo, feat.id);
  assert.equal(stillInProgress.state, "in-progress");
});

test("completeSlice still moves feature to done when feature_complete: true explicitly set", async () => {
  const repo = await tmpRepo("al-explicit-true-");
  const feat = await addFeature(repo, { title: "Single slice with explicit flag" });
  const { mergeFrontmatter } = await import("../scripts/lib/frontmatter.mjs");
  const featContent = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(feat.filePath, mergeFrontmatter(featContent, { feature_complete: true }));
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id);
  // Feature moved as normal
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.ok(!result.feature.keptOpen);
});

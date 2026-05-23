import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature, findFeatureById } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  // Write a minimal .claude/loop.json so config-resolver works.
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

test("sliceFromFeature creates a SLICE file and cross-links the feature", async () => {
  const repo = await tmpRepo("al-slice-link-");
  const feat = await addFeature(repo, {
    title: "Add login form",
    priority: "P1",
    target_release: "v1.0.0"
  });
  const result = await sliceFromFeature(repo, feat.id);
  assert.equal(result.feature.id, feat.id);
  assert.equal(result.feature.toState, "in-progress");
  assert.match(result.slice.id, /^SLICE-\d+$/);
  // Slice file written
  const sliceContent = await fs.readFile(result.slice.path, "utf8");
  assert.match(sliceContent, /Add login form/);
  assert.match(sliceContent, new RegExp(feat.id));
  // Frontmatter has feature back-ref
  const { frontmatter } = parseFrontmatter(sliceContent);
  assert.equal(frontmatter.feature, feat.id);
  assert.equal(frontmatter.priority, "P1");
  assert.equal(frontmatter.target_release, "v1.0.0");
  // Feature now lists the slice
  const updated = await findFeatureById(repo, feat.id);
  assert.ok(updated.frontmatter.slices.includes(result.slice.id));
});

test("sliceFromFeature allocates monotonically increasing ids", async () => {
  const repo = await tmpRepo("al-slice-mono-");
  const a = await addFeature(repo, { title: "A" });
  const b = await addFeature(repo, { title: "B" });
  const ra = await sliceFromFeature(repo, a.id);
  const rb = await sliceFromFeature(repo, b.id);
  const numA = Number(ra.slice.id.replace("SLICE-", ""));
  const numB = Number(rb.slice.id.replace("SLICE-", ""));
  assert.equal(numB, numA + 1);
});

test("sliceFromFeature respects existing flat slice layout (LoopBrain pattern)", async () => {
  const repo = await tmpRepo("al-slice-flat-");
  // Seed flat layout: pre-existing SLICE_05 directly under slicesRoot
  const slicesRoot = path.join(repo, "docs/ai-loop/slices");
  await fs.mkdir(slicesRoot, { recursive: true });
  await fs.writeFile(path.join(slicesRoot, "SLICE_05_OLD.md"), "# SLICE-05 pre-existing");
  const feat = await addFeature(repo, { title: "New work" });
  const result = await sliceFromFeature(repo, feat.id);
  // Next id should be 06 since the recursive scan saw 05
  assert.equal(result.slice.id, "SLICE-06");
  // New slice still lands under pending/ (plugin convention)
  assert.match(result.slice.path, /pending[\\/]SLICE_06_/);
});

test("sliceFromFeature is idempotent on the slice link", async () => {
  const repo = await tmpRepo("al-slice-idem-");
  const feat = await addFeature(repo, { title: "Reentrant" });
  const r1 = await sliceFromFeature(repo, feat.id);
  // Re-running should not duplicate slice id in the feature's slices array
  // (it allocates a NEW slice id since old one was successfully written —
  // but the feature shouldn't pick up a phantom duplicate of r1.slice.id.)
  // The feature now has [SLICE-01]; calling again would create SLICE-02.
  const r2 = await sliceFromFeature(repo, feat.id);
  assert.notEqual(r1.slice.id, r2.slice.id);
  const updated = await findFeatureById(repo, feat.id);
  assert.equal(updated.frontmatter.slices.length, 2);
});

test("sliceFromFeature throws when feature not found", async () => {
  const repo = await tmpRepo("al-slice-missing-");
  await assert.rejects(() => sliceFromFeature(repo, "FEAT-999"), /Feature not found/);
});

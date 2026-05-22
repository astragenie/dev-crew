import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { inferScoresForSlice } from "../scripts/lib/score-inference.mjs";
import { createGradeFile } from "../scripts/lib/grade-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
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

async function writeArtifact(repo, subdir, filename, body) {
  const dir = path.join(repo, ".claude/artifacts/crew", subdir);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), body);
}

test("inferScoresForSlice returns empty when no artifacts exist", async () => {
  const repo = await tmpRepo("al-infer-empty-");
  const out = await inferScoresForSlice(repo, "SLICE-52");
  assert.deepEqual(out.scores, {});
  assert.deepEqual(out.artifactCounts, { reviews: 0, validations: 0, deployments: 0 });
});

test("inferScoresForSlice picks up PASS validation as test_confidence baseline", async () => {
  const repo = await tmpRepo("al-infer-validation-");
  await writeArtifact(
    repo,
    "validations",
    "20260520-slice52.md",
    `# Validation — SLICE-52\n\n**Status:** PASS\n\nAll acceptance criteria PASS with evidence.`
  );
  const out = await inferScoresForSlice(repo, "SLICE-52");
  assert.ok(out.scores.test_confidence >= 0.8);
  assert.ok(out.scores.product_completeness >= 0.8);
  assert.equal(out.artifactCounts.validations, 1);
});

test("inferScoresForSlice infers architecture_quality from review PASS", async () => {
  const repo = await tmpRepo("al-infer-review-");
  await writeArtifact(
    repo,
    "reviews",
    "20260520-slice52.md",
    `# Review — SLICE_52\n\n**Verdict:** PASS\n\nClean design. OTel spans added throughout.`
  );
  const out = await inferScoresForSlice(repo, "SLICE-52");
  assert.ok(out.scores.architecture_quality >= 0.8);
  assert.ok(out.scores.observability >= 0.8, "observability should pick up OTel mention");
});

test("inferScoresForSlice penalises test_confidence on FAIL validation", async () => {
  const repo = await tmpRepo("al-infer-fail-");
  await writeArtifact(
    repo,
    "validations",
    "20260520-slice52.md",
    `# Validation — SLICE-52\n\n**Status:** FAIL\n\nIntegration test broken.`
  );
  const out = await inferScoresForSlice(repo, "SLICE-52");
  assert.ok(out.scores.test_confidence < 0.5);
});

test("inferScoresForSlice ignores artifacts mentioning other slices", async () => {
  const repo = await tmpRepo("al-infer-other-");
  await writeArtifact(
    repo,
    "validations",
    "20260520-slice17.md",
    `# Validation — SLICE-17\n\n**Status:** PASS`
  );
  const out = await inferScoresForSlice(repo, "SLICE-52");
  assert.deepEqual(out.scores, {});
});

test("inferScoresForSlice handles SLICE-52 vs SLICE_52 vs SLICE 52 spellings", async () => {
  const repo = await tmpRepo("al-infer-spell-");
  await writeArtifact(
    repo,
    "reviews",
    "slice52-review.md",
    `# Review for SLICE_052\n\n**Verdict:** PASS\n\nLooks good.`
  );
  const out = await inferScoresForSlice(repo, "SLICE-52");
  assert.ok(out.scores.architecture_quality >= 0.8);
});

test("createGradeFile injects inferred scores into template", async () => {
  const repo = await tmpRepo("al-grade-prefill-scores-");
  const feat = await addFeature(repo, { title: "Demo" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await writeArtifact(
    repo,
    "validations",
    `20260520-${slice.id.toLowerCase()}.md`,
    `# Validation — ${slice.id}\n\n**Status:** PASS\n\nAll AC PASS.`
  );
  await writeArtifact(
    repo,
    "reviews",
    `20260520-${slice.id.toLowerCase()}.md`,
    `# Review — ${slice.id}\n\n**Verdict:** PASS\n\nOTel spans look right.`
  );
  const result = await createGradeFile(repo, slice.id);
  const content = await fs.readFile(result.gradePath, "utf8");
  // Both frontmatter and body list should have prefilled values
  const { frontmatter, body } = parseFrontmatter(content);
  assert.match(body, /Inference sources/);
  assert.match(body, /test_confidence: 0\.85/);
  assert.match(body, /Scores prefilled from crew artifacts/);
});

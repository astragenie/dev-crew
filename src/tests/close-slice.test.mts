// FEAT-188 / SLICE-102 — closeSlice combines complete + grade + grade-write.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { closeSlice, sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

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
  return repo;
}

async function setupSlice(
  repo: string,
  opts: { autonomousSafe: boolean } = { autonomousSafe: true }
): Promise<{ sliceId: string; featureId: string }> {
  const { updateFeatureFrontmatter } = await import("../scripts/lib/backlog-writer.mjs");
  const feat = await addFeature(repo, { title: "Test feature", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, { autonomous_safe: opts.autonomousSafe });
  const result = await sliceFromFeature(repo, feat.id);
  // Mark all ACs checked so the runner:close pre-flight (FEAT-277) passes.
  // In test fixtures, ACs are proof-of-concept placeholders — we simulate
  // the "builder checked them off" step by replacing [ ] with [x].
  const slicePath = result.slice.path;
  const content = await fs.readFile(slicePath, "utf8");
  await fs.writeFile(slicePath, content.replace(/- \[ \]/g, "- [x]"), "utf8");
  return { sliceId: result.slice.id, featureId: feat.id };
}

function gradeYamlBody(sliceId: string, featureId: string): string {
  return [
    "---",
    `id: GRADE-${sliceId}`,
    `slice: ${sliceId}`,
    `feature: ${featureId}`,
    "spec: null",
    "phase: null",
    "target_release: null",
    "graded_at: 2026-06-12",
    "duration_hours: 0.5",
    "scores:",
    "  architecture_quality: 0.85",
    "  reliability: 0.85",
    "  observability: 0.85",
    "  production_readiness: 0.85",
    "  security: 0.85",
    "  test_confidence: 0.85",
    "  product_completeness: 0.85",
    "decisions: []",
    "---",
    `# ${sliceId}: Test — Grade`,
    "",
    "## Scores",
    "",
    "- architecture_quality: 0.85",
    "- reliability: 0.85",
    "- observability: 0.85",
    "- production_readiness: 0.85",
    "- security: 0.85",
    "- test_confidence: 0.85",
    "- product_completeness: 0.85",
    "",
    "## Lessons",
    "",
    "- Test lesson",
    "",
    "## Surprises",
    "",
    "- Test surprise",
    "",
    "## Followups",
    "",
    "- Test followup",
    "",
    "## What went well",
    "",
    "Test narrative.",
    "",
    "## What went wrong",
    "",
    "Test narrative.",
    "",
    "## What I would do differently next time",
    "",
    "Test narrative.",
    ""
  ].join("\n");
}

test("closeSlice scaffold-only: no gradeYamlPath returns scaffoldOnly true", async () => {
  const repo = await tmpRepo("cs-scaffold-");
  const { sliceId } = await setupSlice(repo);
  const out = await closeSlice(repo, sliceId);
  assert.equal(out.scaffoldOnly, true);
  assert.equal(out.grade, null);
  assert.ok(out.gradePath, "gradePath must be returned");
  const gradeStat = await fs.stat(out.gradePath);
  assert.ok(gradeStat.isFile(), "scaffolded grade file must exist on disk");
});

test("closeSlice happy path: gradeYamlPath + autonomous_safe writes scores", async () => {
  const repo = await tmpRepo("cs-happy-");
  const { sliceId, featureId } = await setupSlice(repo, { autonomousSafe: true });
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false);
  assert.ok(out.grade, "writeGrade output must be returned");
  const persistedContent = await fs.readFile(out.gradePath, "utf8");
  const { frontmatter } = parseFrontmatter(persistedContent);
  assert.equal(frontmatter.scores.architecture_quality, 0.85);
  assert.equal(frontmatter.scores.test_confidence, 0.85);
});

test("closeSlice autonomous_safe gate: refuses --grade-yaml on autonomous_safe=false", async () => {
  const repo = await tmpRepo("cs-gate-");
  const { sliceId, featureId } = await setupSlice(repo, { autonomousSafe: false });
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  await assert.rejects(
    () => closeSlice(repo, sliceId, { gradeYamlPath: yamlPath }),
    (err: Error) =>
      err.message.includes("--grade-yaml requires FEAT autonomous_safe: true") &&
      err.message.includes("slice complete + slice grade + slice grade-write")
  );
  // Side-effect check: slice file must still be in pending/, not completed/.
  // Slice filenames use underscores (SLICE_01_...) where the id uses hyphens.
  const pendingDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  const idPattern = sliceId.replace("-", "_");
  const stillPending = (await fs.readdir(pendingDir)).some((f: string) => f.startsWith(idPattern));
  assert.ok(stillPending, "refuse path must not move slice file");
});

test("CLI slice close: spawnSync happy path emits JSON with scaffoldOnly", async () => {
  const repo = await tmpRepo("cs-cli-");
  const { sliceId, featureId } = await setupSlice(repo, { autonomousSafe: true });
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  const r = spawnSync(
    "bun",
    [LOOP_CLI, "slice", "close", "--id", sliceId, "--grade-yaml", yamlPath, "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.scaffoldOnly, false);
  assert.ok(parsed.gradePath, "gradePath must be present in CLI output");
});

test("CLI slice close: --grade-yaml on autonomous_safe=false exits 1", async () => {
  const repo = await tmpRepo("cs-cli-refuse-");
  const { sliceId, featureId } = await setupSlice(repo, { autonomousSafe: false });
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  const r = spawnSync(
    "bun",
    [LOOP_CLI, "slice", "close", "--id", sliceId, "--grade-yaml", yamlPath, "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--grade-yaml requires FEAT autonomous_safe: true/);
});

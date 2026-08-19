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
  // Mark all ACs checked so the devcrew:close pre-flight (FEAT-277) passes.
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

// FEAT-239: the pure-YAML grade shape the autonomous close path emits —
// frontmatter-only (scores map + lessons/decisions arrays), NO markdown body.
function pureYamlGradeBody(sliceId: string, featureId: string): string {
  return [
    "---",
    `id: GRADE-${sliceId}`,
    `slice: ${sliceId}`,
    `feature: ${featureId}`,
    "spec: null",
    "phase: null",
    "target_release: null",
    "graded_at: 2026-07-08",
    "duration_hours: 0.5",
    "scores:",
    "  architecture_quality: 0.9",
    "  reliability: 0.88",
    "  observability: 0.82",
    "  production_readiness: 0.86",
    "  security: 0.9",
    "  test_confidence: 0.91",
    "  product_completeness: 0.84",
    "lessons:",
    "  - Pure yaml close renders into the template body.",
    "decisions:",
    "  - title: Normalize grade yaml before writeGrade",
    "    rationale: writeGrade reads scores from the markdown body.",
    "    consequences: Both yaml and markdown inputs close identically.",
    "---",
    ""
  ].join("\n");
}

test("closeSlice FEAT-239: pure-yaml grade closes with scores + decisions", async () => {
  const repo = await tmpRepo("cs-pureyaml-");
  const { sliceId, featureId } = await setupSlice(repo, { autonomousSafe: true });
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, pureYamlGradeBody(sliceId, featureId));
  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false);
  const result = out.grade as { scoresAverage: number | null; decisionsAllocated: string[] };
  assert.ok(
    result.scoresAverage !== null && result.scoresAverage > 0,
    `expected non-zero scoresAverage, got ${result.scoresAverage}`
  );
  assert.equal(
    result.decisionsAllocated.length,
    1,
    "the inline decision must be allocated a DEC id"
  );
  assert.match(result.decisionsAllocated[0]!, /^DEC-\d+$/);
  // Persisted grade frontmatter carries the parsed scores map.
  const { frontmatter } = parseFrontmatter(await fs.readFile(out.gradePath, "utf8"));
  assert.equal(frontmatter.scores.architecture_quality, 0.9);
});

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

// P1.6: closeSlice's final step regenerates loop-snapshot.md via the
// existing FEAT-208 generator, gated by the snapshot-autoregen flag.
test("closeSlice regenerates loop-snapshot.md by default (snapshot-autoregen on)", async () => {
  const repo = await tmpRepo("cs-snapshot-regen-");
  const { sliceId } = await setupSlice(repo);
  await closeSlice(repo, sliceId);
  const snapshotPath = path.join(repo, ".claude/artifacts/loop/loop-snapshot.md");
  const content = await fs.readFile(snapshotPath, "utf8");
  assert.match(content, /# Autonomous Loop snapshot/);
});

test("closeSlice skips snapshot regen when snapshot-autoregen is disabled", async () => {
  const repo = await tmpRepo("cs-snapshot-disabled-");
  const configPath = path.join(repo, ".claude/loop.json");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  config.features = { "snapshot-autoregen": { enabled: false } };
  await fs.writeFile(configPath, JSON.stringify(config));
  const { sliceId } = await setupSlice(repo);
  await closeSlice(repo, sliceId);
  const snapshotPath = path.join(repo, ".claude/artifacts/loop/loop-snapshot.md");
  await assert.rejects(
    () => fs.stat(snapshotPath),
    "loop-snapshot.md must not be written when the flag is disabled"
  );
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
  // P1.6 review fix: the full grade-write exit path must also regenerate the
  // snapshot (the scaffold-only tests above cover the other call site).
  const snapshotContent = await fs.readFile(
    path.join(repo, ".claude/artifacts/loop/loop-snapshot.md"),
    "utf8"
  );
  assert.match(snapshotContent, /# Autonomous Loop snapshot/);
});

// FEAT-275 / SLICE-178: single-shot close records reviewer/validator dispatch
// telemetry from the same gate derivation the close ceremony already uses
// (see close-dispatch-telemetry.mts). No review or validation artifact/badge
// exists in this fixture: the review gate falls through to its
// absence-tolerated "unproven" branch (not recorded — no real evidence a
// reviewer ever ran), while the validation gate has no waiver/artifact/badge
// at all and is unsatisfied (recorded as a paused devcrew:verifier dispatch).
test("closeSlice records pause telemetry via gate derivation on a single-shot close", async () => {
  const repo = await tmpRepo("cs-pause-telemetry-");
  const { sliceId, featureId } = await setupSlice(repo, { autonomousSafe: true });
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId));
  await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });

  const { pauseEventsPath } = await import("../scripts/lib/pause-telemetry.mjs");
  const raw = await fs.readFile(pauseEventsPath(repo), "utf8");
  const lines = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));

  assert.ok(
    !lines.some((l: any) => l.agentRole === "devcrew:reviewer"),
    "an unproven (absence-tolerated) review gate must not be recorded"
  );
  const verifierOutcome = lines.find(
    (l: any) => l.type === "dispatch_outcome" && l.agentRole === "devcrew:verifier"
  );
  assert.ok(verifierOutcome, "expected a devcrew:verifier dispatch_outcome row");
  assert.equal(verifierOutcome.sliceId, sliceId);
  assert.equal(verifierOutcome.outcome, "paused");
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

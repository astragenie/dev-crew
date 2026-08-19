// FEAT-188 / S1b — AC-1: devcrew:close lessons capture fires with zero
// operator action on the single-shot ceremony (autonomous_safe: true +
// --grade-yaml). This exercises the FULL closeSlice ceremony (not writeGrade
// directly, which grade-writer-learnings.test.mts already covers) to prove
// the wiring from `devcrew:close` all the way to learnings.jsonl is intact.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { closeSlice, sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature, updateFeatureFrontmatter } from "../scripts/lib/backlog-writer.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

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

async function setupSlice(repo: string): Promise<{ sliceId: string; featureId: string }> {
  const feat = await addFeature(repo, { title: "Test feature", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, { autonomous_safe: true });
  const result = await sliceFromFeature(repo, feat.id);
  const slicePath = result.slice.path;
  const content = await fs.readFile(slicePath, "utf8");
  await fs.writeFile(slicePath, content.replace(/- \[ \]/g, "- [x]"), "utf8");
  return { sliceId: result.slice.id, featureId: feat.id };
}

function gradeYamlBody(sliceId: string, featureId: string, lessons: string[]): string {
  const lessonsBlock = lessons.map((l) => `- ${l}`).join("\n");
  return [
    "---",
    `id: GRADE-${sliceId}`,
    `slice: ${sliceId}`,
    `feature: ${featureId}`,
    "spec: null",
    "phase: null",
    "target_release: null",
    "graded_at: 2026-07-06",
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
    lessonsBlock,
    "",
    "## Surprises",
    "",
    "- Real surprise",
    "",
    "## Followups",
    "",
    "- Real followup",
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

async function readLearnings(repo: string) {
  const learningsPath = path.join(repo, ".claude/artifacts/loop/learnings.jsonl");
  try {
    const raw = await fs.readFile(learningsPath, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

test("closeSlice single-shot ceremony auto-appends learnings.jsonl with zero extra operator action", async () => {
  const repo = await tmpRepo("cs-learnings-");
  const { sliceId, featureId } = await setupSlice(repo);
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId, ["Lesson from close ceremony"]));

  // The only call the operator/agent makes is devcrew:close itself.
  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false);

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].insight, "Lesson from close ceremony");
  assert.equal(entries[0].sliceId, sliceId);
});

test("closeSlice single-shot ceremony captures Surprises/Followups as memory notes without throwing", async () => {
  const repo = await tmpRepo("cs-learnings-notes-");
  const { sliceId, featureId } = await setupSlice(repo);
  const yamlPath = path.join(repo, "grade.yaml");
  await fs.writeFile(yamlPath, gradeYamlBody(sliceId, featureId, ["Another lesson"]));

  // memory.enabled is absent from this tmpRepo's loop.json (defaults OFF for
  // the astramem-backed note mirror) — the assertion here is that the
  // ceremony completes cleanly (captureGradeNotes must not throw) even
  // though the astramem CLI never resolves in this sandbox.
  const out = await closeSlice(repo, sliceId, { gradeYamlPath: yamlPath });
  assert.equal(out.scaffoldOnly, false);
  assert.ok(out.grade, "writeGrade output must be returned despite memory mirror being off");
});

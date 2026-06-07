/**
 * Tests for grade file naming convention (FEAT-004).
 *
 * New format: YYYYMMDDTHHMMSSZ-[phaseN-][featNNN-]sliceNN-grade.md
 * Old format: SLICE-NN-grade.md (must remain discoverable for backward compat)
 */

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { createGradeFile } from "../scripts/lib/grade-writer.mjs";
import { listGrades, findGradeForSlice, gradeFilePath } from "../scripts/lib/grade-parser.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";

const LEADING_TS_RE = /^\d{8}T\d{6}Z-/;
const GRADE_SUFFIX = "-grade.md";

async function tmpRepo(prefix: string) {
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
      stack: {}
    })
  );
  return repo;
}

// ---------------------------------------------------------------------------
// New naming format
// ---------------------------------------------------------------------------

test("createGradeFile — filename has leading UTC timestamp", async () => {
  const repo = await tmpRepo("al-gn-ts-");
  const result = await createGradeFile(repo, "SLICE-07");
  assert.equal(result.created, true);
  const base = path.basename(result.gradePath);
  assert.match(base, LEADING_TS_RE, `Expected leading timestamp in filename, got: ${base}`);
});

test("createGradeFile — filename contains slice segment", async () => {
  const repo = await tmpRepo("al-gn-slice-");
  const result = await createGradeFile(repo, "SLICE-07");
  const base = path.basename(result.gradePath);
  assert.match(base, /slice07/, `Expected slice07 segment in filename, got: ${base}`);
});

test("createGradeFile — filename ends with -grade.md", async () => {
  const repo = await tmpRepo("al-gn-suffix-");
  const result = await createGradeFile(repo, "SLICE-42");
  const base = path.basename(result.gradePath);
  assert.ok(base.endsWith(GRADE_SUFFIX), `Expected filename to end with -grade.md, got: ${base}`);
});

test("createGradeFile — filename embeds feat segment when feature present", async () => {
  const repo = await tmpRepo("al-gn-feat-");
  const feat = await addFeature(repo, {
    title: "Feature for naming test",
    target_release: "v1.0.0",
    priority: "P1"
  });
  await moveFeature(feat.filePath, "triaged");
  const sliceResult = await sliceFromFeature(repo, feat.id);
  const grade = await createGradeFile(repo, sliceResult.slice.id);
  assert.equal(grade.created, true);
  const base = path.basename(grade.gradePath);
  // feat id like FEAT-001 → compact segment "feat001"
  const featCompact = feat.id.toLowerCase().replace(/[^a-z0-9]/g, "");
  assert.match(base, new RegExp(featCompact), `Expected feat segment in filename, got: ${base}`);
});

// ---------------------------------------------------------------------------
// Backward compat — old format files still discoverable
// ---------------------------------------------------------------------------

test("listGrades discovers old-format SLICE-NN-grade.md files", async () => {
  const repo = await tmpRepo("al-gn-compat-list-");
  const gradesDir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(gradesDir, { recursive: true });

  // Write a minimal old-format grade file
  const oldContent = [
    "---",
    "id: GRADE-SLICE-03",
    "slice: SLICE-03",
    "feature: null",
    "phase: null",
    "target_release: null",
    "spec: null",
    "graded_at: 2026-01-01",
    "decisions: []",
    "scores:",
    "  architecture_quality: 0.80",
    "  reliability: 0.80",
    "  observability: 0.80",
    "  production_readiness: 0.80",
    "  security: 0.80",
    "  test_confidence: 0.80",
    "  product_completeness: 0.80",
    "---",
    "## Scores",
    "- architecture_quality: 0.80",
    "- reliability: 0.80",
    "- observability: 0.80",
    "- production_readiness: 0.80",
    "- security: 0.80",
    "- test_confidence: 0.80",
    "- product_completeness: 0.80"
  ].join("\n");

  await fs.writeFile(path.join(gradesDir, "SLICE-03-grade.md"), oldContent);

  const grades = await listGrades(repo);
  assert.equal(grades.length, 1, "old-format grade file should be listed");
  assert.equal(grades[0].frontmatter.slice, "SLICE-03");
});

test("listGrades discovers new-format timestamped grade files", async () => {
  const repo = await tmpRepo("al-gn-new-list-");
  const result = await createGradeFile(repo, "SLICE-05");
  assert.equal(result.created, true);
  const grades = await listGrades(repo);
  assert.equal(grades.length, 1, "new-format grade file should be listed");
});

test("findGradeForSlice finds new-format grade file", async () => {
  const repo = await tmpRepo("al-gn-find-new-");
  const result = await createGradeFile(repo, "SLICE-11");
  assert.equal(result.created, true);
  const found = await findGradeForSlice(repo, "SLICE-11");
  assert.ok(found !== null, "findGradeForSlice should locate new-format grade");
  assert.equal(found.frontmatter.slice, "SLICE-11");
});

test("findGradeForSlice finds old-format grade file", async () => {
  const repo = await tmpRepo("al-gn-find-old-");
  const gradesDir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(gradesDir, { recursive: true });

  const oldContent = [
    "---",
    "id: GRADE-SLICE-03",
    "slice: SLICE-03",
    "feature: null",
    "phase: null",
    "target_release: null",
    "spec: null",
    "graded_at: 2026-01-01",
    "decisions: []",
    "scores:",
    "  architecture_quality: 0.80",
    "  reliability: 0.80",
    "  observability: 0.80",
    "  production_readiness: 0.80",
    "  security: 0.80",
    "  test_confidence: 0.80",
    "  product_completeness: 0.80",
    "---",
    "## Scores",
    "- architecture_quality: 0.80"
  ].join("\n");

  await fs.writeFile(path.join(gradesDir, "SLICE-03-grade.md"), oldContent);

  const found = await findGradeForSlice(repo, "SLICE-03");
  assert.ok(found !== null, "findGradeForSlice should locate old-format grade");
  assert.equal(found.frontmatter.slice, "SLICE-03");
});

test("findGradeForSlice returns null when grade does not exist", async () => {
  const repo = await tmpRepo("al-gn-find-none-");
  const found = await findGradeForSlice(repo, "SLICE-99");
  assert.equal(found, null);
});

test("gradeFilePath still works as a deterministic path builder", () => {
  // gradeFilePath is used internally; we just confirm it returns a string path
  const p = gradeFilePath("/some/repo", "SLICE-05");
  assert.ok(typeof p === "string");
  assert.match(p, /grade\.md$/);
});

// ---------------------------------------------------------------------------
// Grade file with phase + feature in name
// ---------------------------------------------------------------------------

test("createGradeFile — phase segment present when slice has phase frontmatter", async () => {
  const repo = await tmpRepo("al-gn-phase-");

  // Create slice file with phase frontmatter manually
  const slicesDir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices");
  await fs.mkdir(slicesDir, { recursive: true });
  const sliceContent = [
    "---",
    "id: SLICE-22",
    "title: Phase slice",
    "feature: FEAT-009",
    "phase: 3",
    "status: in-progress",
    "target_release: null",
    "---",
    "# SLICE-22"
  ].join("\n");
  await fs.writeFile(path.join(slicesDir, "SLICE-22_phase-slice.md"), sliceContent);

  const result = await createGradeFile(repo, "SLICE-22");
  assert.equal(result.created, true);
  const base = path.basename(result.gradePath);
  assert.match(base, /phase3/, `Expected phase3 segment in filename, got: ${base}`);
  assert.match(base, /feat009/, `Expected feat009 segment in filename, got: ${base}`);
  assert.match(base, /slice22/, `Expected slice22 segment in filename, got: ${base}`);
});

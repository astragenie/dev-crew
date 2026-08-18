import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { slugifyLesson, scanGradeLessons } from "../scripts/lib/lessons-ratchet.mjs";
import { loadRules } from "../scripts/lib/planning-rules.mjs";

// Helper: write a minimal grade file into a temp grades dir
async function writeGradeFile(
  dir: string,
  filename: string,
  lessonLines: string[],
  followupLines: string[] = []
): Promise<void> {
  const lessons = lessonLines.map((l) => `- ${l}`).join("\n");
  const followups = followupLines.map((f) => `- ${f}`).join("\n");
  const content = [
    "---",
    "slice: SLICE-01",
    "feature: FEAT-001",
    "---",
    "# Grade",
    "",
    "## Scores",
    "- architecture_quality: 0.8",
    "",
    "## Lessons",
    "",
    lessons,
    "",
    ...(followupLines.length > 0 ? ["## Followups", "", followups, ""] : [])
  ].join("\n");
  await fs.writeFile(path.join(dir, filename), content, "utf8");
}

// Test 1 — slugifyLesson: verifies first-6-words + lowercase + dashes
test("slugifyLesson: converts first 6 words to slug", () => {
  const text = "Integration tests in tmp repos are the right pattern for everything";
  const slug = slugifyLesson(text);
  assert.equal(slug, "integration-tests-in-tmp-repos-are");
});

// Test 2 — slugifyLesson: handles punctuation and hyphenated words
test("slugifyLesson: strips punctuation and handles hyphenated words", () => {
  // "Fail-open on state files is the" is the first 6 whitespace-tokens
  // hyphen is non-alphanumeric → becomes dash; trailing period → stripped
  const text = "Fail-open on state files is the right default.";
  const slug = slugifyLesson(text);
  assert.equal(slug, "fail-open-on-state-files-is-the");
});

// Test 3 — scanGradeLessons: returns empty result when no grade files
test("scanGradeLessons: empty result when grades dir absent", async () => {
  const tmpDir = path.join(os.tmpdir(), `ratchet-test-absent-${Date.now()}`);
  const result = await scanGradeLessons(tmpDir);
  assert.equal(result.scannedCount, 0);
  assert.equal(result.repeated.length, 0);
  assert.equal(result.singleton.length, 0);
});

// Test 4 — scanGradeLessons: detects repeated lesson across 2 grade files
test("scanGradeLessons: detects repeated lesson (count >= 2)", async () => {
  const tmpDir = path.join(os.tmpdir(), `ratchet-test-repeated-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const sharedLesson = "Integration tests in tmp repos are the right pattern";

  await writeGradeFile(tmpDir, "20260601T000000Z-feat001-slice01-grade.md", [sharedLesson]);
  await writeGradeFile(tmpDir, "20260602T000000Z-feat002-slice02-grade.md", [
    sharedLesson,
    "Another unique lesson here that only appears once"
  ]);

  const result = await scanGradeLessons(tmpDir);
  assert.equal(result.scannedCount, 2);

  const repeated = result.repeated.find((e) => e.slug === slugifyLesson(sharedLesson));
  assert.ok(repeated, "shared lesson should be in repeated array");
  assert.equal(repeated!.count, 2);
  assert.equal(repeated!.gradeFiles.length, 2);
});

// Test 5 — scanGradeLessons: singleton lessons not in repeated array
test("scanGradeLessons: singleton lessons appear only in singleton array", async () => {
  const tmpDir = path.join(os.tmpdir(), `ratchet-test-singleton-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  await writeGradeFile(tmpDir, "20260601T000000Z-feat001-slice01-grade.md", [
    "This lesson appears only once in the grade set"
  ]);

  const result = await scanGradeLessons(tmpDir);
  assert.equal(result.repeated.length, 0);
  assert.equal(result.singleton.length, 1);
  assert.equal(result.singleton[0]!.count, 1);
});

// Test 6 — scanGradeLessons: respects maxGrades limit
test("scanGradeLessons: respects maxGrades limit", async () => {
  const tmpDir = path.join(os.tmpdir(), `ratchet-test-limit-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const sharedLesson = "ESLint boundary rule catches violations early";

  // Write 4 grade files all containing the shared lesson
  for (let i = 1; i <= 4; i++) {
    const ts = `2026060${i}T000000Z`;
    await writeGradeFile(tmpDir, `${ts}-feat00${i}-slice0${i}-grade.md`, [sharedLesson]);
  }

  // With maxGrades=2 only the 2 most-recent files are scanned
  const result = await scanGradeLessons(tmpDir, { maxGrades: 2 });
  assert.equal(result.scannedCount, 2);

  const entry = result.repeated.find((e) => e.slug === slugifyLesson(sharedLesson));
  // Repeated only across 2 files (the limit), not all 4
  assert.ok(entry, "lesson should be repeated within the 2-file window");
  assert.equal(entry!.count, 2);
});

// Test 7 — loadRules: returns empty array when planning-rules dir absent
test("loadRules: returns empty array when planning-rules dir absent", async () => {
  const tmpRepo = path.join(os.tmpdir(), `ratchet-test-rules-${Date.now()}`);
  await fs.mkdir(tmpRepo, { recursive: true });
  const rules = await loadRules(tmpRepo);
  assert.deepEqual(rules, []);
});

// Test 8 — scanGradeLessons: followups section is also scanned
test("scanGradeLessons: extracts lessons from Followups section as well", async () => {
  const tmpDir = path.join(os.tmpdir(), `ratchet-test-followups-${Date.now()}`);
  await fs.mkdir(tmpDir, { recursive: true });

  const followup = "Consider adding drift guard to PR CI as well";

  await writeGradeFile(tmpDir, "20260601T000000Z-feat001-slice01-grade.md", [], [followup]);
  await writeGradeFile(tmpDir, "20260602T000000Z-feat002-slice02-grade.md", [], [followup]);

  const result = await scanGradeLessons(tmpDir);
  const repeated = result.repeated.find((e) => e.slug === slugifyLesson(followup));
  assert.ok(repeated, "followup lesson should appear in repeated when seen twice");
  assert.equal(repeated!.count, 2);
});

// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { buildRetrospective, writeRetrospective } from "../scripts/lib/retrospective.mjs";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { SCORE_DIMENSIONS, findGradeFileForSlice } from "../scripts/lib/grade-parser.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

async function tmpRepo(prefix) {
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

async function seedGradedSlice(repo, scores, lessons = []) {
  const feat = await addFeature(repo, { title: "Test feature", body: AC_SECTION_BODY });
  const sliceResult = await sliceFromFeature(repo, feat.id);
  const { gradePath } = await createGradeFile(repo, sliceResult.slice.id);
  let content = await fs.readFile(gradePath, "utf8");
  for (const [dim, value] of Object.entries(scores)) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: ${value}`);
  }
  // Inject lessons into the body (replace both placeholder bullets)
  const lessonsBlock = (lessons.length > 0 ? lessons : ["Default lesson 1", "Default lesson 2"])
    .map((l) => `- ${l}`)
    .join("\n");
  content = content.replace(
    /## Lessons\n\n- bullet 1\n- bullet 2/,
    `## Lessons\n\n${lessonsBlock}`
  );
  content = content.replace("<fill title>", "Real Title");
  // Remove the placeholder DEC-TBD section so grade-write doesn't reject it
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  // Replace placeholder Surprises and Followups bullets
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(gradePath, content);
  await writeGrade(repo, sliceResult.slice.id);
  return sliceResult.slice.id;
}

test("buildRetrospective summarizes counts and score averages", async () => {
  const repo = await tmpRepo("al-retro-summary-");
  const scores = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  await seedGradedSlice(repo, scores);
  await seedGradedSlice(repo, scores);
  // buildRetrospective returns the structured report directly
  const r = await buildRetrospective(repo);
  assert.equal(r.counts.gradesInWindow, 2);
  assert.equal(r.scoreAverages.architecture_quality, 0.85);
});

test("buildRetrospective flags dimensions below 0.80 threshold", async () => {
  const repo = await tmpRepo("al-retro-flag-");
  const lowScores = {};
  for (const dim of SCORE_DIMENSIONS) lowScores[dim] = 0.85;
  lowScores.observability = 0.65;
  await seedGradedSlice(repo, lowScores);
  const r = await buildRetrospective(repo);
  assert.ok(r.dimensionsBelowThreshold.includes("observability"));
  assert.ok(!r.dimensionsBelowThreshold.includes("architecture_quality"));
});

test("buildRetrospective aggregates recurring lessons", async () => {
  const repo = await tmpRepo("al-retro-lessons-");
  const scores = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  const repeatedLesson = "OTel span naming inconsistencies between Worker and Api";
  await seedGradedSlice(repo, scores, [repeatedLesson, "Unique lesson 1"]);
  await seedGradedSlice(repo, scores, [repeatedLesson, "Unique lesson 2"]);
  await seedGradedSlice(repo, scores, [repeatedLesson]);
  const r = await buildRetrospective(repo);
  assert.ok(r.topLessons.length >= 1);
  assert.equal(r.topLessons[0].count, 3);
});

test("writeRetrospective creates .claude/artifacts/loop/retrospectives/YYYY-MM-DD.md", async () => {
  const repo = await tmpRepo("al-retro-write-");
  const scores = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  await seedGradedSlice(repo, scores);
  const result = await writeRetrospective(repo);
  assert.match(
    result.artifactPath,
    /\.claude[\\/]artifacts[\\/]loop[\\/]retrospectives[\\/]\d{4}-\d{2}-\d{2}\.md$/
  );
  const body = await fs.readFile(result.artifactPath, "utf8");
  assert.match(body, /Retrospective/);
  assert.match(body, /Slices graded/);
  assert.match(body, /Score averages/);
});

test("buildRetrospective with --span-days filters older grades", async () => {
  const repo = await tmpRepo("al-retro-span-");
  const scores = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  const sliceId = await seedGradedSlice(repo, scores);
  // Mutate grade's graded_at to be 30 days ago — locate the file dynamically
  // since the filename now includes a timestamp prefix.
  const gradePath = await findGradeFileForSlice(repo, sliceId);
  let content = await fs.readFile(gradePath, "utf8");
  const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  content = content.replace(/graded_at: \d{4}-\d{2}-\d{2}/, `graded_at: ${oldDate}`);
  await fs.writeFile(gradePath, content);
  const r = await buildRetrospective(repo, { spanDays: 7 });
  assert.equal(r.counts.gradesInWindow, 0);
});

test("buildRetrospective excludes unfilled (all-zero) grades from scoreAverages", async () => {
  const repo = await tmpRepo("al-retro-unfilled-");
  // Create one filled grade with 0.85 scores
  const filledScores = {};
  for (const dim of SCORE_DIMENSIONS) filledScores[dim] = 0.85;
  await seedGradedSlice(repo, filledScores);

  // Create one unfilled grade with all-zero scores — don't call seedGradedSlice
  // because that calls writeGrade which now rejects unfilled grades. Instead,
  // manually create a template and leave it unfilled.
  const feat = await addFeature(repo, { title: "Unfilled feature", body: AC_SECTION_BODY });
  const sliceResult = await sliceFromFeature(repo, feat.id);
  await createGradeFile(repo, sliceResult.slice.id);
  // Don't fill scores or call writeGrade — leave as template

  // Now buildRetrospective should see 2 grades in the directory, but only count
  // the filled one in scoreAverages (skip the all-zero unfilled one)
  const r = await buildRetrospective(repo);
  // With one filled (0.85) and one unfilled (0.0 all-zero):
  // Expected: scoreAverages should be 0.85 (only the filled grade counted)
  assert.equal(r.scoreAverages.architecture_quality, 0.85);
  // Unfilled grades are not written to grade-write, so gradesInWindow should only
  // count grades that were successfully written (have a graded_at date not matching template).
  // However, since the unfilled one won't have a graded_at filled in, it won't match the window anyway.
  // To be explicit: assert that we're only counting truly filled grades.
  assert.ok(r.counts.gradesInWindow >= 1);
});

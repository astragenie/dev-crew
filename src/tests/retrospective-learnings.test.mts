// FEAT-188 / S1b — AC-2: retrospective findings (systemic dimension gaps +
// undispositioned recurring lessons) are captured into the persistent
// learnings store with zero operator action. Today `commands/retrospective.md`
// ("Synthesis step") asks the dispatching agent to manually run
// `/devcrew:learn` for each of these; this test proves the raw finding now
// survives automatically even if that follow-up synthesis step is skipped.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { writeRetrospective } from "../scripts/lib/retrospective.mjs";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

async function tmpRepo(prefix: string) {
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

async function seedGradedSlice(
  repo: string,
  scores: Record<string, number>,
  lessons: string[] = []
) {
  const feat = await addFeature(repo, { title: "Test feature", body: AC_SECTION_BODY });
  const sliceResult = await sliceFromFeature(repo, feat.id);
  const { gradePath } = await createGradeFile(repo, sliceResult.slice.id);
  let content = await fs.readFile(gradePath, "utf8");
  for (const [dim, value] of Object.entries(scores)) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: ${value}`);
  }
  const lessonsBlock = (lessons.length > 0 ? lessons : ["Default lesson 1", "Default lesson 2"])
    .map((l) => `- ${l}`)
    .join("\n");
  content = content.replace(
    /## Lessons\n\n- bullet 1\n- bullet 2/,
    `## Lessons\n\n${lessonsBlock}`
  );
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(gradePath, content);
  await writeGrade(repo, sliceResult.slice.id);
  return sliceResult.slice.id;
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

const ALL_DIMS = {
  architecture_quality: 0.9,
  reliability: 0.9,
  observability: 0.5, // deliberately below 0.80
  production_readiness: 0.9,
  security: 0.9,
  test_confidence: 0.9,
  product_completeness: 0.9
};

test("writeRetrospective captures a below-threshold dimension gap as a learning", async () => {
  const repo = await tmpRepo("retro-learnings-gap-");
  await seedGradedSlice(repo, ALL_DIMS, ["Some lesson"]);

  const { report } = await writeRetrospective(repo);
  assert.ok(report.dimensionsBelowThreshold.includes("observability"));

  const entries = await readLearnings(repo);
  const gapEntry = entries.find((e: any) => e.key.includes("dimension-gap:observability"));
  assert.ok(gapEntry, "expected a dimension-gap learning entry");
  assert.equal(gapEntry.source, "retrospective");
  assert.match(gapEntry.insight, /observability/);
});

test("writeRetrospective captures a recurring lesson (count >= 2) needing disposition", async () => {
  const repo = await tmpRepo("retro-learnings-recur-");
  await seedGradedSlice(repo, ALL_DIMS, ["Repeated pain point about flaky CI"]);
  await seedGradedSlice(repo, ALL_DIMS, ["Repeated pain point about flaky CI"]);

  const { report } = await writeRetrospective(repo);
  assert.ok(report.topLessons.some((l: any) => l.count >= 2));

  const entries = await readLearnings(repo);
  const recurEntry = entries.find((e: any) => e.key.includes("recurring-lesson"));
  assert.ok(recurEntry, "expected a recurring-lesson learning entry");
  assert.match(recurEntry.insight, /Needs disposition/);
});

test("writeRetrospective re-run on the same window does not duplicate findings", async () => {
  const repo = await tmpRepo("retro-learnings-dedupe-");
  await seedGradedSlice(repo, ALL_DIMS, ["Some lesson"]);

  await writeRetrospective(repo);
  await writeRetrospective(repo);

  const entries = await readLearnings(repo);
  const gapEntries = entries.filter((e: any) => e.key.includes("dimension-gap:observability"));
  assert.equal(gapEntries.length, 1, "re-running the same window must not duplicate");
});

test("writeRetrospective with no gaps or recurring lessons captures no retrospective-sourced entries", async () => {
  const repo = await tmpRepo("retro-learnings-none-");
  const goodScores = { ...ALL_DIMS, observability: 0.9 };
  await seedGradedSlice(repo, goodScores, ["Unique lesson only seen once"]);

  await writeRetrospective(repo);

  // seedGradedSlice's own writeGrade call already logs the raw lesson via
  // grade-writer.mts's P1.11 capture (source: "grade-write") — that is
  // pre-existing behavior, not this slice's concern. Assert only that NO
  // retrospective-sourced finding was captured, since there is no dimension
  // gap and the lesson was not repeated.
  const entries = await readLearnings(repo);
  const retroEntries = entries.filter((e: any) => e.source === "retrospective");
  assert.equal(retroEntries.length, 0);
});

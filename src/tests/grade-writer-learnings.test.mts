// @ts-nocheck
// P1.11: writeGrade captures "## Lessons" bullets into the persistent
// learnings store (.claude/artifacts/loop/learnings.jsonl), gated by the
// learnings-capture flag (P1.0).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

async function tmpRepo(prefix: string, configOverrides: Record<string, any> = {}) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const config = {
    preset: "dotnet-aspire-python",
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations"
    },
    stack: {},
    ...configOverrides
  };
  await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify(config));
  return { repo, config };
}

// Fills every placeholder the GRADE_TEMPLATE_UNFILLED gate checks for, then
// replaces the "## Lessons" bullets with the caller-supplied list.
async function fillGrade(repo: string, sliceId: string, lessons: string[]) {
  const created = await createGradeFile(repo, sliceId);
  let content = await fs.readFile(created.gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  const lessonsBlock = lessons.map((l) => `- ${l}`).join("\n");
  content = content.replace(/- bullet 1\n- bullet 2/, lessonsBlock);
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(created.gradePath, content);
  return created.gradePath;
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

test("writeGrade with 2 lessons logs 2 learnings.jsonl lines joined by sliceId", async () => {
  const { repo, config } = await tmpRepo("al-grade-learnings-2-");
  await fillGrade(repo, "SLICE-01", ["Lesson one", "Lesson two"]);
  await writeGrade(repo, "SLICE-01", { config });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 2);
  assert.ok(entries.every((e) => e.sliceId === "SLICE-01"));
  assert.equal(entries[0].insight, "Lesson one");
  assert.equal(entries[1].insight, "Lesson two");
  assert.ok(entries.every((e) => e.source === "grade-write"));
});

test("writeGrade with learnings-capture disabled writes zero learnings.jsonl lines", async () => {
  const { repo, config } = await tmpRepo("al-grade-learnings-off-", {
    features: { "learnings-capture": { enabled: false } }
  });
  await fillGrade(repo, "SLICE-01", ["Lesson one", "Lesson two"]);
  await writeGrade(repo, "SLICE-01", { config });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 0);
});

test("writeGrade re-run on the same grade does not double-log learnings", async () => {
  const { repo, config } = await tmpRepo("al-grade-learnings-dedupe-");
  await fillGrade(repo, "SLICE-01", ["Lesson one"]);
  await writeGrade(repo, "SLICE-01", { config });
  // Re-running grade-write on an already-written grade is idempotent per the
  // existing DEC-TBD extraction contract; learnings capture must match.
  await writeGrade(repo, "SLICE-01", { config });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 1, "re-run must not duplicate the same lesson");
});

test("edited lesson text at the same position gets a fresh learnings row", async () => {
  const { repo, config } = await tmpRepo("al-grade-learnings-edit-");
  const gradePath = await fillGrade(repo, "SLICE-01", ["Original insight"]);
  await writeGrade(repo, "SLICE-01", { config });

  // Correct the lesson wording in place (same index, new content) and re-run.
  // Content-derived keys must append the edited text rather than silently
  // dropping it (the positional-key staleness bug from the P1.11 review).
  const content = await fs.readFile(gradePath, "utf8");
  await fs.writeFile(gradePath, content.replace("Original insight", "Corrected insight"));
  await writeGrade(repo, "SLICE-01", { config });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 2, "edited lesson must append, not be dropped");
  const insights = entries.map((e) => e.insight).sort();
  assert.deepEqual(insights, ["Corrected insight", "Original insight"]);
});

test("writeGrade with no ## Lessons bullets logs nothing", async () => {
  const { repo, config } = await tmpRepo("al-grade-learnings-none-");
  const created = await createGradeFile(repo, "SLICE-01");
  let content = await fs.readFile(created.gradePath, "utf8");
  for (const dim of SCORE_DIMENSIONS) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: 0.85`);
  }
  // Remove the placeholder lesson bullets entirely (empty section) instead
  // of supplying real ones.
  content = content.replace(/- bullet 1\n- bullet 2\n/, "");
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  content = content.replace(/## Surprises\n\n- bullet/, "## Surprises\n\n- Real surprise");
  content = content.replace(/## Followups\n\n- bullet/, "## Followups\n\n- Real followup");
  await fs.writeFile(created.gradePath, content);

  await writeGrade(repo, "SLICE-01", { config });
  const entries = await readLearnings(repo);
  assert.equal(entries.length, 0);
});

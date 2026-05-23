import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { sliceFromFeature, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { writeMemorySnapshot } from "../scripts/lib/memory-snapshot.mjs";
import { recentLessons } from "../scripts/lib/lessons-feed.mjs";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { addSpec, updateSpecFrontmatter } from "../scripts/lib/spec-parser.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
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

async function seedGrade(repo, sliceId, scores, lessons = [], surprises = []) {
  await createGradeFile(repo, sliceId);
  const gradePath = path.join(repo, "docs/grades", `${sliceId}-grade.md`);
  let content = await fs.readFile(gradePath, "utf8");
  for (const [dim, value] of Object.entries(scores)) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: ${value}`);
  }
  if (lessons.length > 0) {
    const block = lessons.map((l) => `- ${l}`).join("\n");
    content = content.replace(/## Lessons\n\n- bullet 1\n- bullet 2/, `## Lessons\n\n${block}`);
  }
  if (surprises.length > 0) {
    const block = surprises.map((s) => `- ${s}`).join("\n");
    content = content.replace(/## Surprises\n\n- bullet/, `## Surprises\n\n${block}`);
  }
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  await fs.writeFile(gradePath, content);
  await writeGrade(repo, sliceId);
}

test("completeSlice writes a crew final-synthesis artifact", async () => {
  const repo = await tmpRepo("al-v110-syn-");
  const feat = await addFeature(repo, { title: "synthesis test" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id);
  assert.ok(result.synthesis?.synthesisPath);
  const content = await fs.readFile(result.synthesis.synthesisPath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.kind, "final-synthesis");
  assert.equal(frontmatter.slice, slice.id);
  assert.equal(frontmatter.feature, feat.id);
  // No grade yet — synthesis flags it
  assert.match(content, /grade|Grade/);
});

test("completeSlice synthesis embeds grade summary when grade exists", async () => {
  const repo = await tmpRepo("al-v110-syn-grade-");
  const feat = await addFeature(repo, { title: "graded" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Seed grade BEFORE complete (recommended order)
  const scores = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  await seedGrade(repo, slice.id, scores);
  const result = await completeSlice(repo, slice.id);
  const content = await fs.readFile(result.synthesis.synthesisPath, "utf8");
  // Grade scores should appear in synthesis body
  assert.match(content, /architecture_quality: 0\.85/);
  assert.match(content, /Grade file/);
});

test("writeMemorySnapshot produces a structured doc with backlog + specs + grades", async () => {
  const repo = await tmpRepo("al-v110-snapshot-");
  await addFeature(repo, { title: "pending one" });
  const t = await addFeature(repo, { title: "triaged P0" });
  await moveFeature(t.filePath, "triaged", { priority: "P0", category: "feature" });
  const spec = await addSpec(repo, { type: "prd", title: "Approved spec" });
  await updateSpecFrontmatter(spec.filePath, { status: "approved" });
  const result = await writeMemorySnapshot(repo);
  const content = await fs.readFile(result.artifactPath, "utf8");
  assert.match(content, /Autonomous Loop snapshot/);
  assert.match(content, /Backlog state/);
  assert.match(content, /Top triaged/);
  assert.match(content, /Approved \+ undecomposed/);
  assert.equal(result.counts.backlog, 2);
  assert.equal(result.counts.specs, 1);
});

test("recentLessons aggregates last N grades' lessons + surprises + followups", async () => {
  const repo = await tmpRepo("al-v110-lessons-");
  const scores = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  // Seed 3 grades with distinct lessons
  for (let i = 1; i <= 3; i += 1) {
    const f = await addFeature(repo, { title: `f${i}` });
    const { slice } = await sliceFromFeature(repo, f.id);
    await seedGrade(repo, slice.id, scores, [`Lesson from slice ${i}`], [`Surprise ${i}`]);
  }
  const result = await recentLessons(repo, { limit: 2 });
  assert.equal(result.count, 2);
  assert.match(result.digest, /Lessons feed-forward/);
  // Most recent two slices' lessons present
  assert.match(result.digest, /Lesson from slice/);
});

test("recentLessons handles empty grades repo gracefully", async () => {
  const repo = await tmpRepo("al-v110-lessons-empty-");
  const result = await recentLessons(repo);
  assert.equal(result.count, 0);
  assert.match(result.digest, /no grades yet/);
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { sliceFromFeature, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { writeMemorySnapshot } from "../scripts/lib/memory-snapshot.mjs";
import { recentLessons } from "../scripts/lib/lessons-feed.mjs";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { addSpec, updateSpecFrontmatter } from "../scripts/lib/spec-parser.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

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

async function seedGrade(
  repo: string,
  sliceId: string,
  scores: Record<string, number>,
  lessons: string[] = [],
  surprises: string[] = []
) {
  const { gradePath } = await createGradeFile(repo, sliceId);
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
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  assert.ok(result.synthesis?.synthesisPath);
  const content = await fs.readFile(result.synthesis.synthesisPath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.kind, "final-synthesis");
  assert.equal(frontmatter.slice, slice.id);
  assert.equal(frontmatter.feature, feat.id);
  // No grade yet — synthesis flags it
  assert.match(content, /grade|Grade/);
});

test("completeSlice filename embeds FEAT + phase from slice frontmatter", async () => {
  const repo = await tmpRepo("al-syn-feat-phase-");
  const feat = await addFeature(repo, { title: "phase tagged" });
  const { slice } = await sliceFromFeature(repo, feat.id);

  // Inject phase into slice frontmatter (sliceFromFeature defaults phase: null).
  const slicesRoot = path.join(repo, ".claude/artifacts/loop/ai-loop/slices");
  let slicePath: any = null;
  async function walk(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.name.startsWith(slice.id.replace("-", "_"))) slicePath = full;
    }
  }
  await walk(slicesRoot);
  assert.ok(slicePath, "slice file located");
  const raw = await fs.readFile(slicePath, "utf8");
  await fs.writeFile(slicePath, raw.replace("phase: null", "phase: 3"));

  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  const featSegment = feat.id.toLowerCase().replace(/-/g, "");
  const sliceSegment = slice.id.toLowerCase().replace(/-/g, "");
  assert.equal(
    path.basename(result.synthesis.synthesisPath),
    `phase3-${featSegment}-${sliceSegment}-final-synthesis.md`,
    "final-synthesis filename embeds tight phase → feat → slice (no timestamp)"
  );
  assert.equal(
    path.basename(result.handoff.handoffPath),
    `phase3-${featSegment}-${sliceSegment}-complete.md`,
    "handoff filename embeds tight phase → feat → slice (no timestamp)"
  );
  const synContent = await fs.readFile(result.synthesis.synthesisPath, "utf8");
  const synFm = parseFrontmatter(synContent).frontmatter;
  assert.equal(synFm.phase, 3, "synthesis frontmatter carries phase");
  assert.equal(synFm.feature, feat.id, "synthesis frontmatter carries feature");
  const hoContent = await fs.readFile(result.handoff.handoffPath, "utf8");
  const hoFm = parseFrontmatter(hoContent).frontmatter;
  assert.equal(hoFm.phase, 3, "handoff frontmatter carries phase");
  assert.equal(hoFm.feature, feat.id, "handoff frontmatter carries feature");
});

test("completeSlice falls back to bare sliceNN slug when phase null", async () => {
  const repo = await tmpRepo("al-syn-bare-");
  const feat = await addFeature(repo, { title: "no phase" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  const featSegment = feat.id.toLowerCase().replace(/-/g, "");
  const sliceSegment = slice.id.toLowerCase().replace(/-/g, "");
  assert.equal(
    path.basename(result.synthesis.synthesisPath),
    `${featSegment}-${sliceSegment}-final-synthesis.md`,
    "filename includes FEAT but not phase when phase is null"
  );
  assert.doesNotMatch(
    path.basename(result.synthesis.synthesisPath),
    /phase/,
    "filename has no phase segment"
  );
});

test("completeSlice synthesis embeds grade summary when grade exists", async () => {
  const repo = await tmpRepo("al-v110-syn-grade-");
  const feat = await addFeature(repo, { title: "graded" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Seed grade BEFORE complete (recommended order)
  const scores: Record<string, number> = {};
  for (const dim of SCORE_DIMENSIONS) scores[dim] = 0.85;
  await seedGrade(repo, slice.id, scores);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
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
  const scores: Record<string, number> = {};
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

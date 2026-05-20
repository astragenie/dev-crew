import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { detectPatterns } from "../scripts/lib/pattern-alerts.mjs";
import { addFeature, updateFeatureFrontmatter, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { addSpec, updateSpecFrontmatter } from "../scripts/lib/spec-parser.mjs";
import { createGradeFile, writeGrade } from "../scripts/lib/grade-writer.mjs";
import { SCORE_DIMENSIONS } from "../scripts/lib/grade-parser.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/autonomous-loop.json"),
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

async function seedGrade(repo, sliceId, scores) {
  await createGradeFile(repo, sliceId);
  const gradePath = path.join(repo, "docs/grades", `${sliceId}-grade.md`);
  let content = await fs.readFile(gradePath, "utf8");
  for (const [dim, value] of Object.entries(scores)) {
    content = content.replace(new RegExp(`- ${dim}: 0\\.00`), `- ${dim}: ${value}`);
  }
  content = content.replace(/### DEC-TBD:[\s\S]*?(?=\n## Surprises)/, "");
  await fs.writeFile(gradePath, content);
  await writeGrade(repo, sliceId);
}

test("detectPatterns returns empty array on empty repo", async () => {
  const repo = await tmpRepo("al-alerts-empty-");
  const alerts = await detectPatterns(repo);
  assert.deepEqual(alerts, []);
});

test("detectPatterns warns when a dimension is consistently below 0.80", async () => {
  const repo = await tmpRepo("al-alerts-trend-");
  const lowObs = {};
  for (const dim of SCORE_DIMENSIONS) lowObs[dim] = 0.85;
  lowObs.observability = 0.60;
  await seedGrade(repo, "SLICE-01", lowObs);
  await seedGrade(repo, "SLICE-02", lowObs);
  await seedGrade(repo, "SLICE-03", lowObs);
  const alerts = await detectPatterns(repo);
  const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("observability"));
  assert.ok(trend, "expected an observability score-trend alert");
});

test("detectPatterns warns when a feature has 3+ linked slices", async () => {
  const repo = await tmpRepo("al-alerts-decomp-");
  const f = await addFeature(repo, { title: "Big feature" });
  await updateFeatureFrontmatter(f.filePath, { slices: ["SLICE-01", "SLICE-02", "SLICE-03"] });
  const alerts = await detectPatterns(repo);
  const decomp = alerts.find((a) => a.category === "decomposition");
  assert.ok(decomp);
  assert.match(decomp.message, /3 slices/);
});

test("detectPatterns flags approved-but-undecomposed specs", async () => {
  const repo = await tmpRepo("al-alerts-spec-");
  const s = await addSpec(repo, { type: "prd", title: "Pending decomposition" });
  await updateSpecFrontmatter(s.filePath, { status: "approved" });
  const alerts = await detectPatterns(repo);
  const flow = alerts.find((a) => a.category === "spec-flow");
  assert.ok(flow);
  assert.match(flow.message, /approved but not yet decomposed/);
});

test("detectPatterns flags in-progress features without a linked slice", async () => {
  const repo = await tmpRepo("al-alerts-orphan-");
  const f = await addFeature(repo, { title: "Orphan" });
  await moveFeature(f.filePath, "in-progress");
  const alerts = await detectPatterns(repo);
  const orphan = alerts.find((a) => a.category === "in-progress-orphan");
  assert.ok(orphan);
});

test("detectPatterns suggests triage when pending backlog grows large", async () => {
  const repo = await tmpRepo("al-alerts-pending-");
  for (let i = 0; i < 10; i += 1) {
    await addFeature(repo, { title: `Item ${i}` });
  }
  const alerts = await detectPatterns(repo);
  const flow = alerts.find((a) => a.category === "backlog-flow");
  assert.ok(flow);
  assert.match(flow.message, /pending triage/);
});

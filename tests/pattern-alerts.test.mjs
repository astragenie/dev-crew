// @ts-nocheck
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
    await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify({
        preset: "dotnet-aspire-python",
        loop: {
            aiLoopRoot: ".claude/artifacts/loop/ai-loop",
            backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
            slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
            phaseGateArtifactDir: ".claude/artifacts/crew/validations"
        },
        stack: {}
    }));
    return repo;
}
async function seedGrade(repo, sliceId, scores) {
    const { gradePath } = await createGradeFile(repo, sliceId);
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
    for (const dim of SCORE_DIMENSIONS)
        lowObs[dim] = 0.85;
    lowObs.observability = 0.6;
    await seedGrade(repo, "SLICE-01", lowObs);
    await seedGrade(repo, "SLICE-02", lowObs);
    await seedGrade(repo, "SLICE-03", lowObs);
    const alerts = await detectPatterns(repo);
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("observability"));
    assert.ok(trend, "expected an observability score-trend alert");
});
test("detectPatterns warns when a pending feature has 3+ linked slices", async () => {
    const repo = await tmpRepo("al-alerts-decomp-pending-");
    const f = await addFeature(repo, { title: "Big feature" });
    await updateFeatureFrontmatter(f.filePath, { slices: ["SLICE-01", "SLICE-02", "SLICE-03"] });
    const alerts = await detectPatterns(repo);
    const decomp = alerts.find((a) => a.category === "decomposition");
    assert.ok(decomp, "expected a decomposition alert");
    assert.equal(decomp.severity, "warn", "pending feature should emit warn severity");
    assert.match(decomp.message, /3 slices/);
});
test("detectPatterns emits info (not warn) when a done feature has 3+ slices", async () => {
    const repo = await tmpRepo("al-alerts-decomp-done-");
    const f = await addFeature(repo, { title: "Shipped feature" });
    await updateFeatureFrontmatter(f.filePath, { slices: ["SLICE-01", "SLICE-02", "SLICE-03"] });
    await moveFeature(f.filePath, "done");
    const alerts = await detectPatterns(repo);
    const decomp = alerts.find((a) => a.category === "decomposition");
    assert.ok(decomp, "expected a decomposition alert even for done features");
    assert.equal(decomp.severity, "info", "done feature should emit info severity");
    assert.match(decomp.message, /shipped with/);
});
test("detectPatterns warns when an in-progress feature has 3+ linked slices", async () => {
    const repo = await tmpRepo("al-alerts-decomp-inprogress-");
    const f = await addFeature(repo, { title: "Active feature" });
    await updateFeatureFrontmatter(f.filePath, { slices: ["SLICE-01", "SLICE-02", "SLICE-03"] });
    await moveFeature(f.filePath, "in-progress");
    const alerts = await detectPatterns(repo);
    const decomp = alerts.find((a) => a.category === "decomposition");
    assert.ok(decomp, "expected a decomposition alert for in-progress feature");
    assert.equal(decomp.severity, "warn", "in-progress feature should emit warn severity");
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
// AC-2: threshold and trailing from config
test("detectPatterns: threshold from config honored — no alert when score above config threshold", async () => {
    const repo = await tmpRepo("al-cfg-threshold-above-");
    // seed 3 grades with observability=0.75 (above global 0.80 would fire, but config sets 0.6)
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.observability = 0.75;
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    // With global threshold 0.8 this would fire an observability alert
    // but with threshold 0.6 it must NOT fire
    const config = { loop: { gradeTrendThreshold: 0.6 } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("observability"));
    assert.equal(trend, undefined, "should NOT fire when threshold < score");
});
test("detectPatterns: threshold from config honored — alert fires when score below config threshold", async () => {
    const repo = await tmpRepo("al-cfg-threshold-below-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.test_confidence = 0.65;
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    // config sets threshold to 0.7, score 0.65 < 0.7 → should fire
    const config = { loop: { gradeTrendThreshold: 0.7 } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("test_confidence"));
    assert.ok(trend, "should fire when score below config threshold");
});
// AC-2: trailing slices from config
test("detectPatterns: gradeTrendConsecutiveLimit from config — fewer trailing slices needed", async () => {
    const repo = await tmpRepo("al-cfg-trailing-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.observability = 0.6;
    // Seed only 2 grades — with default trailing=3 this would NOT fire
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    // config sets trailing to 2 → should fire
    const config = { loop: { gradeTrendConsecutiveLimit: 2 } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("observability"));
    assert.ok(trend, "should fire with only 2 grades when trailing limit is 2");
});
// AC-2: missing config falls back to defaults (0.8 threshold, 3 trailing)
test("detectPatterns: missing config falls back to default threshold 0.8 and trailing 3", async () => {
    const repo = await tmpRepo("al-cfg-default-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.test_confidence = 0.75; // 0.75 < 0.8 → should fire with default
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    const alerts = await detectPatterns(repo); // no config
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("test_confidence"));
    assert.ok(trend, "should fire with default threshold when score is 0.75");
});
// AC-2: malformed threshold (string) falls back to default
test("detectPatterns: malformed threshold string falls back to default 0.8", async () => {
    const repo = await tmpRepo("al-cfg-malformed-str-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.test_confidence = 0.75;
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    const config = { loop: { gradeTrendThreshold: "not-a-number" } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("test_confidence"));
    assert.ok(trend, "malformed threshold should fall back to 0.8, causing alert for 0.75 score");
});
// AC-2: out-of-range threshold (negative) falls back to default
test("detectPatterns: out-of-range threshold (negative) falls back to default 0.8", async () => {
    const repo = await tmpRepo("al-cfg-malformed-neg-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.test_confidence = 0.75;
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    const config = { loop: { gradeTrendThreshold: -0.5 } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("test_confidence"));
    assert.ok(trend, "negative threshold should fall back to 0.8");
});
// AC-2: out-of-range threshold (>1) falls back to default
test("detectPatterns: out-of-range threshold (>1) falls back to default 0.8", async () => {
    const repo = await tmpRepo("al-cfg-malformed-gt1-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.test_confidence = 0.75;
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    const config = { loop: { gradeTrendThreshold: 1.5 } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("test_confidence"));
    assert.ok(trend, "threshold > 1 should fall back to 0.8");
});
// AC-3: per-dimension override honored
test("detectPatterns: per-dim override allows lower threshold for observability", async () => {
    const repo = await tmpRepo("al-cfg-perdim-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.observability = 0.75; // 0.75 < default 0.8, but per-dim says 0.7 → no alert
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    const config = { loop: { gradeTrendPerDimension: { observability: 0.7 } } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("observability"));
    assert.equal(trend, undefined, "per-dim 0.7 threshold, score 0.75 — no alert");
});
test("detectPatterns: per-dim override fires when score below per-dim threshold", async () => {
    const repo = await tmpRepo("al-cfg-perdim-fires-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.observability = 0.65; // 0.65 < per-dim 0.7 → alert
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    const config = { loop: { gradeTrendPerDimension: { observability: 0.7 } } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("observability"));
    assert.ok(trend, "per-dim 0.7 threshold, score 0.65 — alert fires");
});
// AC-3: invalid per-dim value falls back to global threshold
test("detectPatterns: invalid per-dim value (string) falls back to global threshold", async () => {
    const repo = await tmpRepo("al-cfg-perdim-invalid-");
    const scores = {};
    for (const dim of SCORE_DIMENSIONS)
        scores[dim] = 0.85;
    scores.observability = 0.75; // 0.75 < global 0.8 → should fire after fallback
    await seedGrade(repo, "SLICE-01", scores);
    await seedGrade(repo, "SLICE-02", scores);
    await seedGrade(repo, "SLICE-03", scores);
    const config = { loop: { gradeTrendPerDimension: { observability: "bad" } } };
    const alerts = await detectPatterns(repo, { config });
    const trend = alerts.find((a) => a.category === "score-trend" && a.message.includes("observability"));
    assert.ok(trend, "invalid per-dim value should fall back to global threshold (0.8), causing alert for 0.75");
});

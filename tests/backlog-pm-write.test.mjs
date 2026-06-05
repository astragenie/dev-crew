import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { writePmScores } from "../scripts/lib/backlog-pm-write.mjs";
async function tmpRepo(prefix) {
    return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
const FULL_SCORES = {
    customer_impact: 0.8,
    effort_estimate: 0.3,
    strategic_alignment: 0.7,
    technical_risk: 0.2,
    dependency_depth: 0.1
};
test("writePmScores writes all pm_* fields to a pending FEAT frontmatter", async () => {
    const repo = await tmpRepo("al-pm-write-happy-");
    const feat = await addFeature(repo, { title: "Test feature" });
    await writePmScores(repo, {
        id: feat.id,
        scores: FULL_SCORES,
        priority: "P1",
        autonomousSafe: true
    });
    const content = await fs.readFile(feat.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.pm_customer_impact, 0.8);
    assert.equal(frontmatter.pm_effort_estimate, 0.3);
    assert.equal(frontmatter.pm_strategic_alignment, 0.7);
    assert.equal(frontmatter.pm_technical_risk, 0.2);
    assert.equal(frontmatter.pm_dependency_depth, 0.1);
});
test("writePmScores writes composite_score using weighted formula (impact/alignment positive, effort/risk/dep inverted)", async () => {
    const repo = await tmpRepo("al-pm-write-composite-");
    const feat = await addFeature(repo, { title: "Composite score check" });
    await writePmScores(repo, {
        id: feat.id,
        scores: FULL_SCORES,
        priority: "P1",
        autonomousSafe: true
    });
    const content = await fs.readFile(feat.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    // Weighted: impact*0.35 + alignment*0.30 + (1-effort)*0.20 + (1-risk)*0.10 + (1-dep)*0.05
    // = 0.8*0.35 + 0.7*0.30 + (1-0.3)*0.20 + (1-0.2)*0.10 + (1-0.1)*0.05
    // = 0.28 + 0.21 + 0.14 + 0.08 + 0.045 = 0.755
    assert.equal(typeof frontmatter.composite_score, "number");
    assert.ok(frontmatter.composite_score >= 0 && frontmatter.composite_score <= 1, "composite_score must be 0-1");
    assert.equal(frontmatter.composite_score, 0.755);
});
test("writePmScores writes --priority and --autonomous-safe to frontmatter", async () => {
    const repo = await tmpRepo("al-pm-write-priority-");
    const feat = await addFeature(repo, { title: "Priority and safe flags" });
    await writePmScores(repo, {
        id: feat.id,
        scores: FULL_SCORES,
        priority: "P0",
        autonomousSafe: false
    });
    const content = await fs.readFile(feat.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.priority, "P0");
    assert.equal(frontmatter.autonomous_safe, false);
});
test("writePmScores does not change status field of a pending FEAT", async () => {
    const repo = await tmpRepo("al-pm-write-status-pending-");
    const feat = await addFeature(repo, { title: "Status preserved pending" });
    await writePmScores(repo, {
        id: feat.id,
        scores: FULL_SCORES,
        priority: "P2",
        autonomousSafe: true
    });
    const content = await fs.readFile(feat.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.status, "pending");
});
test("writePmScores does not change status field of a triaged FEAT and does not move the file", async () => {
    const repo = await tmpRepo("al-pm-write-status-triaged-");
    const feat = await addFeature(repo, { title: "Triaged feature" });
    const moved = await moveFeature(feat.filePath, "triaged", {
        priority: "P2",
        category: "feature"
    });
    await writePmScores(repo, {
        id: feat.id,
        scores: FULL_SCORES,
        priority: "P1",
        autonomousSafe: true
    });
    // File stays in triaged directory
    const content = await fs.readFile(moved.to, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.status, "triaged");
    assert.equal(frontmatter.pm_customer_impact, 0.8);
    // Original triaged path still exists, not moved
    const exists = await fs
        .access(moved.to)
        .then(() => true)
        .catch(() => false);
    assert.equal(exists, true);
});
test("writePmScores throws when FEAT is not found", async () => {
    const repo = await tmpRepo("al-pm-write-notfound-");
    await addFeature(repo, { title: "Some feature" });
    await assert.rejects(() => writePmScores(repo, {
        id: "FEAT-999",
        scores: FULL_SCORES,
        priority: "P2",
        autonomousSafe: false
    }), /FEAT-999/);
});
test("writePmScores accepts optional triage_notes from reasoning argument", async () => {
    const repo = await tmpRepo("al-pm-write-notes-");
    const feat = await addFeature(repo, { title: "Feature with notes" });
    await writePmScores(repo, {
        id: feat.id,
        scores: FULL_SCORES,
        priority: "P2",
        autonomousSafe: true,
        triageNotes: "high demand from enterprise segment"
    });
    const content = await fs.readFile(feat.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    assert.equal(frontmatter.triage_notes, "high demand from enterprise segment");
});
test("writePmScores score field mapping: customer_impact maps to pm_customer_impact", async () => {
    const repo = await tmpRepo("al-pm-write-mapping-");
    const feat = await addFeature(repo, { title: "Mapping check" });
    const scores = {
        customer_impact: 0.9,
        effort_estimate: 0.1,
        strategic_alignment: 0.8,
        technical_risk: 0.05,
        dependency_depth: 0.2
    };
    await writePmScores(repo, {
        id: feat.id,
        scores,
        priority: "P1",
        autonomousSafe: true
    });
    const content = await fs.readFile(feat.filePath, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    // Explicit field-by-field mapping verification
    assert.equal(frontmatter.pm_customer_impact, scores.customer_impact);
    assert.equal(frontmatter.pm_effort_estimate, scores.effort_estimate);
    assert.equal(frontmatter.pm_strategic_alignment, scores.strategic_alignment);
    assert.equal(frontmatter.pm_technical_risk, scores.technical_risk);
    assert.equal(frontmatter.pm_dependency_depth, scores.dependency_depth);
});

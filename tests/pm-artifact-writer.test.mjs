import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { writePmReviewArtifact } from "../scripts/lib/pm-artifact-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("writePmReviewArtifact creates a PM review file with scored frontmatter", async () => {
  const repo = await tmpRepo("al-pm-artifact-");
  const result = await writePmReviewArtifact(repo, {
    featureId: "FEAT-001",
    scores: {
      customer_impact: 0.8,
      effort_estimate: 0.35,
      strategic_alignment: 0.9,
      technical_risk: 0.4,
      dependency_depth: 0.15
    },
    compositePriority: "P1",
    autonomousSafe: true,
    demandEvidence: "Grade SLICE-27 flagged missing pagination",
    scopeNotes: "Bounded to API + dashboard",
    risks: ["pgvector index rebuild may lock table"],
    reasoning: "High impact, low effort, core mission"
  });
  assert.ok(result.artifactPath);
  assert.match(result.artifactPath, /pm-reviews/);
  assert.match(result.artifactPath, /FEAT-001-pm-review\.md$/);
  const content = await fs.readFile(result.artifactPath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.feature, "FEAT-001");
  assert.equal(frontmatter.pm_customer_impact, 0.8);
  assert.equal(frontmatter.composite_priority, "P1");
  assert.equal(frontmatter.autonomous_safe, true);
  assert.equal(frontmatter.id, "PM-REVIEW-FEAT-001");
});

test("writePmReviewArtifact overwrites existing review for same FEAT", async () => {
  const repo = await tmpRepo("al-pm-overwrite-");
  await writePmReviewArtifact(repo, {
    featureId: "FEAT-001",
    scores: {
      customer_impact: 0.5,
      effort_estimate: 0.5,
      strategic_alignment: 0.5,
      technical_risk: 0.5,
      dependency_depth: 0.5
    },
    compositePriority: "P2",
    autonomousSafe: false,
    reasoning: "first pass"
  });
  const result = await writePmReviewArtifact(repo, {
    featureId: "FEAT-001",
    scores: {
      customer_impact: 0.9,
      effort_estimate: 0.2,
      strategic_alignment: 0.9,
      technical_risk: 0.1,
      dependency_depth: 0.1
    },
    compositePriority: "P0",
    autonomousSafe: true,
    reasoning: "revised after evidence"
  });
  const content = await fs.readFile(result.artifactPath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.composite_priority, "P0");
  assert.equal(frontmatter.autonomous_safe, true);
});

test("writePmReviewArtifact handles missing optional fields", async () => {
  const repo = await tmpRepo("al-pm-minimal-");
  const result = await writePmReviewArtifact(repo, {
    featureId: "FEAT-042",
    scores: {
      customer_impact: 0.5,
      effort_estimate: 0.5,
      strategic_alignment: 0.5,
      technical_risk: 0.5,
      dependency_depth: 0.5
    },
    compositePriority: "P2",
    autonomousSafe: false
  });
  const content = await fs.readFile(result.artifactPath, "utf8");
  assert.ok(content.includes("FEAT-042"));
  assert.ok(content.includes("none"));
});

test("writePmReviewArtifact throws without featureId", async () => {
  const repo = await tmpRepo("al-pm-noid-");
  await assert.rejects(() => writePmReviewArtifact(repo, { scores: {} }), /featureId/);
});

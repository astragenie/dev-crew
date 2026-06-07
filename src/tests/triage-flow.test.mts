import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import {
  computeCompositePriority,
  computeAutonomousSafe,
  validatePmScores
} from "../scripts/lib/pm-scorer.mjs";
import { writePmReviewArtifact } from "../scripts/lib/pm-artifact-writer.mjs";
import { triagePending } from "../scripts/lib/backlog-triage.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("full PM triage flow: add feature, score, write artifact, read back", async () => {
  const repo = await tmpRepo("al-pm-flow-");

  const feat = await addFeature(repo, {
    title: "Add pagination to ingestion API",
    body: "## Description\n\n10k+ jobs per tenant exceed payload limit.\n\n## Acceptance hints\n\n- API returns paginated results\n- Dashboard shows page controls\n",
    category: "feature"
  });

  const scores = {
    customer_impact: 0.8,
    effort_estimate: 0.35,
    strategic_alignment: 0.9,
    technical_risk: 0.3,
    dependency_depth: 0.1
  };

  const errors = validatePmScores(scores);
  assert.equal(errors.length, 0);

  const priority = computeCompositePriority(scores, "feature");
  assert.equal(priority, "P1");

  const safe = computeAutonomousSafe(scores, {
    hasSpec: false,
    hasAcceptanceCriteria: true
  });
  assert.equal(safe, true);

  const artifact = await writePmReviewArtifact(repo, {
    featureId: feat.id,
    scores,
    compositePriority: priority,
    autonomousSafe: safe,
    demandEvidence: "10k+ jobs payload limit hit in production",
    reasoning: "High impact, low effort, core API improvement"
  });

  assert.ok(
    await fs
      .access(artifact.artifactPath)
      .then(() => true)
      .catch(() => false)
  );

  const artifactContent = await fs.readFile(artifact.artifactPath, "utf8");
  const { frontmatter: artifactFm } = parseFrontmatter(artifactContent);
  assert.equal(artifactFm.pm_customer_impact, 0.8);
  assert.equal(artifactFm.composite_priority, "P1");
  assert.equal(artifactFm.autonomous_safe, true);
});

test("validatePmScores catches missing dimensions", () => {
  const partial = { customer_impact: 0.5, effort_estimate: 0.3 };
  const errors = validatePmScores(partial);
  assert.equal(errors.length, 3);
  assert.ok(errors.some((e) => e.includes("strategic_alignment")));
});

test("validatePmScores catches out-of-range values", () => {
  const bad = {
    customer_impact: 1.5,
    effort_estimate: -0.1,
    strategic_alignment: 0.5,
    technical_risk: 0.5,
    dependency_depth: 0.5
  };
  const errors = validatePmScores(bad);
  assert.equal(errors.length, 2);
});

test("regex fallback writes same frontmatter shape as PM happy path", async () => {
  const repo = await tmpRepo("al-fallback-shape-");
  await addFeature(repo, {
    title: "Fallback shape parity",
    body: "## Acceptance criteria\n\n- AC-1: x\n- AC-2: y\n- AC-3: z",
    category: "feature"
  });

  const results = await triagePending(repo);
  assert.equal(results.length, 1);
  const r = results[0];

  // Every PM dimension key must be present in the regex-fallback frontmatter
  // so consumers do not need to branch on the triage path.
  for (const dim of [
    "pm_customer_impact",
    "pm_effort_estimate",
    "pm_strategic_alignment",
    "pm_technical_risk",
    "pm_dependency_depth"
  ]) {
    assert.ok(
      dim in r,
      `regex fallback must write ${dim} (got keys: ${Object.keys(r).join(", ")})`
    );
  }
  assert.equal(typeof r.autonomous_safe, "boolean");
  assert.ok(typeof r.triage_notes === "string" && r.triage_notes.length > 0);
});

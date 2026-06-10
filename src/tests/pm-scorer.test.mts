// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  computeCompositePriority,
  computeAutonomousSafe,
  PM_DIMENSIONS,
  validatePmScores,
  averagePmScore,
  parsePmScoresFromFrontmatter
} from "../scripts/lib/pm-scorer.mjs";

test("PM_DIMENSIONS lists all five scoring dimensions", () => {
  assert.deepEqual(PM_DIMENSIONS, [
    "customer_impact",
    "effort_estimate",
    "strategic_alignment",
    "technical_risk",
    "dependency_depth"
  ]);
});

test("computeCompositePriority returns P0 for high-impact bugfix", () => {
  const scores = {
    customer_impact: 0.85,
    effort_estimate: 0.3,
    strategic_alignment: 0.7,
    technical_risk: 0.4,
    dependency_depth: 0.1
  };
  assert.equal(computeCompositePriority(scores, "bugfix"), "P0");
});

test("computeCompositePriority returns P0 for high-impact high-risk", () => {
  const scores = {
    customer_impact: 0.85,
    effort_estimate: 0.5,
    strategic_alignment: 0.6,
    technical_risk: 0.85,
    dependency_depth: 0.2
  };
  assert.equal(computeCompositePriority(scores, "feature"), "P0");
});

test("computeCompositePriority returns P1 for high-impact aligned", () => {
  const scores = {
    customer_impact: 0.75,
    effort_estimate: 0.4,
    strategic_alignment: 0.7,
    technical_risk: 0.3,
    dependency_depth: 0.1
  };
  assert.equal(computeCompositePriority(scores, "feature"), "P1");
});

test("computeCompositePriority returns P1 for high-alignment low-effort", () => {
  const scores = {
    customer_impact: 0.5,
    effort_estimate: 0.3,
    strategic_alignment: 0.85,
    technical_risk: 0.2,
    dependency_depth: 0.1
  };
  assert.equal(computeCompositePriority(scores, "feature"), "P1");
});

test("computeCompositePriority returns P3 for high-effort low-impact", () => {
  const scores = {
    customer_impact: 0.2,
    effort_estimate: 0.8,
    strategic_alignment: 0.3,
    technical_risk: 0.5,
    dependency_depth: 0.3
  };
  assert.equal(computeCompositePriority(scores, "feature"), "P3");
});

test("computeCompositePriority returns P2 for middle-of-road scores", () => {
  const scores = {
    customer_impact: 0.5,
    effort_estimate: 0.5,
    strategic_alignment: 0.5,
    technical_risk: 0.5,
    dependency_depth: 0.5
  };
  assert.equal(computeCompositePriority(scores, "feature"), "P2");
});

test("computeAutonomousSafe returns true for low-risk bounded work", () => {
  const scores = {
    customer_impact: 0.7,
    effort_estimate: 0.4,
    strategic_alignment: 0.8,
    technical_risk: 0.3,
    dependency_depth: 0.1
  };
  assert.equal(computeAutonomousSafe(scores, { hasSpec: true, hasAcceptanceCriteria: true }), true);
});

test("computeAutonomousSafe returns false for high-risk", () => {
  const scores = {
    customer_impact: 0.7,
    effort_estimate: 0.4,
    strategic_alignment: 0.8,
    technical_risk: 0.7,
    dependency_depth: 0.1
  };
  assert.equal(
    computeAutonomousSafe(scores, { hasSpec: true, hasAcceptanceCriteria: true }),
    false
  );
});

test("computeAutonomousSafe returns false when no spec and no AC", () => {
  const scores = {
    customer_impact: 0.7,
    effort_estimate: 0.3,
    strategic_alignment: 0.8,
    technical_risk: 0.2,
    dependency_depth: 0.1
  };
  assert.equal(
    computeAutonomousSafe(scores, { hasSpec: false, hasAcceptanceCriteria: false }),
    false
  );
});

test("computeAutonomousSafe returns false for high effort", () => {
  const scores = {
    customer_impact: 0.9,
    effort_estimate: 0.7,
    strategic_alignment: 0.9,
    technical_risk: 0.2,
    dependency_depth: 0.1
  };
  assert.equal(
    computeAutonomousSafe(scores, { hasSpec: true, hasAcceptanceCriteria: true }),
    false
  );
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

test("validatePmScores returns empty array for valid scores", () => {
  const good = {
    customer_impact: 0.8,
    effort_estimate: 0.4,
    strategic_alignment: 0.9,
    technical_risk: 0.3,
    dependency_depth: 0.1
  };
  assert.deepEqual(validatePmScores(good), []);
});

test("averagePmScore computes mean of all dimensions", () => {
  const scores = {
    customer_impact: 0.8,
    effort_estimate: 0.4,
    strategic_alignment: 0.6,
    technical_risk: 0.2,
    dependency_depth: 0.0
  };
  assert.equal(averagePmScore(scores), 0.4);
});

test("averagePmScore returns null when no valid dimensions", () => {
  assert.equal(averagePmScore({}), null);
});

test("parsePmScoresFromFrontmatter extracts pm_ prefixed keys", () => {
  const fm = {
    pm_customer_impact: 0.8,
    pm_effort_estimate: 0.35,
    pm_strategic_alignment: 0.9,
    pm_technical_risk: 0.4,
    pm_dependency_depth: 0.15,
    unrelated: "foo"
  };
  const scores = parsePmScoresFromFrontmatter(fm);
  assert.equal(scores.customer_impact, 0.8);
  assert.equal(scores.effort_estimate, 0.35);
  assert.equal(scores.dependency_depth, 0.15);
  assert.equal(Object.keys(scores).length, 5);
});

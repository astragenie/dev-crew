import test from "node:test";
import assert from "node:assert/strict";

import { computeConfidence } from "../scripts/lib/confidence-signal.mjs";

test("green when autonomous_safe + AC>=3 + healthy grade + no deps", () => {
  const r = computeConfidence({
    autonomousSafe: true,
    acCount: 3,
    recentGradeAvg: 0.92,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "green");
  assert.match(r.reason, /autonomous-safe/);
});

test("yellow on auto-safe false catch-all (5 AC, good grade, no deps)", () => {
  const r = computeConfidence({
    autonomousSafe: false,
    acCount: 5,
    recentGradeAvg: 0.92,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "yellow");
  assert.match(r.reason, /autonomous_safe: false/);
});

test("yellow when grade trend below 0.85 (auto-safe + 3 AC)", () => {
  const r = computeConfidence({
    autonomousSafe: true,
    acCount: 3,
    recentGradeAvg: 0.78,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "yellow");
  assert.match(r.reason, /0\.78/);
});

test("red when acCount === 0 regardless of other signals", () => {
  const r = computeConfidence({
    autonomousSafe: true,
    acCount: 0,
    recentGradeAvg: 0.99,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "red");
  assert.match(r.reason, /no acceptance criteria/);
});

test("red on compound auto-safe false + low AC", () => {
  const r = computeConfidence({
    autonomousSafe: false,
    acCount: 1,
    recentGradeAvg: 0.92,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "red");
  assert.match(r.reason, /AC count 1/);
});

test("red on compound auto-safe false + low grade", () => {
  const r = computeConfidence({
    autonomousSafe: false,
    acCount: 5,
    recentGradeAvg: 0.7,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "red");
  assert.match(r.reason, /0\.70/);
});

test("red on compound auto-safe false + depends_on", () => {
  const r = computeConfidence({
    autonomousSafe: false,
    acCount: 5,
    recentGradeAvg: 0.92,
    dependsOnCount: 2
  });
  assert.equal(r.confidence, "red");
  assert.match(r.reason, /2 unresolved depends_on/);
});

test("green when grade history is null + autonomous-safe + AC>=3", () => {
  const r = computeConfidence({
    autonomousSafe: true,
    acCount: 3,
    recentGradeAvg: null,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "green");
  assert.match(r.reason, /no grade history yet/);
});

test("autonomous_safe null treated as not-false — passes to grade-trend branch", () => {
  const r = computeConfidence({
    autonomousSafe: null,
    acCount: 3,
    recentGradeAvg: 0.92,
    dependsOnCount: 0
  });
  assert.equal(r.confidence, "green");
});

// @ts-nocheck
// Tests for the autonomous backlog walker (FEAT-025 SLICE-A).
// Covers: happy path, ranking by composite_score, max-features cap,
// stop-condition halt, and empty-backlog early return.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { runAutoWalker } from "../scripts/lib/auto-walker.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/state/loop"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/crew/cost-insights"), { recursive: true });
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

/** Move a feature to triaged state and optionally patch frontmatter fields. */
async function triageFeature(
  filePath: string,
  extra: Record<string, any> = {}
): Promise<string> {
  const result = await moveFeature(filePath, "triaged", {
    priority: "P2",
    category: "feature",
    ...extra
  });
  return result.to;
}

/** Seed crew workflow state so escalation stop condition can fire. */
async function writeCrewWorkflow(repo: string, gates: any[]): Promise<void> {
  const target = path.join(repo, ".claude/state/crew/workflow-state.json");
  await fs.writeFile(
    target,
    JSON.stringify(
      {
        version: "1.0",
        updatedAt: new Date().toISOString(),
        currentRun: { id: "run-auto-walker-test", gates }
      },
      null,
      2
    )
  );
}

// ---------------------------------------------------------------------------
// Test 1 — Happy path: autonomous_safe=true and autonomous_safe=false (no risk)
//          are both planned; undefined autonomous_safe is skipped
// ---------------------------------------------------------------------------

test("happy path: 3 triaged FEATs (true/false/undefined) → 2 plans, 1 skipped", async () => {
  const repo = await tmpRepo("aw-happy-");

  const a = await addFeature(repo, { title: "Safe feature" });
  const b = await addFeature(repo, { title: "Unsafe but viable feature" });
  const c = await addFeature(repo, { title: "Undefined safety feature" });

  // SLICE-B: autonomous_safe=true → planned without preflight
  await triageFeature(a.filePath, { autonomous_safe: true });
  // SLICE-B: autonomous_safe=false (no risk factors) → planned with preflight
  await triageFeature(b.filePath, { autonomous_safe: false, pm_risk_level: 0.3 });
  // SLICE-B: no autonomous_safe key (undefined) → skipped
  await triageFeature(c.filePath);

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(typeof result, "object", "result must be an object");
  assert.equal(result.walked, 3, "walked must equal total triaged count");
  assert.equal(result.planned, 2, "2 plans expected (safe + unsafe without risk)");
  assert.equal(result.skipped.length, 1, "1 FEAT must be skipped (undefined safety)");
  assert.ok(Array.isArray(result.plans), "plans must be an array");
  assert.equal(result.plans.length, 2);

  // Verify the undefined-safety feature was skipped
  const skipped = result.skipped[0];
  assert.equal(skipped.reason, "not_autonomous_safe");

  // Verify plan shapes
  const safePlan = result.plans.find((p) => p.featureId === a.id);
  const unsafePlan = result.plans.find((p) => p.featureId === b.id);

  assert.ok(safePlan, "safe plan must be present");
  assert.ok(safePlan.featureId, "plan must have featureId");
  assert.ok(safePlan.suggestedSliceTitle, "plan must have suggestedSliceTitle");
  assert.ok(!safePlan.requiresPlanPreflight, "safe plan should not require preflight");

  assert.ok(unsafePlan, "unsafe plan must be present");
  assert.equal(unsafePlan.requiresPlanPreflight, true, "unsafe plan must require preflight");

  // Result shape
  assert.equal(typeof result.halted, "boolean");
  assert.ok(result.stopReason === null || typeof result.stopReason === "string");
});

// ---------------------------------------------------------------------------
// Test 2 — Ranking: higher composite_score returned first
// ---------------------------------------------------------------------------

test("ranking: 2 triaged FEATs → higher composite_score returned first", async () => {
  const repo = await tmpRepo("aw-rank-");

  const low = await addFeature(repo, { title: "Low score feature" });
  const high = await addFeature(repo, { title: "High score feature" });

  await triageFeature(low.filePath, { autonomous_safe: true, composite_score: 0.3 });
  await triageFeature(high.filePath, { autonomous_safe: true, composite_score: 0.9 });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.plans.length, 2, "both safe FEATs must be planned");
  assert.equal(
    result.plans[0].featureId,
    high.id,
    `first plan must be the high-score feature (${high.id}), got ${result.plans[0].featureId}`
  );
  assert.equal(result.plans[1].featureId, low.id, "second plan must be the low-score feature");
});

// ---------------------------------------------------------------------------
// Test 3 — Max-features cap: walker stops after N plans
// ---------------------------------------------------------------------------

test("max-features cap: 3 candidates + maxFeatures=2 → returns 2 plans", async () => {
  const repo = await tmpRepo("aw-cap-");

  const a = await addFeature(repo, { title: "Feature A" });
  const b = await addFeature(repo, { title: "Feature B" });
  const c = await addFeature(repo, { title: "Feature C" });

  await triageFeature(a.filePath, { autonomous_safe: true, composite_score: 0.9 });
  await triageFeature(b.filePath, { autonomous_safe: true, composite_score: 0.7 });
  await triageFeature(c.filePath, { autonomous_safe: true, composite_score: 0.5 });

  const result = await runAutoWalker(repo, { dryRun: true, maxFeatures: 2 });

  assert.equal(result.plans.length, 2, "must cap at 2 plans");
  assert.equal(result.planned, 2);
});

// ---------------------------------------------------------------------------
// Test 4 — Stop-condition halt: escalated workflow → halts immediately
// ---------------------------------------------------------------------------

test("stop-condition halt: escalated crew workflow → halted=true, stopReason populated", async () => {
  const repo = await tmpRepo("aw-halt-");

  const a = await addFeature(repo, { title: "Safe feature" });
  await triageFeature(a.filePath, { autonomous_safe: true });

  // Seed escalation badge so checkStopConditions fires
  await writeCrewWorkflow(repo, {
    escalation: { status: "escalated", note: "human review required" }
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.halted, true, "halted must be true when stop condition fires");
  assert.ok(result.stopReason, "stopReason must be set when halted");
  assert.equal(typeof result.stopReason, "string");
});

// ---------------------------------------------------------------------------
// Test 5 — Empty backlog: returns zeroed-out result
// ---------------------------------------------------------------------------

test("empty backlog: returns walked=0, plans=[], halted=false", async () => {
  const repo = await tmpRepo("aw-empty-");

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.walked, 0, "walked must be 0 for empty backlog");
  assert.equal(result.planned, 0);
  assert.ok(Array.isArray(result.plans), "plans must be an array");
  assert.equal(result.plans.length, 0);
  assert.equal(result.halted, false);
  assert.equal(result.stopReason, null);
  assert.ok(Array.isArray(result.skipped));
  assert.equal(result.skipped.length, 0);
});

// ---------------------------------------------------------------------------
// SLICE-B Tests (5 new tests)
// ---------------------------------------------------------------------------

test("SLICE-B: autonomous_safe=false without risk factors → included with requiresPlanPreflight", async () => {
  const repo = await tmpRepo("aw-unsafe-");

  const entry = await addFeature(repo, { title: "Unsafe but viable feature" });
  await triageFeature(entry.filePath, {
    autonomous_safe: false,
    pm_risk_level: 0.3
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.planned, 1, "unsafe feature without risk factors must be planned");
  assert.equal(result.skipped.length, 0, "no items should be skipped");

  const plan = result.plans[0];
  assert.equal(plan.featureId, entry.id);
  assert.equal(plan.requiresPlanPreflight, true, "must set requiresPlanPreflight");
  assert.ok(!plan.riskGate, "low risk level should not set riskGate");
});

test("SLICE-B: deferred=true item → skipped with reason 'deferred'", async () => {
  const repo = await tmpRepo("aw-deferred-");

  const entry = await addFeature(repo, { title: "Deferred feature" });
  await triageFeature(entry.filePath, {
    autonomous_safe: false,
    deferred: true
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.planned, 0, "deferred feature must not be planned");
  assert.equal(result.skipped.length, 1, "deferred feature must be skipped");

  const skip = result.skipped[0];
  assert.equal(skip.id, entry.id);
  assert.equal(skip.reason, "deferred", "skip reason must be 'deferred'");
});

test("SLICE-B: depends_on with unfinished deps → skipped with deps listed", async () => {
  const repo = await tmpRepo("aw-deps-");

  const entry = await addFeature(repo, { title: "Feature with deps" });
  await triageFeature(entry.filePath, {
    autonomous_safe: false,
    depends_on: ["FEAT-999", "FEAT-888"]
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.planned, 0, "feature with unfinished deps must not be planned");
  assert.equal(result.skipped.length, 1);

  const skip = result.skipped[0];
  assert.equal(skip.id, entry.id);
  assert.ok(
    skip.reason.includes("depends_on"),
    "skip reason must mention depends_on"
  );
  assert.ok(
    skip.reason.includes("FEAT-999") && skip.reason.includes("FEAT-888"),
    "skip reason must list the dependencies"
  );
});

test("SLICE-B: pm_risk_level >= 0.7 → planned with riskGateWarn", async () => {
  const repo = await tmpRepo("aw-risk-");

  const entry = await addFeature(repo, { title: "High-risk feature" });
  await triageFeature(entry.filePath, {
    autonomous_safe: false,
    pm_risk_level: 0.8
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.planned, 1, "high-risk feature must be planned (warning only)");
  assert.equal(result.skipped.length, 0);

  const plan = result.plans[0];
  assert.ok(plan.riskGate, "riskGate must be set for high risk level");
  assert.equal(plan.riskGate.level, 0.8);
  assert.ok(
    plan.riskGate.warn.includes("pm_risk_level"),
    "warn message must mention pm_risk_level"
  );
  assert.ok(
    plan.riskGate.warn.includes("SPEC"),
    "warn message must mention SPEC"
  );
});

test("SLICE-B: writeAutoRunSummary creates artifact under auto-runs/", async () => {
  const repo = await tmpRepo("aw-summary-");

  const a = await addFeature(repo, { title: "Safe feature" });
  const b = await addFeature(repo, { title: "Unsafe feature" });

  await triageFeature(a.filePath, { autonomous_safe: true });
  await triageFeature(b.filePath, {
    autonomous_safe: false,
    pm_risk_level: 0.3
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.ok(result.summaryPath, "summaryPath must be set in result");
  assert.ok(
    result.summaryPath.includes("auto-runs"),
    "artifact must be under auto-runs/"
  );
  assert.ok(
    result.summaryPath.endsWith(".md"),
    "artifact must have .md extension"
  );

  // Verify file exists
  const content = await fs.readFile(result.summaryPath, "utf-8");
  assert.ok(content.includes("kind: auto-run-summary"), "file must have frontmatter");
  assert.ok(content.includes("# Auto-Run Summary"), "file must have heading");
  assert.ok(content.includes(`walked: ${result.walked}`), "file must list walked count");
  assert.ok(content.includes(`planned: ${result.planned}`), "file must list planned count");
});

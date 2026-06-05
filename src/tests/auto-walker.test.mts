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
async function triageFeature(filePath: string, extra: Record<string, any> = {}): Promise<string> {
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
  assert.ok(skip.reason.includes("depends_on"), "skip reason must mention depends_on");
  assert.ok(
    skip.reason.includes("FEAT-999") && skip.reason.includes("FEAT-888"),
    "skip reason must list the dependencies"
  );
  // AC-9: Both are missing from backlog, so reason will contain "(missing)" suffix
  assert.ok(skip.reason.includes("(missing)"), "missing dep ids get (missing) suffix");
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
  assert.ok(plan.riskGate.warn.includes("SPEC"), "warn message must mention SPEC");
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
  assert.ok(result.summaryPath.includes("auto-runs"), "artifact must be under auto-runs/");
  assert.ok(result.summaryPath.endsWith(".md"), "artifact must have .md extension");

  // Verify file exists
  const content = await fs.readFile(result.summaryPath, "utf-8");
  assert.ok(content.includes("kind: auto-run-summary"), "file must have frontmatter");
  assert.ok(content.includes("# Auto-Run Summary"), "file must have heading");
  assert.ok(content.includes(`walked: ${result.walked}`), "file must list walked count");
  assert.ok(content.includes(`planned: ${result.planned}`), "file must list planned count");
});

// ---------------------------------------------------------------------------
// SLICE-C Tests (4 new tests)
// ---------------------------------------------------------------------------

test("SLICE-C: costStopThreshold=1 → halts after 1 plan with cost_cap stopReason", async () => {
  const repo = await tmpRepo("aw-cost-cap-");

  const a = await addFeature(repo, { title: "Feature A" });
  const b = await addFeature(repo, { title: "Feature B" });
  const c = await addFeature(repo, { title: "Feature C" });

  await triageFeature(a.filePath, { autonomous_safe: true, composite_score: 0.9 });
  await triageFeature(b.filePath, { autonomous_safe: true, composite_score: 0.7 });
  await triageFeature(c.filePath, { autonomous_safe: true, composite_score: 0.5 });

  const result = await runAutoWalker(repo, {
    dryRun: true,
    costStopThreshold: 1
  });

  assert.equal(result.planned, 1, "must halt after 1 plan due to cost cap");
  assert.equal(result.halted, true, "halted must be true");
  assert.ok(result.stopReason, "stopReason must be set");
  assert.ok(
    result.stopReason.includes("cost_cap"),
    `stopReason must mention cost_cap, got: ${result.stopReason}`
  );
  assert.ok(
    result.stopReason.includes("costStopThreshold"),
    "stopReason must mention costStopThreshold"
  );
});

test("SLICE-C: result includes orchConfig with escalationThreshold and autoMode", async () => {
  const repo = await tmpRepo("aw-orchconfig-");

  const a = await addFeature(repo, { title: "Feature A" });
  await triageFeature(a.filePath, { autonomous_safe: true });

  const result = await runAutoWalker(repo, { dryRun: true, autoMode: true });

  assert.ok(result.orchConfig, "result must include orchConfig");
  assert.equal(result.orchConfig.escalationThreshold, 3, "escalationThreshold must be 3");
  assert.equal(result.orchConfig.autoMode, true, "autoMode must reflect the option passed");
  assert.ok(
    result.orchConfig.costStopThreshold === null ||
      typeof result.orchConfig.costStopThreshold === "number",
    "costStopThreshold must be null or a number"
  );
});

test("SLICE-C: autoMode=true → each plan includes autoMode=true", async () => {
  const repo = await tmpRepo("aw-automode-");

  const a = await addFeature(repo, { title: "Safe feature" });
  const b = await addFeature(repo, { title: "Unsafe feature" });

  await triageFeature(a.filePath, { autonomous_safe: true });
  await triageFeature(b.filePath, { autonomous_safe: false, pm_risk_level: 0.3 });

  const result = await runAutoWalker(repo, { dryRun: true, autoMode: true });

  assert.equal(result.plans.length, 2, "both plans must be returned");

  for (const plan of result.plans) {
    assert.equal(plan.autoMode, true, `plan ${plan.featureId} must have autoMode=true`);
  }
});

test("SLICE-C: config-provided costStopThreshold read from loop.json → applied", async () => {
  const repo = await tmpRepo("aw-config-cost-");

  // Overwrite loop.json with costStopThreshold in loop section
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations",
        costStopThreshold: 1
      },
      stack: {}
    })
  );

  const a = await addFeature(repo, { title: "Feature A" });
  const b = await addFeature(repo, { title: "Feature B" });

  await triageFeature(a.filePath, { autonomous_safe: true, composite_score: 0.9 });
  await triageFeature(b.filePath, { autonomous_safe: true, composite_score: 0.7 });

  // Import resolveConfig to pass it
  const { resolveConfig } = await import("../scripts/lib/config-resolver.mjs");
  const config = await resolveConfig(repo);

  const result = await runAutoWalker(repo, {
    dryRun: true,
    config
  });

  assert.equal(
    result.planned,
    1,
    "must halt after 1 plan due to config-provided costStopThreshold"
  );
  assert.equal(result.halted, true, "halted must be true");
  assert.ok(
    result.stopReason.includes("cost_cap"),
    `stopReason must mention cost_cap, got: ${result.stopReason}`
  );
  assert.equal(
    result.orchConfig.costStopThreshold,
    1,
    "orchConfig.costStopThreshold must reflect config value"
  );
});

// ---------------------------------------------------------------------------
// FEAT-042 Tests — composite_score out-of-range clamping
// ---------------------------------------------------------------------------

test("FEAT-042 AC-2: legacy score 6 clamps to 1.0 — equal to score 1.0, tiebreak by priority", async () => {
  const repo = await tmpRepo("aw-score-clamp-");

  // score 6 clamps to 1.0; score 1.0 stays 1.0 — they tie, priority wins
  const legacy = await addFeature(repo, { title: "Legacy scored P2" });
  const current = await addFeature(repo, { title: "Current scored P1" });

  await triageFeature(legacy.filePath, {
    autonomous_safe: true,
    composite_score: 6,
    priority: "P2"
  });
  await triageFeature(current.filePath, {
    autonomous_safe: true,
    composite_score: 1.0,
    priority: "P1"
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.plans.length, 2, "both plans must be returned");
  assert.equal(
    result.plans[0].featureId,
    current.id,
    "P1 (score 1.0) must beat P2 (score 6 clamped to 1.0) on priority tiebreak"
  );
});

test("FEAT-042 AC-3/AC-5: in-range scores 0.0-1.0 sort correctly unchanged", async () => {
  const repo = await tmpRepo("aw-score-inrange-");

  const low = await addFeature(repo, { title: "Low score" });
  const mid = await addFeature(repo, { title: "Mid score" });
  const high = await addFeature(repo, { title: "High score" });

  await triageFeature(low.filePath, { autonomous_safe: true, composite_score: 0.2 });
  await triageFeature(mid.filePath, { autonomous_safe: true, composite_score: 0.5 });
  await triageFeature(high.filePath, { autonomous_safe: true, composite_score: 0.9 });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.plans.length, 3);
  assert.equal(result.plans[0].featureId, high.id, "0.9 must be first");
  assert.equal(result.plans[1].featureId, mid.id, "0.5 must be second");
  assert.equal(result.plans[2].featureId, low.id, "0.2 must be third");
});

test("FEAT-042 AC-4: scores 1.1 and 1.0 both clamp to 1.0 → tiebreak by priority", async () => {
  const repo = await tmpRepo("aw-score-tiebreak-");

  const a = await addFeature(repo, { title: "Score 1.1 P2" });
  const b = await addFeature(repo, { title: "Score 1.0 P1" });

  await triageFeature(a.filePath, { autonomous_safe: true, composite_score: 1.1, priority: "P2" });
  await triageFeature(b.filePath, { autonomous_safe: true, composite_score: 1.0, priority: "P1" });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.plans.length, 2);
  assert.equal(result.plans[0].featureId, b.id, "P1 must win tiebreak after both clamp to 1.0");
});

// ---------------------------------------------------------------------------
// SLICE-41 / FEAT-040 Tests — shared pre-branch filter (deferred + depends_on)
// ---------------------------------------------------------------------------

test("FEAT-040 AC-7: autoSafe=true with all deps done → planned", async () => {
  const repo = await tmpRepo("aw-deps-done-");

  // Create a dep feature, triage it, then move it through in-progress to done
  const dep = await addFeature(repo, { title: "Dependency feature" });
  await triageFeature(dep.filePath, { autonomous_safe: true });

  const { listBacklog } = await import("../scripts/lib/backlog-parser.mjs");

  const triagedDep = (await listBacklog(repo)).find((e: any) => e.id === dep.id);
  await moveFeature(triagedDep.filePath, "in-progress", {});

  const inProgressDep = (await listBacklog(repo)).find((e: any) => e.id === dep.id);
  await moveFeature(inProgressDep.filePath, "done", {});

  // Create the feature with depends_on pointing to the done dep
  const feat = await addFeature(repo, { title: "Feature with satisfied dep" });
  await triageFeature(feat.filePath, {
    autonomous_safe: true,
    depends_on: [dep.id]
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  // The dep is in done/ → dep satisfied → feat should be planned
  const planned = result.plans.find((p: any) => p.featureId === feat.id);
  assert.ok(
    planned,
    `feature with all deps done must be planned, got skipped: ${JSON.stringify(result.skipped)}`
  );
});

test("FEAT-040 AC-8: autoSafe=true with dep in triaged → skipped with dep id", async () => {
  const repo = await tmpRepo("aw-deps-triaged-");

  const dep = await addFeature(repo, { title: "Unfinished dep" });
  await triageFeature(dep.filePath, { autonomous_safe: true });

  const feat = await addFeature(repo, { title: "Feature blocked by dep" });
  await triageFeature(feat.filePath, {
    autonomous_safe: true,
    depends_on: [dep.id]
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  const skip = result.skipped.find((s: any) => s.id === feat.id);
  assert.ok(skip, "feature with unfinished dep must be skipped");
  assert.ok(skip.reason.includes("depends_on"), "reason must mention depends_on");
  assert.ok(skip.reason.includes(dep.id), `reason must name the unsatisfied dep ${dep.id}`);
});

test("FEAT-040 AC-10: mixed dep states (done + missing) → skipped, lists only unsatisfied", async () => {
  const repo = await tmpRepo("aw-deps-mixed-");

  const { listBacklog } = await import("../scripts/lib/backlog-parser.mjs");

  // One dep that exists and is done
  const doneDep = await addFeature(repo, { title: "Done dep" });
  await triageFeature(doneDep.filePath, { autonomous_safe: true });

  const triagedDoneDep = (await listBacklog(repo)).find((e: any) => e.id === doneDep.id);
  await moveFeature(triagedDoneDep.filePath, "in-progress", {});

  const inProgressDoneDep = (await listBacklog(repo)).find((e: any) => e.id === doneDep.id);
  await moveFeature(inProgressDoneDep.filePath, "done", {});

  const feat = await addFeature(repo, { title: "Feature with mixed deps" });
  await triageFeature(feat.filePath, {
    autonomous_safe: true,
    depends_on: [doneDep.id, "FEAT-MISSING-999"]
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  const skip = result.skipped.find((s: any) => s.id === feat.id);
  assert.ok(skip, "feature must be skipped when any dep unsatisfied");
  assert.ok(skip.reason.includes("FEAT-MISSING-999"), "reason must list missing dep");
  assert.ok(!skip.reason.includes(doneDep.id), "reason must NOT list the satisfied dep");
});

test("FEAT-040 AC-15: autoSafe=true with deferred=true → skipped with reason 'deferred'", async () => {
  const repo = await tmpRepo("aw-deferred-safe-");

  const entry = await addFeature(repo, { title: "Deferred safe feature" });
  await triageFeature(entry.filePath, {
    autonomous_safe: true,
    deferred: true
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.planned, 0, "deferred autoSafe=true feature must not be planned");
  assert.equal(result.skipped.length, 1);
  const skip = result.skipped[0];
  assert.equal(skip.id, entry.id);
  assert.equal(skip.reason, "deferred");
});

test("FEAT-040 AC-16: autoSafe=false with deferred=true still skipped (regression guard)", async () => {
  const repo = await tmpRepo("aw-deferred-unsafe-");

  const entry = await addFeature(repo, { title: "Deferred unsafe feature" });
  await triageFeature(entry.filePath, {
    autonomous_safe: false,
    deferred: true
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(result.planned, 0, "deferred autoSafe=false feature must not be planned");
  assert.equal(result.skipped.length, 1);
  assert.equal(result.skipped[0].reason, "deferred");
});

test("FEAT-040 AC-12: auto-run summary lists deferred skip reason correctly", async () => {
  const repo = await tmpRepo("aw-summary-deferred-");

  const entry = await addFeature(repo, { title: "Deferred feature" });
  await triageFeature(entry.filePath, {
    autonomous_safe: true,
    deferred: true
  });

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.ok(result.summaryPath, "summaryPath must be set");
  const content = await fs.readFile(result.summaryPath, "utf-8");
  assert.ok(content.includes("deferred"), "summary must include 'deferred' skip reason");
  assert.ok(content.includes(entry.id), "summary must include the skipped feature id");
});

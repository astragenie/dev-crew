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
// Test 1 — Happy path: only autonomous_safe=true FEATs are planned
// ---------------------------------------------------------------------------

test("happy path: 3 triaged FEATs, only 1 autonomous_safe=true → 1 plan, 2 skipped", async () => {
  const repo = await tmpRepo("aw-happy-");

  const a = await addFeature(repo, { title: "Safe feature" });
  const b = await addFeature(repo, { title: "Unsafe feature 1" });
  const c = await addFeature(repo, { title: "Unsafe feature 2" });

  await triageFeature(a.filePath, { autonomous_safe: true });
  await triageFeature(b.filePath, { autonomous_safe: false });
  await triageFeature(c.filePath); // no autonomous_safe key → treated as false

  const result = await runAutoWalker(repo, { dryRun: true });

  assert.equal(typeof result, "object", "result must be an object");
  assert.equal(result.walked, 3, "walked must equal total triaged count");
  assert.equal(result.planned, 1, "only 1 plan expected");
  assert.equal(result.skipped.length, 2, "2 FEATs must be skipped");
  assert.ok(Array.isArray(result.plans), "plans must be an array");
  assert.equal(result.plans.length, 1);

  // Verify skip reasons
  for (const skip of result.skipped) {
    assert.equal(
      skip.reason,
      "not_autonomous_safe",
      `skip.reason must be 'not_autonomous_safe', got: ${skip.reason}`
    );
  }

  // Verify plan shape
  const plan = result.plans[0];
  assert.ok(plan.featureId, "plan must have featureId");
  assert.ok(plan.suggestedSliceTitle, "plan must have suggestedSliceTitle");
  assert.ok(plan.fromFeatureCmd, "plan must have fromFeatureCmd");
  assert.ok(plan.startCmd, "plan must have startCmd");
  assert.ok(plan.builderPrompt, "plan must have builderPrompt");

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

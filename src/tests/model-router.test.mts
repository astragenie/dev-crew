import test from "node:test";
import assert from "node:assert/strict";
import { resolveModel, MODEL_PHASES } from "../scripts/lib/model-router.mjs";
import { buildDispatchInstruction } from "../scripts/lib/slice-linker.mjs";

test("resolveModel returns phase-specific model when configured", () => {
  const config = { loop: { modelRouting: { default: "sonnet", review: "opus" } } };
  assert.equal(resolveModel("review", config), "opus");
});

test("resolveModel falls back to default when phase not configured", () => {
  const config = { loop: { modelRouting: { default: "sonnet" } } };
  assert.equal(resolveModel("build", config), "sonnet");
});

test("resolveModel returns opus when no modelRouting configured", () => {
  assert.equal(resolveModel("build", {}), "opus");
  assert.equal(resolveModel("build", null), "opus");
});

test("MODEL_PHASES lists all routable phases", () => {
  assert.ok(MODEL_PHASES.includes("build"));
  assert.ok(MODEL_PHASES.includes("review"));
  assert.ok(MODEL_PHASES.includes("sliceStart"));
});

test("buildDispatchInstruction does not contain model hint (Agent tool model param is ignored)", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-01",
    title: "Test slice",
    sliceFile: null,
    repoPath: "/tmp/repo",
    resolvedGoal: "Test goal"
  });
  assert.ok(!result.includes("Preferred model"), "dispatch must not contain misleading model hint");
});

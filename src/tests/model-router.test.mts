import test from "node:test";
import assert from "node:assert/strict";
import {
  resolveModel,
  resolveOrchestratorModel,
  MODEL_PHASES,
  resolveArchitectModels
} from "../scripts/lib/model-router.mjs";
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
  assert.ok(MODEL_PHASES.includes("architect"));
});

test("resolveOrchestratorModel returns configured model string", () => {
  const config = { loop: { orchestratorModel: "sonnet" } };
  assert.equal(resolveOrchestratorModel(config), "sonnet");
});

test("resolveOrchestratorModel returns null when key is absent", () => {
  assert.equal(resolveOrchestratorModel({ loop: {} }), null);
  assert.equal(resolveOrchestratorModel({}), null);
  assert.equal(resolveOrchestratorModel(null), null);
});

test("resolveArchitectModels with no config returns both models as opus", () => {
  const models = resolveArchitectModels({});
  assert.equal(models.architectModel, "opus");
  assert.equal(models.editorModel, "opus");
});

test("resolveArchitectModels with explicit routing returns correct split", () => {
  const config = { loop: { modelRouting: { architect: "opus", build: "sonnet" } } };
  const models = resolveArchitectModels(config);
  assert.equal(models.architectModel, "opus");
  assert.equal(models.editorModel, "sonnet");
});

test("resolveArchitectModels uses default when architect not explicitly configured", () => {
  const config = { loop: { modelRouting: { default: "sonnet" } } };
  const models = resolveArchitectModels(config);
  // When architect is not explicitly set, resolveModel("architect") falls back to default="sonnet"
  assert.equal(models.architectModel, "sonnet");
  assert.equal(models.editorModel, "sonnet");
});

test("resolveArchitectModels explicitly routes architect to opus when configured", () => {
  const config = { loop: { modelRouting: { default: "sonnet", architect: "opus" } } };
  const models = resolveArchitectModels(config);
  assert.equal(models.architectModel, "opus", "architect should use explicit architect key");
  assert.equal(models.editorModel, "sonnet");
});

test("resolveArchitectModels with only build configured returns opus architect, sonnet editor", () => {
  const config = { loop: { modelRouting: { build: "sonnet" } } };
  const models = resolveArchitectModels(config);
  assert.equal(models.architectModel, "opus");
  assert.equal(models.editorModel, "sonnet");
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

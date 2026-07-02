import { test } from "bun:test";
import assert from "node:assert/strict";
import {
  resolveModel,
  resolveOrchestratorModel,
  MODEL_PHASES,
  resolveArchitectModels,
  resolveShapeTier,
  resolveWaveDispatchModel,
  SHAPE_TIER_MAP
} from "../scripts/lib/model-router.mjs";
import { buildDispatchInstruction } from "../scripts/lib/slice-linker.mjs";
import { buildDispatchPrompt } from "../scripts/lib/wave/dispatch-prompt.mjs";
import { classifySliceShape } from "../scripts/lib/classify-slice-shape.mjs";

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

// ---------------------------------------------------------------------------
// FEAT-205: slice-shape-aware model tier routing
// ---------------------------------------------------------------------------

test("SHAPE_TIER_MAP routes every trivial shape to sonnet and 'none' to null", () => {
  assert.equal(SHAPE_TIER_MAP["doc-update"], "sonnet");
  assert.equal(SHAPE_TIER_MAP["config-tweak"], "sonnet");
  assert.equal(SHAPE_TIER_MAP["test-only"], "sonnet");
  assert.equal(SHAPE_TIER_MAP["single-module-edit"], "sonnet");
  assert.equal(SHAPE_TIER_MAP.none, null);
});

test("resolveShapeTier returns the mid tier for a trivial shape with no config", () => {
  assert.equal(resolveShapeTier("doc-update", null), "sonnet");
});

test("resolveShapeTier returns null for 'none' shape (caller falls through)", () => {
  assert.equal(resolveShapeTier("none", null), null);
  assert.equal(resolveShapeTier("unknown-shape", null), null);
});

test("resolveShapeTier honors loop.modelRouting.byShape override", () => {
  const config = { loop: { modelRouting: { byShape: { "doc-update": "haiku" } } } };
  assert.equal(resolveShapeTier("doc-update", config), "haiku");
});

test("resolveWaveDispatchModel uses the shape tier when one applies", () => {
  const config = { loop: { modelRouting: { default: "sonnet", build: "opus" } } };
  assert.equal(resolveWaveDispatchModel("doc-update", config), "sonnet");
});

test("resolveWaveDispatchModel falls through to phase-based 'build' routing for 'none' shape", () => {
  const config = { loop: { modelRouting: { build: "sonnet" } } };
  assert.equal(resolveWaveDispatchModel("none", config), "sonnet");
});

test("resolveWaveDispatchModel falls back to opus when no config exists at all", () => {
  assert.equal(resolveWaveDispatchModel("none", null), "opus");
});

test("FEAT-205 regression: a docs-shaped slice fixture produces a dispatch with no opus routing", () => {
  const { shape } = classifySliceShape({
    files: [{ path: "docs/guide.md", added: 10, removed: 0 }]
  });
  assert.equal(shape, "doc-update");

  // No loop.json at all — still must not fall back to opus for a trivial shape.
  const model = resolveWaveDispatchModel(shape, null);
  assert.equal(model, "sonnet");
  assert.notEqual(model, "opus");

  const prompt = buildDispatchPrompt({
    sliceId: "SLICE-DOC-1",
    worktreePath: "/tmp/wt/SLICE-DOC-1",
    sliceCommand: "/crew:orchestrate-slice",
    mode: "normal"
  });
  assert.ok(
    !prompt.toLowerCase().includes("opus"),
    "wave dispatch prompt text must never carry a model hint — model is a structured field"
  );
});

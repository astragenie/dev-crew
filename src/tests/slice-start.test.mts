// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { startSlice, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { recordGradeScore } from "../scripts/lib/grade-trend.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
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

// Replace the template placeholder AC-2 so startSlice's AC linter passes.
// Used by tests that exercise startSlice behavior, not AC validation itself.
async function fillPlaceholderACs(slicePath) {
  const content = await fs.readFile(slicePath, "utf8");
  const fixed = content.replace(
    /- \[ \] AC-2: <replace with a concrete, testable acceptance criterion>/g,
    "- [ ] AC-2: Feature behaves as expected per the slice objective"
  );
  await fs.writeFile(slicePath, fixed);
}

async function pinOrchestratorMode(repo, mode) {
  const configPath = path.join(repo, ".claude/loop.json");
  const config = JSON.parse(await fs.readFile(configPath, "utf8"));
  config.loop.orchestratorMode = mode;
  await fs.writeFile(configPath, JSON.stringify(config));
}

async function writePlan(repo, slices) {
  const lines = ["# Plan", ""];
  slices.forEach((s, i) => {
    lines.push(`## Task ${i + 1}: ${s.id.replace("-", "_")} — ${s.title}`);
  });
  const planPath = path.join(repo, "docs/superpowers/plans/plan.md");
  await fs.mkdir(path.dirname(planPath), { recursive: true });
  await fs.writeFile(planPath, lines.join("\n"));
  return planPath;
}

test("startSlice refreshes slice-progress and includes plan-derived title", async () => {
  const repo = await tmpRepo("al-slice-start-");
  await writePlan(repo, [
    { id: "SLICE-01", title: "First" },
    { id: "SLICE-02", title: "Second" }
  ]);
  const feat = await addFeature(repo, { title: "Test feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  const result = await startSlice(repo, slice.id);
  // sliceFromFeature allocates SLICE-01 (the first id under slicesRoot),
  // matching our plan's first task.
  assert.equal(result.slice.id, slice.id);
  // Title from plan if it matches; otherwise just the sliceId.
  assert.ok(result.slice.title.includes(slice.id));

  // slice-progress dashboard is written.
  const dashboard = path.join(repo, ".claude/state/crew/slice-progress.md");
  const stat = await fs.stat(dashboard);
  assert.ok(stat.isFile());
  const text = await fs.readFile(dashboard, "utf8");
  assert.match(text, new RegExp(`${slice.id}.*IN_PROGRESS`));
});

test("startSlice tolerates missing plan and missing slice file", async () => {
  const repo = await tmpRepo("al-slice-start-missing-");
  const result = await startSlice(repo, "SLICE-42");
  assert.equal(result.slice.id, "SLICE-42");
  assert.equal(result.slice.title, "SLICE-42");
  // best-effort dashboard write succeeds even with no plan.
  assert.ok(result.sliceProgress && !result.sliceProgress.error);
});

test("startSlice emits 'Dispatch crew:lead subagent' instruction by default", async () => {
  const repo = await tmpRepo("al-slice-start-dispatch-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Test feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  // Default orchestratorMode = "lead" — no config override needed.
  const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.9.0" });
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present by default");
  assert.match(result.dispatchInstruction, /Dispatch crew:lead subagent/);
  assert.match(result.dispatchInstruction, new RegExp(slice.id));
  assert.match(result.dispatchInstruction, /Orchestrate /);
  assert.match(result.nextAction, /Dispatch crew:lead subagent/);
});

test("SLICE-93 AC-4: lead dispatch instruction contains slice post-builder-fanout invocation", async () => {
  const repo = await tmpRepo("al-slice-start-fanout-ref-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Fanout ref feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  // orchestratorMode defaults to "lead".
  const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.9.0" });
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present");
  assert.match(
    result.dispatchInstruction,
    /slice post-builder-fanout/,
    "dispatchInstruction must reference slice post-builder-fanout"
  );
});

test("startSlice with orchestratorMode='direct-builder' emits legacy crew:fullstack-dev instruction", async () => {
  const repo = await tmpRepo("al-slice-start-direct-builder-");
  await pinOrchestratorMode(repo, "direct-builder");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Direct builder feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.9.0" });
  assert.match(result.dispatchInstruction, /Dispatch crew:fullstack-dev subagent/);
  assert.match(result.dispatchInstruction, /parent loop drives those gates/);
  assert.match(result.nextAction, /Dispatch crew:fullstack-dev subagent/);
});

test("FEAT-047 AC-1: slice-start emits orchestrate-slice when orchestratorMode='orchestrate-slice'", async () => {
  const repo = await tmpRepo("al-slice-start-orchestrate-");
  await pinOrchestratorMode(repo, "orchestrate-slice");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Orchestrate feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.11.0" });
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present");
  assert.match(
    result.dispatchInstruction,
    /\/crew:orchestrate-slice/,
    "instruction must reference /crew:orchestrate-slice"
  );
  assert.match(result.dispatchInstruction, new RegExp(slice.id));
  assert.match(
    result.nextAction,
    /\/crew:orchestrate-slice/,
    "nextAction must reference /crew:orchestrate-slice"
  );
});

test("FEAT-047 AC-3: direct-builder mode falls back to crew:fullstack-dev regardless of crew version", async () => {
  const repo = await tmpRepo("al-slice-start-fallback-");
  await pinOrchestratorMode(repo, "direct-builder");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Fallback feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.9.9" });
  assert.match(result.dispatchInstruction, /Dispatch crew:fullstack-dev subagent/);
  assert.match(result.nextAction, /Dispatch crew:fullstack-dev subagent/);
});

test("FEAT-047 AC-3: direct-builder mode under crew 0.10.x emits builder instruction", async () => {
  const repo = await tmpRepo("al-slice-start-fallback-010-");
  await pinOrchestratorMode(repo, "direct-builder");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Fallback 010" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.10.9" });
  assert.match(result.dispatchInstruction, /Dispatch crew:fullstack-dev subagent/);
  assert.match(result.nextAction, /Dispatch crew:fullstack-dev subagent/);
});

test("dispatchInstruction includes [MODE] + [CHECKPOINT] progress signals (FEAT-038)", async () => {
  const repo = await tmpRepo("al-slice-start-progress-signals-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Visibility feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  // Use legacy crew version so the instruction contains the builder prompt body with progress signals.
  const result = await startSlice(repo, slice.id, { _crewVersionOverride: "0.9.0" });
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present");
  // Header for the new block
  assert.match(
    result.dispatchInstruction,
    /## Progress signals/,
    "progress signals section header missing"
  );
  // Mode tag with all three permitted values listed
  assert.match(
    result.dispatchInstruction,
    /\[MODE\] <single-session\|assisted-single-session\|team-run>/,
    "MODE tag spec missing or malformed"
  );
  // Checkpoint tag with status enum + AC marker
  assert.match(
    result.dispatchInstruction,
    /\[CHECKPOINT\] AC-<N>: <pass\|fail\|skip>/,
    "CHECKPOINT tag spec missing or malformed"
  );
});

test("startSlice with dispatch:false omits the instruction", async () => {
  const repo = await tmpRepo("al-slice-start-nodispatch-");
  const feat = await addFeature(repo, { title: "Manual" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { dispatch: false });
  assert.equal(result.dispatchInstruction, null);
  assert.match(result.nextAction, /Begin acceptance-criteria work/);
});

test("completeSlice also refreshes slice-progress", async () => {
  const repo = await tmpRepo("al-slice-progress-on-complete-");
  await writePlan(repo, [{ id: "SLICE-01", title: "Only one" }]);
  const feat = await addFeature(repo, { title: "Done feature" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  assert.ok(result.sliceProgress && !result.sliceProgress.error);
  const dashboard = path.join(repo, ".claude/state/crew/slice-progress.md");
  const text = await fs.readFile(dashboard, "utf8");
  assert.match(text, /Slice Progress/);
});

// --- AC linter gate tests ---

test("startSlice throws when slice has placeholder ACs", async () => {
  const repo = await tmpRepo("al-slice-ac-gate-");
  const feat = await addFeature(repo, { title: "AC gate" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // slice has AC-2: <replace ...> — do NOT patch → linter must reject
  await assert.rejects(
    () => startSlice(repo, slice.id),
    (err) => {
      assert.match(err.message, /AC linter failed/);
      assert.match(err.message, /placeholder/i);
      return true;
    }
  );
});

test("startSlice accepts slice with all concrete ACs", async () => {
  const repo = await tmpRepo("al-slice-ac-pass-");
  const feat = await addFeature(repo, { title: "Concrete ACs" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { dispatch: false });
  assert.equal(result.slice.id, slice.id);
});

// --- Ladder gate test ---

test("startSlice throws when grade trend signals quality stop", async () => {
  const repo = await tmpRepo("al-slice-ladder-gate-");
  const feat = await addFeature(repo, { title: "Ladder gate" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  // Record 2 consecutive below-threshold scores (default limit = 2)
  await recordGradeScore(repo, { sliceId: "SLICE-00", avg: 0.5 });
  await recordGradeScore(repo, { sliceId: "SLICE-00b", avg: 0.55 });
  const config = { loop: { gradeTrendConsecutiveLimit: 2, gradeTrendThreshold: 0.65 } };
  await assert.rejects(
    () => startSlice(repo, slice.id, { config }),
    (err) => {
      assert.match(err.message, /Ladder gate/);
      return true;
    }
  );
});

// --- Marathon milestone test ---

test("startSlice returns marathonMilestone when all window scores above threshold", async () => {
  const repo = await tmpRepo("al-slice-marathon-");
  const feat = await addFeature(repo, { title: "Marathon" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  await recordGradeScore(repo, { sliceId: "SLICE-00", avg: 0.9 });
  await recordGradeScore(repo, { sliceId: "SLICE-00b", avg: 0.85 });
  await recordGradeScore(repo, { sliceId: "SLICE-00c", avg: 0.8 });
  const result = await startSlice(repo, slice.id, { dispatch: false });
  assert.ok(result.marathonMilestone !== null, "marathonMilestone should be set");
  assert.equal(result.marathonMilestone.milestone, true);
});

// --- Orchestrator model gate tests ---

test("startSlice returns orchestratorModel from config when set", async () => {
  const repo = await tmpRepo("al-slice-orch-model-");
  const feat = await addFeature(repo, { title: "Model gate" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const config = { loop: { orchestratorModel: "sonnet" } };
  const result = await startSlice(repo, slice.id, { dispatch: false, config });
  assert.equal(result.orchestratorModel, "sonnet");
});

test("startSlice returns orchestratorModel null when not configured", async () => {
  const repo = await tmpRepo("al-slice-orch-model-null-");
  const feat = await addFeature(repo, { title: "No model gate" });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const config = { loop: {} };
  const result = await startSlice(repo, slice.id, { dispatch: false, config });
  assert.equal(result.orchestratorModel, null);
});

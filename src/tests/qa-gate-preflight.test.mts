// Tests for qa-gate-preflight.mts — FEAT-264 SLICE-3 (AC-3, #527).
//
// Covers: needsQaGatePreflight gating, buildDispatchInstruction wiring
// (appears/absent/stacks-with-architect), the AC-2/AC-6 byte-identical
// regression (mode absent/off/post-build must not change ceremony output),
// <task-scoped> marker balance, and the qa_gate_artifact_written ordering
// fixture (AC-3's evidence bar).

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { buildDispatchInstruction } from "../scripts/lib/slice-linker.mjs";
import {
  needsQaGatePreflight,
  buildQaGatePreflight,
  emitQaGateArtifactWritten
} from "../scripts/lib/slice-linker/qa-gate-preflight.mjs";
import { checkMarkerBalance } from "../scripts/validate-dispatch-markers.mjs";
import { appendSliceEvent, eventsPath } from "../scripts/lib/slice-events.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeTestPlanArtifact(repo: string, filename: string, kind = "test-plan") {
  const dir = path.join(repo, ".claude", "artifacts", "crew", "validations");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), `---\nkind: ${kind}\n---\n# plan\n`);
}

const PRE_BUILD_CONFIG = { loop: { qa_gate: "pre-build" } };

// ---------------------------------------------------------------------------
// needsQaGatePreflight
// ---------------------------------------------------------------------------

test("needsQaGatePreflight: true when pre-build + no artifact", async () => {
  const repo = await tmpRepo("qgp-need-true-");
  assert.equal(needsQaGatePreflight(null, repo, "SLICE-01", PRE_BUILD_CONFIG), true);
});

for (const config of [
  null,
  {},
  { loop: {} },
  { loop: { qa_gate: "off" } },
  { loop: { qa_gate: "post-build" } }
]) {
  test(`needsQaGatePreflight: false for config ${JSON.stringify(config)}`, async () => {
    const repo = await tmpRepo("qgp-need-false-");
    assert.equal(needsQaGatePreflight(null, repo, "SLICE-01", config as any), false);
  });
}

test("needsQaGatePreflight: false when a kind:test-plan artifact already exists (dir scan)", async () => {
  const repo = await tmpRepo("qgp-existing-");
  await writeTestPlanArtifact(repo, "20260718T000000Z-test-plan-slice-01.md");
  assert.equal(needsQaGatePreflight(null, repo, "SLICE-01", PRE_BUILD_CONFIG), false);
});

test("needsQaGatePreflight: true when a matching artifact exists but is NOT kind:test-plan", async () => {
  const repo = await tmpRepo("qgp-wrongkind-");
  await writeTestPlanArtifact(repo, "20260718T000000Z-validation-slice-01.md", "validation-result");
  assert.equal(needsQaGatePreflight(null, repo, "SLICE-01", PRE_BUILD_CONFIG), true);
});

test("needsQaGatePreflight: false when slice frontmatter records an existing qa_gate_artifact", async () => {
  const repo = await tmpRepo("qgp-recorded-");
  const artifactRel = ".claude/artifacts/crew/validations/plan.md";
  await writeTestPlanArtifact(repo, "plan.md");
  const sliceContent = `---\nqa_gate_artifact: ${artifactRel}\n---\n# Slice\n`;
  assert.equal(needsQaGatePreflight(sliceContent, repo, "SLICE-99", PRE_BUILD_CONFIG), false);
});

test("needsQaGatePreflight: recorded qa_gate_artifact pointing at a missing file does not short-circuit", async () => {
  const repo = await tmpRepo("qgp-recorded-missing-");
  const sliceContent = `---\nqa_gate_artifact: .claude/artifacts/crew/validations/missing.md\n---\n# Slice\n`;
  assert.equal(needsQaGatePreflight(sliceContent, repo, "SLICE-99", PRE_BUILD_CONFIG), true);
});

// ---------------------------------------------------------------------------
// buildDispatchInstruction wiring
// ---------------------------------------------------------------------------

test("buildDispatchInstruction: QA GATE PRE-FLIGHT appears when qa_gate=pre-build + no artifact", async () => {
  const repo = await tmpRepo("qgp-dispatch-appears-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-QG-1",
    title: "QA gate slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [surface:api]\n---\n# Slice\n",
    loopConfig: PRE_BUILD_CONFIG
  });
  assert.match(out, /QA GATE PRE-FLIGHT/);
  assert.ok(out.includes("crew:qa-expert"), "must dispatch crew:qa-expert");
  assert.ok(out.includes("crew:test-automator"), "must dispatch crew:test-automator next");
  assert.ok(out.includes("Dispatch crew:backend-dev"), "builder dispatch still embedded below");
});

for (const [label, config] of [
  ["absent", null],
  ["off", { loop: { qa_gate: "off" } }],
  ["post-build", { loop: { qa_gate: "post-build" } }]
] as const) {
  test(`buildDispatchInstruction: QA GATE PRE-FLIGHT absent when qa_gate is ${label} (AC-2/AC-6 regression)`, async () => {
    const repo = await tmpRepo(`qgp-dispatch-absent-${label}-`);
    const args = {
      sliceId: "SLICE-QG-2",
      title: "QA gate slice",
      sliceFile: null,
      repoPath: repo,
      resolvedGoal: null,
      orchestratorMode: "slice-build" as const,
      sliceContent: "---\ntags: [surface:api]\n---\n# Slice\n"
    };
    const out = buildDispatchInstruction({ ...args, loopConfig: config as any });
    const baseline = buildDispatchInstruction(args); // no loopConfig at all — pre-FEAT-264 shape
    assert.ok(!out.includes("QA GATE PRE-FLIGHT"));
    assert.equal(out, baseline, "ceremony output must be byte-identical to pre-FEAT-264 behavior");
  });
}

test("buildDispatchInstruction: QA GATE PRE-FLIGHT absent when a test-plan artifact already exists", async () => {
  const repo = await tmpRepo("qgp-dispatch-existing-");
  await writeTestPlanArtifact(repo, "20260718T000000Z-test-plan-slice-qg-3.md");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-QG-3",
    title: "QA gate slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\ntags: [surface:api]\n---\n# Slice\n",
    loopConfig: PRE_BUILD_CONFIG
  });
  assert.ok(!out.includes("QA GATE PRE-FLIGHT"));
});

test("buildDispatchInstruction: QA gate stacks AFTER the architect pre-flight", async () => {
  const repo = await tmpRepo("qgp-dispatch-stacks-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-QG-4",
    title: "QA gate slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\nneeds_contract: true\ntags: [surface:api]\n---\n# Slice\n",
    loopConfig: PRE_BUILD_CONFIG
  });
  assert.match(out, /^ARCHITECT PRE-FLIGHT/);
  const architectIdx = out.indexOf("ARCHITECT PRE-FLIGHT");
  const qaIdx = out.indexOf("QA GATE PRE-FLIGHT");
  const builderIdx = out.indexOf("Dispatch crew:backend-dev");
  assert.ok(
    architectIdx >= 0 && qaIdx > architectIdx,
    "QA gate block must follow the architect block"
  );
  assert.ok(builderIdx > qaIdx, "builder dispatch must follow both pre-flights");
});

test("buildDispatchInstruction: orchestrate-slice mode ignores qa_gate — no pre-flight (in-thread slash flow)", async () => {
  const repo = await tmpRepo("qgp-dispatch-orchestrate-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-QG-5",
    title: "QA gate slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "orchestrate-slice",
    sliceContent: "---\ntags: [surface:api]\n---\n# Slice\n",
    loopConfig: PRE_BUILD_CONFIG
  });
  assert.ok(!out.includes("QA GATE PRE-FLIGHT"));
});

// ---------------------------------------------------------------------------
// <task-scoped> marker balance
// ---------------------------------------------------------------------------

test("buildQaGatePreflight: <task-scoped> markers are balanced and keywords confined", () => {
  const block = buildQaGatePreflight("SLICE-QG-6", "QA gate slice", "path/to/FEAT-264.md");
  const { ok, errors } = checkMarkerBalance("buildQaGatePreflight", block);
  assert.ok(ok, errors.join("\n"));
});

test("buildDispatchInstruction (stacked architect + qa gate): markers stay balanced end-to-end", async () => {
  const repo = await tmpRepo("qgp-marker-e2e-");
  const out = buildDispatchInstruction({
    sliceId: "SLICE-QG-7",
    title: "QA gate slice",
    sliceFile: null,
    repoPath: repo,
    resolvedGoal: null,
    orchestratorMode: "slice-build",
    sliceContent: "---\nneeds_contract: true\ntags: [surface:api]\n---\n# Slice\n",
    loopConfig: PRE_BUILD_CONFIG
  });
  const { ok, errors } = checkMarkerBalance("buildDispatchInstruction (stacked)", out);
  assert.ok(ok, errors.join("\n"));
});

// ---------------------------------------------------------------------------
// qa_gate_artifact_written ordering fixture (AC-3 evidence)
// ---------------------------------------------------------------------------

test("ordering fixture: qa_gate_artifact_written timestamp precedes workflow_state_changed:building", async () => {
  const repo = await tmpRepo("qgp-ordering-");
  const sliceId = "SLICE-QG-8";

  await emitQaGateArtifactWritten(repo, sliceId, {
    featureId: "FEAT-264",
    artifactPath: ".claude/artifacts/crew/validations/20260718T000000Z-test-plan-slice-qg-8.md",
    timestamp: "2026-07-18T00:00:00.000Z"
  });
  await appendSliceEvent(repo, sliceId, {
    type: "workflow_state_changed",
    sliceId,
    featureId: "FEAT-264",
    timestamp: "2026-07-18T00:00:05.000Z",
    from: null,
    to: "building"
  });

  const raw = await fs.readFile(eventsPath(repo, sliceId), "utf8");
  const lines = raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l));
  assert.equal(lines.length, 2);

  const writeEvent = lines.find((e) => e.type === "qa_gate_artifact_written");
  const buildingEvent = lines.find(
    (e) => e.type === "workflow_state_changed" && e.to === "building"
  );
  assert.ok(writeEvent, "qa_gate_artifact_written event must be recorded");
  assert.ok(buildingEvent, "workflow_state_changed:building event must be recorded");
  assert.ok(
    new Date(writeEvent.timestamp).getTime() < new Date(buildingEvent.timestamp).getTime(),
    "test-plan-write timestamp must precede the building-transition timestamp"
  );
});

// ---------------------------------------------------------------------------
// SLICE-4 (AC-4): red/green sequence + goalpost-lock
// ---------------------------------------------------------------------------

test("buildQaGatePreflight: builder segment carries a FORBIDDEN order against editing the test-plan artifact", () => {
  const block = buildQaGatePreflight("SLICE-QG-9", "QA gate slice", "path/to/FEAT-264.md");
  assert.match(block, /FORBIDDEN:.*qa_gate_artifact/s);
  assert.match(block, /make them pass \(green\)/);
  assert.match(block, /crew:test-automator/);
  assert.match(block, /red-first/i);
});

test("buildQaGatePreflight: builder FORBIDDEN order lives inside its own <task-scoped> region", () => {
  const block = buildQaGatePreflight("SLICE-QG-10", "QA gate slice", null);
  const { ok, errors } = checkMarkerBalance("buildQaGatePreflight (builder segment)", block);
  assert.ok(ok, errors.join("\n"));
  // Two sequential (non-nested) <task-scoped> regions: the qa-expert
  // allowlist orders, then the builder goalpost-lock FORBIDDEN.
  const openCount = block.split("<task-scoped>").length - 1;
  const closeCount = block.split("</task-scoped>").length - 1;
  assert.equal(openCount, 2, "two sequential task-scoped regions expected");
  assert.equal(closeCount, 2);
});

test("emitQaGateArtifactWritten: writes an artifact lock for the test-plan path (dev-team#262 wire contract)", async () => {
  const repo = await tmpRepo("qgp-lock-emit-");
  const sliceId = "SLICE-QG-11";
  const artifactPath =
    ".claude/artifacts/crew/validations/20260718T000000Z-test-plan-slice-qg-11.md";

  await emitQaGateArtifactWritten(repo, sliceId, {
    featureId: "FEAT-264",
    artifactPath
  });

  const lockPath = path.join(repo, ".claude", "state", "loop", "artifact-locks", `${sliceId}.json`);
  const raw = await fs.readFile(lockPath, "utf8");
  const lock = JSON.parse(raw);
  assert.equal(lock.sliceId, sliceId);
  assert.deepEqual(lock.lockedPaths, [artifactPath]);
  assert.equal(lock.lockedBy, "qa-gate");
  assert.ok(!Number.isNaN(Date.parse(lock.createdAt)));
  assert.ok(!Number.isNaN(Date.parse(lock.expiresAt)));
});

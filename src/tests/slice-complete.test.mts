// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCb, execSync } from "node:child_process";
import { promisify } from "node:util";
import { test, afterAll } from "bun:test";
import assert from "node:assert/strict";

import { sliceFromFeature, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature, findFeatureById } from "../scripts/lib/backlog-writer.mjs";
import { addSpec, updateSpecFrontmatter, findSpecById } from "../scripts/lib/spec-parser.mjs";
import { decomposeSpec } from "../scripts/lib/spec-decomposer.mjs";
import { listBacklog } from "../scripts/lib/backlog-parser.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { writeFeatureEndCeremony, featureEnd } from "../scripts/lib/ceremonies.mjs";
import { AC_SECTION_BODY, isolateCrewCli } from "./_fixtures.mjs";

isolateCrewCli();

function execFile(file, args, opts) {
  return promisify(execFileCb)(file, args, { timeout: 10000, ...opts });
}

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  // Initialize git so discovery doesn't traverse the entire temp path on Windows
  await execFile("git", ["init", "-b", "main"], { cwd: repo });
  await execFile("git", ["config", "user.email", "test@test.com"], { cwd: repo });
  await execFile("git", ["config", "user.name", "Test"], { cwd: repo });
  await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: repo });
  await execFile("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });
  return repo;
}

afterAll(() => {
  try {
    execSync("git worktree prune 2>/dev/null || true", {
      timeout: 5000,
      shell: true
    });
  } catch {
    /* worktree prune is best-effort cleanup; ignore failures */
  }
});

test("completeSlice moves slice to completed/ and feature to done/", async () => {
  const repo = await tmpRepo("al-slice-complete-");
  const feat = await addFeature(repo, { title: "Test work", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Slice moved
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  const sliceContent = await fs.readFile(result.slice.to, "utf8");
  const { frontmatter: sliceFm } = parseFrontmatter(sliceContent);
  assert.equal(sliceFm.status, "completed");
  assert.ok(sliceFm.completed_at);
  // Feature moved + completed_at stamped
  assert.equal(result.feature.id, feat.id);
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  const featContent = await fs.readFile(result.feature.to, "utf8");
  const { frontmatter: featFm } = parseFrontmatter(featContent);
  assert.equal(featFm.status, "done");
  assert.ok(featFm.completed_at);
});

test("completeSlice auto-rolls parent spec to satisfied when all features done", async () => {
  const repo = await tmpRepo("al-slice-complete-spec-");
  const spec = await addSpec(repo, { type: "prd", title: "Parent PRD" });
  await updateSpecFrontmatter(spec.filePath, { status: "approved" });
  await decomposeSpec(repo, spec.id, ["Single feature"]);
  const [feat] = await listBacklog(repo);
  // decomposeSpec-derived FEATs carry no ACs; seed one so the scaffold gate
  // (placeholder AC auto-generation was removed) is satisfied.
  const featBody = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(
    feat.filePath,
    `${featBody}\n## Acceptance criteria\n\n- [ ] AC-1: parent feature behaves as specified\n`
  );
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Spec should now be satisfied (only had 1 feature, which moved to done)
  const specStatuses = result.specStatusChanges.map((c) => c.to);
  assert.ok(specStatuses.includes("satisfied"));
  const updatedSpec = await findSpecById(repo, spec.id);
  assert.equal(updatedSpec.frontmatter.status, "satisfied");
});

test("completeSlice is idempotent — re-running on a completed slice doesn't error", async () => {
  const repo = await tmpRepo("al-slice-complete-idem-");
  const feat = await addFeature(repo, { title: "Idempotent", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  const second = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Feature is already done — completeSlice reports alreadyDone
  assert.ok(second.feature.alreadyDone);
});

test("completeSlice throws when slice not found", async () => {
  const repo = await tmpRepo("al-slice-complete-missing-");
  await assert.rejects(() => completeSlice(repo, "SLICE-999"), /Slice file not found/);
});

test("moveFeature stamps started_at on first in-progress entry", async () => {
  const repo = await tmpRepo("al-feature-lifecycle-");
  const feat = await addFeature(repo, { title: "Lifecycle test" });
  const { moveFeature } = await import("../scripts/lib/backlog-writer.mjs");
  await moveFeature(feat.filePath, "triaged");
  const triaged = await findFeatureById(repo, feat.id);
  assert.equal(triaged.frontmatter.started_at, undefined);
  await moveFeature(triaged.filePath, "in-progress");
  const inProgress = await findFeatureById(repo, feat.id);
  assert.ok(inProgress.frontmatter.started_at);
  await moveFeature(inProgress.filePath, "done");
  const done = await findFeatureById(repo, feat.id);
  assert.ok(done.frontmatter.completed_at);
  // started_at preserved across done move
  assert.equal(done.frontmatter.started_at, inProgress.frontmatter.started_at);
});

test("completeSlice blocked when featureEnd ceremony has simplifyRan: false", async () => {
  const repo = await tmpRepo("al-slice-simplify-blocked-");
  const feat = await addFeature(repo, { title: "Simplify gate test", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Write a ceremony with simplifyRan: false
  const ceremony = featureEnd(
    { id: feat.id, title: "Simplify gate test", phase: "2" },
    { simplifyRan: false }
  );
  await writeFeatureEndCeremony(repo, ceremony);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Slice still moves but feature is blocked
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  assert.equal(result.feature.skipped, true);
  assert.ok(
    result.feature.reason.includes("simplify-gate"),
    `expected simplify-gate in reason, got: ${result.feature.reason}`
  );
});

test("completeSlice allowed when featureEnd ceremony has simplifyRan: true", async () => {
  const repo = await tmpRepo("al-slice-simplify-allowed-");
  const feat = await addFeature(repo, { title: "Simplify passed", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Write a ceremony with simplifyRan: true
  const ceremony = featureEnd(
    { id: feat.id, title: "Simplify passed", phase: "2" },
    { simplifyRan: true }
  );
  await writeFeatureEndCeremony(repo, ceremony);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Feature should move to done normally
  assert.ok(!result.feature.skipped, "feature should not be skipped");
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
});

test("completeSlice allowed when no featureEnd ceremony exists", async () => {
  const repo = await tmpRepo("al-slice-simplify-no-ceremony-");
  const feat = await addFeature(repo, { title: "No ceremony", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // No ceremony written — feature is still in-progress
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Should complete normally (no ceremony = no gate)
  assert.ok(!result.feature.skipped, "no ceremony should not block");
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
});

// FEAT-020: multi-slice support — feature stays in-progress when explicitly opted out

test("completeSlice keeps feature in-progress when feature_complete: false in frontmatter", async () => {
  const repo = await tmpRepo("al-keep-fm-");
  const feat = await addFeature(repo, { title: "Multi-slice work", body: AC_SECTION_BODY });
  // Set feature_complete: false in the feature frontmatter
  const { mergeFrontmatter } = await import("../scripts/lib/frontmatter.mjs");
  const featContent = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(feat.filePath, mergeFrontmatter(featContent, { feature_complete: false }));
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Slice still completed
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  // Feature kept open
  assert.equal(result.feature.keptOpen, true);
  assert.match(result.feature.reason, /feature_complete: false/);
  // File still in in-progress/
  const stillInProgress = await findFeatureById(repo, feat.id);
  assert.equal(stillInProgress.state, "in-progress");
});

test("completeSlice keeps feature in-progress when keepFeatureOpen runtime flag passed", async () => {
  const repo = await tmpRepo("al-keep-flag-");
  const feat = await addFeature(repo, {
    title: "Multi-slice work via flag",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    keepFeatureOpen: true,
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Slice still completed
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  // Feature kept open
  assert.equal(result.feature.keptOpen, true);
  assert.match(result.feature.reason, /--keep-feature-open/);
  // File still in in-progress/
  const stillInProgress = await findFeatureById(repo, feat.id);
  assert.equal(stillInProgress.state, "in-progress");
});

test("completeSlice still moves feature to done when feature_complete: true explicitly set", async () => {
  const repo = await tmpRepo("al-explicit-true-");
  const feat = await addFeature(repo, {
    title: "Single slice with explicit flag",
    body: AC_SECTION_BODY
  });
  const { mergeFrontmatter } = await import("../scripts/lib/frontmatter.mjs");
  const featContent = await fs.readFile(feat.filePath, "utf8");
  await fs.writeFile(feat.filePath, mergeFrontmatter(featContent, { feature_complete: true }));
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  // Feature moved as normal
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.ok(!result.feature.keptOpen);
});

// Validation gate

async function writeValidationsArtifact(repo, filename, body = "# validation\n") {
  const dir = path.join(repo, ".claude/artifacts/crew/validations");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), body);
}

async function writeValidationBadge(repo, status, note = "") {
  const dir = path.join(repo, ".claude/state/crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "workflow-state.json"),
    JSON.stringify(
      { version: "1.0", currentRun: { gates: { validation: { status, note } } } },
      null,
      2
    )
  );
}

test("completeSlice holds feature open when validation gate unmet (no artifact, no badge)", async () => {
  const repo = await tmpRepo("al-vgate-block-");
  const feat = await addFeature(repo, { title: "Behavior-bearing work", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id);
  // Slice still moves
  assert.match(result.slice.to, /completed[\\/]SLICE_/);
  // Feature held open
  assert.equal(result.feature.skipped, true);
  assert.match(result.feature.reason, /validation-gate/);
  assert.equal(result.validationGate.satisfied, false);
  // Feature still in in-progress
  const stillInProgress = await findFeatureById(repo, feat.id);
  assert.equal(stillInProgress.state, "in-progress");
});

test("completeSlice proceeds when validation artifact present for the slice", async () => {
  const repo = await tmpRepo("al-vgate-artifact-");
  const feat = await addFeature(repo, { title: "Validated", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // SLICE-205 / FEAT-295: presence alone no longer satisfies the validation
  // gate (grandfather clause removed) — the artifact must carry a `decision:` key.
  await writeValidationsArtifact(
    repo,
    `20260528T120000Z-validation-result-${slice.id.toLowerCase()}-feature.md`,
    "---\ndecision: pass\n---\n# validation\n"
  );
  const result = await completeSlice(repo, slice.id);
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.equal(result.validationGate.satisfied, true);
  assert.match(result.validationGate.reason, /validation artifact decision: pass/);
});

test("completeSlice proceeds when validation_passed badge present", async () => {
  const repo = await tmpRepo("al-vgate-passed-");
  const feat = await addFeature(repo, { title: "Passed via badge", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await writeValidationBadge(repo, "passed", "all green");
  const result = await completeSlice(repo, slice.id);
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.equal(result.validationGate.satisfied, true);
});

test("completeSlice proceeds when validation_skipped badge present", async () => {
  const repo = await tmpRepo("al-vgate-pre-skipped-");
  const feat = await addFeature(repo, { title: "Pre-skipped", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await writeValidationBadge(repo, "skipped", "no env");
  const result = await completeSlice(repo, slice.id);
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.equal(result.validationGate.satisfied, true);
  assert.match(result.validationGate.reason, /validation_skipped/);
});

test("completeSlice proceeds when slice frontmatter requires_validation: false", async () => {
  const repo = await tmpRepo("al-vgate-waiver-");
  const feat = await addFeature(repo, { title: "Doc-only slice", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // Patch the slice file to add requires_validation: false
  const { mergeFrontmatter } = await import("../scripts/lib/frontmatter.mjs");
  const sliceContent = await fs.readFile(slice.path, "utf8");
  await fs.writeFile(slice.path, mergeFrontmatter(sliceContent, { requires_validation: false }));
  const result = await completeSlice(repo, slice.id);
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.equal(result.validationGate.satisfied, true);
  assert.match(result.validationGate.reason, /explicit-waiver/);
});

test("completeSlice --skip-validation-check bypass requires non-empty reason", async () => {
  const repo = await tmpRepo("al-vgate-skip-empty-");
  const feat = await addFeature(repo, { title: "Bad skip", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await assert.rejects(
    () => completeSlice(repo, slice.id, { skipValidationCheck: "   " }),
    /requires a non-empty reason/
  );
});

test("completeSlice --skip-validation-check with reason bypasses gate", async () => {
  const repo = await tmpRepo("al-vgate-skip-ok-");
  const feat = await addFeature(repo, { title: "Skip with reason", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "no DB available in sandbox"
  });
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.equal(result.validationGate.satisfied, true);
  assert.match(result.validationGate.reason, /no DB available in sandbox/);
  // Best-effort badge call surfaced (may be skipped: hero-crew CLI not found in CI)
  assert.ok(result.validationSkippedBadge !== undefined);
});

// AC-1 + AC-2: updated_confidence returned and downgrades to red on hard failure
test("completeSlice returns updated_confidence red when builderEvidence has test-fail", async () => {
  const repo = await tmpRepo("al-builder-evidence-red-");
  const feat = await addFeature(repo, { title: "Builder evidence red", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test",
    builderEvidence: { status: "fail", failures: ["test-fail"] }
  });
  assert.equal(result.updated_confidence, "red");
  assert.match(result.updated_confidence_reason, /test-fail/);
});

// AC-3: updated_confidence is null when no builderEvidence provided
test("completeSlice returns updated_confidence null when no builderEvidence", async () => {
  const repo = await tmpRepo("al-builder-evidence-null-");
  const feat = await addFeature(repo, { title: "No builder evidence", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  assert.equal(result.updated_confidence, null);
  assert.equal(result.updated_confidence_reason, null);
});

// QW3 (2026-07-10 incident): a `blocked` badge left over from a
// long-resolved crew run silently held every subsequent feature roll,
// echoing only the note text. Stale badges now downgrade to a warning
// instead of blocking; fresh badges are unaffected.

async function writeCrewState(repoPath, state) {
  const dir = path.join(repoPath, ".claude", "state", "crew");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "workflow-state.json"), JSON.stringify(state, null, 2));
}

function baseLoopConfig(loopOverrides = {}) {
  return {
    preset: "dotnet-python",
    loop: {
      aiLoopRoot: ".claude/artifacts/loop/ai-loop",
      backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
      slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
      phaseGateArtifactDir: ".claude/artifacts/crew/validations",
      ...loopOverrides
    },
    stack: {}
  };
}

test("completeSlice: fresh blocked badge still blocks the feature roll (unchanged)", async () => {
  const repo = await tmpRepo("al-blocked-fresh-");
  const feat = await addFeature(repo, { title: "Fresh blocked badge", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  const updatedAt = new Date().toISOString();
  await writeCrewState(repo, {
    currentRun: {
      gates: { blocked: { status: "blocked", note: "waiting on unrelated run", updatedAt } }
    }
  });
  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  assert.equal(result.feature.skipped, true);
  assert.match(result.feature.reason, /crew run blocked/);
  assert.ok(
    result.feature.reason.includes(updatedAt),
    `expected reason to include updatedAt, got: ${result.feature.reason}`
  );
  assert.match(result.feature.reason, /workflow-state\.json/);
});

test("completeSlice: stale blocked badge downgrades to a warning and the roll proceeds", async () => {
  const repo = await tmpRepo("al-blocked-stale-");
  const feat = await addFeature(repo, { title: "Stale blocked badge", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // 5 days old — past the default 3-day threshold.
  const staleUpdatedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  await writeCrewState(repo, {
    currentRun: {
      gates: {
        blocked: { status: "blocked", note: "long-resolved run", updatedAt: staleUpdatedAt }
      }
    }
  });
  const originalWarn = console.warn;
  const warnings: string[] = [];
  console.warn = (msg: unknown) => {
    warnings.push(String(msg));
  };
  let result;
  try {
    result = await completeSlice(repo, slice.id, {
      skipValidationCheck: "test-fixture: gate not under test"
    });
  } finally {
    console.warn = originalWarn;
  }
  assert.ok(!result.feature.skipped, "stale blocked badge should not block the roll");
  assert.match(result.feature.to, /done[\\/]FEAT-001\.md/);
  assert.ok(
    warnings.some((w) => w.includes("stale-blocked-badge") && w.includes(staleUpdatedAt)),
    `expected a stale-blocked-badge warning, got: ${JSON.stringify(warnings)}`
  );
});

test("completeSlice: staleBadgeMaxAgeDays threshold is configurable", async () => {
  const repo = await tmpRepo("al-blocked-threshold-");
  const feat = await addFeature(repo, { title: "Configurable threshold", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // 2 days old.
  const twoDaysOld = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  await writeCrewState(repo, {
    currentRun: {
      gates: { blocked: { status: "blocked", note: "2 days old", updatedAt: twoDaysOld } }
    }
  });
  // Default threshold (3d): a 2d-old badge is still fresh enough to block.
  const blockedResult = await completeSlice(repo, slice.id, {
    skipValidationCheck: "test-fixture: gate not under test"
  });
  assert.equal(blockedResult.feature.skipped, true);

  // Override the threshold to 1 day: the same-age badge is now stale.
  const feat2 = await addFeature(repo, {
    title: "Configurable threshold 2",
    body: AC_SECTION_BODY
  });
  const { slice: slice2 } = await sliceFromFeature(repo, feat2.id);
  const overriddenResult = await completeSlice(repo, slice2.id, {
    skipValidationCheck: "test-fixture: gate not under test",
    config: baseLoopConfig({ staleBadgeMaxAgeDays: 1 })
  });
  assert.ok(
    !overriddenResult.feature.skipped,
    "1-day threshold should treat the 2d-old badge as stale"
  );
});

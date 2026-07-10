// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { test } from "bun:test";
import assert from "node:assert/strict";

function execFile(file, args, opts) {
  return promisify(execFileCb)(file, args, { timeout: 10000, ...opts });
}

import { startSlice, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { recordGradeScore } from "../scripts/lib/grade-trend.mjs";
import { logLearning } from "../scripts/lib/learnings.mjs";
import { updateSliceFrontmatter } from "../scripts/lib/backlog-store.mjs";
import { AC_SECTION_BODY, AC_PLACEHOLDER_BODY } from "./_fixtures.mjs";

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
  // Initialize git so discovery doesn't traverse the entire temp path on
  // Windows — without a real repo boundary here, git commands invoked by
  // completeSlice (e.g. crew-bridge's cost-report git diff/log calls) walk
  // up past the tmp dir to whatever ancestor repo the OS temp path lives
  // under (e.g. a git-initialized home directory), which can make the
  // "completeSlice also refreshes slice-progress" test scan the entire
  // home directory and hang/time out. Matches the tmpRepo() pattern in
  // slice-complete.test.mts.
  await execFile("git", ["init", "-b", "main"], { cwd: repo });
  await execFile("git", ["config", "user.email", "test@test.com"], { cwd: repo });
  await execFile("git", ["config", "user.name", "Test"], { cwd: repo });
  await execFile("git", ["config", "commit.gpgsign", "false"], { cwd: repo });
  await execFile("git", ["commit", "--allow-empty", "-m", "init"], { cwd: repo });
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
  const feat = await addFeature(repo, { title: "Test feature", body: AC_SECTION_BODY });
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

test("startSlice emits slice-build tag-routed dispatch by default (FEAT-191: lead removed)", async () => {
  const repo = await tmpRepo("al-slice-start-dispatch-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Test feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  // Default orchestratorMode = "slice-build" — no config override needed.
  const result = await startSlice(repo, slice.id);
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present by default");
  // No tags set on this slice → slice-build falls through to crew:fullstack-dev.
  assert.match(result.dispatchInstruction, /Dispatch crew:fullstack-dev subagent/);
  assert.match(result.dispatchInstruction, new RegExp(slice.id));
  assert.doesNotMatch(
    result.dispatchInstruction,
    /Dispatch crew:lead subagent/,
    "lead mode removed in FEAT-191 — must not emit lead dispatch"
  );
});

test("slice-start emits orchestrate-slice when orchestratorMode='orchestrate-slice'", async () => {
  const repo = await tmpRepo("al-slice-start-orchestrate-");
  await pinOrchestratorMode(repo, "orchestrate-slice");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Orchestrate feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id);
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

test("slice-build mode falls back to crew:fullstack-dev when slice has no fe/be tags", async () => {
  const repo = await tmpRepo("al-slice-start-fullstack-");
  await pinOrchestratorMode(repo, "slice-build");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "No surface tags", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id);
  assert.match(result.dispatchInstruction, /Dispatch crew:fullstack-dev subagent/);
});

test("dispatchInstruction includes [MODE] + [CHECKPOINT] progress signals (FEAT-038)", async () => {
  const repo = await tmpRepo("al-slice-start-progress-signals-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  const feat = await addFeature(repo, { title: "Visibility feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id);
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

test("startSlice splices a non-empty learningsDigest into dispatchInstruction (FEAT-219 AC-7)", async () => {
  const repo = await tmpRepo("al-slice-start-learnings-digest-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  await logLearning(repo, {
    key: "recurring-flake",
    insight: "Retry the astramem daemon check before marking it unreachable."
  });
  const feat = await addFeature(repo, { title: "Learnings digest feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  const result = await startSlice(repo, slice.id);
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present");
  assert.ok(result.learningsDigest, "learningsDigest should be computed on the result too");
  // The digest carries its own header (learnings.mts renderLearningsDigest) —
  // splice must not double-wrap it in a second header.
  assert.match(result.dispatchInstruction, /## Operational learnings/);
  assert.match(result.dispatchInstruction, /recurring-flake/);
  assert.match(result.dispatchInstruction, /Retry the astramem daemon check/);
  // Digest is prepended, mirroring the recallBlock splice pattern.
  assert.ok(
    result.dispatchInstruction.indexOf("## Operational learnings") <
      result.dispatchInstruction.indexOf("Dispatch crew:"),
    "learnings digest must be prepended ahead of the dispatch body"
  );
});

test("startSlice leaves dispatchInstruction unchanged when learningsDigest is empty (FEAT-219 AC-7 noop)", async () => {
  const repo = await tmpRepo("al-slice-start-learnings-noop-");
  await writePlan(repo, [{ id: "SLICE-01", title: "First" }]);
  // No learnings.jsonl seeded — recentLearnings() returns digest: null.
  const feat = await addFeature(repo, { title: "No learnings feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  const result = await startSlice(repo, slice.id);
  assert.ok(result.dispatchInstruction, "dispatchInstruction should be present");
  assert.equal(result.learningsDigest, null);
  assert.doesNotMatch(
    result.dispatchInstruction,
    /## Operational learnings/,
    "no digest block should be spliced in when learningsDigest is empty"
  );
  // Byte-identical noop: instruction is exactly the pre-existing dispatch
  // body (no leading digest concatenation), matching the shape asserted by
  // the FEAT-191 default-dispatch test above.
  assert.match(result.dispatchInstruction, /^Dispatch crew:fullstack-dev subagent/);
});

test("startSlice with dispatch:false omits the instruction", async () => {
  const repo = await tmpRepo("al-slice-start-nodispatch-");
  const feat = await addFeature(repo, { title: "Manual", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { dispatch: false });
  assert.equal(result.dispatchInstruction, null);
  assert.match(result.nextAction, /Begin acceptance-criteria work/);
});

test("completeSlice also refreshes slice-progress", async () => {
  const repo = await tmpRepo("al-slice-progress-on-complete-");
  await writePlan(repo, [{ id: "SLICE-01", title: "Only one" }]);
  const feat = await addFeature(repo, { title: "Done feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);

  // Root cause of this test's flakiness/timeout: completeSlice's
  // crew-bridge best-effort calls (tryWriteCostReport, markValidationSkippedBadge)
  // resolve the REAL hero-crew CLI via findCrewCli() (plugin-identity.mts),
  // which scans ~/.claude/plugins/cache/<marketplace>/crew. On any machine
  // that actually has the crew plugin installed (e.g. a developer box),
  // this shells out to the real `crew cost-slice --aggregate-all` — a real,
  // unmocked subprocess that does cross-repo cost aggregation and can run
  // far longer than this unit test's timeout budget. Point
  // CREW_MARKETPLACE_NAME at a marketplace name that can't resolve to a
  // real cache dir so findCrewCli() short-circuits to null (all crew-bridge
  // calls become instant `{ skipped }` no-ops) — deterministic and fast
  // regardless of what's installed on the host running the test.
  const savedMarketplace = process.env.CREW_MARKETPLACE_NAME;
  process.env.CREW_MARKETPLACE_NAME = "al-test-isolated-no-such-marketplace";
  let result;
  try {
    result = await completeSlice(repo, slice.id, {
      skipValidationCheck: "test-fixture: gate not under test"
    });
  } finally {
    if (savedMarketplace === undefined) delete process.env.CREW_MARKETPLACE_NAME;
    else process.env.CREW_MARKETPLACE_NAME = savedMarketplace;
  }
  assert.ok(result.sliceProgress && !result.sliceProgress.error);
  const dashboard = path.join(repo, ".claude/state/crew/slice-progress.md");
  const text = await fs.readFile(dashboard, "utf8");
  assert.match(text, /Slice Progress/);
});

// --- AC linter gate tests ---

test("startSlice throws when slice has placeholder ACs", async () => {
  const repo = await tmpRepo("al-slice-ac-gate-");
  const feat = await addFeature(repo, { title: "AC gate", body: AC_PLACEHOLDER_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  // slice carries the unfilled placeholder AC verbatim → linter must reject
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
  const feat = await addFeature(repo, { title: "Concrete ACs", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const result = await startSlice(repo, slice.id, { dispatch: false });
  assert.equal(result.slice.id, slice.id);
});

// --- Ladder gate test ---

test("startSlice throws when grade trend signals quality stop", async () => {
  const repo = await tmpRepo("al-slice-ladder-gate-");
  const feat = await addFeature(repo, { title: "Ladder gate", body: AC_SECTION_BODY });
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
  const feat = await addFeature(repo, { title: "Marathon", body: AC_SECTION_BODY });
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
  const feat = await addFeature(repo, { title: "Model gate", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const config = { loop: { orchestratorModel: "sonnet" } };
  const result = await startSlice(repo, slice.id, { dispatch: false, config });
  assert.equal(result.orchestratorModel, "sonnet");
});

test("startSlice returns orchestratorModel null when not configured", async () => {
  const repo = await tmpRepo("al-slice-orch-model-null-");
  const feat = await addFeature(repo, { title: "No model gate", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);
  const config = { loop: {} };
  const result = await startSlice(repo, slice.id, { dispatch: false, config });
  assert.equal(result.orchestratorModel, null);
});

// --- FEAT-277 Task 10: FEAT-id input + classify + touches_files ---

// AC-7a: startSlice always returns touchesFiles (classify-slice-shape runs on every start)
test("startSlice result includes touchesFiles array from classify step (FEAT-277 AC-7)", async () => {
  const repo = await tmpRepo("al-start-touches-files-");
  const feat = await addFeature(repo, { title: "Classify test feature", body: AC_SECTION_BODY });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  const result = await startSlice(repo, slice.id, { dispatch: false });

  assert.ok(
    "touchesFiles" in result,
    "result must include touchesFiles from classify-slice-shape step"
  );
  assert.ok(Array.isArray(result.touchesFiles), "touchesFiles must be an array");
  // New slice has no ## Files section → classify returns empty array (shape: none)
  assert.equal(result.touchesFiles.length, 0);
});

// Regression: startSlice must honor a frontmatter-declared touches_files list
// (the shape PM's inline drafting and /runner:start actually write) rather
// than silently returning [] because the "## Files" body section is empty.
test("startSlice honors frontmatter touches_files over empty ## Files classification", async () => {
  const repo = await tmpRepo("al-start-touches-files-frontmatter-");
  const feat = await addFeature(repo, {
    title: "Frontmatter touches_files",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  const declared = ["src/scripts/lib/foo.mts", "src/tests/foo.test.mts"];
  await updateSliceFrontmatter(slice.path, { touches_files: declared });

  const result = await startSlice(repo, slice.id, { dispatch: false });

  assert.deepEqual(
    result.touchesFiles,
    declared,
    "touchesFiles must come from frontmatter touches_files, not the empty ## Files body scan"
  );
});

// AC-7b: startSlice detects a FEAT id and enters the sliceFromFeature dispatch path.
// The AC linter gate fires after slice creation, confirming the FEAT branch was entered.
test("startSlice with FEAT id enters sliceFromFeature dispatch path (FEAT-277 AC-7)", async () => {
  const repo = await tmpRepo("al-start-feat-dispatch-");
  const feat = await addFeature(repo, {
    title: "FEAT-id dispatch test",
    body: AC_PLACEHOLDER_BODY
  });

  // startSlice with a FEAT id should detect it, call sliceFromFeature (creating SLICE-01),
  // then hit the AC linter gate on the newly created slice — which has a placeholder AC.
  // This confirms the FEAT-id dispatch path is entered (otherwise it would fail with
  // "slice file not found" or silently treat the FEAT id as a missing slice id).
  let caughtError: Error | null = null;
  try {
    await startSlice(repo, feat.id, { dispatch: false });
  } catch (err) {
    caughtError = err as Error;
  }
  assert.ok(caughtError, "expected startSlice to throw (AC linter gate on freshly created slice)");
  assert.match(
    caughtError!.message,
    /AC linter failed/,
    "error must be from AC linter, not a missing-slice error"
  );
  // Confirm the slice was actually created before the linter fired
  const slicesRoot = path.join(repo, ".claude/artifacts/loop/ai-loop/slices");
  const slicePending = path.join(slicesRoot, "pending");
  let sliceFiles: string[] = [];
  try {
    sliceFiles = await fs.readdir(slicePending);
  } catch {
    // dir may not exist if sliceFromFeature failed entirely
  }
  assert.ok(
    sliceFiles.length > 0,
    "sliceFromFeature must have created a slice file before AC linter fired"
  );
});

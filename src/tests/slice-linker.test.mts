import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  sliceFromFeature,
  buildDispatchInstruction,
  readFeatureExcerpt
} from "../scripts/lib/slice-linker.mjs";
import { addFeature, findFeatureById } from "../scripts/lib/backlog-writer.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

async function tmpRepo(prefix: string) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  // Write a minimal .claude/loop.json so config-resolver works.
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

test("sliceFromFeature creates a SLICE file and cross-links the feature", async () => {
  const repo = await tmpRepo("al-slice-link-");
  const feat = await addFeature(repo, {
    title: "Add login form",
    priority: "P1",
    target_release: "v1.0.0"
  });
  const result = await sliceFromFeature(repo, feat.id);
  assert.equal(result.feature.id, feat.id);
  assert.equal(result.feature.toState, "in-progress");
  assert.match(result.slice.id, /^SLICE-\d+$/);
  // Slice file written
  const sliceContent = await fs.readFile(result.slice.path, "utf8");
  assert.match(sliceContent, /Add login form/);
  assert.match(sliceContent, new RegExp(feat.id));
  // Frontmatter has feature back-ref
  const { frontmatter } = parseFrontmatter(sliceContent);
  assert.equal(frontmatter.feature, feat.id);
  assert.equal(frontmatter.priority, "P1");
  assert.equal(frontmatter.target_release, "v1.0.0");
  assert.equal(frontmatter.requires_validation, true);
  // Feature now lists the slice
  const updated = await findFeatureById(repo, feat.id);
  assert.ok(updated.frontmatter.slices.includes(result.slice.id));
});

test("sliceFromFeature allocates monotonically increasing ids", async () => {
  const repo = await tmpRepo("al-slice-mono-");
  const a = await addFeature(repo, { title: "A" });
  const b = await addFeature(repo, { title: "B" });
  const ra = await sliceFromFeature(repo, a.id);
  const rb = await sliceFromFeature(repo, b.id);
  const numA = Number(ra.slice.id.replace("SLICE-", ""));
  const numB = Number(rb.slice.id.replace("SLICE-", ""));
  assert.equal(numB, numA + 1);
});

test("sliceFromFeature respects existing flat slice layout (LoopBrain pattern)", async () => {
  const repo = await tmpRepo("al-slice-flat-");
  // Seed flat layout: pre-existing SLICE_05 directly under slicesRoot
  const slicesRoot = path.join(repo, ".claude/artifacts/loop/ai-loop/slices");
  await fs.mkdir(slicesRoot, { recursive: true });
  await fs.writeFile(path.join(slicesRoot, "SLICE_05_OLD.md"), "# SLICE-05 pre-existing");
  const feat = await addFeature(repo, { title: "New work" });
  const result = await sliceFromFeature(repo, feat.id);
  // Next id should be 06 since the recursive scan saw 05
  assert.equal(result.slice.id, "SLICE-06");
  // New slice still lands under pending/ (plugin convention)
  assert.match(result.slice.path, /pending[\\/]SLICE_06_/);
});

test("sliceFromFeature is idempotent on the slice link", async () => {
  const repo = await tmpRepo("al-slice-idem-");
  const feat = await addFeature(repo, { title: "Reentrant" });
  const r1 = await sliceFromFeature(repo, feat.id);
  // Re-running should not duplicate slice id in the feature's slices array
  // (it allocates a NEW slice id since old one was successfully written —
  // but the feature shouldn't pick up a phantom duplicate of r1.slice.id.)
  // The feature now has [SLICE-01]; calling again would create SLICE-02.
  const r2 = await sliceFromFeature(repo, feat.id);
  assert.notEqual(r1.slice.id, r2.slice.id);
  const updated = await findFeatureById(repo, feat.id);
  assert.equal(updated.frontmatter.slices.length, 2);
});

test("sliceFromFeature throws when feature not found", async () => {
  const repo = await tmpRepo("al-slice-missing-");
  await assert.rejects(() => sliceFromFeature(repo, "FEAT-999"), /Feature not found/);
});

// FEAT-168 AC-2: refuse-gate integration through sliceFromFeature.
test("sliceFromFeature refuses when effort_points >= 8 and proposed_slices missing", async () => {
  const { updateFeatureFrontmatter } = await import("../scripts/lib/backlog-writer.mjs");
  const repo = await tmpRepo("al-slice-refuse-");
  const feat = await addFeature(repo, { title: "Big work" });
  await updateFeatureFrontmatter(feat.filePath, { effort_points: 13 });
  await assert.rejects(
    () => sliceFromFeature(repo, feat.id),
    (err: Error) =>
      err.name === "DecompositionRequiredError" &&
      /sized 13 points/.test(err.message) &&
      /\/loop:pm-review/.test(err.message)
  );
  // Backlog state untouched — feature stays in pending, no slice file created.
  const found = await findFeatureById(repo, feat.id);
  assert.equal(found.state, "pending");
  assert.equal(found.frontmatter.slices?.length ?? 0, 0);
});

// FEAT-168 AC-2: gate is a no-op for FEATs sized < 8.
test("sliceFromFeature allows when effort_points < 8 even without proposed_slices", async () => {
  const { updateFeatureFrontmatter } = await import("../scripts/lib/backlog-writer.mjs");
  const repo = await tmpRepo("al-slice-small-");
  const feat = await addFeature(repo, { title: "Small work" });
  await updateFeatureFrontmatter(feat.filePath, { effort_points: 5 });
  const result = await sliceFromFeature(repo, feat.id);
  assert.match(result.slice.id, /^SLICE-\d+$/);
});

// FEAT-168: full integration of proposed_slices (AC-1 schema validation +
// AC-5 atomic create + AC-7 parse error visible through sliceFromFeature)
// is deferred — the in-tree frontmatter parser/writer can't yet round-trip
// nested mappings inside arrays. The proposed-slices validator itself is
// covered unit-side in src/tests/proposed-slices.test.mts. Wiring AC-1 /
// AC-5 / AC-7 through the full slice flow waits on a follow-up slice that
// extends src/scripts/lib/frontmatter.mts with nested-list-of-mappings
// support.

// --- buildDispatchInstruction context embedding tests ---

test("buildDispatchInstruction with sliceContent embeds context block", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-01",
    title: "SLICE-01: Add login",
    sliceFile: "/repo/slices/SLICE_01.md",
    repoPath: "/repo",
    resolvedGoal: "Implement login",
    sliceContent: "## Acceptance criteria\n- AC-1: login works"
  });
  assert.match(result, /Slice context \(pre-read/);
  assert.match(result, /AC-1: login works/);
});

test("buildDispatchInstruction with featureExcerpt embeds feature section", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-02",
    title: "SLICE-02: Add signup",
    sliceFile: "/repo/slices/SLICE_02.md",
    repoPath: "/repo",
    resolvedGoal: "Implement signup",
    featureId: "FEAT-007",
    sliceContent: "## Acceptance criteria\n- AC-1",
    featureExcerpt: "Allow users to register a new account."
  });
  assert.match(result, /Feature: FEAT-007/);
  assert.match(result, /Allow users to register/);
});

test("buildDispatchInstruction without optional fields emits default lead orchestrator", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-03",
    title: "SLICE-03: Refactor",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null
  });
  assert.match(result, /Dispatch crew:lead subagent/);
  assert.doesNotMatch(result, /Slice context/);
});

test("buildDispatchInstruction with dispatchLimits injects budget block in direct-builder mode", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-04",
    title: "SLICE-04: Add feature",
    sliceFile: "/repo/slices/SLICE_04.md",
    repoPath: "/repo",
    resolvedGoal: "Implement feature",
    orchestratorMode: "direct-builder",
    dispatchLimits: {
      maxSubagentsPerSlice: 4,
      preferInlineFor: ["single-file-edit", "test-fix"]
    }
  });
  assert.match(result, /Dispatch budget/);
  assert.match(result, /max 4 subagents/);
  assert.match(result, /single-file-edit/);
  assert.match(result, /test-fix/);
});

// --- SLICE-63 / FEAT-061: appendWorktreeSection coverage (AC-1 / AC-4) ---

test("buildDispatchInstruction with worktreePath embeds ## Worktree section and --repo hint", () => {
  const worktreePath = "C:\\work\\mega\\loop-worktrees\\slice-63";
  const result = buildDispatchInstruction({
    sliceId: "SLICE-63",
    title: "SLICE-63: Lead operates inside slice worktree",
    sliceFile: "/repo/slices/SLICE_63.md",
    repoPath: "/repo",
    resolvedGoal: "Wire worktreePath",
    worktreePath
  });
  assert.match(result, /## Worktree/);
  assert.ok(
    result.includes(worktreePath),
    "dispatch prompt should embed the absolute worktree path"
  );
  assert.match(
    result,
    /--repo /,
    "dispatch prompt should remind the builder to forward --repo to crew shell-outs"
  );
});

test("buildDispatchInstruction without worktreePath omits ## Worktree section", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-63",
    title: "SLICE-63: Lead operates inside slice worktree",
    sliceFile: "/repo/slices/SLICE_63.md",
    repoPath: "/repo",
    resolvedGoal: "Wire worktreePath"
  });
  assert.doesNotMatch(result, /## Worktree/);
});

test("buildDispatchInstruction with null worktreePath omits ## Worktree section", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-63",
    title: "SLICE-63: Lead operates inside slice worktree",
    sliceFile: "/repo/slices/SLICE_63.md",
    repoPath: "/repo",
    resolvedGoal: "Wire worktreePath",
    worktreePath: null
  });
  assert.doesNotMatch(result, /## Worktree/);
});

test("buildDispatchInstruction without dispatchLimits omits budget block", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-05",
    title: "SLICE-05: Refactor",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: null
  });
  assert.doesNotMatch(result, /Dispatch budget/);
});

// --- orchestratorMode: "lead" emission tests ---

test("buildDispatchInstruction with orchestratorMode='lead' emits 'Dispatch crew:lead subagent' instruction", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-89-LEAD",
    title: "SLICE-89-LEAD: Wire crew:lead as default orchestrator",
    sliceFile: "/repo/slices/SLICE_89.md",
    repoPath: "/repo",
    resolvedGoal: "Wire lead orchestrator",
    orchestratorMode: "lead"
  });
  assert.match(result, /Dispatch crew:lead subagent/);
  assert.match(result, /Orchestrate SLICE-89-LEAD/);
  assert.match(result, /\/loop:slice complete --id SLICE-89-LEAD/);
  assert.doesNotMatch(result, /Dispatch crew:fullstack-dev subagent/);
  assert.doesNotMatch(result, /\/crew:orchestrate-slice/);
});

test("buildDispatchInstruction with orchestratorMode='orchestrate-slice' emits /crew:orchestrate-slice command", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-OS",
    title: "SLICE-OS: Orchestrate-slice path",
    sliceFile: "/repo/slices/SLICE_OS.md",
    repoPath: "/repo",
    resolvedGoal: "Use legacy orchestrate-slice",
    orchestratorMode: "orchestrate-slice"
  });
  assert.match(result, /\/crew:orchestrate-slice --id SLICE-OS/);
  assert.doesNotMatch(result, /Dispatch crew:lead subagent/);
});

test("buildDispatchInstruction with orchestratorMode='direct-builder' emits 'Dispatch crew:fullstack-dev subagent' instruction", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-DB",
    title: "SLICE-DB: Direct builder path",
    sliceFile: "/repo/slices/SLICE_DB.md",
    repoPath: "/repo",
    resolvedGoal: "Use direct-builder fallback",
    orchestratorMode: "direct-builder"
  });
  assert.match(result, /Dispatch crew:fullstack-dev subagent/);
  assert.doesNotMatch(result, /Dispatch crew:lead subagent/);
  assert.doesNotMatch(result, /\/crew:orchestrate-slice/);
});

test("buildDispatchInstruction defaults to lead orchestrator mode when none specified", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-DEF1",
    title: "SLICE-DEF1: Default lead",
    sliceFile: "/repo/slices/SLICE_DEF1.md",
    repoPath: "/repo",
    resolvedGoal: "Default mode"
  });
  assert.match(result, /Dispatch crew:lead subagent/);
});

test("readFeatureExcerpt returns {path, excerpt} object when feature found", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rfe-"));
  const dir = path.join(tmp, "in-progress");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "FEAT-001.md"),
    "---\nid: FEAT-001\n---\n# FEAT-001\n\n## Description\n\nTest feature description.\n"
  );
  // config.loop.backlogRoot = "." so resolveBacklogRoot returns path.join(tmp, ".") = tmp
  const config = { loop: { backlogRoot: "." } };
  const result = await readFeatureExcerpt(tmp, "FEAT-001", config);
  assert.ok(result !== null, "expected non-null result");
  if (!result) throw new Error("narrowing guard");
  assert.strictEqual(typeof result.path, "string");
  assert.match(result.path, /FEAT-001\.md$/);
  assert.match(result.excerpt, /Test feature description/);
  await fs.rm(tmp, { recursive: true });
});

test("readFeatureExcerpt returns null when feature not found", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "rfe-"));
  const config = { loop: { backlogRoot: "." } };
  const result = await readFeatureExcerpt(tmp, "FEAT-999", config);
  assert.strictEqual(result, null);
  await fs.rm(tmp, { recursive: true });
});

test("buildDispatchInstruction with featurePath renders Path line in context block", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-99",
    title: "SLICE-99",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: "test goal",
    featureId: "FEAT-001",
    featureExcerpt: "A description.",
    featurePath: "/repo/.claude/artifacts/loop/backlog/in-progress/FEAT-001.md"
  });
  assert.match(result, /### Feature: FEAT-001/);
  assert.match(result, /Path: .*FEAT-001\.md/);
  assert.match(result, /A description\./);
});

test("buildDispatchInstruction without featurePath omits Path line", () => {
  const result = buildDispatchInstruction({
    sliceId: "SLICE-99",
    title: "SLICE-99",
    sliceFile: null,
    repoPath: "/repo",
    resolvedGoal: "test goal",
    featureId: "FEAT-001",
    featureExcerpt: "A description.",
    featurePath: null
  });
  assert.match(result, /### Feature: FEAT-001/);
  assert.doesNotMatch(result, /^Path:/m);
});

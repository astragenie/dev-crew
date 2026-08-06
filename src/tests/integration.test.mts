// @ts-nocheck
// Integration tests: full-cycle startSlice → completeSlice sequences
// covering happy path, blocked gate, and --skip-validation-check bypass.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { startSlice, completeSlice } from "../scripts/lib/slice-linker.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { AC_SECTION_BODY, initGitRepo, isolateCrewCli } from "./_fixtures.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
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
  await initGitRepo(repo);
  return repo;
}

isolateCrewCli();

/** Replace template placeholder ACs so startSlice AC linter passes. */
async function fillPlaceholderACs(slicePath: string): Promise<void> {
  const content = await fs.readFile(slicePath, "utf8");
  const fixed = content.replace(
    /- \[ \] AC-2: <replace with a concrete, testable acceptance criterion>/g,
    "- [ ] AC-2: Feature behaves as expected per the slice objective"
  );
  await fs.writeFile(slicePath, fixed);
}

/** Write a validation artifact that satisfies the validation gate for sliceId. */
async function writeValidationArtifact(repo: string, sliceId: string): Promise<void> {
  const dir = path.join(repo, ".claude/artifacts/crew/validations");
  await fs.mkdir(dir, { recursive: true });
  const normalized = sliceId.toLowerCase().replace("-", "");
  // SLICE-205 / FEAT-295: presence alone no longer satisfies the validation
  // gate (grandfather clause removed) — the artifact must carry a `decision:` key.
  await fs.writeFile(
    path.join(dir, `20260528T120000Z-validation-result-${normalized}-feature.md`),
    "---\ndecision: pass\n---\n# Validation\n\n**Status:** PASS\n\nAll acceptance criteria PASS.\n"
  );
}

// ---------------------------------------------------------------------------
// AC-3a: Full-cycle happy path — normal close (validation artifact present)
// ---------------------------------------------------------------------------

test("integration: startSlice → completeSlice happy path moves slice+feature to done", async () => {
  const repo = await tmpRepo("it-happy-");
  const feat = await addFeature(repo, {
    title: "Integration happy path",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  // Start
  const startResult = await startSlice(repo, slice.id, { dispatch: false });
  assert.equal(startResult.slice.id, slice.id);
  assert.ok(startResult.runBrief !== undefined, "runBrief should be attempted");

  // Satisfy validation gate
  await writeValidationArtifact(repo, slice.id);

  // Complete
  const completeResult = await completeSlice(repo, slice.id);
  assert.match(completeResult.slice.to, /completed[\\/]SLICE_/);
  assert.match(completeResult.feature.to, /done[\\/]FEAT-/);
  assert.equal(completeResult.validationGate.satisfied, true);
  assert.match(completeResult.validationGate.reason, /validation artifact decision: pass/);

  // Slice file is now under completed/
  const sliceStat = await fs.stat(completeResult.slice.to);
  assert.ok(sliceStat.isFile());
  const sliceBody = await fs.readFile(completeResult.slice.to, "utf8");
  const { frontmatter } = parseFrontmatter(sliceBody);
  assert.equal(frontmatter.status, "completed");
  assert.ok(frontmatter.completed_at, "completed_at should be stamped");

  // Feature file is under done/
  const featBody = await fs.readFile(completeResult.feature.to, "utf8");
  const { frontmatter: featFm } = parseFrontmatter(featBody);
  assert.equal(featFm.status, "done");
});

// ---------------------------------------------------------------------------
// AC-3b: Full-cycle blocked gate — completeSlice holds feature open when
//         no validation evidence and no --skip-validation-check
// ---------------------------------------------------------------------------

test("integration: startSlice → completeSlice blocked by validation gate keeps feature open", async () => {
  const repo = await tmpRepo("it-blocked-");
  const feat = await addFeature(repo, {
    title: "Integration blocked gate",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  // Start
  await startSlice(repo, slice.id, { dispatch: false });

  // Complete WITHOUT writing validation artifact → gate fires
  const completeResult = await completeSlice(repo, slice.id);

  // Slice still moves
  assert.match(completeResult.slice.to, /completed[\\/]SLICE_/);

  // Feature held open
  assert.equal(completeResult.feature.skipped, true);
  assert.match(completeResult.feature.reason, /validation-gate/);
  assert.equal(completeResult.validationGate.satisfied, false);
});

// ---------------------------------------------------------------------------
// AC-3c: Full-cycle --skip-validation-check bypass — gate satisfied with reason
// ---------------------------------------------------------------------------

test("integration: startSlice → completeSlice with --skip-validation-check bypasses gate", async () => {
  const repo = await tmpRepo("it-skip-");
  const feat = await addFeature(repo, {
    title: "Integration skip bypass",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  // Start
  await startSlice(repo, slice.id, { dispatch: false });

  // Complete with explicit skip reason
  const completeResult = await completeSlice(repo, slice.id, {
    skipValidationCheck: "sandbox environment — no HTTP stack available"
  });

  // Feature should move to done
  assert.match(completeResult.feature.to, /done[\\/]FEAT-/);
  assert.equal(completeResult.validationGate.satisfied, true);
  assert.match(
    completeResult.validationGate.reason,
    /sandbox environment — no HTTP stack available/
  );
});

// ---------------------------------------------------------------------------
// Cross-module data flow: feature frontmatter fields flow from addFeature →
// sliceFromFeature → slice frontmatter → completeSlice featureResult
// ---------------------------------------------------------------------------

test("integration: feature priority and target_release flow through to slice frontmatter", async () => {
  const repo = await tmpRepo("it-dataflow-");
  const feat = await addFeature(repo, {
    title: "Data flow test",
    priority: "P1",
    target_release: "v2.0.0",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);

  const sliceBody = await fs.readFile(slice.path, "utf8");
  const { frontmatter } = parseFrontmatter(sliceBody);

  assert.equal(frontmatter.priority, "P1");
  assert.equal(frontmatter.target_release, "v2.0.0");
  assert.equal(frontmatter.feature, feat.id);
  assert.match(frontmatter.feature, /^FEAT-/);
});

// ---------------------------------------------------------------------------
// Regression: completeSlice emits nextAction pointing to slice grade
// ---------------------------------------------------------------------------

test("integration: completeSlice nextAction always mentions slice grade command", async () => {
  const repo = await tmpRepo("it-nextaction-");
  const feat = await addFeature(repo, {
    title: "Next action regression",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);

  const result = await completeSlice(repo, slice.id, {
    skipValidationCheck: "regression test fixture"
  });
  assert.match(result.nextAction, /slice grade/);
  assert.match(result.nextAction, new RegExp(slice.id));
});

// ---------------------------------------------------------------------------
// Regression: completeSlice on a slice with requires_validation: false in
// frontmatter satisfies gate without any artifact
// ---------------------------------------------------------------------------

test("integration: completeSlice with requires_validation: false waiver skips gate automatically", async () => {
  const repo = await tmpRepo("it-waiver-");
  const feat = await addFeature(repo, {
    title: "Waiver regression",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);

  // Patch slice frontmatter with explicit waiver
  const { mergeFrontmatter } = await import("../scripts/lib/frontmatter.mjs");
  const sliceContent = await fs.readFile(slice.path, "utf8");
  await fs.writeFile(slice.path, mergeFrontmatter(sliceContent, { requires_validation: false }));

  const result = await completeSlice(repo, slice.id);
  assert.match(result.feature.to, /done[\\/]FEAT-/);
  assert.equal(result.validationGate.satisfied, true);
  assert.match(result.validationGate.reason, /explicit-waiver/);
});

// ---------------------------------------------------------------------------
// Regression: startSlice returns slice.id that matches the id in the file
// ---------------------------------------------------------------------------

test("integration: startSlice slice.id matches the id written in the slice file frontmatter", async () => {
  const repo = await tmpRepo("it-idmatch-");
  const feat = await addFeature(repo, {
    title: "ID consistency check",
    body: AC_SECTION_BODY
  });
  const { slice } = await sliceFromFeature(repo, feat.id);
  await fillPlaceholderACs(slice.path);

  const startResult = await startSlice(repo, slice.id, { dispatch: false });

  const sliceBody = await fs.readFile(slice.path, "utf8");
  const { frontmatter } = parseFrontmatter(sliceBody);
  assert.equal(startResult.slice.id, frontmatter.id);
});

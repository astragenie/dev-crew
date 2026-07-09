// ARCHITECT GATE (runner side) — integration coverage for the Part 2 wiring
// into startSlice (start-slice.mts runArchGateHook). Unit coverage for the
// gate's decision matrix / state machine / budget lives in arch-gate.test.mts;
// this file only proves startSlice actually splices the preflight block into
// dispatchInstruction when the gate fires, and leaves it out otherwise.
//
// The positive-fire case is environment-aware: whether the real hero-crew
// CLI is installed on the machine running this suite determines whether the
// gate can fire at all (crew-presence is a hard prerequisite — see
// arch-gate.mts shouldRunArchGate). Rather than mocking that dependency
// (start-slice.mts wires the real isCrewAvailable(), not an injectable
// stub), this test asks the same real signal the production code path uses
// and asserts consistently with it — deterministic on any machine, crew
// installed or not.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { addFeature, updateFeatureFrontmatter } from "../scripts/lib/backlog-writer.mjs";
import { sliceFromFeature, startSlice } from "../scripts/lib/slice-linker.mjs";
import { mergeFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { isCrewAvailable } from "../scripts/lib/arch-gate.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

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
  return repo;
}

async function baseConfig(repo: string): Promise<Record<string, any>> {
  const raw = await fs.readFile(path.join(repo, ".claude/loop.json"), "utf8");
  return JSON.parse(raw);
}

async function fillPlaceholderACs(slicePath: string): Promise<void> {
  const content = await fs.readFile(slicePath, "utf8");
  const fixed = content.replace(
    /- \[ \] AC-2: <replace with a concrete, testable acceptance criterion>/g,
    "- [ ] AC-2: Feature behaves as expected per the slice objective"
  );
  await fs.writeFile(slicePath, fixed);
}

/** Scaffold a single-slice FEAT with the given priority + slice tags, bypassing the classify agent-dispatch (noClassify) so tags are set deterministically. */
async function makeFeatureAndSlice(
  repo: string,
  { priority, tags }: { priority: string; tags: string[] }
) {
  const feat = await addFeature(repo, {
    title: "Gate wiring feature",
    body: AC_SECTION_BODY,
    priority
  });
  const scaffold = await sliceFromFeature(repo, feat.id, { noClassify: true });
  const slice = scaffold.slice;
  await fillPlaceholderACs(slice.path);
  const content = await fs.readFile(slice.path, "utf8");
  await fs.writeFile(slice.path, mergeFrontmatter(content, { tags }));
  // sliceFromFeature moves the FEAT pending/ -> in-progress/ before scaffolding
  // the slice — feat.filePath (still pointing at pending/) is stale; use the
  // post-move path from the scaffold result for any further frontmatter writes.
  return { feat: { ...feat, filePath: scaffold.feature.path }, slice };
}

test("ARCHITECT GATE wiring: no gate block for a non-P0/P1 FEAT even with fullstack tags", async () => {
  const repo = await tmpRepo("al-arch-gate-lowpri-");
  const config = await baseConfig(repo);
  const { slice } = await makeFeatureAndSlice(repo, {
    priority: "P2",
    tags: ["surface:ui", "surface:api"]
  });

  const result = await startSlice(repo, slice.id, { config });
  assert.ok(result.dispatchInstruction);
  assert.doesNotMatch(result.dispatchInstruction, /ARCHITECT GATE/);
});

test("ARCHITECT GATE wiring: no gate block for a P0 FEAT with a single-surface (backend-only) tag", async () => {
  const repo = await tmpRepo("al-arch-gate-backend-");
  const config = await baseConfig(repo);
  const { slice } = await makeFeatureAndSlice(repo, {
    priority: "P0",
    tags: ["surface:api"]
  });

  const result = await startSlice(repo, slice.id, { config });
  assert.ok(result.dispatchInstruction);
  assert.doesNotMatch(result.dispatchInstruction, /ARCHITECT GATE/);
});

test("ARCHITECT GATE wiring: idempotent — a deferred_design FEAT never re-shows the gate, even when otherwise eligible", async () => {
  const repo = await tmpRepo("al-arch-gate-deferred-");
  const config = await baseConfig(repo);
  const { feat, slice } = await makeFeatureAndSlice(repo, {
    priority: "P0",
    tags: ["surface:ui", "surface:api"]
  });
  await updateFeatureFrontmatter(
    feat.filePath,
    { arch_status: "deferred_design", arch_attempt: 2 },
    repo,
    config
  );

  const result = await startSlice(repo, slice.id, { config });
  assert.ok(result.dispatchInstruction);
  assert.doesNotMatch(result.dispatchInstruction, /ARCHITECT GATE/);
});

test("ARCHITECT GATE wiring: fires for an eligible P0 fullstack FEAT exactly when crew is available on this machine", async () => {
  const repo = await tmpRepo("al-arch-gate-fire-");
  const config = await baseConfig(repo);
  const { slice, feat } = await makeFeatureAndSlice(repo, {
    priority: "P0",
    tags: ["surface:ui", "surface:api"]
  });

  const result = await startSlice(repo, slice.id, { config });
  assert.ok(result.dispatchInstruction);

  const crewAvailable = await isCrewAvailable();
  if (crewAvailable) {
    assert.match(result.dispatchInstruction, /ARCHITECT GATE/);
    assert.match(result.dispatchInstruction, new RegExp(feat.id));
  } else {
    assert.doesNotMatch(
      result.dispatchInstruction,
      /ARCHITECT GATE/,
      "crew absent — gate must soft-skip, never block the dispatch"
    );
  }
});

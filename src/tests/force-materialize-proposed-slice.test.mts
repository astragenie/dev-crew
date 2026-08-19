// FEAT-009 AC-2 (SLICE-193) — CLI escape hatch: force-materialize one named
// `proposed_slices` entry by id_suffix, so a gapped FEAT can be repaired
// without calling BacklogStore directly.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import {
  forceMaterializeProposedSlice,
  ProposedSliceNotFoundError,
  ProposedSliceAlreadyMaterializedError
} from "../scripts/lib/slice-linker.mjs";
import {
  addFeature,
  findFeatureById,
  updateFeatureFrontmatter
} from "../scripts/lib/backlog-writer.mjs";
import { createSlice } from "../scripts/lib/backlog-store.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { AC_SECTION_BODY } from "./_fixtures.mjs";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

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

const PROPOSED = [
  { id_suffix: "-SLICE-1", title: "Fixture rebuild", points: 2 },
  { id_suffix: "-SLICE-2", title: "Diff corroboration", points: 2 },
  { id_suffix: "-SLICE-3", title: "Downgrade warnings", points: 2 }
];

test("AC-2: force-materializes exactly the named gap entry, leaves siblings alone", async () => {
  const repo = await tmpRepo("fmp-gap-");
  const feat = await addFeature(repo, { title: "Gapped decomposition", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, { effort_points: 6, proposed_slices: PROPOSED });

  // Pre-materialize ordinals 2 and 3, simulating a live gap at ordinal 1.
  const entry = await findFeatureById(repo, feat.id);
  const legacyIds: string[] = [];
  for (const item of PROPOSED.slice(1)) {
    const created = await createSlice({
      repoPath: repo,
      featureId: feat.id,
      featureFilePath: entry.filePath,
      featureFrontmatter: entry.frontmatter,
      featureBody: entry.body,
      title: item.title,
      effortPoints: item.points,
      estimatedTokens: 100_000,
      proposedSliceIdSuffix: item.id_suffix
    });
    legacyIds.push(created.id);
  }
  await updateFeatureFrontmatter(feat.filePath, { slices: legacyIds });

  const out = await forceMaterializeProposedSlice(repo, feat.id, "-SLICE-1");
  assert.equal(out.slice.title, "Fixture rebuild");

  const sliceContent = await fs.readFile(out.slice.path, "utf8");
  const { frontmatter } = parseFrontmatter(sliceContent);
  assert.equal(frontmatter.proposed_slice_id_suffix, "-SLICE-1");
  assert.equal(frontmatter.effort_points, 2);

  const updated = await findFeatureById(repo, feat.id);
  assert.equal(
    updated.frontmatter.slices.length,
    3,
    "the two pre-materialized siblings + the new one"
  );
  assert.ok(updated.frontmatter.slices.includes(out.slice.id));
  for (const id of legacyIds) assert.ok(updated.frontmatter.slices.includes(id));
});

test("AC-2: moves a pending FEAT to in-progress as part of the force-materialize", async () => {
  const repo = await tmpRepo("fmp-move-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: PROPOSED.slice(0, 2)
  });

  const before = await findFeatureById(repo, feat.id);
  assert.equal(before.state, "pending");

  await forceMaterializeProposedSlice(repo, feat.id, "-SLICE-1");

  const after = await findFeatureById(repo, feat.id);
  assert.equal(after.state, "in-progress");
});

test("AC-2: refuses with ProposedSliceNotFoundError for an id_suffix absent from proposed_slices", async () => {
  const repo = await tmpRepo("fmp-notfound-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: PROPOSED.slice(0, 2)
  });

  await assert.rejects(
    () => forceMaterializeProposedSlice(repo, feat.id, "-SLICE-99"),
    (err: unknown) => {
      assert.ok(err instanceof ProposedSliceNotFoundError);
      assert.equal(err.featureId, feat.id);
      assert.equal(err.idSuffix, "-SLICE-99");
      return true;
    }
  );
});

test("AC-2: refuses with ProposedSliceAlreadyMaterializedError rather than duplicate an already-materialized entry", async () => {
  const repo = await tmpRepo("fmp-dupe-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: PROPOSED.slice(0, 2)
  });

  const first = await forceMaterializeProposedSlice(repo, feat.id, "-SLICE-1");

  await assert.rejects(
    () => forceMaterializeProposedSlice(repo, feat.id, "-SLICE-1"),
    (err: unknown) => {
      assert.ok(err instanceof ProposedSliceAlreadyMaterializedError);
      assert.equal(err.featureId, feat.id);
      assert.equal(err.idSuffix, "-SLICE-1");
      assert.equal(err.sliceId, first.slice.id);
      return true;
    }
  );

  // No duplicate slice was created by the refused second call.
  const after = await findFeatureById(repo, feat.id);
  assert.equal(after.frontmatter.slices.length, 1);
});

test("AC-2: refuses on a FEAT with no proposed_slices at all", async () => {
  const repo = await tmpRepo("fmp-none-");
  const feat = await addFeature(repo, { title: "Small work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, { effort_points: 3 });

  await assert.rejects(
    () => forceMaterializeProposedSlice(repo, feat.id, "-SLICE-1"),
    /has no proposed_slices entries/
  );
});

test("AC-2 CLI: `slice force-materialize --id FEAT-x --id-suffix -SLICE-1` creates the slice end to end", async () => {
  const repo = await tmpRepo("fmp-cli-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: PROPOSED.slice(0, 2)
  });

  const r = spawnSync(
    "bun",
    [
      LOOP_CLI,
      "slice",
      "force-materialize",
      "--id",
      feat.id,
      "--id-suffix",
      "-SLICE-1",
      "--repo",
      repo
    ],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0, got ${r.status}; stderr=${r.stderr}`);

  const updated = await findFeatureById(repo, feat.id);
  assert.equal(updated.frontmatter.slices.length, 1);
});

test("AC-2 CLI: missing --id-suffix exits 1 with a clear error", async () => {
  const repo = await tmpRepo("fmp-cli-missing-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: PROPOSED.slice(0, 2)
  });

  const r = spawnSync(
    "bun",
    [LOOP_CLI, "slice", "force-materialize", "--id", feat.id, "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 1);
  assert.match(r.stderr, /--id-suffix/);
});

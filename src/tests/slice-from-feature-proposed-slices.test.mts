// FEAT-168 / SLICE-100 — sliceFromFeature consumes proposed_slices.
// Atomic multi-slice creation + idempotent rerun + malformed propagation.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import { sliceFromFeature } from "../scripts/lib/slice-linker.mjs";
import {
  addFeature,
  findFeatureById,
  updateFeatureFrontmatter
} from "../scripts/lib/backlog-writer.mjs";
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

test("sliceFromFeature creates all proposed slices atomically", async () => {
  const repo = await tmpRepo("sfp-atomic-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 13,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "Auth", points: 5 },
      { id_suffix: "-SLICE-2", title: "API", points: 5 },
      { id_suffix: "-SLICE-3", title: "Integration", points: 3 }
    ]
  });

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 3, "must materialize all 3 proposed slices");
  assert.equal(out.idempotent, false);
  assert.equal(out.slices[0].title, "Auth");
  assert.equal(out.slices[1].title, "API");
  assert.equal(out.slices[2].title, "Integration");

  // Feature.slices array has all 3 ids in proposal order.
  const updated = await findFeatureById(repo, feat.id);
  assert.equal(updated.frontmatter.slices.length, 3);
  assert.equal(updated.frontmatter.slices[0], out.slices[0].id);
  assert.equal(updated.frontmatter.slices[2], out.slices[2].id);

  // Each slice file exists with the proposed title and effort_points.
  for (let i = 0; i < 3; i += 1) {
    const sl = out.slices[i] as { id: string; path: string; title: string; points: number };
    const sliceContent = await fs.readFile(sl.path, "utf8");
    const { frontmatter } = parseFrontmatter(sliceContent);
    assert.equal(frontmatter.feature, feat.id);
    assert.equal(
      frontmatter.effort_points,
      sl.points,
      `slice ${sl.id} must carry effort_points from proposal`
    );
  }
});

test("sliceFromFeature is idempotent on proposed_slices rerun (no duplicate slices)", async () => {
  const repo = await tmpRepo("sfp-idem-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 8,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "First", points: 5 },
      { id_suffix: "-SLICE-2", title: "Second", points: 3 }
    ]
  });

  const r1 = await sliceFromFeature(repo, feat.id);
  assert.equal(r1.slices.length, 2);
  assert.equal(r1.idempotent, false);
  const slicesAfterR1 = (await findFeatureById(repo, feat.id)).frontmatter.slices;
  assert.equal(slicesAfterR1.length, 2);

  // Re-run: no new slices, no growth.
  const r2 = await sliceFromFeature(repo, feat.id);
  assert.equal(r2.idempotent, true, "rerun must signal idempotent: true");
  const slicesAfterR2 = (await findFeatureById(repo, feat.id)).frontmatter.slices;
  assert.deepEqual(slicesAfterR2, slicesAfterR1, "slices array must not grow");
});

test("sliceFromFeature single-slice path (no proposed_slices) returns slices array of length 1", async () => {
  const repo = await tmpRepo("sfp-single-");
  const feat = await addFeature(repo, { title: "Small work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, { effort_points: 5 });

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 1);
  assert.equal(out.idempotent, false);
  assert.equal(out.slice.id, out.slices[0].id, "out.slice must equal out.slices[0] (back-compat)");
});

// WS-3: surface:*/stack:* propagation must also apply to the multi-slice
// (proposed_slices) materialization path, since it calls the same
// buildSliceContent helper as the single-slice path.
test("sliceFromFeature proposed_slices path: FEAT surface:*/stack:* tags propagate to every materialized slice", async () => {
  const repo = await tmpRepo("sfp-propagate-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 8,
    tags: ["surface:api", "stack:csharp"],
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "First", points: 5 },
      { id_suffix: "-SLICE-2", title: "Second", points: 3 }
    ]
  });

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 2);

  for (const sl of out.slices as { id: string; path: string }[]) {
    const sliceContent = await fs.readFile(sl.path, "utf8");
    const { frontmatter } = parseFrontmatter(sliceContent);
    assert.deepEqual(frontmatter.tags, ["surface:api", "stack:csharp"]);
  }
});

test("from-feature CLI on malformed proposed_slices writes audit + exits 1", async () => {
  const repo = await tmpRepo("sfp-malformed-cli-");
  const feat = await addFeature(repo, { title: "Bad sized" });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 8,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "OK", points: 5 },
      { id_suffix: "-SLICE-2", title: "Bad points", points: 4 } // 4 is NOT Fibonacci
    ]
  });

  const r = spawnSync("bun", [LOOP_CLI, "slice", "from-feature", "--id", feat.id, "--repo", repo], {
    encoding: "utf8"
  });
  assert.equal(r.status, 1, `expected exit 1, got ${r.status}; stderr=${r.stderr}`);
  assert.match(r.stderr, /proposed_slices parse failed/, "stderr must mention parse failure");

  // Audit log entry.
  const auditPath = path.join(repo, ".claude/artifacts/loop/auto-dispatch.jsonl");
  const raw = await fs.readFile(auditPath, "utf8");
  const lines = raw.trim().split("\n").filter(Boolean);
  assert.ok(lines.length >= 1, "must append at least one audit line");
  const lastEntry = JSON.parse(lines[lines.length - 1]!);
  assert.equal(lastEntry.parentCommand, "slice from-feature");
  assert.equal(lastEntry.featureId, feat.id);
  assert.equal(lastEntry.ok, false);
  assert.match(lastEntry.error, /proposed_slices parse failed/);
});

test("sliceFromFeature on undersized proposed_slices throws InvalidProposedSlicesError", async () => {
  const repo = await tmpRepo("sfp-undersized-");
  const feat = await addFeature(repo, { title: "Undersized" });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 13,
    // sum(points) = 5 + 3 = 8 < 13 — should refuse
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "A", points: 5 },
      { id_suffix: "-SLICE-2", title: "B", points: 3 }
    ]
  });
  await assert.rejects(
    () => sliceFromFeature(repo, feat.id),
    (err: Error) =>
      err.name === "InvalidProposedSlicesError" &&
      /sum\(points\)=8 is less than feature effort_points=13/.test(err.message)
  );
});

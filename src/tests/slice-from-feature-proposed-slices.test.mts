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

test("sliceFromFeature creates all proposed slices atomically", async () => {
  const repo = await tmpRepo("sfp-atomic-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 6,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "Auth", points: 2 },
      { id_suffix: "-SLICE-2", title: "API", points: 2 },
      { id_suffix: "-SLICE-3", title: "Integration", points: 2 }
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

  // Each slice file exists with the proposed title, effort_points, and
  // estimated_tokens (runner#393 proposal 4).
  for (let i = 0; i < 3; i += 1) {
    const sl = out.slices[i] as {
      id: string;
      path: string;
      title: string;
      points: number;
      estimatedTokens: number;
    };
    const sliceContent = await fs.readFile(sl.path, "utf8");
    const { frontmatter } = parseFrontmatter(sliceContent);
    assert.equal(frontmatter.feature, feat.id);
    assert.equal(
      frontmatter.effort_points,
      sl.points,
      `slice ${sl.id} must carry effort_points from proposal`
    );
    assert.equal(
      frontmatter.estimated_tokens,
      sl.estimatedTokens,
      `slice ${sl.id} must carry estimated_tokens from proposal`
    );
    assert.equal(
      frontmatter.estimated_tokens,
      20_000 + sl.points * 40_000,
      `slice ${sl.id} estimated_tokens must equal the points-derived default`
    );
  }
});

// runner#393 proposal 4: an explicit estimated_tokens override above the
// ~200k threshold must refuse materialization even though points alone is
// within its own per-entry cap — the token estimator is a second signal a
// points-only cap cannot see (e.g. a low-points slice absorbing a flagged
// landmine).
test("sliceFromFeature refuses when a proposed_slices entry's estimated_tokens exceeds the 200k auto-split threshold", async () => {
  const repo = await tmpRepo("sfp-token-cap-");
  const feat = await addFeature(repo, { title: "Landmine bearing", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 2,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "OAuth callback", points: 1, estimated_tokens: 240_000 }
    ]
  });
  await assert.rejects(
    () => sliceFromFeature(repo, feat.id),
    (err: Error) =>
      err.name === "InvalidProposedSlicesError" &&
      /estimated_tokens value in slice 0 exceeds the ~200k auto-split threshold/.test(err.message)
  );
});

test("sliceFromFeature is idempotent on proposed_slices rerun (no duplicate slices)", async () => {
  const repo = await tmpRepo("sfp-idem-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "First", points: 2 },
      { id_suffix: "-SLICE-2", title: "Second", points: 2 }
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
    effort_points: 4,
    tags: ["surface:api", "stack:csharp"],
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "First", points: 2 },
      { id_suffix: "-SLICE-2", title: "Second", points: 2 }
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

// QW4: per-slice ACs from proposed_slices, and the shared-copy warning for
// siblings that fall back to the FEAT-level ACs.
test("QW4: a proposed_slices entry with its own acceptance_criteria uses those, not the FEAT-level ACs", async () => {
  const repo = await tmpRepo("sfp-own-ac-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: [
      {
        id_suffix: "-SLICE-1",
        title: "First",
        points: 2,
        acceptance_criteria: ["AC-1: first slice's own scoped criterion"]
      },
      { id_suffix: "-SLICE-2", title: "Second", points: 2 }
    ]
  });

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 2);

  const firstContent = await fs.readFile((out.slices[0] as { path: string }).path, "utf8");
  assert.match(firstContent, /- \[ \] AC-1: first slice's own scoped criterion/);
  assert.ok(
    !firstContent.includes("seeded acceptance criterion"),
    "own acceptance_criteria must replace, not merge with, the FEAT-level ACs"
  );
  assert.ok(
    !firstContent.includes("WARNING"),
    "own acceptance_criteria must not trigger the shared-copy warning"
  );

  const secondContent = await fs.readFile((out.slices[1] as { path: string }).path, "utf8");
  assert.match(secondContent, /seeded acceptance criterion/);
  assert.match(
    secondContent,
    /> WARNING: ACs copied from .+ and shared across 2 sibling slices — scope per-slice before close/
  );
});

// QW4 review — the unit tests above construct proposed_slices as an in-memory
// JS object and never touch serializeFrontmatter/parseFrontmatter, so they
// missed that a comma-bearing GWT acceptance_criteria entry got shredded by
// frontmatter.mts's inline-array parser. This test goes through the REAL
// write + read path (updateFeatureFrontmatter -> sliceFromFeature) with
// comma-heavy prose, the median shape for FEAT-277 inline-AC content.
test("QW4: a comma-bearing acceptance_criteria entry round-trips through the real frontmatter read/write path as exactly one checkbox bullet", async () => {
  const repo = await tmpRepo("sfp-comma-ac-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  const gwt = "Given a logged-in user, when they click save, then the record persists";
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: [
      {
        id_suffix: "-SLICE-1",
        title: "First",
        points: 2,
        acceptance_criteria: [gwt]
      },
      { id_suffix: "-SLICE-2", title: "Second", points: 2 }
    ]
  });

  const out = await sliceFromFeature(repo, feat.id);
  const firstContent = await fs.readFile((out.slices[0] as { path: string }).path, "utf8");

  const acBullets = firstContent
    .split("\n")
    .filter((line) => line.startsWith("- [ ]") || line.startsWith("- [x]"));
  assert.equal(acBullets.length, 1, "the comma-bearing AC must produce exactly one bullet");
  assert.equal(acBullets[0], `- [ ] ${gwt}`);
});

test("QW4: no proposed_slices entry carries its own ACs — every sibling gets the shared-copy warning", async () => {
  const repo = await tmpRepo("sfp-shared-warn-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "First", points: 2 },
      { id_suffix: "-SLICE-2", title: "Second", points: 2 }
    ]
  });

  const out = await sliceFromFeature(repo, feat.id);
  for (const sl of out.slices as { path: string }[]) {
    const content = await fs.readFile(sl.path, "utf8");
    assert.match(content, /> WARNING: ACs copied from .+ and shared across 2 sibling slices/);
  }
});

test("QW4: a single-entry proposed_slices array does not trigger the shared-copy warning", async () => {
  const repo = await tmpRepo("sfp-single-proposed-");
  const feat = await addFeature(repo, { title: "Right-sized work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 2,
    proposed_slices: [{ id_suffix: "-SLICE-1", title: "Only slice", points: 2 }]
  });

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 1);
  const content = await fs.readFile((out.slices[0] as { path: string }).path, "utf8");
  assert.ok(
    !content.includes("WARNING"),
    "single-slice proposed_slices must stay silent like the single-slice path"
  );
});

// FEAT-276 AC-4: a proposed_slices entry's own touches_files declares that
// slice's frontmatter directly, and must NOT leak onto a sibling slice that
// declared no touches_files of its own (that would falsely tell the wave
// planner the sibling conflicts on files it never touches).
test("FEAT-276: a proposed_slices entry with its own touches_files declares only that slice's frontmatter", async () => {
  const repo = await tmpRepo("sfp-touches-");
  const feat = await addFeature(repo, { title: "Big work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 4,
    proposed_slices: [
      {
        id_suffix: "-SLICE-1",
        title: "First",
        points: 2,
        touches_files: ["src/scripts/lib/first.mts"]
      },
      { id_suffix: "-SLICE-2", title: "Second", points: 2 }
    ]
  });

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 2);

  const firstContent = await fs.readFile((out.slices[0] as { path: string }).path, "utf8");
  const { frontmatter: firstFm } = parseFrontmatter(firstContent);
  assert.deepEqual(firstFm.touches_files, ["src/scripts/lib/first.mts"]);

  const secondContent = await fs.readFile((out.slices[1] as { path: string }).path, "utf8");
  const { frontmatter: secondFm } = parseFrontmatter(secondContent);
  assert.equal(
    secondFm.touches_files,
    undefined,
    "a sibling with no declared touches_files must not inherit the other slice's paths"
  );
});

// FEAT-276 AC-4: single-slice path — the lone materialized slice IS the
// whole FEAT's scope, so a FEAT-level touches_files is safe to propagate
// 1:1 (unlike the multi-slice case above).
test("FEAT-276: single-slice path propagates FEAT-level touches_files to the sole materialized slice", async () => {
  const repo = await tmpRepo("sfp-touches-single-");
  const feat = await addFeature(repo, { title: "Small work", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 5,
    touches_files: ["src/scripts/lib/small.mts", "src/tests/small.test.mts"]
  });

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 1);
  const content = await fs.readFile((out.slices[0] as { path: string }).path, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.deepEqual(frontmatter.touches_files, [
    "src/scripts/lib/small.mts",
    "src/tests/small.test.mts"
  ]);
});

test("from-feature CLI on malformed proposed_slices writes audit + exits 1", async () => {
  const repo = await tmpRepo("sfp-malformed-cli-");
  const feat = await addFeature(repo, { title: "Bad sized" });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 8,
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "OK", points: 2 },
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
    // sum(points) = 2 + 2 = 4 < 13 — should refuse
    proposed_slices: [
      { id_suffix: "-SLICE-1", title: "A", points: 2 },
      { id_suffix: "-SLICE-2", title: "B", points: 2 }
    ]
  });
  await assert.rejects(
    () => sliceFromFeature(repo, feat.id),
    (err: Error) =>
      err.name === "InvalidProposedSlicesError" &&
      /sum\(points\)=4 is less than feature effort_points=13/.test(err.message)
  );
});

// FEAT-284 SLICE-192 — materializeProposedSlices used to decide what to
// create by COUNT (Math.max(existingSlices.length, startIndex)), never by
// identity. Live repro (2026-08-04, FEAT-259): ordinal 1 was silently
// dropped while ordinals 2-5 materialized; re-running saw
// existingSlices.length === 4 and re-created proposed[4] (ordinal 5) a
// SECOND time, while ordinal 1 stayed missing. These slice files below are
// built with `createSlice` directly and carry NO `proposed_slice_id_suffix`
// — the exact shape of every slice materialized before this fix shipped —
// so the regression exercises the legacy title-matching fallback, not just
// the happy path where the new stamp is already present.
const GAPPED_PROPOSED = [
  { id_suffix: "-SLICE-1", title: "Fixture rebuild", points: 2 },
  { id_suffix: "-SLICE-2", title: "Diff corroboration", points: 2 },
  { id_suffix: "-SLICE-3", title: "Downgrade warnings", points: 2 },
  { id_suffix: "-SLICE-4", title: "Migrate frontmatter shape", points: 2 },
  { id_suffix: "-SLICE-5", title: "Idle-ping suppression", points: 2 }
];

async function seedGappedFeature(repo: string) {
  const feat = await addFeature(repo, { title: "Gapped decomposition", body: AC_SECTION_BODY });
  await updateFeatureFrontmatter(feat.filePath, {
    effort_points: 10,
    proposed_slices: GAPPED_PROPOSED
  });

  // Pre-materialize ordinals 2-5 as legacy slices (no proposed_slice_id_suffix
  // stamp), simulating the FEAT-259/FEAT-284 state where ordinal 1 alone was
  // dropped by the (now-fixed) git-anchored reconcile bug.
  const entry = await findFeatureById(repo, feat.id);
  const legacyIds: string[] = [];
  for (const item of GAPPED_PROPOSED.slice(1)) {
    const created = await createSlice({
      repoPath: repo,
      featureId: feat.id,
      featureFilePath: entry.filePath,
      featureFrontmatter: entry.frontmatter,
      featureBody: entry.body,
      title: item.title,
      effortPoints: item.points,
      estimatedTokens: 100_000
    });
    legacyIds.push(created.id);
  }
  await updateFeatureFrontmatter(feat.filePath, { slices: legacyIds });
  return { feat, legacyIds };
}

test("SLICE-192: fills a dropped ordinal by identity and does not duplicate already-materialized siblings (FEAT-284/FEAT-259 regression)", async () => {
  const repo = await tmpRepo("sfp-gap-fill-");
  const { feat, legacyIds } = await seedGappedFeature(repo);

  // Re-run: must create exactly the missing ordinal 1, never a duplicate of
  // any of the 4 already-materialized siblings.
  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.idempotent, false);
  assert.equal(out.slices.length, 1, "must create exactly the one missing ordinal");
  assert.equal(
    out.slices[0].title,
    "Fixture rebuild",
    "must be ordinal 1's title, not a duplicate"
  );
  const newId = out.slices[0].id;
  assert.ok(
    !legacyIds.includes(newId),
    "the created slice must be a new id, not a duplicate of a sibling"
  );

  const afterFirstRerun = await findFeatureById(repo, feat.id);
  assert.equal(
    afterFirstRerun.frontmatter.slices.length,
    5,
    "5 proposed entries -> 5 total slices"
  );
  assert.deepEqual(
    new Set(afterFirstRerun.frontmatter.slices),
    new Set([...legacyIds, newId]),
    "no sibling id was duplicated or lost"
  );

  // Re-running again must now be fully idempotent — nothing missing, no
  // second copy of ordinal 1 or any sibling (the observed bug: a second
  // `from-feature` invocation re-created the LAST proposed entry a second
  // time and published a redundant tracker issue for it).
  const out2 = await sliceFromFeature(repo, feat.id);
  assert.equal(out2.idempotent, true);
  const afterSecondRerun = await findFeatureById(repo, feat.id);
  assert.deepEqual(
    afterSecondRerun.frontmatter.slices,
    afterFirstRerun.frontmatter.slices,
    "idempotent rerun must not grow the slices array"
  );
});

test("SLICE-192: idempotent-rerun report keys off real identity, not existingSlices[i] <-> proposed[i] position (AC-2)", async () => {
  const repo = await tmpRepo("sfp-gap-relabel-");
  const { feat, legacyIds } = await seedGappedFeature(repo);

  // Fill the gap, then re-run once more to land in the idempotent branch.
  await sliceFromFeature(repo, feat.id);
  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.idempotent, true);
  assert.equal(out.slices.length, 5);

  // `legacyIds[0]` is physically ordinal 2 ("Diff corroboration") — it sits
  // FIRST in the FEAT's `slices` array because it was materialized before
  // ordinal 1 was ever created. The old position-based report paired
  // existingSlices[0] with proposed[0] (ordinal 1's title) — exactly the
  // wrong answer. The fix must report legacyIds[0] under its OWN title.
  const reportedForLegacy0 = out.slices.find((s: { id: string }) => s.id === legacyIds[0]);
  assert.ok(reportedForLegacy0, `expected a report entry for ${legacyIds[0]}`);
  assert.equal(
    reportedForLegacy0!.title,
    "Diff corroboration",
    "must report the slice's own identity-matched title, not proposed[i] by array position"
  );

  // And every other reported entry's title matches its real proposed
  // identity too — not just the one case above.
  const byTitle = new Map(GAPPED_PROPOSED.map((p) => [p.title, p.id_suffix]));
  for (const sl of out.slices as { id: string; title: string; points: number }[]) {
    const matchingProposal = GAPPED_PROPOSED.find((p) => p.title === sl.title);
    assert.ok(
      matchingProposal,
      `reported title "${sl.title}" must match a real proposed_slices entry`
    );
    assert.equal(sl.points, matchingProposal!.points);
    assert.ok(byTitle.has(sl.title));
  }
});

// FEAT-284 SLICE-192: loop.mts's `slice from-feature` handler publishes every
// entry in `out.slices` to the tracker (the mechanism that turned the
// duplicate into a redundant GitHub issue, #598). The create-path return
// must therefore contain ONLY the slice(s) actually created this call —
// never a already-materialized sibling — so a caller iterating `out.slices`
// to publish never re-publishes an existing slice.
test("SLICE-192: the create-path return contains only the newly created slice, never an already-materialized sibling (publish-safety)", async () => {
  const repo = await tmpRepo("sfp-gap-publish-safe-");
  const { feat, legacyIds } = await seedGappedFeature(repo);

  const out = await sliceFromFeature(repo, feat.id);
  assert.equal(out.slices.length, 1);
  for (const sl of out.slices as { id: string }[]) {
    assert.ok(
      !legacyIds.includes(sl.id),
      "materialize's create-path result must never include an already-materialized sibling id"
    );
  }
});

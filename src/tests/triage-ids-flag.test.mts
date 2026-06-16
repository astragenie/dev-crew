// FEAT-201 — /loop:triage --ids flag tests.
// Three test groups:
//   1. Unit: flag parser recognises --ids and produces a list of 3 ids.
//   2. Unit: mutual-exclusion guard: --ids + --include-triaged → exit 2.
//   3. Integration: fixture triaged/ dir with 3 FEATs; --ids runs scoring on
//      exactly those 3; other triaged FEATs are untouched (pm_reviewed field
//      unchanged on them).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { listPendingFeatureIds } from "../scripts/lib/backlog-list-ids.mjs";

const LOOP_CLI = path.resolve("src/scripts/loop.mts");

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

// ---------------------------------------------------------------------------
// 1. Unit: CLI flag parser recognises --ids
// ---------------------------------------------------------------------------

test("CLI backlog list-pending-ids --ids parses 3 ids and returns them", async () => {
  const repo = await tmpRepo("triage-ids-unit-");
  // Create 3 FEATs in pending then move to triaged
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });
  const c = await addFeature(repo, { title: "Charlie", body: "z", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });
  await moveFeature(b.filePath, "triaged", { status: "triaged" });
  await moveFeature(c.filePath, "triaged", { status: "triaged" });

  const idsArg = [a.id, b.id, c.id].join(",");
  const r = spawnSync(
    "bun",
    [LOOP_CLI, "backlog", "list-pending-ids", "--ids", idsArg, "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.equal(parsed.ids.length, 3, "should return exactly 3 ids");
  assert.deepEqual(parsed.ids.sort(), [a.id, b.id, c.id].sort(), "ids must match requested set");
});

// ---------------------------------------------------------------------------
// 2. Unit: mutual-exclusion guard
// ---------------------------------------------------------------------------

test("CLI backlog list-pending-ids --ids + --include-triaged exits with code 2", async () => {
  const repo = await tmpRepo("triage-ids-mutex-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });

  const r = spawnSync(
    "bun",
    [
      LOOP_CLI,
      "backlog",
      "list-pending-ids",
      "--ids",
      a.id,
      "--include-triaged",
      "--repo",
      repo
    ],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 2, `expected exit 2; got ${r.status}; stderr=${r.stderr}`);
  assert.match(
    r.stderr,
    /--ids.*--include-triaged|--include-triaged.*--ids|not both/i,
    "stderr must explain the mutual-exclusion"
  );
});

// ---------------------------------------------------------------------------
// 3. Unit: library function — listPendingFeatureIds with ids option
// ---------------------------------------------------------------------------

test("listPendingFeatureIds with ids returns only the requested triaged ids", async () => {
  const repo = await tmpRepo("triage-ids-lib-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });
  const c = await addFeature(repo, { title: "Charlie", body: "z", category: "feature" });
  const d = await addFeature(repo, { title: "Delta", body: "w", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });
  await moveFeature(b.filePath, "triaged", { status: "triaged" });
  await moveFeature(c.filePath, "triaged", { status: "triaged" });
  await moveFeature(d.filePath, "triaged", { status: "triaged" });

  // Request only 3 of the 4 triaged FEATs
  const ids = await listPendingFeatureIds(repo, { ids: [a.id, b.id, c.id].join(",") });
  assert.equal(ids.length, 3, "should return exactly 3 ids");
  assert.deepEqual(ids.sort(), [a.id, b.id, c.id].sort());
  assert.ok(!ids.includes(d.id), "d.id must NOT appear in the result");
});

test("listPendingFeatureIds with ids throws invalid_ids for missing triaged FEAT", async () => {
  const repo = await tmpRepo("triage-ids-missing-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });

  await assert.rejects(
    () => listPendingFeatureIds(repo, { ids: "FEAT-999" }),
    (err: any) => {
      assert.equal(err.halt_reason, "invalid_ids");
      assert.ok(err.missing_ids?.includes("FEAT-999"), "missing_ids should list FEAT-999");
      return true;
    }
  );
});

test("listPendingFeatureIds with ids throws invalid_ids for malformed id", async () => {
  const repo = await tmpRepo("triage-ids-malformed-");

  await assert.rejects(
    () => listPendingFeatureIds(repo, { ids: "not-a-feat,FEAT-001" }),
    (err: any) => {
      assert.equal(err.halt_reason, "invalid_ids");
      assert.ok(err.malformed_ids?.includes("not-a-feat"), "malformed_ids should list bad id");
      return true;
    }
  );
});

test("listPendingFeatureIds with ids accepts split-feature FEAT-NNNa format (FEAT-119a style)", async () => {
  const repo = await tmpRepo("triage-ids-split-feat-");
  // Add a feature and manually move it to triaged under a FEAT-NNNa filename
  // by using addFeature then renaming the file.
  const a = await addFeature(repo, { title: "Split Alpha", body: "x", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });

  // The split-feature id has a letter suffix appended to the numeric part (no hyphen).
  // We test that the regex accepts the format — use the real id we got back.
  // Construct a synthetic FEAT-NNNa id to verify the regex accepts it at the
  // format-check level (before the triaged-existence check fires).
  // A missing-triaged error (not malformed) proves format was accepted.
  const syntheticId = "FEAT-119a";
  await assert.rejects(
    () => listPendingFeatureIds(repo, { ids: syntheticId }),
    (err: any) => {
      // Must fail with missing_ids (not found in triaged), NOT malformed_ids.
      // If halt_reason is invalid_ids and missing_ids contains FEAT-119a,
      // the format was accepted and the failure is existence-only.
      assert.equal(err.halt_reason, "invalid_ids", "should fail with invalid_ids");
      assert.ok(
        err.missing_ids?.includes("FEAT-119a"),
        `missing_ids should list FEAT-119a (existence failure), got: ${JSON.stringify(err)}`
      );
      assert.ok(
        !err.malformed_ids?.includes("FEAT-119a"),
        "FEAT-119a must NOT appear in malformed_ids — it is a valid format"
      );
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// 4. Integration: other triaged FEATs are untouched (pm_reviewed unchanged)
// ---------------------------------------------------------------------------

test("integration: --ids reads only target FEATs; bystander FEAT file is unmodified", async () => {
  const repo = await tmpRepo("triage-ids-integration-");
  const a = await addFeature(repo, { title: "Target1", body: "x", category: "feature" });
  const b = await addFeature(repo, { title: "Target2", body: "y", category: "feature" });
  const c = await addFeature(repo, { title: "Bystander", body: "z", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });
  await moveFeature(b.filePath, "triaged", { status: "triaged" });
  await moveFeature(c.filePath, "triaged", { status: "triaged" });

  // Record mtime of bystander before the --ids call
  const backlogRoot = path.join(repo, ".claude/artifacts/loop/backlog/triaged");
  const bystanderFile = path.join(backlogRoot, path.basename(c.filePath));
  const statBefore = await fs.stat(bystanderFile);

  // Run list-pending-ids --ids a,b — must NOT touch c
  const idsArg = [a.id, b.id].join(",");
  const r = spawnSync(
    "bun",
    [LOOP_CLI, "backlog", "list-pending-ids", "--ids", idsArg, "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.ids.sort(), [a.id, b.id].sort(), "only targeted ids returned");

  // Bystander file must be unmodified
  const statAfter = await fs.stat(bystanderFile);
  assert.equal(
    statBefore.mtimeMs,
    statAfter.mtimeMs,
    "bystander FEAT file mtime must be unchanged"
  );
});

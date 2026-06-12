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

test("listPendingFeatureIds returns ids of pending FEATs only, sorted ascending", async () => {
  const repo = await tmpRepo("al-list-ids-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const ids = await listPendingFeatureIds(repo);
  assert.deepEqual(ids, [a.id, b.id]);
});

test("listPendingFeatureIds excludes triaged entries", async () => {
  const repo = await tmpRepo("al-list-ids-excl-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });

  await moveFeature(a.filePath, "triaged", { status: "triaged" });

  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const ids = await listPendingFeatureIds(repo);
  assert.deepEqual(ids, [b.id]);
});

test("listPendingFeatureIds returns [] when no pending entries", async () => {
  const repo = await tmpRepo("al-list-ids-empty-");
  await fs.mkdir(path.join(repo, "docs/backlog/pending"), { recursive: true });
  const ids = await listPendingFeatureIds(repo);
  assert.deepEqual(ids, []);
});

// FEAT-194 / SLICE-110 — opts.includeTriaged

test("listPendingFeatureIds with includeTriaged true returns pending + triaged", async () => {
  const repo = await tmpRepo("al-list-ids-include-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const ids = await listPendingFeatureIds(repo, { includeTriaged: true });
  assert.deepEqual(ids.sort(), [a.id, b.id].sort());
});

test("listPendingFeatureIds with includeTriaged false matches default (pending-only)", async () => {
  const repo = await tmpRepo("al-list-ids-explicit-false-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const ids = await listPendingFeatureIds(repo, { includeTriaged: false });
  assert.deepEqual(ids, [b.id]);
});

test("CLI backlog list-pending-ids (default) returns pending-only", async () => {
  const repo = await tmpRepo("al-list-ids-cli-default-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const r = spawnSync(
    "bun",
    [LOOP_CLI, "backlog", "list-pending-ids", "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.ids, [b.id]);
});

test("CLI backlog list-pending-ids --include-triaged merges pending + triaged", async () => {
  const repo = await tmpRepo("al-list-ids-cli-include-");
  const a = await addFeature(repo, { title: "Alpha", body: "x", category: "feature" });
  await moveFeature(a.filePath, "triaged", { status: "triaged" });
  const b = await addFeature(repo, { title: "Bravo", body: "y", category: "feature" });

  const r = spawnSync(
    "bun",
    [LOOP_CLI, "backlog", "list-pending-ids", "--include-triaged", "--repo", repo],
    { encoding: "utf8" }
  );
  assert.equal(r.status, 0, `expected exit 0; stderr=${r.stderr}`);
  const parsed = JSON.parse(r.stdout);
  assert.deepEqual(parsed.ids.sort(), [a.id, b.id].sort());
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { listPendingFeatureIds } from "../scripts/lib/backlog-list-ids.mjs";

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

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { validateSnapshotFreshness } from "../scripts/validate-snapshot-freshness.mjs";
import { writeMemorySnapshot } from "../scripts/lib/memory-snapshot.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { clearAll } from "../scripts/lib/cache.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function addTriaged(repo: string, title: string, updates: Record<string, any> = {}) {
  const f = await addFeature(repo, { title });
  await moveFeature(f.filePath, "triaged", { priority: "P2", category: "feature", ...updates });
  return {
    id: f.id,
    filePath: path.join(repo, ".claude/artifacts/loop/backlog/triaged", `${f.id}.md`)
  };
}

async function writeGradeFixture(repo: string, featureId: string, sliceId: string) {
  const dir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(dir, { recursive: true });
  const stamp = `${new Date().toISOString().replace(/[:-]/g, "").split(".")[0]}Z`;
  const filename = `${stamp}-${featureId.toLowerCase()}-${sliceId.toLowerCase()}-grade.md`;
  const content = `---
kind: grade
slice: ${sliceId}
feature: ${featureId}
---

# Grade for ${sliceId}

## Scores

- architecture_quality: 0.9
- reliability: 0.9
- observability: 0.9
- production_readiness: 0.9
- security: 0.9
- test_confidence: 0.9
- product_completeness: 0.9
`;
  await fs.writeFile(path.join(dir, filename), content);
}

// AC-2: a snapshot regenerated at (or after) the newest backlog/grade change
// must not false-positive.
test("validateSnapshotFreshness passes on a freshly regenerated snapshot", async () => {
  const repo = await tmpRepo("al-freshness-fresh-");
  await addTriaged(repo, "Live feature");

  await writeMemorySnapshot(repo);

  const result = await validateSnapshotFreshness(repo);
  assert.equal(result.ok, true, `expected fresh snapshot to pass: ${result.errors.join("; ")}`);
  assert.deepEqual(result.errors, []);
});

// AC-1 / AC-3: reproduce the exact drift observed live in the 2026-07-02
// retrospective — a FEAT physically moved to done/ and graded, while the
// on-disk snapshot (never regenerated since) still lists it under "Top
// triaged (next to slice)" and understates the Done/grade counts.
test("validateSnapshotFreshness fails on a stale snapshot reproducing live backlog/grade drift", async () => {
  const repo = await tmpRepo("al-freshness-stale-");
  const featureA = await addTriaged(repo, "Feature A — will move to done");
  await addTriaged(repo, "Feature B — stays triaged");

  // Snapshot captured BEFORE the drift — this is the file that ships to
  // disk and is never regenerated, mirroring the live bug.
  const staleSnapshot = await writeMemorySnapshot(repo);
  const staleContent = await fs.readFile(staleSnapshot.artifactPath, "utf8");
  assert.ok(
    staleContent.includes(featureA.id),
    "sanity: stale snapshot lists Feature A under Top triaged"
  );

  // Real state changes: Feature A moves to done/ and gets graded — exactly
  // like FEAT-090/FEAT-094 being physically in done/ while the snapshot
  // still called them "next to slice".
  await moveFeature(featureA.filePath, "done", {});
  await writeGradeFixture(repo, featureA.id, "SLICE-01");
  // Bust the process-scoped listBacklog/listGrades cache — writeGradeFixture
  // and moveFeature above wrote directly to disk without going through the
  // cache-busting write paths for a *second* pass over the same repoPath.
  clearAll();

  // The on-disk file was never regenerated after the drift (re-plant the
  // stale content explicitly, in case the harness touched the file).
  await fs.writeFile(staleSnapshot.artifactPath, staleContent);

  const result = await validateSnapshotFreshness(repo);
  assert.equal(result.ok, false, "stale snapshot must fail the freshness gate");
  assert.ok(result.errors.length > 0, "must report at least one drift error");
  assert.match(result.errors.join("\n"), /out of date/);
});

test("validateSnapshotFreshness fails when loop-snapshot.md does not exist", async () => {
  const repo = await tmpRepo("al-freshness-missing-");
  const result = await validateSnapshotFreshness(repo);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /not found/);
});

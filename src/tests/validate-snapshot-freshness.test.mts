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

// DEC-063: the FEAT-205 "## Dispatch lifecycle" section renders LIVE dispatch
// state (worktree count, oldest-run age in days). It is machine- and
// time-dependent — a clean CI checkout has zero live worktrees and the age
// grows every hour — so the freshness gate must ignore it. Reproduces the
// merge-time CI failure where an on-disk snapshot carrying a local Dispatch
// lifecycle section failed against a regenerated one that had none.
test("validateSnapshotFreshness ignores the volatile Dispatch lifecycle section", async () => {
  const repo = await tmpRepo("al-freshness-dispatch-");
  await addTriaged(repo, "Live feature");
  const snap = await writeMemorySnapshot(repo);

  // Inject a live-state Dispatch lifecycle section ahead of the usage footer —
  // exactly what FEAT-205 renders on a machine with open worktrees, and what a
  // clean CI regeneration would NOT produce.
  const fresh = await fs.readFile(snap.artifactPath, "utf8");
  const injected = fresh.replace(
    "## How to use this file",
    [
      "## Dispatch lifecycle",
      "",
      "- Open runIds (1): 2026-06-13T10-55-42-834Z-888fb4",
      "- Worktree count (open runs): 4",
      "- Oldest runId age: 20.1d",
      "- Hint: run `bun src/scripts/loop.mts dispatch prune` to reap stale runs (>7d)",
      "",
      "## How to use this file"
    ].join("\n")
  );
  await fs.writeFile(snap.artifactPath, injected);

  const result = await validateSnapshotFreshness(repo);
  assert.equal(
    result.ok,
    true,
    `dispatch-lifecycle drift must not fail the gate: ${result.errors.join("; ")}`
  );
});

// FEAT-263 Phase 3d: the "Memory usefulness (7d)" bullet reads the LIVE
// astramem daemon — served/used counts move hourly and a CI checkout has no
// daemon ("n/a"), so the gate must ignore that line by the same DEC-063
// rationale. Reproduces the PR #518 CI failure where a snapshot committed
// with live numbers failed against a daemon-less regeneration.
test("validateSnapshotFreshness ignores the volatile Memory usefulness line", async () => {
  const repo = await tmpRepo("al-freshness-usefulness-");
  await addTriaged(repo, "Live feature");
  const snap = await writeMemorySnapshot(repo);

  const fresh = await fs.readFile(snap.artifactPath, "utf8");
  const injected = fresh.includes("- Memory usefulness (7d):")
    ? fresh.replace(
        /- Memory usefulness \(7d\):.*$/m,
        "- Memory usefulness (7d): served=862 used=14 rate=1.6%"
      )
    : fresh.replace(
        "## How to use this file",
        "- Memory usefulness (7d): served=862 used=14 rate=1.6%\n\n## How to use this file"
      );
  await fs.writeFile(snap.artifactPath, injected);

  const result = await validateSnapshotFreshness(repo);
  assert.equal(
    result.ok,
    true,
    `memory-usefulness drift must not fail the gate: ${result.errors.join("; ")}`
  );
});

test("validateSnapshotFreshness fails when loop-snapshot.md does not exist", async () => {
  const repo = await tmpRepo("al-freshness-missing-");
  const result = await validateSnapshotFreshness(repo);
  assert.equal(result.ok, false);
  assert.match(result.errors.join("\n"), /not found/);
});

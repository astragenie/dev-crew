import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { writeMemorySnapshot } from "../scripts/lib/memory-snapshot.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { initializeIterationCounter, incrementIteration } from "../scripts/lib/loop-iteration.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeCostReport(repo: string, sliceId: string, usdValue: number) {
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const filename = `${timestamp}-cost-report-slice-${sliceId}.md`;
  const filepath = path.join(dir, filename);
  const content = `---
kind: cost-report
slice: ${sliceId}
usd: ${usdValue}
created_at: 2026-05-22T12:00:00Z
---

# Cost Report for ${sliceId}

Cost analysis here.
`;
  await fs.writeFile(filepath, content);
  return filepath;
}

test("writeMemorySnapshot includes Loop telemetry section", async () => {
  const repo = await tmpRepo("al-snapshot-telemetry-");
  // Create minimal backlog structure
  await addFeature(repo, { title: "Test" });
  const snapshot = await writeMemorySnapshot(repo);

  const content = await fs.readFile(snapshot.artifactPath, "utf8");
  assert.ok(
    content.includes("## Loop telemetry"),
    "snapshot should include Loop telemetry section"
  );
});

test("writeMemorySnapshot reports n/a when no loop history exists", async () => {
  const repo = await tmpRepo("al-snapshot-no-history-");
  // Create minimal backlog, but don't initialize loop state
  await addFeature(repo, { title: "Test" });
  const snapshot = await writeMemorySnapshot(repo);

  const content = await fs.readFile(snapshot.artifactPath, "utf8");
  assert.ok(content.includes("Iteration count: 0 / 25"), "should report 0 iterations");
  assert.ok(
    content.includes("In-window cost trajectory: n/a"),
    "should report n/a for cost without reports"
  );
  assert.ok(content.includes("Last cost-advisor verdict: n/a"), "should report n/a for verdict");
});

test("writeMemorySnapshot reports actual iteration count and cap when loop has run", async () => {
  const repo = await tmpRepo("al-snapshot-with-iterations-");
  // Create minimal backlog
  await addFeature(repo, { title: "Test" });

  // Initialize and increment iteration counter
  await initializeIterationCounter(repo);
  for (let i = 0; i < 5; i++) {
    await incrementIteration(repo);
  }

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(
    content.includes("Iteration count: 5 / 25"),
    "should report actual iteration count and cap"
  );
});

test("writeMemorySnapshot includes per-iteration avg USD when cost reports exist", async () => {
  const repo = await tmpRepo("al-snapshot-cost-reports-");
  // Create minimal backlog
  await addFeature(repo, { title: "Test" });

  // Initialize iterations
  await initializeIterationCounter(repo);
  for (let i = 0; i < 3; i++) {
    await incrementIteration(repo);
  }

  // Write cost reports
  await writeCostReport(repo, "SLICE-01", 10.5);
  await writeCostReport(repo, "SLICE-02", 15.0);
  await writeCostReport(repo, "SLICE-03", 20.5);

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  // Average should be (10.5 + 15.0 + 20.5) / 3 = 15.333
  assert.ok(
    content.includes("$15.333 per iteration (3 reports)"),
    "should report per-iteration average USD"
  );
});

test("writeMemorySnapshot snapshot remains valid with mixed empty and full state", async () => {
  const repo = await tmpRepo("al-snapshot-mixed-");
  // Create some backlog
  await addFeature(repo, { title: "Feature A" });
  const f = await addFeature(repo, { title: "Feature B" });
  await moveFeature(f.filePath, "triaged", { priority: "P1", category: "feature" });

  // No loop state, no cost reports
  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  // Should have both backlog state and loop telemetry
  assert.ok(content.includes("## Backlog state"), "should have backlog state");
  assert.ok(content.includes("## Loop telemetry"), "should have loop telemetry");
  assert.ok(content.includes("Iteration count: 0 / 25"), "should have iteration info");
});

test("writeMemorySnapshot includes return count of cost reports", async () => {
  const repo = await tmpRepo("al-snapshot-return-count-");
  await addFeature(repo, { title: "Test" });

  // Write cost reports
  await writeCostReport(repo, "SLICE-01", 10.0);
  await writeCostReport(repo, "SLICE-02", 20.0);

  const result = await writeMemorySnapshot(repo);
  assert.equal(result.counts.costReports, 2, "should return cost report count");
});

test("writeMemorySnapshot handles zero cost reports gracefully", async () => {
  const repo = await tmpRepo("al-snapshot-zero-costs-");
  await addFeature(repo, { title: "Test" });
  await initializeIterationCounter(repo);

  // No cost reports written
  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(
    content.includes("In-window cost trajectory: n/a"),
    "should handle zero reports gracefully"
  );
});

/** Extract the `- **FEAT-NNN**` bullet ids from the "Top triaged" section only. */
function topTriagedIds(content: string): string[] {
  const start = content.indexOf("## Top triaged (next to slice)");
  if (start === -1) return [];
  const rest = content.slice(start + 1);
  const end = rest.indexOf("\n## ");
  const section = end === -1 ? rest : rest.slice(0, end);
  return [...section.matchAll(/- \*\*(FEAT-\d+)\*\*/g)].map((m) => m[1]!);
}

async function addTriaged(repo: string, title: string, updates: Record<string, any>) {
  const f = await addFeature(repo, { title });
  await moveFeature(f.filePath, "triaged", { priority: "P2", category: "feature", ...updates });
  return f.id;
}

// AC-2: deferred FEAT excluded from Top-triaged when >=5 non-deferred exist
test("writeMemorySnapshot excludes deferred FEAT from Top triaged (>=5 non-deferred)", async () => {
  const repo = await tmpRepo("al-snapshot-deferred-excl-");
  const deferredId = await addTriaged(repo, "Blocked upstream", { priority: "P1", deferred: true });
  const liveIds: string[] = [];
  for (let i = 0; i < 5; i++) liveIds.push(await addTriaged(repo, `Live feature ${i}`, {}));

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");
  const top = topTriagedIds(content);

  assert.ok(!top.includes(deferredId), `deferred ${deferredId} must not appear in Top triaged`);
  assert.equal(top.length, 5, "Top triaged should show 5 non-deferred entries");
  for (const id of top)
    assert.ok(liveIds.includes(id), `${id} should be a live (non-deferred) feature`);
});

// AC-3: no padding with the deferred entry when fewer than 5 non-deferred exist
test("writeMemorySnapshot does not pad Top triaged with deferred entry (<5 non-deferred)", async () => {
  const repo = await tmpRepo("al-snapshot-deferred-nopad-");
  const deferredId = await addTriaged(repo, "Blocked upstream", { priority: "P1", deferred: true });
  const liveA = await addTriaged(repo, "Live A", {});
  const liveB = await addTriaged(repo, "Live B", {});

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");
  const top = topTriagedIds(content);

  assert.ok(!top.includes(deferredId), `deferred ${deferredId} must not appear`);
  assert.deepEqual(top.sort(), [liveA, liveB].sort(), "only the two non-deferred features appear");
});

test("writeMemorySnapshot parses cost report USD values correctly", async () => {
  const repo = await tmpRepo("al-snapshot-parse-usd-");
  await addFeature(repo, { title: "Test" });

  // Write cost reports with decimal USD values
  await writeCostReport(repo, "SLICE-01", 5.75);
  await writeCostReport(repo, "SLICE-02", 10.25);

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  // Average should be (5.75 + 10.25) / 2 = 8.0, formatted as 8.000
  assert.ok(
    content.includes("$8.000 per iteration (2 reports)"),
    "should correctly parse and average USD values"
  );
});

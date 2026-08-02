import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { writeMemorySnapshot, generateSnapshotContent } from "../scripts/lib/memory-snapshot.mjs";
import { addFeature, moveFeature } from "../scripts/lib/backlog-writer.mjs";
import { initializeIterationCounter, incrementIteration } from "../scripts/lib/loop-iteration.mjs";
import { recordDispatchOutcome, recordPauseEvent } from "../scripts/lib/pause-telemetry.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeCostReport(
  repo: string,
  sliceId: string,
  usdValue: number,
  opts: { aggregate_all?: boolean } = {}
) {
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const filename = `${timestamp}-cost-report-slice-${sliceId}.md`;
  const filepath = path.join(dir, filename);
  const content = `---
kind: cost-report
slice: ${sliceId}
usd: ${usdValue}${opts.aggregate_all ? "\naggregate_all: true" : ""}
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

test("writeMemorySnapshot includes per-cost-report median/mean USD when cost reports exist", async () => {
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

  // Median of (10.5, 15.0, 20.5) = 15.0; mean = 15.333
  assert.ok(
    content.includes("median $15.000 / mean $15.333 per cost-report (3 slice-close session scans)"),
    "should report per-cost-report median and mean USD"
  );
});

test("cost trajectory excludes aggregate_all rollup reports and survives wide-window outliers via median", async () => {
  const repo = await tmpRepo("al-snapshot-cost-agg-");
  await addFeature(repo, { title: "Test" });

  await writeCostReport(repo, "SLICE-01", 10.0);
  await writeCostReport(repo, "SLICE-02", 3200.0); // dev-team#178-style wide-window outlier
  await writeCostReport(repo, "SLICE-03", 14.0);
  // Aggregate rollup must not count at all (double-counts its sources).
  await writeCostReport(repo, "SLICE-04", 999.0, { aggregate_all: true });

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  // 3 counted reports (aggregate excluded); median 14.0 unaffected by the outlier.
  assert.ok(
    content.includes(
      "median $14.000 / mean $1074.667 per cost-report (3 slice-close session scans)"
    ),
    `aggregate excluded + median robust; got: ${content.match(/In-window cost trajectory:.*/)?.[0]}`
  );

  // FEAT-269 AC-1/AC-3: the excluded aggregate is also surfaced as its own
  // count, matching the single aggregate_all fixture written above.
  assert.ok(
    content.includes("Aggregate reports excluded from cost trajectory: 1"),
    `expected aggregate-excluded count line; got: ${content.match(/Aggregate reports excluded.*/)?.[0]}`
  );
});

// FEAT-269 AC-2: zero aggregate reports in the window -- the count line is
// omitted entirely and the existing trajectory line is unaffected.
test("aggregate-excluded count line is omitted when no aggregate_all reports exist", async () => {
  const repo = await tmpRepo("al-snapshot-cost-noagg-");
  await addFeature(repo, { title: "Test" });

  await writeCostReport(repo, "SLICE-01", 10.5);
  await writeCostReport(repo, "SLICE-02", 15.0);

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(
    !content.includes("Aggregate reports excluded"),
    "aggregate-excluded line must be omitted when zero aggregate reports are present"
  );
  assert.ok(
    content.includes("median $12.750 / mean $12.750 per cost-report (2 slice-close session scans)"),
    "existing trajectory output must be unaffected"
  );
});

test("same-slice re-reports collapse to the newest report (dev-team#178 wide-window repeats)", async () => {
  const repo = await tmpRepo("al-snapshot-cost-slicededup-");
  await addFeature(repo, { title: "Test" });

  // Same slice reported 3x (emitter re-scan bug); distinct sibling once.
  await writeCostReport(repo, "SLICE-99", 3200.0);
  await writeCostReport(repo, "SLICE-99", 3210.0);
  await writeCostReport(repo, "SLICE-99", 3220.0);
  await writeCostReport(repo, "SLICE-07", 12.0);

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  // 2 counted: newest SLICE-99 report + SLICE-07. Newest-first file order means
  // one of the SLICE-99 values survives (same-second timestamps make which one
  // ordering-dependent); assert the shape: exactly 2 scans, mean ≈ (32xx+12)/2.
  const line = content.match(/In-window cost trajectory:.*/)?.[0] ?? "";
  assert.ok(line.includes("(2 slice-close session scans)"), `expected 2 scans; got: ${line}`);
  const mean = Number(line.match(/mean \$([\d.]+)/)?.[1]);
  assert.ok(mean > 1600 && mean < 1620, `mean should be ~(3200..3220+12)/2; got: ${line}`);
});

test("writeMemorySnapshot snapshot remains valid with mixed empty and full state", async () => {
  const repo = await tmpRepo("al-snapshot-mixed-");
  // Create some backlog
  await addFeature(repo, { title: "Feature A" });
  const f = await addFeature(repo, { title: "Feature B" });
  await moveFeature(f.filePath, "triaged", {
    priority: "P1",
    category: "feature"
  });

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
  await moveFeature(f.filePath, "triaged", {
    priority: "P2",
    category: "feature",
    ...updates
  });
  return f.id;
}

// AC-2: deferred FEAT excluded from Top-triaged when >=5 non-deferred exist
test("writeMemorySnapshot excludes deferred FEAT from Top triaged (>=5 non-deferred)", async () => {
  const repo = await tmpRepo("al-snapshot-deferred-excl-");
  const deferredId = await addTriaged(repo, "Blocked upstream", {
    priority: "P1",
    deferred: true
  });
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
  const deferredId = await addTriaged(repo, "Blocked upstream", {
    priority: "P1",
    deferred: true
  });
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

  // Median = mean = (5.75 + 10.25) / 2 = 8.0, formatted as 8.000
  assert.ok(
    content.includes("median $8.000 / mean $8.000 per cost-report (2 slice-close session scans)"),
    "should correctly parse and average USD values"
  );
});

const AUTO_HEADER =
  "<!-- AUTO-GENERATED — do not edit by hand. Regenerate: bun src/scripts/loop.mts snapshot-memory --repo <path> -->";

test("writeMemorySnapshot prepends AUTO-GENERATED header as first line", async () => {
  const repo = await tmpRepo("al-snapshot-header-");
  await addFeature(repo, { title: "Test" });
  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");
  assert.ok(content.startsWith(AUTO_HEADER), "first line must be the AUTO-GENERATED header");
});

test("writeMemorySnapshot header is idempotent — only one copy after two runs", async () => {
  const repo = await tmpRepo("al-snapshot-idempotent-");
  await addFeature(repo, { title: "Test" });
  await writeMemorySnapshot(repo);
  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");
  const count = (content.match(/AUTO-GENERATED/g) ?? []).length;
  assert.equal(count, 1, "header must appear exactly once after two regenerations");
});

test("generateSnapshotContent returns string starting with AUTO-GENERATED header", async () => {
  const repo = await tmpRepo("al-snapshot-generate-");
  await addFeature(repo, { title: "Test" });
  const content = await generateSnapshotContent(repo, { today: "2026-01-01" });
  assert.ok(
    content.startsWith(AUTO_HEADER),
    "generateSnapshotContent must start with the AUTO-GENERATED header"
  );
});

// ---------------------------------------------------------------------------
// FEAT-212: Pause rate bullet — presence/absence in Loop telemetry section
// ---------------------------------------------------------------------------

test("writeMemorySnapshot omits Pause rate bullet when no pause-events.jsonl exists", async () => {
  const repo = await tmpRepo("al-snapshot-pause-absent-");
  await addFeature(repo, { title: "Test" });
  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(content.includes("## Loop telemetry"), "should still render Loop telemetry section");
  assert.ok(!content.includes("Pause rate"), "should omit Pause rate bullet with no data");
});

test("writeMemorySnapshot renders Pause rate bullet once dispatch outcomes exist", async () => {
  const repo = await tmpRepo("al-snapshot-pause-present-");
  await addFeature(repo, { title: "Test" });

  await recordDispatchOutcome(repo, {
    agentRole: "crew:fullstack-dev",
    outcome: "completed"
  });
  await recordDispatchOutcome(repo, {
    agentRole: "crew:fullstack-dev",
    outcome: "completed"
  });
  await recordDispatchOutcome(repo, {
    agentRole: "crew:fullstack-dev",
    outcome: "paused"
  });
  await recordDispatchOutcome(repo, {
    agentRole: "crew:fullstack-dev",
    outcome: "completed"
  });
  await recordPauseEvent(repo, {
    agentRole: "crew:fullstack-dev",
    kind: "pause",
    detection: "no_artifact"
  });

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(
    content.includes("Pause rate (last 4 dispatches): 25.0%"),
    "should render the pause rate bullet with the correct window count and percentage"
  );
});

test("generateSnapshotContent matches writeMemorySnapshot output", async () => {
  const repo = await tmpRepo("al-snapshot-match-");
  await addFeature(repo, { title: "Feature A" });
  const today = new Date().toISOString().slice(0, 10);
  const [snapshot, generated] = await Promise.all([
    writeMemorySnapshot(repo),
    generateSnapshotContent(repo, { today })
  ]);
  const onDisk = await fs.readFile(snapshot.artifactPath, "utf8");
  assert.equal(generated, onDisk, "generateSnapshotContent must match written file");
});

// ---------------------------------------------------------------------------
// FEAT-263 Phase 3d: "Memory usefulness (7d)" telemetry bullet
// ---------------------------------------------------------------------------

test("writeMemorySnapshot renders 'Memory usefulness (7d): n/a' when memory is unconfigured", async () => {
  const repo = await tmpRepo("al-snapshot-memusefulness-off-");
  await addFeature(repo, { title: "Test" });

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");
  assert.ok(content.includes("- Memory usefulness (7d): n/a"));
});

test("writeMemorySnapshot renders served/used/rate when the daemon health call succeeds", async () => {
  const repo = await tmpRepo("al-snapshot-memusefulness-ok-");
  await addFeature(repo, { title: "Test" });

  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          ok: true,
          version: "1.0.0",
          wire_versions_supported: ["v1.0"],
          contract_schema_version: "v1",
          schema_version: 1,
          security: { redaction: true, encryption: true },
          usefulness: { served_7d: 634, used_7d: 5, rate_7d: 0.0079 },
          status: "ok"
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )) as unknown as typeof fetch;

    const snapshot = await writeMemorySnapshot(repo, { config: { memory: { enabled: "on" } } });
    const content = await fs.readFile(snapshot.artifactPath, "utf8");
    assert.ok(
      content.includes("- Memory usefulness (7d): served=634 used=5 rate=0.8%"),
      `expected the usefulness line, got: ${content.slice(content.indexOf("## Loop telemetry"))}`
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

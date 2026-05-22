import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { countHighSeverityCostAlerts } from "../scripts/lib/cost-alert-loader.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";

async function tmpRepo(prefix) {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/crew/cost"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/autonomous-loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: "docs/ai-loop",
        backlogPath: "docs/backlog",
        slicesRoot: "docs/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function writeCostReport(repo, sliceId, content) {
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const filename = `${timestamp}-cost-report-slice-${sliceId}.md`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, content);
  return filepath;
}

test("countHighSeverityCostAlerts returns 0 when no cost reports exist", async () => {
  const repo = await tmpRepo("al-cost-no-reports-");
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 0, "should return 0 when no reports exist");
});

test("countHighSeverityCostAlerts detects high-severity cost alerts in report body", async () => {
  const repo = await tmpRepo("al-cost-high-severity-");
  const reportContent = `---
kind: cost-report
slice: SLICE-01
usd: 25.50
created_at: 2026-05-22T12:00:00Z
---

# Cost Report

Some analysis here.

## Recommendations

- cache-busted: Cache hit 40% is below optimal (high)
- opus-overuse: Opus accounts for 85% of spend (high)

More text.`;
  await writeCostReport(repo, "SLICE-01", reportContent);
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 2, "should detect 2 high-severity alerts");
});

test("countHighSeverityCostAlerts ignores medium and low severity alerts", async () => {
  const repo = await tmpRepo("al-cost-low-severity-");
  const reportContent = `---
kind: cost-report
slice: SLICE-01
usd: 15.25
created_at: 2026-05-22T12:00:00Z
---

# Cost Report

Some analysis here.

## Recommendations

- cache-busted: Cache hit 70% (medium)
- large-tool-output: Tool results are large (low)
- file-rereads: 8 redundant reads (medium)

More text.`;
  await writeCostReport(repo, "SLICE-01", reportContent);
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 0, "should not count medium/low severity alerts");
});

test("checkStopConditions does NOT stop when only low-severity cost alerts exist", async () => {
  const repo = await tmpRepo("al-cost-stop-low-");
  const reportContent = `---
kind: cost-report
slice: SLICE-01
usd: 10.00
created_at: 2026-05-22T12:00:00Z
---

# Cost Report

## Recommendations

- cache-busted: Cache hit 75% (low)

End.`;
  await writeCostReport(repo, "SLICE-01", reportContent);

  // Add a pending feature to avoid "no work" stop condition
  await addFeature(repo, { title: "Test feature" });

  const config = {
    loop: { costStopThreshold: 1 }
  };
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.shouldStop, false, "should not stop when only low-severity alerts exist");
  assert.equal(result.snapshot.costAlerts, 0, "cost alerts snapshot should be 0");
});

test("checkStopConditions stops when >= 1 high-severity cost alert fires (default threshold)", async () => {
  const repo = await tmpRepo("al-cost-stop-high-");
  const reportContent = `---
kind: cost-report
slice: SLICE-01
usd: 50.00
created_at: 2026-05-22T12:00:00Z
---

# Cost Report

## Recommendations

- opus-overuse: Opus is 85% of spend (high)

End.`;
  await writeCostReport(repo, "SLICE-01", reportContent);

  // Initialize backlog structure
  const backlogDir = path.join(repo, "docs/backlog/pending");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    `---
id: FEAT-001
status: pending
---
# Test Feature`
  );

  const config = {
    loop: { costStopThreshold: 1 }
  };
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.shouldStop, true, "should stop when high-severity cost alert exists");
  assert.ok(
    result.reasons.some((r) => r.includes("cost_alert_high")),
    "should include cost_alert_high in reasons"
  );
  assert.equal(result.snapshot.costAlerts, 1, "cost alerts snapshot should be 1");
});

test("checkStopConditions respects custom costStopThreshold", async () => {
  const repo = await tmpRepo("al-cost-threshold-");

  // Create 2 high-severity alerts
  const report1 = `---
kind: cost-report
slice: SLICE-01
created_at: 2026-05-22T12:00:00Z
---
# Cost Report
## Recommendations
- opus-overuse: High (high)
End.`;
  const report2 = `---
kind: cost-report
slice: SLICE-02
created_at: 2026-05-22T12:01:00Z
---
# Cost Report
## Recommendations
- cache-busted: High (high)
End.`;
  await writeCostReport(repo, "SLICE-01", report1);
  await writeCostReport(repo, "SLICE-02", report2);

  // Initialize backlog
  const backlogDir = path.join(repo, "docs/backlog/pending");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    `---
id: FEAT-001
status: pending
---
# Test Feature`
  );

  // Test with threshold=3 (should NOT stop with only 2 alerts)
  const config3 = {
    loop: { costStopThreshold: 3 }
  };
  const result3 = await checkStopConditions(repo, { config: config3 });
  assert.equal(result3.shouldStop, false, "should not stop when alert count < threshold");

  // Test with threshold=2 (should stop with 2 alerts)
  const config2 = {
    loop: { costStopThreshold: 2 }
  };
  const result2 = await checkStopConditions(repo, { config: config2 });
  assert.equal(result2.shouldStop, true, "should stop when alert count >= threshold");
  assert.equal(result2.snapshot.costAlerts, 2, "cost alerts snapshot should be 2");
});

test("checkStopConditions uses default threshold of 1 when not configured", async () => {
  const repo = await tmpRepo("al-cost-default-threshold-");
  const reportContent = `---
kind: cost-report
slice: SLICE-01
created_at: 2026-05-22T12:00:00Z
---
# Cost Report
## Recommendations
- exploration-heavy: High exploration ratio (high)
End.`;
  await writeCostReport(repo, "SLICE-01", reportContent);

  // Initialize backlog
  const backlogDir = path.join(repo, "docs/backlog/pending");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    `---
id: FEAT-001
status: pending
---
# Test Feature`
  );

  // No costStopThreshold configured, should use default of 1
  const config = { loop: {} };
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.shouldStop, true, "should use default threshold of 1");
});

test("countHighSeverityCostAlerts scans across last 3 slices only", async () => {
  const repo = await tmpRepo("al-cost-window-");

  // Create 5 cost reports with high-severity alerts
  for (let i = 1; i <= 5; i++) {
    const reportContent = `---
kind: cost-report
slice: SLICE-${String(i).padStart(2, "0")}
created_at: 2026-05-22T${String(i).padStart(2, "0")}:00:00Z
---
# Cost Report
## Recommendations
- cache-busted: Issue (high)
End.`;
    await writeCostReport(repo, `SLICE-${String(i).padStart(2, "0")}`, reportContent);
  }

  // Should only count the last 3 (most recent by timestamp sort)
  const count = await countHighSeverityCostAlerts(repo, 3);
  assert.equal(count, 3, "should count only last 3 slices");
});

test("checkStopConditions includes cost alerts in snapshot", async () => {
  const repo = await tmpRepo("al-cost-snapshot-");
  const reportContent = `---
kind: cost-report
slice: SLICE-01
created_at: 2026-05-22T12:00:00Z
---
# Cost Report
## Recommendations
- opus-overuse: Issue (high)
- cache-busted: Issue (high)
End.`;
  await writeCostReport(repo, "SLICE-01", reportContent);

  // Initialize backlog
  const backlogDir = path.join(repo, "docs/backlog/pending");
  await fs.mkdir(backlogDir, { recursive: true });
  await fs.writeFile(
    path.join(backlogDir, "FEAT-001.md"),
    `---
id: FEAT-001
status: pending
---
# Test Feature`
  );

  const config = { loop: { costStopThreshold: 1 } };
  const result = await checkStopConditions(repo, { config });
  assert.ok(
    typeof result.snapshot.costAlerts === "number",
    "snapshot should include costAlerts field"
  );
  assert.equal(result.snapshot.costAlerts, 2, "snapshot should reflect 2 high-severity alerts");
});

test("countHighSeverityCostAlerts handles missing or malformed reports gracefully", async () => {
  const repo = await tmpRepo("al-cost-malformed-");

  // Write a malformed report (missing frontmatter closing)
  const dir = path.join(repo, ".claude/artifacts/crew/cost");
  await fs.mkdir(dir, { recursive: true });
  const malformed = path.join(dir, "20260522T120000Z-cost-report-bad.md");
  await fs.writeFile(malformed, "---\nkind: cost-report\nslice: BAD\n\nNo closing frontmatter");

  // Write a valid report
  const reportContent = `---
kind: cost-report
slice: SLICE-01
created_at: 2026-05-22T12:00:00Z
---
# Cost Report
## Recommendations
- opus-overuse: High (high)
End.`;
  await writeCostReport(repo, "SLICE-01", reportContent);

  // Should skip malformed and count valid ones
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 1, "should skip malformed reports and count valid ones");
});

test("countHighSeverityCostAlerts detects alerts regardless of casing in marker", async () => {
  const repo = await tmpRepo("al-cost-case-insensitive-");
  const reportContent = `---
kind: cost-report
slice: SLICE-01
created_at: 2026-05-22T12:00:00Z
---
# Cost Report
## Recommendations
- opus-overuse: Issue (HIGH)
- cache-busted: Issue (High)
End.`;
  await writeCostReport(repo, "SLICE-01", reportContent);
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 2, "should detect high-severity alerts regardless of casing");
});

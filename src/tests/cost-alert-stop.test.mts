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
  await fs.mkdir(path.join(repo, ".claude/artifacts/crew/cost-insights"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

async function writeCostAdvise(repo, sliceId, content) {
  const dir = path.join(repo, ".claude/artifacts/crew/cost-insights");
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const filename = `${timestamp}-cost-advise-slice-${sliceId}.md`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, content);
  return filepath;
}

test("countHighSeverityCostAlerts returns 0 when no cost reports exist", async () => {
  const repo = await tmpRepo("al-cost-no-reports-");
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 0, "should return 0 when no reports exist");
});

test("countHighSeverityCostAlerts detects high-severity findings in cost-advise body", async () => {
  const repo = await tmpRepo("al-cost-high-severity-");
  const adviseContent = `# Cost Advisor

Target slice: **test-slice**
Cost: $25.50 · duration 5.0 min · cache hit 95.0% · grade avg -

## Per-slice findings
### [HIGH] cache-busted
- Cache hit 40% is below optimal.
- **Suggested action:** Reduce file re-reads.

### [HIGH] opus-overuse
- Opus accounts for 85% of spend.
- **Suggested action:** Switch routine slices to Sonnet.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 2, "should detect 2 high-severity findings");
});

test("countHighSeverityCostAlerts ignores medium and low severity findings", async () => {
  const repo = await tmpRepo("al-cost-low-severity-");
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [MEDIUM] cache-busted
- Cache hit 70%.

### [LOW] large-tool-output
- Tool results are large.

### [MEDIUM] file-rereads
- 8 redundant reads.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 0, "should not count medium/low severity findings");
});

test("checkStopConditions does NOT stop when only low-severity cost findings exist", async () => {
  const repo = await tmpRepo("al-cost-stop-low-");
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [LOW] cache-busted
- Cache hit 75%.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);

  // Add a pending feature to avoid "no work" stop condition
  await addFeature(repo, { title: "Test feature" });

  const config = {
    loop: { costStopThreshold: 1 }
  };
  const result = await checkStopConditions(repo, { config });
  assert.equal(result.shouldStop, false, "should not stop when only low-severity findings exist");
  assert.equal(result.snapshot.costAlerts, 0, "cost alerts snapshot should be 0");
});

test("checkStopConditions stops when >= 1 high-severity cost finding fires (default threshold)", async () => {
  const repo = await tmpRepo("al-cost-stop-high-");
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus is 85% of spend.
- **Suggested action:** Switch to Sonnet.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);

  // Initialize backlog structure
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
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

  const advise1 = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus share too high.
`;
  const advise2 = `# Cost Advisor

## Per-slice findings
### [HIGH] cache-busted
- Cache hit too low.
`;
  await writeCostAdvise(repo, "SLICE-01", advise1);
  await writeCostAdvise(repo, "SLICE-02", advise2);

  // Initialize backlog
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
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
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] exploration-heavy
- High exploration ratio.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);

  // Initialize backlog
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
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

  for (let i = 1; i <= 5; i++) {
    const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] cache-busted
- Cache hit below threshold.
`;
    await writeCostAdvise(repo, `SLICE-${String(i).padStart(2, "0")}`, adviseContent);
  }

  // Should only count the last 3 (most recent by timestamp sort)
  const count = await countHighSeverityCostAlerts(repo, 3);
  assert.equal(count, 3, "should count only last 3 slices");
});

test("checkStopConditions includes cost alerts in snapshot", async () => {
  const repo = await tmpRepo("al-cost-snapshot-");
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus share too high.

### [HIGH] cache-busted
- Cache hit too low.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);

  // Initialize backlog
  const backlogDir = path.join(repo, ".claude/artifacts/loop/backlog/pending");
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

test("countHighSeverityCostAlerts handles missing or malformed files gracefully", async () => {
  const repo = await tmpRepo("al-cost-malformed-");

  const dir = path.join(repo, ".claude/artifacts/crew/cost-insights");
  await fs.mkdir(dir, { recursive: true });
  const malformed = path.join(dir, "20260522T120000Z-cost-advise-bad.md");
  await fs.writeFile(malformed, "---\nkind: cost-advise\nslice: BAD\n\nNo closing frontmatter");

  const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus share too high.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);

  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 1, "should skip malformed files and count valid ones");
});

test("countHighSeverityCostAlerts detects findings regardless of casing in marker", async () => {
  const repo = await tmpRepo("al-cost-case-insensitive-");
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus share too high.

### [High] cache-busted
- Cache hit too low.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);
  const count = await countHighSeverityCostAlerts(repo);
  assert.equal(count, 2, "should detect high-severity findings regardless of casing");
});

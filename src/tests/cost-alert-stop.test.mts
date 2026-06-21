import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";
import { countHighSeverityCostAlerts } from "../scripts/lib/cost-alert-loader.mjs";

async function tmpRepo(prefix: string) {
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

async function writeCostAdvise(repo: string, sliceId: string, content: string) {
  const dir = path.join(repo, ".claude/artifacts/crew/cost-insights");
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:-]/g, "").split(".")[0] + "Z";
  const filename = `${timestamp}-cost-advise-slice-${sliceId}.md`;
  const filepath = path.join(dir, filename);
  await fs.writeFile(filepath, content);
  return filepath;
}

// ──────────────────────────────────────────────────────────────────────────
// countHighSeverityCostAlerts — pure counter (still valid after demote)
// ──────────────────────────────────────────────────────────────────────────

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

  const count = await countHighSeverityCostAlerts(repo, 3);
  assert.equal(count, 3, "should count only last 3 slices");
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

// ──────────────────────────────────────────────────────────────────────────
// Demoted behavior — HIGH cost alerts emit as suggestion, never halt
// ──────────────────────────────────────────────────────────────────────────

test("checkStopConditions: HIGH cost alerts emit as advisory suggestion, never halt", async () => {
  const repo = await tmpRepo("al-cost-advisory-");
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus is 85% of spend.
- **Suggested action:** Switch to Sonnet.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);

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

  const result = await checkStopConditions(repo, { config: { loop: {} } });
  assert.equal(result.shouldStop, false, "HIGH cost alerts must NOT halt the loop (advisory only)");
  assert.ok(
    result.suggestions.some((s: string) => s.includes("cost_alert_high")),
    "cost_alert_high should appear in suggestions"
  );
  assert.equal(
    result.reasons.some((r: string) => r.includes("cost_alert_high")),
    false,
    "cost_alert_high must NOT appear in halt reasons"
  );
  assert.equal(result.snapshot.costAlerts, 1, "cost alerts snapshot should be 1");
});

test("checkStopConditions: snapshot still carries costAlerts count for visibility", async () => {
  const repo = await tmpRepo("al-cost-snapshot-");
  const adviseContent = `# Cost Advisor

## Per-slice findings
### [HIGH] opus-overuse
- Opus share too high.

### [HIGH] cache-busted
- Cache hit too low.
`;
  await writeCostAdvise(repo, "SLICE-01", adviseContent);

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

  const result = await checkStopConditions(repo, { config: { loop: {} } });
  assert.equal(result.snapshot.costAlerts, 2, "snapshot should reflect 2 high-severity alerts");
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  readDispatchLog,
  aggregateBySkill,
  computeDeltaPercent,
  formatCostBySkillReport,
  buildCostBySkillReport,
  DISPATCH_LOG_REL
} from "../scripts/lib/cost-by-skill.mjs";

async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeDispatchLog(dir: string, lines: object[]): Promise<string> {
  const logPath = path.join(dir, DISPATCH_LOG_REL);
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.writeFile(logPath, lines.map((l) => JSON.stringify(l)).join("\n") + "\n", "utf8");
  return logPath;
}

// --- readDispatchLog ---

test("readDispatchLog returns empty array on missing file", async () => {
  const dir = await tmpDir("cbs-missing-");
  const result = await readDispatchLog(path.join(dir, "nonexistent.jsonl"));
  assert.deepEqual(result, []);
});

test("readDispatchLog returns empty array on empty file", async () => {
  const dir = await tmpDir("cbs-empty-");
  const logPath = path.join(dir, "log.jsonl");
  await fs.writeFile(logPath, "", "utf8");
  const result = await readDispatchLog(logPath);
  assert.deepEqual(result, []);
});

test("readDispatchLog parses well-formed entries", async () => {
  const dir = await tmpDir("cbs-parse-");
  const logPath = await writeDispatchLog(dir, [
    { timestamp: "2026-06-06T10:00:00.000Z", agent: "loop:researcher", costUsd: 0.05 },
    { timestamp: "2026-06-06T11:00:00.000Z", agent: "loop:architect", costUsd: 0.12 }
  ]);
  const entries = await readDispatchLog(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]!.agent, "loop:researcher");
  assert.equal(entries[0]!.costUsd, 0.05);
  assert.equal(entries[1]!.agent, "loop:architect");
});

test("readDispatchLog handles missing/null skill_name gracefully (AC-3)", async () => {
  const dir = await tmpDir("cbs-null-agent-");
  const logPath = await writeDispatchLog(dir, [
    { timestamp: "2026-06-06T10:00:00.000Z", agent: null, costUsd: 0.01 },
    { timestamp: "2026-06-06T11:00:00.000Z", costUsd: 0.02 },
    { timestamp: "2026-06-06T12:00:00.000Z", agent: "loop:pm", costUsd: 0.03 }
  ]);
  const entries = await readDispatchLog(logPath);
  assert.equal(entries.length, 3);
  assert.equal(entries[0]!.agent, null);
  assert.equal(entries[1]!.agent, null);
  assert.equal(entries[2]!.agent, "loop:pm");
});

test("readDispatchLog skips malformed JSON lines without throwing (AC-3)", async () => {
  const dir = await tmpDir("cbs-malformed-");
  const logPath = path.join(dir, "log.jsonl");
  await fs.writeFile(
    logPath,
    [
      JSON.stringify({ timestamp: "2026-06-06T10:00:00.000Z", agent: "loop:pm", costUsd: 0.05 }),
      "not valid json {{{",
      JSON.stringify({
        timestamp: "2026-06-06T11:00:00.000Z",
        agent: "loop:architect",
        costUsd: 0.1
      })
    ].join("\n") + "\n",
    "utf8"
  );
  const entries = await readDispatchLog(logPath);
  assert.equal(entries.length, 2);
  assert.equal(entries[0]!.agent, "loop:pm");
  assert.equal(entries[1]!.agent, "loop:architect");
});

test("readDispatchLog treats null costUsd as null (not zero)", async () => {
  const dir = await tmpDir("cbs-null-cost-");
  const logPath = await writeDispatchLog(dir, [
    { timestamp: "2026-06-06T10:00:00.000Z", agent: "loop:researcher", costUsd: null }
  ]);
  const entries = await readDispatchLog(logPath);
  assert.equal(entries[0]!.costUsd, null);
});

// --- aggregateBySkill ---

test("aggregateBySkill returns empty array on empty entries (AC-4 edge case)", () => {
  const rows = aggregateBySkill([]);
  assert.deepEqual(rows, []);
});

test("aggregateBySkill buckets by agent name correctly (AC-4)", () => {
  // Use a fixed 'now' so window logic is deterministic
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const threeDaysAgo = new Date("2026-06-10T12:00:00.000Z").toISOString();
  const twentyDaysAgo = new Date("2026-05-24T12:00:00.000Z").toISOString();

  const entries = [
    { timestamp: threeDaysAgo, agent: "loop:researcher", costUsd: 0.1 },
    { timestamp: threeDaysAgo, agent: "loop:researcher", costUsd: 0.2 },
    { timestamp: threeDaysAgo, agent: "loop:architect", costUsd: 0.5 },
    { timestamp: twentyDaysAgo, agent: "loop:researcher", costUsd: 0.05 }
  ];

  const rows = aggregateBySkill(entries, 28, now);
  assert.equal(rows.length, 2);

  const researcher = rows.find((r) => r.skillName === "loop:researcher")!;
  assert.ok(researcher, "loop:researcher row should exist");
  // currentWeekUsd: entries within last 7 days (threeDaysAgo qualifies)
  assert.ok(
    Math.abs(researcher.currentWeekUsd - 0.3) < 0.0001,
    `currentWeekUsd should be ~0.30, got ${researcher.currentWeekUsd}`
  );
  // windowTotal over 28 days: 0.10 + 0.20 + 0.05 = 0.35; avg per week = 0.35/4 = 0.0875
  assert.ok(Math.abs(researcher.fourWeekAvgUsd - 0.0875) < 0.0001, "fourWeekAvgUsd mismatch");
  assert.equal(researcher.entryCount, 3);
});

test("aggregateBySkill handles null/missing agent as (unknown) bucket", () => {
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const recentTs = new Date("2026-06-10T12:00:00.000Z").toISOString();

  const entries = [
    { timestamp: recentTs, agent: null as string | null, costUsd: 0.05 },
    { timestamp: recentTs, agent: undefined as unknown as string, costUsd: 0.07 },
    { timestamp: recentTs, agent: "loop:pm", costUsd: 0.1 }
  ];

  const rows = aggregateBySkill(entries, 28, now);
  const unknown = rows.find((r) => r.skillName === "(unknown)");
  assert.ok(unknown, "(unknown) row should exist for null/missing agent");
  assert.equal(unknown!.entryCount, 2);
});

test("aggregateBySkill excludes entries older than windowDays", () => {
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const oldTs = new Date("2026-05-10T12:00:00.000Z").toISOString(); // > 28 days ago

  const entries = [{ timestamp: oldTs, agent: "loop:researcher", costUsd: 0.5 }];

  const rows = aggregateBySkill(entries, 28, now);
  assert.deepEqual(rows, [], "entries older than window should be excluded");
});

test("aggregateBySkill null costUsd counts as 0 spend", () => {
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const recentTs = new Date("2026-06-10T12:00:00.000Z").toISOString();

  const entries = [
    { timestamp: recentTs, agent: "loop:researcher", costUsd: null as number | null }
  ];

  const rows = aggregateBySkill(entries, 28, now);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.currentWeekUsd, 0);
  assert.equal(rows[0]!.fourWeekAvgUsd, 0);
});

// --- computeDeltaPercent ---

test("computeDeltaPercent returns null when baseline is zero (AC-4)", () => {
  assert.equal(computeDeltaPercent(0.5, 0), null);
  assert.equal(computeDeltaPercent(0, 0), null);
});

test("computeDeltaPercent returns positive delta when current > baseline (AC-4)", () => {
  const delta = computeDeltaPercent(1.5, 1.0);
  assert.ok(delta !== null);
  assert.ok(Math.abs(delta - 50) < 0.001, `expected 50, got ${delta}`);
});

test("computeDeltaPercent returns negative delta when current < baseline (AC-4)", () => {
  const delta = computeDeltaPercent(0.5, 1.0);
  assert.ok(delta !== null);
  assert.ok(Math.abs(delta - -50) < 0.001, `expected -50, got ${delta}`);
});

test("computeDeltaPercent returns zero when current equals baseline (AC-4)", () => {
  const delta = computeDeltaPercent(1.0, 1.0);
  assert.ok(delta !== null);
  assert.equal(delta, 0);
});

// --- formatCostBySkillReport ---

test("formatCostBySkillReport returns no-data message on empty rows", () => {
  const report = formatCostBySkillReport([]);
  assert.ok(report.includes("No dispatch log"), `unexpected: ${report}`);
});

test("formatCostBySkillReport includes skill name, spend, and delta", () => {
  const rows = [
    {
      skillName: "loop:researcher",
      currentWeekUsd: 0.3,
      fourWeekAvgUsd: 0.25,
      deltaPercent: 20.0,
      entryCount: 5
    }
  ];
  const report = formatCostBySkillReport(rows);
  assert.ok(report.includes("loop:researcher"), "should include skill name");
  assert.ok(report.includes("$0.3000"), "should include current week spend");
  assert.ok(report.includes("+20.0%"), "should include positive delta");
});

test("formatCostBySkillReport shows n/a when delta is null (zero baseline)", () => {
  const rows = [
    {
      skillName: "crew:reviewer",
      currentWeekUsd: 0.1,
      fourWeekAvgUsd: 0,
      deltaPercent: null,
      entryCount: 1
    }
  ];
  const report = formatCostBySkillReport(rows);
  assert.ok(report.includes("n/a"), "should include n/a for null delta");
});

test("formatCostBySkillReport respects topN limit", () => {
  const rows = [
    {
      skillName: "loop:researcher",
      currentWeekUsd: 0.3,
      fourWeekAvgUsd: 0.25,
      deltaPercent: 20.0,
      entryCount: 5
    },
    {
      skillName: "loop:architect",
      currentWeekUsd: 0.2,
      fourWeekAvgUsd: 0.15,
      deltaPercent: 33.3,
      entryCount: 3
    },
    {
      skillName: "loop:pm",
      currentWeekUsd: 0.1,
      fourWeekAvgUsd: 0.08,
      deltaPercent: 25.0,
      entryCount: 2
    }
  ];
  const report = formatCostBySkillReport(rows, 2);
  assert.ok(report.includes("loop:researcher"), "should include first row");
  assert.ok(report.includes("loop:architect"), "should include second row");
  assert.ok(!report.includes("loop:pm"), "should exclude third row (topN=2)");
});

// --- buildCostBySkillReport (integration) ---

test("buildCostBySkillReport returns no-data message on missing log", async () => {
  const dir = await tmpDir("cbs-integration-empty-");
  const report = await buildCostBySkillReport(dir);
  assert.ok(report.includes("No dispatch log"), `unexpected: ${report}`);
});

test("buildCostBySkillReport aggregates from synthetic jsonl (AC-4)", async () => {
  const dir = await tmpDir("cbs-integration-");
  const now = new Date("2026-06-13T12:00:00.000Z").getTime();
  const recentTs = new Date("2026-06-10T12:00:00.000Z").toISOString();

  await writeDispatchLog(dir, [
    { timestamp: recentTs, agent: "loop:researcher", costUsd: 0.1 },
    { timestamp: recentTs, agent: "loop:pm", costUsd: 0.05 }
  ]);

  const report = await buildCostBySkillReport(dir, { now });
  assert.ok(report.includes("loop:researcher"), "should include loop:researcher");
  assert.ok(report.includes("loop:pm"), "should include loop:pm");
});

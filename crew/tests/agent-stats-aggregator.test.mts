/**
 * Tests for scripts/lib/agent-stats-aggregator.ts (FEAT-159 SLICE-84).
 * Uses bun:test (bun-runnable).
 *
 * Fixtures: tests/fixtures/agent-stats/
 *   dispatch-timing-seed.jsonl  — 3 agents × 5 slices
 *   grades-seed.jsonl           — grade records (parsed via JSONL helper here)
 *
 * AC-T1: 3 agents × 5 dispatches, window last_5_slices → validates metrics.
 * AC-T2: window last_2_slices narrows result to most-recent 2 slices.
 * AC-T3: review_rework_rate counts needs_fix artifact against agent's slice.
 * AC-T4: validation_fail_rate counts fail artifact against agent's slice.
 * AC-T5: median_dispatches_to_pass — 3 dispatches for 1 slice reports 3.
 * AC-T6: empty window → returns [] + writes artifact with rows: [].
 * AC-T7: --agent filter returns only that agent.
 */
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {
  aggregateAgentStats,
  writeAgentStatsArtifact
} from "../scripts/lib/agent-stats-aggregator.mjs";
import type { WindowSpec } from "../scripts/lib/agent-stats-aggregator.mjs";

// Fixture helpers

const FIXTURE_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1")),
  "fixtures",
  "agent-stats"
);

const DISPATCH_SEED = path.join(FIXTURE_DIR, "dispatch-timing-seed.jsonl");

// Grade records matching dispatch-timing-seed.jsonl (SLICE-S01..S05). Newest-first.
// `mk` keeps lines short while preserving exact per-slice averages used by the math ACs.
function mk(slice: string, date: string, avg: number) {
  return {
    slice,
    graded_at: date,
    scores: {
      architecture_quality: avg,
      reliability: avg,
      observability: avg,
      production_readiness: avg,
      security: avg,
      test_confidence: avg,
      product_completeness: avg
    }
  };
}
const SEED_GRADES = [
  mk("SLICE-S05", "2026-06-05", 0.86),
  mk("SLICE-S04", "2026-06-04", 0.671), // < 0.7 → drags pass_rate
  mk("SLICE-S03", "2026-06-03", 0.9),
  mk("SLICE-S02", "2026-06-02", 0.82),
  mk("SLICE-S01", "2026-06-01", 0.88)
];

async function makeTempRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "agent-stats-test-"));
}

// AC-T1: 3 agents × 5 slices, window last_5_slices → correct metrics

test("AC-T1: 3 agents × 5 dispatches each, window last_5_slices", async () => {
  const window: WindowSpec = { kind: "last_n_slices", n: 5 };
  const repo = await makeTempRepo();
  const rows = await aggregateAgentStats({
    repo,
    window,
    dispatchTimingPath: DISPATCH_SEED,
    grades: SEED_GRADES
  });

  // 3 distinct agents.
  expect(rows.length, "should return 3 agents").toBe(3);

  const builder = rows.find((r) => r.agent === "crew:builder");
  const reviewer = rows.find((r) => r.agent === "crew:reviewer");
  const verifier = rows.find((r) => r.agent === "crew:verifier");
  expect(builder, "builder row must be present").toBeTruthy();
  expect(reviewer, "reviewer row must be present").toBeTruthy();
  expect(verifier, "verifier row must be present").toBeTruthy();

  // sample_count: 5 dispatches per agent across 5 slices.
  expect(builder.sample_count, "builder sample_count == 5").toBe(5);
  expect(reviewer.sample_count).toBe(5);
  expect(verifier.sample_count).toBe(5);

  // mean_wall_ms: builder = (40000+55000+35000+60000+48000)/5 = 47600
  expect(builder.mean_wall_ms, "builder mean_wall_ms").toBe(47600);

  // mean_tokens: builder tokenIn+tokenOut per dispatch = 38k,50k,32k,57k,44k
  // → (38000+50000+32000+57000+44000)/5 = 221000/5 = 44200
  expect(builder.mean_tokens, "builder mean_tokens").toBe(44200);

  // pass_rate: all 5 slices have avg score ≥ 0.7 except none here (all > 0.7)
  // SLICE-S04 avg ~ 0.671 < 0.7 → 4/5 pass
  expect(builder.pass_rate, "builder pass_rate = 4/5 slices passing").toBe(0.8);

  // No rework/fail without review/validation artifacts present.
  expect(builder.review_rework_rate, "builder review_rework_rate == 0 (no artifacts)").toBe(0);
  expect(builder.validation_fail_rate, "builder validation_fail_rate == 0 (no artifacts)").toBe(0);
  expect(builder.window).toBe("last_n_slices_5");

  await fs.rm(repo, { recursive: true, force: true });
});

// AC-T2: window last_2_slices returns only most-recent 2 slices' agents

test("AC-T2: window last_2_slices narrows result to most-recent 2 slices", async () => {
  const window: WindowSpec = { kind: "last_n_slices", n: 2 };
  const repo = await makeTempRepo();
  const rows = await aggregateAgentStats({
    repo,
    window,
    dispatchTimingPath: DISPATCH_SEED,
    grades: SEED_GRADES
  });

  // Most-recent 2 grades: SLICE-S05 (2026-06-05) and SLICE-S04 (2026-06-04).
  expect(rows.length, "still 3 agents but only 2-slice window").toBe(3);
  const builder = rows.find((r) => r.agent === "crew:builder");
  expect(builder).toBeTruthy();
  // 2 dispatches in the window (one per slice).
  expect(builder.sample_count, "builder sample_count == 2 in last_2_slices window").toBe(2);
  expect(builder.window).toBe("last_n_slices_2");

  // mean_wall_ms: (60000 + 48000) / 2 = 54000 (S04 + S05)
  expect(builder.mean_wall_ms, "builder mean_wall_ms in 2-slice window").toBe(54000);

  await fs.rm(repo, { recursive: true, force: true });
});

// AC-T3: review_rework_rate — needs_fix review artifact counts as rework

test("AC-T3: review_rework_rate counts needs_fix artifacts for the agent's slice", async () => {
  const window: WindowSpec = { kind: "last_n_slices", n: 5 };
  const repo = await makeTempRepo();

  // Create a fake reviews dir with a needs_fix artifact for SLICE-S02.
  const reviewsDir = path.join(repo, "reviews");
  await fs.mkdir(reviewsDir, { recursive: true });
  const reviewContent = `---
kind: review-result
slice: SLICE-S02
reviewer: crew:reviewer
verdict: NEEDS_FIX
---
# Review
Needs fix.
`;
  await fs.writeFile(path.join(reviewsDir, "review-slice-s02.md"), reviewContent);

  const rows = await aggregateAgentStats({
    repo,
    window,
    dispatchTimingPath: DISPATCH_SEED,
    grades: SEED_GRADES,
    reviewsDir,
    validationsDir: path.join(repo, "validations-empty")
  });

  const builder = rows.find((r) => r.agent === "crew:builder");
  expect(builder).toBeTruthy();
  // 1 of 5 builder slices had a needs_fix → 0.2
  expect(builder.review_rework_rate, "builder rework_rate = 1/5").toBe(0.2);

  // reviewer and verifier are on the same slices but rework_rate tracks
  // the slice-level needs_fix (all agents who worked on SLICE-S02 share the flag).
  const reviewer = rows.find((r) => r.agent === "crew:reviewer");
  expect(reviewer).toBeTruthy();
  expect(reviewer.review_rework_rate, "reviewer rework_rate = 1/5").toBe(0.2);

  await fs.rm(repo, { recursive: true, force: true });
});

// AC-T4: validation_fail_rate — fail artifact counts for agent's slice

test("AC-T4: validation_fail_rate counts fail artifacts for the agent's slice", async () => {
  const window: WindowSpec = { kind: "last_n_slices", n: 5 };
  const repo = await makeTempRepo();

  const validationsDir = path.join(repo, "validations");
  await fs.mkdir(validationsDir, { recursive: true });
  // Inline "- Decision: failed" format matching real artifacts.
  const validationContent = `---
kind: validation-result
slice: SLICE-S03
---
# Validation Result

- Decision: failed
- Evidence: some tests failed
`;
  await fs.writeFile(path.join(validationsDir, "validation-slice-s03.md"), validationContent);

  const rows = await aggregateAgentStats({
    repo,
    window,
    dispatchTimingPath: DISPATCH_SEED,
    grades: SEED_GRADES,
    reviewsDir: path.join(repo, "reviews-empty"),
    validationsDir
  });

  const builder = rows.find((r) => r.agent === "crew:builder");
  expect(builder).toBeTruthy();
  // 1 of 5 slices failed validation → 0.2
  expect(builder.validation_fail_rate, "builder validation_fail_rate = 1/5").toBe(0.2);

  await fs.rm(repo, { recursive: true, force: true });
});

// AC-T5: median_dispatches_to_pass — 3 dispatches for 1 slice → 3

test("AC-T5: median_dispatches_to_pass with extra fix dispatches", async () => {
  const window: WindowSpec = { kind: "last_n_slices", n: 2 };
  const repo = await makeTempRepo();

  // Create a custom dispatch log where builder has 3 rows for SLICE-S05.
  const customDispatch =
    [
      // SLICE-S05: 3 builder dispatches (fix loop)
      `{"runId":"run-s05-a","sliceId":"SLICE-S05","agent":"crew:builder","model":"claude-sonnet","wallMs":40000,"tokenIn":30000,"tokenOut":8000,"toolCalls":{},"bashDurationMs":0,"skillLoadCount":0}`,
      `{"runId":"run-s05-fix1","sliceId":"SLICE-S05","agent":"crew:builder","model":"claude-sonnet","wallMs":20000,"tokenIn":15000,"tokenOut":4000,"toolCalls":{},"bashDurationMs":0,"skillLoadCount":0}`,
      `{"runId":"run-s05-fix2","sliceId":"SLICE-S05","agent":"crew:builder","model":"claude-sonnet","wallMs":10000,"tokenIn":8000,"tokenOut":2000,"toolCalls":{},"bashDurationMs":0,"skillLoadCount":0}`,
      // SLICE-S04: 1 builder dispatch (clean pass)
      `{"runId":"run-s04-a","sliceId":"SLICE-S04","agent":"crew:builder","model":"claude-sonnet","wallMs":55000,"tokenIn":40000,"tokenOut":10000,"toolCalls":{},"bashDurationMs":0,"skillLoadCount":0}`
    ].join("\n") + "\n";

  const dispatchPath = path.join(repo, "dispatch-timing.jsonl");
  await fs.writeFile(dispatchPath, customDispatch);

  // Grades for 2 slices.
  const grades = [
    {
      slice: "SLICE-S05",
      graded_at: "2026-06-05",
      scores: {
        architecture_quality: 0.9,
        reliability: 0.9,
        observability: 0.9,
        production_readiness: 0.9,
        security: 0.9,
        test_confidence: 0.9,
        product_completeness: 0.9
      }
    },
    {
      slice: "SLICE-S04",
      graded_at: "2026-06-04",
      scores: {
        architecture_quality: 0.88,
        reliability: 0.88,
        observability: 0.88,
        production_readiness: 0.88,
        security: 0.88,
        test_confidence: 0.88,
        product_completeness: 0.88
      }
    }
  ];

  const rows = await aggregateAgentStats({
    repo,
    window,
    dispatchTimingPath: dispatchPath,
    grades
  });

  const builder = rows.find((r) => r.agent === "crew:builder");
  expect(builder, "builder row exists").toBeTruthy();
  // Per-slice dispatches: SLICE-S04=1, SLICE-S05=3 → median([1,3])=2
  expect(builder.median_dispatches_to_pass, "median of [1,3] = 2").toBe(2);

  await fs.rm(repo, { recursive: true, force: true });
});

// AC-T6: empty window (no matching slices) → returns [] + artifact rows: []

test("AC-T6: empty window returns empty array and writes artifact with rows: []", async () => {
  const window: WindowSpec = { kind: "last_n_slices", n: 5 };
  const repo = await makeTempRepo();

  // No grades → no window slices → empty result.
  const rows = await aggregateAgentStats({
    repo,
    window,
    dispatchTimingPath: DISPATCH_SEED,
    grades: [] // empty — no window
  });

  expect(rows, "empty window returns empty array").toEqual([]);

  const artifactPath = await writeAgentStatsArtifact(repo, rows, window);
  const raw = await fs.readFile(artifactPath, "utf-8");
  const parsed = JSON.parse(raw);
  expect(parsed.rows, "artifact rows field is empty array").toEqual([]);
  expect(parsed.generated_at, "artifact has generated_at").toBeTruthy();
  expect(parsed.window.kind).toBe("last_n_slices");
  expect(parsed.window.n).toBe(5);

  await fs.rm(repo, { recursive: true, force: true });
});

// AC-T7: --agent filter returns only the requested agent

test("AC-T7: agent filter returns only the specified agent", async () => {
  const window: WindowSpec = { kind: "last_n_slices", n: 5 };
  const repo = await makeTempRepo();
  const rows = await aggregateAgentStats({
    repo,
    window,
    agents: ["crew:builder"],
    dispatchTimingPath: DISPATCH_SEED,
    grades: SEED_GRADES
  });

  expect(rows.length, "only 1 agent returned").toBe(1);
  expect(rows[0]?.agent, "returned agent is crew:builder").toBe("crew:builder");
  expect(rows[0]?.sample_count).toBe(5);

  await fs.rm(repo, { recursive: true, force: true });
});

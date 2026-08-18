// FEAT-167 AC-6 — integration: slice-close regression check in expected_usd mode
// exercises the full checkStopConditions path and surfaces the right reason.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";

// (was: LOOP_DISABLE_COST_REGRESSION_LOG=1 — removed; emission silenced via spy in tests that care.)

const COST_DIR_REL = ".claude/artifacts/crew/cost";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude/state/crew"), { recursive: true });
  await fs.mkdir(path.join(repo, COST_DIR_REL), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop/backlog/pending"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/artifacts/loop/backlog/pending/FEAT-001.md"),
    "---\nid: FEAT-001\nstatus: pending\n---\n# Pending\n"
  );
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      }
    })
  );
  return repo;
}

async function writeReport(
  repo: string,
  ts: string,
  slice: string,
  usd: number,
  extra: Record<string, string | number> = {}
): Promise<void> {
  const lines = [
    "---",
    "kind: cost-report",
    `slice: ${slice}`,
    `run_title: "${slice}"`,
    `usd: ${usd}`,
    "aggregate_all: true",
    "source_count: 1",
    ...Object.entries(extra).map(([k, v]) => `${k}: ${v}`),
    "---",
    "",
    `# ${slice}`,
    ""
  ].join("\n");
  await fs.writeFile(
    path.join(repo, COST_DIR_REL, `${ts}-cost-report-aggregate-${slice.toLowerCase()}.md`),
    lines
  );
}

test("slice-close-regression-check: expected_usd mode trip drives checkStopConditions to halt", async () => {
  const repo = await tmpRepo("cr-integ-trip-");
  await writeReport(repo, "20260101T000000Z", "SLICE-1", 10);
  await writeReport(repo, "20260102T000000Z", "SLICE-2", 10);
  await writeReport(repo, "20260103T000000Z", "SLICE-3", 10);
  // Current effort_points=1, median=$10, multiplier=3 → expected=$10, threshold=$30.
  // Actual $200 > $30 → MUST trip.
  await writeReport(repo, "20260104T000000Z", "SLICE-4", 200, { effort_points: 1 });

  const config = {
    loop: {
      autoMode: true,
      costRegressionMode: "expected_usd",
      costMedianUsdPerPoint: 10
    }
  };
  const result: any = await checkStopConditions(repo, { config });

  // Demoted: cost-regression is advisory — emits a suggestion, never halts.
  const suggestions: string[] = result.suggestions || [];
  assert.ok(
    suggestions.some((s) => s.includes("cost-regression advisory")),
    `suggestions must include cost-regression advisory; got: ${JSON.stringify(suggestions)}`
  );
  const reasons: string[] = result.reasons || [];
  assert.equal(
    reasons.some((r) => r.startsWith("cost_regression_stop")),
    false,
    "cost_regression_stop must NOT appear in halt reasons (demoted)"
  );
});

test("slice-close-regression-check: large FEAT in expected mode does NOT trip", async () => {
  const repo = await tmpRepo("cr-integ-safe-");
  await writeReport(repo, "20260101T000000Z", "SLICE-1", 10);
  await writeReport(repo, "20260102T000000Z", "SLICE-2", 10);
  await writeReport(repo, "20260103T000000Z", "SLICE-3", 10);
  // effort_points=13, median=$10/pt, multiplier=3 → expected=$130, threshold=$390.
  // Actual $150 < $390 → safe.
  await writeReport(repo, "20260104T000000Z", "SLICE-4", 150, { effort_points: 13 });

  const config = {
    loop: {
      autoMode: true,
      costRegressionMode: "expected_usd",
      costMedianUsdPerPoint: 10
    }
  };
  const result: any = await checkStopConditions(repo, { config });
  const reasons: string[] = result.reasons || [];
  assert.ok(
    !reasons.some((r) => r.startsWith("cost_regression_stop")),
    `13-point FEAT must NOT trigger cost_regression_stop; got: ${JSON.stringify(reasons)}`
  );
});

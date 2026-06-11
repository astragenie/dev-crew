import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { buildPerfReport } from "../scripts/lib/perf-report.mjs";
import { resolveConfig } from "../scripts/lib/config-resolver.mjs";

async function writeGrade(repo: string, sliceId: string, walls: number, avg: number) {
  const dir = path.join(repo, ".claude/artifacts/loop/grades");
  await fs.mkdir(dir, { recursive: true });
  const body = `---
id: GRADE-${sliceId}
slice: ${sliceId}
timing:
  wall_clock_seconds: ${walls}
  phase_gate_parallel: true
  post_builder_fanout: false
scores:
  architecture_quality: ${avg}
  reliability: ${avg}
  observability: ${avg}
  production_readiness: ${avg}
  security: ${avg}
  test_confidence: ${avg}
  product_completeness: ${avg}
---
# ${sliceId}
`;
  await fs.writeFile(path.join(dir, `20260611T0000${sliceId}-grade.md`), body);
}

test("perf-report aggregates median wall_clock + avg grade across window", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "perf-report-"));
  await writeGrade(repo, "01", 600, 0.85);
  await writeGrade(repo, "02", 480, 0.83);
  await writeGrade(repo, "03", 720, 0.87);
  const report = await buildPerfReport(repo, { window: 3 });
  assert.equal(report.window, 3);
  assert.equal(report.medianWallClockSeconds, 600);
  assert.equal(Math.round(report.avgGrade! * 1000) / 1000, 0.85);
  assert.equal(report.phaseGateParallelPct, 100);
  await fs.rm(repo, { recursive: true, force: true });
});

test("perf-report computes speedup vs pinned baseline", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "perf-report-baseline-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ loop: { perfBaseline: { medianWallClockSeconds: 1200, avgGrade: 0.835 } } })
  );
  await writeGrade(repo, "01", 600, 0.85);
  const config = await resolveConfig(repo);
  const report = await buildPerfReport(repo, { window: 1, config });
  assert.equal(report.baseline.medianWallClockSeconds, 1200);
  assert.equal(report.speedupRatio, 2);
  await fs.rm(repo, { recursive: true, force: true });
});

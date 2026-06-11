import fs from "node:fs/promises";
import path from "node:path";

import { parseFrontmatter } from "./frontmatter.mjs";
import { gradesRoot } from "./grade-parser.mjs";

// Aggregate timing + shape telemetry across the most-recent grade artifacts.
// Used by the `loop perf-report` CLI subcommand (SLICE-91 telemetry seed).
//
// Window semantics: by default reads the last `window` grade files
// (lexicographic sort puts newest last because grade filenames embed UTC
// timestamps in YYYYMMDDTHHMMSSZ format). Aggregates median / p90 wall
// clock, average grade score, and percentage flags for parallelism
// observations. Speedup vs. pinned baseline comes from
// .claude/loop.json -> loop.perfBaseline.

export type PerfReport = {
  window: number;
  slicesIncluded: number;
  medianWallClockSeconds: number | null;
  p90WallClockSeconds: number | null;
  avgGrade: number | null;
  phaseGateParallelPct: number;
  postBuilderFanoutPct: number;
  serialReviewerWarningPct: number;
  inlinePathPct: number;
  baseline: { medianWallClockSeconds: number | null; avgGrade: number | null };
  speedupRatio: number | null;
};

function median(nums: number[]): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentile(nums: number[], p: number): number | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

function avg(nums: number[]): number | null {
  if (nums.length === 0) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(matches: number, total: number): number {
  return total === 0 ? 0 : Math.round((matches / total) * 1000) / 10;
}

async function readGradeEntries(repoPath: string, config: Record<string, any> | null) {
  const dir = gradesRoot(repoPath, config);
  try {
    const entries = await fs.readdir(dir);
    return { dir, entries };
  } catch {
    return { dir, entries: [] as string[] };
  }
}

function tallySliceMetrics(
  frontmatter: Record<string, any>,
  acc: {
    walls: number[];
    gradeAvgs: number[];
    phaseGateParallel: number;
    postBuilderFanout: number;
    serialWarn: number;
    inlinePath: number;
  }
) {
  const timing = (frontmatter.timing as Record<string, unknown>) || {};
  const shape = (frontmatter.shape as Record<string, unknown>) || {};
  if (typeof timing.wall_clock_seconds === "number") {
    acc.walls.push(timing.wall_clock_seconds);
  }
  const scores = (frontmatter.scores as Record<string, unknown>) || {};
  const scoreVals = Object.values(scores).filter((v): v is number => typeof v === "number");
  if (scoreVals.length > 0) {
    acc.gradeAvgs.push(scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length);
  }
  if (timing.phase_gate_parallel === true) acc.phaseGateParallel += 1;
  if (timing.post_builder_fanout === true) acc.postBuilderFanout += 1;
  if (timing.serial_reviewer_warning === true) acc.serialWarn += 1;
  if (shape.inline_path_used === true) acc.inlinePath += 1;
}

export async function buildPerfReport(
  repoPath: string,
  { window = 10, config = null }: { window?: number; config?: Record<string, any> | null } = {}
): Promise<PerfReport> {
  const { dir, entries } = await readGradeEntries(repoPath, config);
  const grades = entries.filter((f) => f.endsWith("-grade.md")).sort();
  const recent = grades.slice(-window);
  const acc = {
    walls: [] as number[],
    gradeAvgs: [] as number[],
    phaseGateParallel: 0,
    postBuilderFanout: 0,
    serialWarn: 0,
    inlinePath: 0
  };
  for (const file of recent) {
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    const { frontmatter } = parseFrontmatter(raw);
    tallySliceMetrics(frontmatter, acc);
  }
  const baselineCfg =
    ((config?.loop?.perfBaseline ?? {}) as {
      medianWallClockSeconds?: number;
      avgGrade?: number;
    }) || {};
  const medianWall = median(acc.walls);
  const baseMedian = baselineCfg.medianWallClockSeconds ?? null;
  return {
    window,
    slicesIncluded: recent.length,
    medianWallClockSeconds: medianWall,
    p90WallClockSeconds: percentile(acc.walls, 90),
    avgGrade: avg(acc.gradeAvgs),
    phaseGateParallelPct: pct(acc.phaseGateParallel, recent.length),
    postBuilderFanoutPct: pct(acc.postBuilderFanout, recent.length),
    serialReviewerWarningPct: pct(acc.serialWarn, recent.length),
    inlinePathPct: pct(acc.inlinePath, recent.length),
    baseline: {
      medianWallClockSeconds: baseMedian,
      avgGrade: baselineCfg.avgGrade ?? null
    },
    speedupRatio:
      medianWall && baseMedian ? Math.round((baseMedian / medianWall) * 100) / 100 : null
  };
}

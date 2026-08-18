// learning-cycle.mts — FEAT-229: wires the already-shipped continuous-learning
// pieces (FEAT-220/221/222) into one orchestrated pipeline.
//
// runLearningCycle chains:
//   1. mineFailures (failure-mining.mjs, FEAT-221) — classify -> clusters ->
//      candidate lessons + its own dated mining report.
//   2. generateEvalsForClusters (eval-generator.mjs, FEAT-222) — top clusters
//      -> manufactured crew eval-specs (only when loop.crewRepoPath resolves;
//      otherwise its own skip-path fires and is recorded, not duplicated).
//   3. One dated cycle report under .claude/artifacts/loop/learning-runs/.
//
// Fire-and-forget contract (AC-2): each stage is wrapped independently. A
// throw in stage 1 or 2 is logged into the cycle result and the OTHER stage
// still runs — nothing here ever propagates to the caller. Cadence callers
// (the `learn` CLI subcommand, the retrospective hook — DEC-070) can `await`
// this function without a surrounding try/catch.
//
// Opt-in (AC-3): absent/disabled `loop.learningLoop.enabled` is a
// byte-identical no-op — returns null before touching disk, mirroring the
// memory-sink opt-in posture (DEC-065).
//
// Idempotency (AC-4) and volume caps (AC-5) are layered on top of the two
// stages' own contracts: mineFailures dedups on `mined:<hash>` and
// generateEvalsForClusters dedups on `provenance.cluster_hash` — this module
// does not re-derive those keys, it only decides how many clusters each
// stage is allowed to see and records what the caps dropped.

import fs from "node:fs/promises";
import path from "node:path";

import { mineFailures, type MinedLessonRecord } from "./failure-mining.mjs";
import { generateEvalsForClusters, type EvalGeneratorResult } from "./eval-generator.mjs";
import type { FailureCluster } from "./failure-classifier.mjs";
import { learningRunsRoot, ensureDir } from "./paths.mjs";

const DEFAULT_MAX_CLUSTERS_PER_RUN = 10;
const DEFAULT_MAX_SPECS_PER_RUN = 5;
const DEFAULT_WINDOW_DAYS = 14;

export interface LearningLoopConfig {
  enabled?: boolean;
  cadence?: string;
  maxClustersPerRun?: number;
  maxSpecsPerRun?: number;
  windowDays?: number;
}

export interface LearningCycleError {
  stage: "mine-failures" | "eval-generator";
  message: string;
}

export interface LearningCycleResult {
  ranAt: string;
  windowSince: string | null;
  windowUntil: string | null;
  clustersFound: number;
  clustersProcessed: number;
  clustersDroppedByCap: number;
  lessonsWritten: MinedLessonRecord[];
  specsConsidered: number;
  specsDroppedByCap: number;
  specResults: EvalGeneratorResult[];
  errors: LearningCycleError[];
  reportPath: string;
}

function resolveLearningLoopConfig(
  config: Record<string, any> | null | undefined
): LearningLoopConfig | null {
  const raw = config?.loop?.learningLoop;
  if (!raw || typeof raw !== "object") return null;
  return raw as LearningLoopConfig;
}

async function runMiningStage(
  repoPath: string,
  maxClustersPerRun: number,
  windowDays: number,
  config: Record<string, any> | null | undefined,
  errors: LearningCycleError[]
): Promise<{
  clusters: FailureCluster[];
  lessonsWritten: MinedLessonRecord[];
  windowSince: string | null;
  windowUntil: string | null;
}> {
  try {
    const result = await mineFailures(repoPath, {
      sinceDays: windowDays,
      maxLessons: maxClustersPerRun,
      config: config ?? null
    });
    return {
      clusters: result.clusters,
      lessonsWritten: result.lessonsWritten,
      windowSince: result.windowSince,
      windowUntil: result.windowUntil
    };
  } catch (err) {
    errors.push({ stage: "mine-failures", message: (err as Error).message });
    return { clusters: [], lessonsWritten: [], windowSince: null, windowUntil: null };
  }
}

async function runEvalGenStage(
  repoPath: string,
  clusters: FailureCluster[],
  config: Record<string, any> | null | undefined,
  errors: LearningCycleError[]
): Promise<EvalGeneratorResult[]> {
  if (clusters.length === 0) return [];
  try {
    return await generateEvalsForClusters(repoPath, clusters, { config: config ?? null });
  } catch (err) {
    errors.push({ stage: "eval-generator", message: (err as Error).message });
    return [];
  }
}

function renderCycleReport(result: Omit<LearningCycleResult, "reportPath">): string {
  const lines = [`# Learning cycle ${result.ranAt}`, ""];
  lines.push(`Window: ${result.windowSince ?? "n/a"} -> ${result.windowUntil ?? "n/a"}`, "");
  lines.push(
    `## Clusters`,
    "",
    `- Found: ${result.clustersFound}`,
    `- Processed: ${result.clustersProcessed}`,
    `- Dropped by \`maxClustersPerRun\` cap: ${result.clustersDroppedByCap}`,
    ""
  );
  lines.push(`## Candidate lessons (${result.lessonsWritten.length})`, "");
  if (result.lessonsWritten.length === 0) {
    lines.push("_(none written this cycle)_");
  } else {
    for (const w of result.lessonsWritten) lines.push(`- \`${w.key}\` (${w.failure_class})`);
  }
  lines.push("", `## Manufactured eval-specs`, "");
  lines.push(`- Considered: ${result.specsConsidered}`);
  lines.push(`- Dropped by \`maxSpecsPerRun\` cap: ${result.specsDroppedByCap}`);
  const written = result.specResults.filter((r) => r.status === "written");
  const skipped = result.specResults.filter((r) => r.status === "skipped");
  lines.push(`- Written: ${written.length}`, `- Skipped: ${skipped.length}`, "");
  if (written.length > 0) {
    lines.push("### Written", "");
    for (const w of written)
      lines.push(`- ${w.failure_class} -> ${w.targetFile} (${w.clusterHash})`);
    lines.push("");
  }
  if (skipped.length > 0) {
    lines.push("### Skipped", "");
    for (const s of skipped) lines.push(`- ${s.failure_class}: ${s.reason}`);
    lines.push("");
  }
  if (result.errors.length > 0) {
    lines.push(`## Stage errors (${result.errors.length})`, "");
    for (const e of result.errors) lines.push(`- \`${e.stage}\`: ${e.message}`);
    lines.push("");
  }
  return lines.join("\n");
}

async function writeCycleReport(
  repoPath: string,
  config: Record<string, any> | null | undefined,
  result: Omit<LearningCycleResult, "reportPath">
): Promise<string> {
  const dir = learningRunsRoot(repoPath, config);
  await ensureDir(dir);
  const filename = `${result.ranAt.slice(0, 10)}.md`;
  const target = path.join(dir, filename);
  await fs.writeFile(target, renderCycleReport(result));
  return target;
}

/**
 * Run one continuous-learning cycle: mine failures -> manufacture eval-specs
 * -> write one dated report. Never throws (AC-2). Returns null when
 * `loop.learningLoop.enabled` is not `true` (AC-3, absent config included).
 */
export async function runLearningCycle(
  repoPath: string,
  config: Record<string, any> | null | undefined
): Promise<LearningCycleResult | null> {
  const learningLoop = resolveLearningLoopConfig(config);
  if (!learningLoop?.enabled) return null;

  const maxClustersPerRun = learningLoop.maxClustersPerRun ?? DEFAULT_MAX_CLUSTERS_PER_RUN;
  const maxSpecsPerRun = learningLoop.maxSpecsPerRun ?? DEFAULT_MAX_SPECS_PER_RUN;
  const windowDays = learningLoop.windowDays ?? DEFAULT_WINDOW_DAYS;

  const errors: LearningCycleError[] = [];
  const mined = await runMiningStage(repoPath, maxClustersPerRun, windowDays, config, errors);

  const clustersFound = mined.clusters.length;
  const processedClusters = mined.clusters.slice(0, maxClustersPerRun);
  const clustersDroppedByCap = Math.max(0, clustersFound - processedClusters.length);

  const specClusters = processedClusters.slice(0, maxSpecsPerRun);
  const specsDroppedByCap = Math.max(0, processedClusters.length - specClusters.length);
  const specResults = await runEvalGenStage(repoPath, specClusters, config, errors);

  const ranAt = new Date().toISOString();
  const partial: Omit<LearningCycleResult, "reportPath"> = {
    ranAt,
    windowSince: mined.windowSince,
    windowUntil: mined.windowUntil,
    clustersFound,
    clustersProcessed: processedClusters.length,
    clustersDroppedByCap,
    lessonsWritten: mined.lessonsWritten,
    specsConsidered: specClusters.length,
    specsDroppedByCap,
    specResults,
    errors
  };

  const reportPath = await writeCycleReport(repoPath, config, partial);
  return { ...partial, reportPath };
}

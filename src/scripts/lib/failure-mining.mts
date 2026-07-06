// failure-mining.mts — FEAT-221 Part B: the operator-runnable mining job.
//
// Runs FailureClassifier over a window, extracts candidate lessons for the
// top clusters via `logLearning` (learnings.mts — no parallel writer), and
// writes a dated report under .claude/artifacts/loop/mining/YYYY-MM-DD.md.
//
// Idempotent: a candidate lesson's key is `mined:<hash>` where hash is
// sha1(failure_class + "|" + normalized root_cause) — timestamp-independent,
// so re-running over the same (or an overlapping) window never appends a
// duplicate lesson for the same cluster identity (AC-4).
//
// Fire-and-forget: a zero-cluster window writes a "no clusters" report,
// writes no lessons, and never throws (AC-5) — every read underneath is
// already tail-safe (missing files -> []), so no top-level try/catch is
// needed to hide real bugs.

import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

import {
  classifyFailures,
  normalizeRootCause,
  resolveSinceMs,
  MINED_LESSON_KEY_PREFIX,
  type ClassifyOptions,
  type FailureCluster
} from "./failure-classifier.mjs";
import { logLearning, listAllLearnings } from "./learnings.mjs";
import { isFeatureEnabled } from "./features-service.mjs";
import { miningRoot, ensureDir } from "./paths.mjs";

const MAX_CANDIDATE_LESSONS = 10;
const MINED_KEY_PREFIX = MINED_LESSON_KEY_PREFIX;

export interface MineFailuresOptions extends ClassifyOptions {
  maxLessons?: number;
}

export interface MinedLessonRecord {
  key: string;
  failure_class: string;
}

export interface MineFailuresResult {
  windowSince: string;
  windowUntil: string;
  clusters: FailureCluster[];
  lessonsWritten: MinedLessonRecord[];
  skippedDuplicates: string[];
  reportPath: string;
}

function clusterHash(cluster: FailureCluster): string {
  const signature = `${cluster.failure_class}|${normalizeRootCause(cluster.representative_root_cause)}`;
  return createHash("sha1").update(signature).digest("hex").slice(0, 12);
}

function buildInsight(cluster: FailureCluster): string {
  const cause = cluster.representative_root_cause || "unspecified";
  return (
    `Recurring failure_class "${cluster.failure_class}" observed ${cluster.count}x ` +
    `between ${cluster.first_seen} and ${cluster.last_seen}. Root cause: ${cause}.`
  );
}

async function loadExistingMinedKeys(repoPath: string): Promise<Set<string>> {
  const entries = await listAllLearnings(repoPath);
  const keys = new Set<string>();
  for (const e of entries) {
    if (typeof e.key === "string" && e.key.startsWith(MINED_KEY_PREFIX)) keys.add(e.key);
  }
  return keys;
}

async function writeCandidateLessons(
  repoPath: string,
  clusters: FailureCluster[],
  config: Record<string, unknown> | null | undefined
): Promise<{ written: MinedLessonRecord[]; skipped: string[] }> {
  const written: MinedLessonRecord[] = [];
  const skipped: string[] = [];
  if (clusters.length === 0 || !isFeatureEnabled("learnings-capture", config)) {
    return { written, skipped };
  }

  const existingKeys = await loadExistingMinedKeys(repoPath);
  for (const cluster of clusters) {
    const key = `${MINED_KEY_PREFIX}${clusterHash(cluster)}`;
    if (existingKeys.has(key)) {
      skipped.push(key);
      continue;
    }
    await logLearning(repoPath, {
      key,
      insight: buildInsight(cluster),
      source: "failure-mining",
      failure_class: cluster.failure_class,
      ...(cluster.representative_root_cause
        ? { root_cause: cluster.representative_root_cause }
        : {}),
      ...(cluster.representative_fix ? { recommended_fix: cluster.representative_fix } : {}),
      evidence: cluster.exemplar_ids,
      status: "candidate"
    });
    existingKeys.add(key);
    written.push({ key, failure_class: cluster.failure_class });
  }
  return { written, skipped };
}

function renderReport(
  windowSince: string,
  windowUntil: string,
  clusters: FailureCluster[],
  written: MinedLessonRecord[],
  skipped: string[]
): string {
  const lines = [`# Failure mining ${windowSince} -> ${windowUntil}`, ""];
  if (clusters.length === 0) {
    lines.push("No failure clusters found in this window.");
    lines.push("");
    return lines.join("\n");
  }
  lines.push(`## Clusters (${clusters.length}, ranked by frequency x recency)`, "");
  for (const c of clusters) {
    lines.push(`### ${c.failure_class} (${c.count}x, ${c.first_seen} -> ${c.last_seen})`);
    lines.push(`- Representative root cause: ${c.representative_root_cause || "n/a"}`);
    if (c.representative_fix) lines.push(`- Representative fix: ${c.representative_fix}`);
    lines.push(`- Exemplars: ${c.exemplar_ids.join(", ")}`);
    lines.push("");
  }
  lines.push("## Candidate lessons written", "");
  if (written.length === 0) {
    lines.push("_(none — either no top clusters cleared the gate, or all were already mined)_");
  } else {
    for (const w of written) lines.push(`- \`${w.key}\` (${w.failure_class})`);
  }
  if (skipped.length > 0) {
    lines.push("", `## Skipped (already mined, ${skipped.length})`, "");
    for (const k of skipped) lines.push(`- \`${k}\``);
  }
  lines.push("");
  return lines.join("\n");
}

async function writeMiningReport(
  repoPath: string,
  windowSince: string,
  windowUntil: string,
  clusters: FailureCluster[],
  written: MinedLessonRecord[],
  skipped: string[],
  config: Record<string, unknown> | null | undefined
): Promise<string> {
  const dir = miningRoot(repoPath, config);
  await ensureDir(dir);
  const filename = `${windowUntil.slice(0, 10)}.md`;
  const target = path.join(dir, filename);
  await fs.writeFile(target, renderReport(windowSince, windowUntil, clusters, written, skipped));
  return target;
}

export async function mineFailures(
  repoPath: string,
  opts: MineFailuresOptions = {}
): Promise<MineFailuresResult> {
  const nowMs = opts.nowMs ?? Date.now();
  const clusters = await classifyFailures(repoPath, opts);
  const topClusters = clusters.slice(0, opts.maxLessons ?? MAX_CANDIDATE_LESSONS);

  const { written, skipped } = await writeCandidateLessons(repoPath, topClusters, opts.config);

  const windowUntil = new Date(nowMs).toISOString();
  const windowSince = new Date(resolveSinceMs(opts, nowMs)).toISOString();

  const reportPath = await writeMiningReport(
    repoPath,
    windowSince,
    windowUntil,
    clusters,
    written,
    skipped,
    opts.config
  );

  return {
    windowSince,
    windowUntil,
    clusters,
    lessonsWritten: written,
    skippedDuplicates: skipped,
    reportPath
  };
}

import fs from "node:fs/promises";
import path from "node:path";
import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { checkStopConditions } from "./stop-conditions.mjs";
import { compareWalkerOrder, evaluateCandidate } from "./walker-gates.mjs";
import { checkSessionDrift } from "./session-drift.mjs";
import { appendAuditLog } from "./auto-dispatch.mjs";

export type { DispatchPlan } from "./walker-gates.mjs";
export { evaluateRiskGate } from "./walker-gates.mjs";

// Re-import DispatchPlan as a type for use within this module.
import type { DispatchPlan } from "./walker-gates.mjs";

export interface SkippedEntry {
  id: string;
  reason: string;
}

export interface AutoWalkerResult {
  walked: number;
  skipped: SkippedEntry[];
  planned: number;
  halted: boolean;
  stopReason: string | null;
  plans: DispatchPlan[];
  /** SLICE-B: path to generated auto-run summary artifact (if write succeeded) */
  summaryPath?: string;
  /** SLICE-C: orchestrator hints for cost/escalation/mode control */
  orchConfig?: {
    costStopThreshold: number | null;
    escalationThreshold: number;
    autoMode: boolean;
  };
}

export interface AutoWalkerOptions {
  maxFeatures?: number;
  /** Currently always true in SLICE-A — no live dispatch until SLICE-B. */
  dryRun?: boolean;
  /** SLICE-B/C: when true, include autoMode flag in plan objects to suppress approval gates. */
  autoMode?: boolean;
  /** SLICE-C: halt after the number of plans reaches this threshold (plan-count proxy for cost). */
  costStopThreshold?: number;
  /** SLICE-C: resolved config from loop.json (loaded automatically if not provided). */
  config?: any;
  /** SLICE-54 (FEAT-056): bypass session-drift halt + log override event. */
  allowCrossSession?: boolean;
}

/**
 * Process the walk loop: iterate candidates, build plans, check stop conditions.
 *
 * @param candidates        The triaged candidates to walk.
 * @param maxFeatures       Cap on number of plans to build.
 * @param autoMode          If true, include autoMode flag in plans.
 * @param costStopThreshold SLICE-C: halt after this many plans (plan-count proxy for cost).
 * @param repoPath          For stop condition checks.
 * @param doneSet           SLICE-41: Set of IDs in the done/ folder for depends_on resolution.
 * @param allKnownIds       SLICE-41: Set of all known backlog IDs for missing-dep detection.
 * @returns                 { skipped, plans, halted, stopReason }
 */
// FEAT-056: collapse stop-condition + cross-session override into one helper so
// walkCandidates stays under the complexity cap.
//
// Override semantics (per SLICE-54 reviewer finding): filter session_drift_stop
// from all reasons. If other halt reasons remain, halt with the first remaining
// reason — the override does NOT swallow unrelated halts. If only drift reasons
// were present, log override audit and continue.
async function evaluateStopCondition(
  repoPath: string,
  config: any,
  allowCrossSession: boolean
): Promise<{ halt: boolean; reason: string | null }> {
  const stopResult = await checkStopConditions(repoPath, { config });
  if (!stopResult.shouldStop) return { halt: false, reason: null };
  const reasons: string[] = stopResult.reasons ?? [];
  const firstReason = reasons[0] ?? "stop condition fired";
  if (!allowCrossSession) return { halt: true, reason: firstReason };

  const nonDrift = reasons.filter((r) => !r.startsWith("session_drift_stop"));
  const driftPresent = reasons.length > nonDrift.length;
  if (!driftPresent) return { halt: true, reason: firstReason };

  try {
    const drift = await checkSessionDrift(repoPath);
    await appendAuditLog(repoPath, {
      timestamp: new Date().toISOString(),
      event: "session-drift-override",
      sessionIdAtStart: drift?.sessionIdAtStart ?? null,
      sessionIdNow: drift?.sessionIdNow ?? null
    });
  } catch {
    // Best-effort audit log; do not halt on logging failure.
  }
  if (nonDrift.length > 0) return { halt: true, reason: nonDrift[0] ?? firstReason };
  return { halt: false, reason: null };
}

async function walkCandidates(
  candidates: any[],
  maxFeatures: number | undefined,
  autoMode: boolean,
  costStopThreshold: number | undefined,
  repoPath: string,
  doneSet: Set<string>,
  allKnownIds: Set<string>,
  config: any = null,
  allowCrossSession = false
): Promise<{
  skipped: SkippedEntry[];
  plans: DispatchPlan[];
  halted: boolean;
  stopReason: string | null;
}> {
  const skipped: SkippedEntry[] = [];
  const plans: DispatchPlan[] = [];
  let halted = false;
  let stopReason: string | null = null;

  for (const entry of candidates) {
    // Enforce max-features cap on plans (not on the walk count).
    if (maxFeatures !== undefined && plans.length >= maxFeatures) {
      break;
    }

    const evalResult = evaluateCandidate(entry, autoMode, doneSet, allKnownIds);
    if ("skipReason" in evalResult) {
      skipped.push({ id: entry.id, reason: evalResult.skipReason });
      continue;
    }
    plans.push(evalResult.plan);

    // SLICE-C: enforce cost cap after each plan
    if (costStopThreshold !== undefined && plans.length >= costStopThreshold) {
      halted = true;
      stopReason = `cost_cap: plan count ${plans.length} reached costStopThreshold ${costStopThreshold}`;
      break;
    }

    // Check stop conditions after each plan to allow early halt.
    const stopAction = await evaluateStopCondition(repoPath, config, allowCrossSession);
    if (stopAction.halt) {
      halted = true;
      stopReason = stopAction.reason;
      break;
    }
  }

  return { skipped, plans, halted, stopReason };
}

/**
 * Walk the triaged backlog and emit dispatch plans for autonomous_safe FEATs.
 *
 * SLICE-B: Now also processes autonomous_safe=false items (with risk gate).
 * Only skips items where autonomous_safe is null/undefined (not explicitly set).
 *
 * SLICE-C: Adds cost cap enforcement and orchConfig hints.
 *
 * Plans include:
 *   - requiresPlanPreflight: true for autonomous_safe=false items
 *   - riskGate: populated if pm_risk_level >= 0.7
 *   - autoMode: set when options.autoMode=true
 *
 * After the walk, writes summary artifact to .claude/artifacts/loop/auto-runs/<TS>-auto-run.md
 *
 * @param repoPath  Absolute path to the repo root.
 * @param options   { maxFeatures?, dryRun? (default true), autoMode?, costStopThreshold?, config? }
 */
export async function runAutoWalker(
  repoPath: string,
  options: AutoWalkerOptions = {}
): Promise<AutoWalkerResult> {
  const {
    maxFeatures,
    dryRun: _dryRun = true,
    autoMode = false,
    config: providedConfig,
    allowCrossSession = false
  } = options;

  // SLICE-C: Load config if not provided and read costStopThreshold
  let resolvedConfig = providedConfig;
  if (!resolvedConfig) {
    try {
      const { resolveConfig } = await import("./config-resolver.mjs");
      resolvedConfig = await resolveConfig(repoPath);
    } catch {
      // Best-effort: if config resolution fails, continue without it
      resolvedConfig = null;
    }
  }

  // SLICE-C: Determine effective costStopThreshold
  // Priority: explicit option > config.loop.costStopThreshold > undefined
  const costStopThreshold =
    options.costStopThreshold ?? resolvedConfig?.loop?.costStopThreshold ?? undefined;

  // Load triaged entries and sort by walker priority ordering.
  const allEntries = await listBacklog(repoPath);
  const triaged = filterBacklog(allEntries, { status: "triaged" });
  triaged.sort(compareWalkerOrder as (a: Record<string, any>, b: Record<string, any>) => number);

  // SLICE-41: Build done-set and all-known-ids for depends_on resolution.
  const doneEntries = filterBacklog(allEntries, { status: "done" });
  const doneSet = new Set<string>(doneEntries.map((e: any) => String(e.id)));
  const allKnownIds = new Set<string>(allEntries.map((e: any) => String(e.id)));

  const { skipped, plans, halted, stopReason } = await walkCandidates(
    triaged,
    maxFeatures,
    autoMode,
    costStopThreshold,
    repoPath,
    doneSet,
    allKnownIds,
    resolvedConfig,
    allowCrossSession
  );

  // SLICE-B: Write auto-run summary artifact (best-effort; don't fail if it errors)
  let summaryPath: string | undefined;
  try {
    summaryPath = await writeAutoRunSummary(repoPath, {
      walked: triaged.length,
      skipped,
      planned: plans.length,
      halted,
      stopReason,
      plans
    });
  } catch {
    // Best-effort: silently continue on write failure
  }

  return {
    walked: triaged.length,
    skipped,
    planned: plans.length,
    halted,
    stopReason,
    plans,
    ...(summaryPath !== undefined ? { summaryPath } : {}),
    // SLICE-C: Include orchestrator hints
    orchConfig: {
      costStopThreshold: costStopThreshold ?? null,
      escalationThreshold: 3,
      autoMode
    }
  };
}

/**
 * SLICE-B: Write auto-run summary artifact to .claude/artifacts/loop/auto-runs/<TS>-auto-run.md
 *
 * @param repoPath  Absolute path to the repo root.
 * @param result    The AutoWalkerResult returned by runAutoWalker.
 * @returns         The absolute path to the written artifact.
 */
export async function writeAutoRunSummary(
  repoPath: string,
  result: AutoWalkerResult
): Promise<string> {
  const artifactDir = path.join(repoPath, ".claude/artifacts/loop/auto-runs");
  await fs.mkdir(artifactDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filePath = path.join(artifactDir, `${timestamp}-auto-run.md`);

  // Build planned list
  const plannedList = result.plans
    .map((plan) => {
      const preflight = plan.requiresPlanPreflight ? " (requiresPlanPreflight)" : "";
      return `- ${plan.featureId}${preflight}`;
    })
    .join("\n");

  // Build skipped list
  const skippedList = result.skipped.map((skip) => `- ${skip.id}: ${skip.reason}`).join("\n");

  // Build frontmatter
  const content = `---
kind: auto-run-summary
walked: ${result.walked}
planned: ${result.planned}
skipped: ${result.skipped.length}
halted: ${result.halted}
generated_at: ${new Date().toISOString()}
---

# Auto-Run Summary

- FEATs walked: ${result.walked}
- FEATs planned: ${result.planned}
- FEATs skipped: ${result.skipped.length}
- Halted: ${result.halted}${result.stopReason ? ` (reason: ${result.stopReason})` : ""}

## Planned

${plannedList || "_(none)_"}

## Skipped

${skippedList || "_(none)_"}
`;

  await fs.writeFile(filePath, content, "utf-8");
  return filePath;
}

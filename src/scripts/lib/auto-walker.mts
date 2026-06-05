import fs from "node:fs/promises";
import path from "node:path";
import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
import { checkStopConditions } from "./stop-conditions.mjs";

// Priority ordering for sort tiebreaker (lower index = higher rank).
const PRIORITY_ORDER = ["P0", "P1", "P2", "P3"];

/**
 * Compare two backlog entries for walker ordering:
 *   1. composite_score DESC (default 0)
 *   2. priority ascending by rank (P0 > P1 > P2 > P3; missing treated as P3)
 *   3. pm_strategic_fit DESC (default 0)
 */
function compareWalkerOrder(
  a: { frontmatter: Record<string, any> },
  b: { frontmatter: Record<string, any> }
): number {
  const scoreA = Math.min(Number(a.frontmatter.composite_score) || 0, 1.0);
  const scoreB = Math.min(Number(b.frontmatter.composite_score) || 0, 1.0);
  if (scoreB !== scoreA) return scoreB - scoreA;

  const prA = PRIORITY_ORDER.indexOf(a.frontmatter.priority || "P3");
  const prB = PRIORITY_ORDER.indexOf(b.frontmatter.priority || "P3");
  const rankA = prA === -1 ? PRIORITY_ORDER.length : prA;
  const rankB = prB === -1 ? PRIORITY_ORDER.length : prB;
  if (rankA !== rankB) return rankA - rankB;

  const fitA = Number(a.frontmatter.pm_strategic_fit) || 0;
  const fitB = Number(b.frontmatter.pm_strategic_fit) || 0;
  return fitB - fitA;
}

export interface DispatchPlan {
  featureId: string;
  suggestedSliceTitle: string;
  fromFeatureCmd: string;
  startCmd: string;
  builderPrompt: string;
  /** SLICE-B: set when autonomous_safe=false. Signals orchestrator to require plan preflight. */
  requiresPlanPreflight?: boolean;
  /** SLICE-B: risk gate details if pm_risk_level >= 0.7 */
  riskGate?: {
    level: number;
    warn: string;
  };
  /** SLICE-B/C: include in plan objects when autoMode=true to suppress approval gates. */
  autoMode?: boolean;
}

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
}

/**
 * SLICE-41: Check whether a backlog entry's depends_on are satisfied.
 *
 * A dep is satisfied when it exists in allKnownIds AND is in doneSet.
 * A dep not found in allKnownIds is reported with a "(missing)" suffix.
 *
 * @param entry        The backlog entry to evaluate.
 * @param doneSet      Set of IDs in the done/ folder.
 * @param allKnownIds  Set of all known backlog IDs (all statuses).
 */
function checkDependsOn(
  entry: any,
  doneSet: Set<string>,
  allKnownIds: Set<string>
): { skip: boolean; reason?: string } {
  const fm = entry.frontmatter;
  if (!Array.isArray(fm.depends_on) || fm.depends_on.length === 0) {
    return { skip: false };
  }
  const unsatisfied: string[] = [];
  for (const dep of fm.depends_on) {
    if (!allKnownIds.has(dep)) {
      unsatisfied.push(`${dep} (missing)`);
    } else if (!doneSet.has(dep)) {
      unsatisfied.push(dep);
    }
    // if dep is in allKnownIds AND in doneSet → satisfied, skip
  }
  if (unsatisfied.length > 0) {
    return { skip: true, reason: `depends_on: ${unsatisfied.join(", ")}` };
  }
  return { skip: false };
}

/**
 * SLICE-B: Evaluate risk gate for autonomous_safe=false items.
 *
 * Returns { skip, skipReason?, warn? }:
 *   - pm_risk_level >= 0.7 → do NOT skip, but warn (SPEC recommended)
 *   - otherwise → do not skip, no warn
 *
 * Note: deferred and depends_on checks have been moved to the shared
 * pre-branch filter in walkCandidates (SLICE-41) so they apply to ALL
 * entries regardless of autonomous_safe value.
 *
 * @param entry  The backlog entry to evaluate.
 */
export function evaluateRiskGate(entry: any): {
  skip: boolean;
  skipReason?: string;
  warn?: string;
} {
  const fm = entry.frontmatter;

  // High risk → warn but don't skip (SPEC requirement check handled at orchestrator layer)
  if (Number(fm.pm_risk_level) >= 0.7) {
    return {
      skip: false,
      warn: `pm_risk_level ${fm.pm_risk_level} — SPEC recommended`
    };
  }

  return { skip: false };
}

/**
 * Process an entry with autonomous_safe=false and determine if it should be
 * skipped or planned. Returns { shouldSkip, plan?, skipReason? }
 */
function processUnsafeEntry(
  entry: any,
  autoMode: boolean
): { shouldSkip: boolean; plan?: DispatchPlan; skipReason?: string } {
  const riskResult = evaluateRiskGate(entry);
  if (riskResult.skip) {
    return { shouldSkip: true, skipReason: riskResult.skipReason || "risk gate blocked" };
  }

  const plan: DispatchPlan = {
    featureId: entry.id,
    suggestedSliceTitle: `Implement ${entry.id}: ${extractTitle(entry)}`,
    fromFeatureCmd: `node scripts/loop.mjs slice from-feature --id ${entry.id}`,
    startCmd: `node scripts/loop.mjs slice start --id SLICE-<TBD>`,
    builderPrompt: buildPromptSummary(entry),
    requiresPlanPreflight: true
  };

  if (riskResult.warn) {
    plan.riskGate = {
      level: Number(entry.frontmatter.pm_risk_level) || 0,
      warn: riskResult.warn
    };
  }

  if (autoMode) {
    plan.autoMode = true;
  }

  return { shouldSkip: false, plan };
}

/**
 * Build a dispatch plan for a triaged entry with autonomous_safe=true.
 *
 * @param entry    The backlog entry.
 * @param autoMode If true, marks plan with autoMode flag.
 */
function buildSafePlan(entry: any, autoMode: boolean): DispatchPlan {
  const plan: DispatchPlan = {
    featureId: entry.id,
    suggestedSliceTitle: `Implement ${entry.id}: ${extractTitle(entry)}`,
    fromFeatureCmd: `node scripts/loop.mjs slice from-feature --id ${entry.id}`,
    startCmd: `node scripts/loop.mjs slice start --id SLICE-<TBD>`,
    builderPrompt: buildPromptSummary(entry)
  };

  if (autoMode) {
    plan.autoMode = true;
  }

  return plan;
}

/**
 * SLICE-41: Evaluate a single candidate entry through the shared pre-branch filter
 * and the autonomous_safe branch. Returns { skipReason } if the entry should be
 * skipped, or { plan } if it should be planned.
 */
function evaluateCandidate(
  entry: any,
  autoMode: boolean,
  doneSet: Set<string>,
  allKnownIds: Set<string>
): { skipReason: string } | { plan: DispatchPlan } {
  // Shared pre-branch filter (applies to ALL entries, AC-17: deferred first).
  if (entry.frontmatter.deferred === true) {
    return { skipReason: "deferred" };
  }

  const depsResult = checkDependsOn(entry, doneSet, allKnownIds);
  if (depsResult.skip) {
    return { skipReason: depsResult.reason! };
  }

  const autonSafe = entry.frontmatter.autonomous_safe;

  // Only skip if autonomous_safe is null/undefined (not explicitly set).
  if (autonSafe !== true && autonSafe !== false) {
    return { skipReason: "not_autonomous_safe" };
  }

  if (autonSafe === false) {
    const result = processUnsafeEntry(entry, autoMode);
    if (result.shouldSkip) {
      return { skipReason: result.skipReason || "risk gate blocked" };
    }
    return { plan: result.plan! };
  }

  // autonomous_safe === true: build standard plan.
  return { plan: buildSafePlan(entry, autoMode) };
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
async function walkCandidates(
  candidates: any[],
  maxFeatures: number | undefined,
  autoMode: boolean,
  costStopThreshold: number | undefined,
  repoPath: string,
  doneSet: Set<string>,
  allKnownIds: Set<string>,
  config: any = null
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
    const stopResult = await checkStopConditions(repoPath, { config });
    if (stopResult.shouldStop) {
      halted = true;
      stopReason = stopResult.reasons?.[0] ?? "stop condition fired";
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
  const { maxFeatures, dryRun: _dryRun = true, autoMode = false, config: providedConfig } = options;

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
  triaged.sort(compareWalkerOrder);

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
    resolvedConfig
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
    summaryPath,
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

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractTitle(entry: {
  id: string;
  frontmatter: Record<string, any>;
  body: string;
}): string {
  const fm = entry.frontmatter;
  if (fm.title && typeof fm.title === "string") return fm.title;
  // Try to extract heading from body: "# FEAT-NNN: Some Title"
  const match = entry.body.match(/^#\s+\S+:\s+(.+)$/m);
  if (match) return match[1].trim();
  return entry.id;
}

function buildPromptSummary(entry: {
  id: string;
  frontmatter: Record<string, any>;
  body: string;
}): string {
  const title = extractTitle(entry);
  const category = entry.frontmatter.category ? ` (${entry.frontmatter.category})` : "";
  return `Implement ${entry.id}: ${title}${category} — see feature file for full acceptance criteria.`;
}

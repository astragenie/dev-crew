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
  const scoreA = Number(a.frontmatter.composite_score) || 0;
  const scoreB = Number(b.frontmatter.composite_score) || 0;
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
}

export interface AutoWalkerOptions {
  maxFeatures?: number;
  /** Currently always true in SLICE-A — no live dispatch until SLICE-B. */
  dryRun?: boolean;
}

/**
 * Walk the triaged backlog and emit dispatch plans for autonomous_safe FEATs.
 *
 * This is SLICE-A: dry-run only. Plans describe what SLICE-B would dispatch
 * but do NOT invoke any builder agent or commit.
 *
 * @param repoPath  Absolute path to the repo root.
 * @param options   { maxFeatures?, dryRun? (default true) }
 */
export async function runAutoWalker(
  repoPath: string,
  options: AutoWalkerOptions = {}
): Promise<AutoWalkerResult> {
  const { maxFeatures, dryRun: _dryRun = true } = options;

  const skipped: SkippedEntry[] = [];
  const plans: DispatchPlan[] = [];
  let halted = false;
  let stopReason: string | null = null;

  // Load triaged entries and sort by walker priority ordering.
  const allEntries = await listBacklog(repoPath);
  const triaged = filterBacklog(allEntries, { status: "triaged" });
  triaged.sort(compareWalkerOrder);

  const candidates = triaged;

  for (const entry of candidates) {
    // Enforce max-features cap on plans (not on the walk count).
    if (maxFeatures !== undefined && plans.length >= maxFeatures) {
      break;
    }

    if (entry.frontmatter.autonomous_safe !== true) {
      skipped.push({ id: entry.id, reason: "not_autonomous_safe" });
      continue;
    }

    // Build dispatch plan (read-only; SLICE-B wires actual execution).
    const plan: DispatchPlan = {
      featureId: entry.id,
      suggestedSliceTitle: `Implement ${entry.id}: ${extractTitle(entry)}`,
      fromFeatureCmd: `node scripts/loop.mjs slice from-feature --id ${entry.id}`,
      startCmd: `node scripts/loop.mjs slice start --id SLICE-<TBD>`,
      builderPrompt: buildPromptSummary(entry)
    };
    plans.push(plan);

    // Check stop conditions after each plan to allow early halt.
    const stopResult = await checkStopConditions(repoPath);
    if (stopResult.shouldStop) {
      halted = true;
      stopReason = stopResult.reasons?.[0] ?? "stop condition fired";
      break;
    }
  }

  return {
    walked: candidates.length,
    skipped,
    planned: plans.length,
    halted,
    stopReason,
    plans
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractTitle(entry: { id: string; frontmatter: Record<string, any>; body: string }): string {
  const fm = entry.frontmatter;
  if (fm.title && typeof fm.title === "string") return fm.title;
  // Try to extract heading from body: "# FEAT-NNN: Some Title"
  const match = entry.body.match(/^#\s+\S+:\s+(.+)$/m);
  if (match) return match[1].trim();
  return entry.id;
}

function buildPromptSummary(entry: { id: string; frontmatter: Record<string, any>; body: string; }): string {
  const title = extractTitle(entry);
  const category = entry.frontmatter.category ? ` (${entry.frontmatter.category})` : "";
  return `Implement ${entry.id}: ${title}${category} — see feature file for full acceptance criteria.`;
}

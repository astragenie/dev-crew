// FEAT-220 SLICE-A — real token/cost aggregation for hierarchical dispatch,
// scoped to a single dispatch run's [startedAt, completedAt] time window.
// Reuses the proven transcript-token-usage pipeline (events.jsonl read +
// transcript parse) rather than re-implementing it.
//
// Correlation heuristic (Option A — see FEAT-220 backlog item): a child is
// matched to a parsed agent transcript by (agentType, time window). This is
// unambiguous only when exactly one child plan and exactly one observed
// transcript share that agentType within the window. When 2+ children of a
// dispatch run share an agentType (concurrent — start/stop order alone
// cannot disambiguate which transcript is whose), this module refuses to
// guess: those children are reported in `partialChildren` and contribute
// zero to the aggregate totals, rather than emitting a confidently-wrong
// sum. Missing/unmatched events (no events.jsonl, or a child with no
// correlated transcript at all) degrade the same way. This function never
// throws — any read/parse failure degrades to a zeroed, fully-partial
// aggregate.

import fs from "node:fs/promises";
import path from "node:path";
import type { DispatchPlan } from "./dispatch-types.mjs";
import { collectEnrichedAgentPairs } from "./slice-linker/transcript-token-usage.mjs";
import { deriveCostUsd, type ModelRates } from "./cost-rate-table.mjs";

export interface DispatchCostAggregate {
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  estimatedCostUsd: number;
  model: string;
  partialChildren: string[];
}

export interface AggregateDispatchCostOptions {
  repoRoot: string;
  startedAt: string;
  completedAt: string;
  costRates?: Record<string, ModelRates>;
}

async function readLoopCostRates(
  repoRoot: string
): Promise<Record<string, ModelRates> | undefined> {
  try {
    const raw = await fs.readFile(path.join(repoRoot, ".claude", "loop.json"), "utf8");
    const parsed = JSON.parse(raw) as { loop?: { costRates?: Record<string, ModelRates> } };
    return parsed.loop?.costRates;
  } catch {
    // Not present or unreadable — proceed with hardcoded rates.
    return undefined;
  }
}

function groupById<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k) ?? [];
    bucket.push(item);
    map.set(k, bucket);
  }
  return map;
}

function zeroAggregate(childIds: string[]): DispatchCostAggregate {
  return {
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    model: "unknown",
    partialChildren: [...childIds]
  };
}

type EnrichedPair = Record<string, any>;

// Fold one unambiguously-matched (child, transcript) correlation into the
// running totals. Mutates nothing — returns the incremental contribution.
function costForPair(
  pair: EnrichedPair,
  ratesOverride: Record<string, ModelRates> | undefined
): { inputTokens: number; outputTokens: number; costUsd: number; model: string | null } {
  const inputTokens = (pair.inputTokens as number | undefined) ?? 0;
  const outputTokens = (pair.outputTokens as number | undefined) ?? 0;
  const cacheReadInputTokens = (pair.cacheReadInputTokens as number | undefined) ?? 0;
  const cacheCreationInputTokens = (pair.cacheCreationInputTokens as number | undefined) ?? 0;
  const pairModel = (pair.model as string | undefined) ?? "n/a";
  if (pairModel === "n/a") {
    return { inputTokens, outputTokens, costUsd: 0, model: null };
  }
  const costUsd = deriveCostUsd(
    { model: pairModel, inputTokens, outputTokens, cacheReadInputTokens, cacheCreationInputTokens },
    ratesOverride
  );
  return { inputTokens, outputTokens, costUsd, model: pairModel };
}

interface CorrelationTotals {
  totalInput: number;
  totalOutput: number;
  totalCost: number;
  model: string;
  partialChildren: string[];
}

// Fold one (agentType, children-of-that-type) group into the running
// totals. Unambiguous only when exactly one child and exactly one observed
// transcript share the agentType — see module doc comment for why any
// other shape (2+ children, 0 or 2+ transcripts) is reported as partial
// rather than guessed.
function correlateAgentTypeGroup(
  typedPlans: DispatchPlan[],
  candidates: EnrichedPair[],
  ratesOverride: Record<string, ModelRates> | undefined,
  totals: CorrelationTotals
): void {
  if (typedPlans.length !== 1 || candidates.length !== 1) {
    for (const plan of typedPlans) totals.partialChildren.push(plan.id);
    return;
  }
  const contribution = costForPair(candidates[0]!, ratesOverride);
  totals.totalInput += contribution.inputTokens;
  totals.totalOutput += contribution.outputTokens;
  totals.totalCost += contribution.costUsd;
  if (totals.model === "unknown" && contribution.model) totals.model = contribution.model;
}

/**
 * Aggregate real token usage + cost for a dispatch run's children by
 * correlating each child's `agentType` against transcripts observed in
 * `.claude/logs/events.jsonl` within [startedAt, completedAt]. See module
 * doc comment for the correlation heuristic and its ambiguity handling.
 */
export async function aggregateDispatchCost(
  plans: DispatchPlan[],
  opts: AggregateDispatchCostOptions
): Promise<DispatchCostAggregate> {
  const childIds = plans.map((p) => p.id);
  if (plans.length === 0) return zeroAggregate([]);

  let pairs: EnrichedPair[];
  let fileFound: boolean;
  try {
    ({ pairs, fileFound } = await collectEnrichedAgentPairs(opts.repoRoot, {
      startedAt: opts.startedAt,
      endedAt: opts.completedAt
    }));
  } catch {
    return zeroAggregate(childIds);
  }
  if (!fileFound || pairs.length === 0) return zeroAggregate(childIds);

  const ratesOverride = opts.costRates ?? (await readLoopCostRates(opts.repoRoot));
  const pairsByType = groupById(pairs, (p) => (p.agentType as string | undefined) || "unknown");
  const plansByType = groupById(plans, (p) => p.agentType || "unknown");

  const totals: CorrelationTotals = {
    totalInput: 0,
    totalOutput: 0,
    totalCost: 0,
    model: "unknown",
    partialChildren: []
  };
  for (const [agentType, typedPlans] of plansByType) {
    correlateAgentTypeGroup(typedPlans, pairsByType.get(agentType) ?? [], ratesOverride, totals);
  }
  const { totalInput, totalOutput, totalCost, model, partialChildren } = totals;

  return {
    totalTokens: totalInput + totalOutput,
    promptTokens: totalInput,
    completionTokens: totalOutput,
    estimatedCostUsd: totalCost,
    model,
    partialChildren
  };
}

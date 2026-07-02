// cost-rate-table.mts — per-model cost derivation for agent token usage.
//
// Rate table is hardcoded for the known Anthropic model families and can be
// overridden per-model via loop.costRates in .claude/loop.json.
//
// Unknown models return 0 (fail-safe, no throw).

export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadInputTokens: number;
  cacheCreationInputTokens: number;
}

export interface ModelRates {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

// Rates are per-MTok (per million tokens). Prices as of 2025-07.
const HARDCODED_RATES: Record<string, ModelRates> = {
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cacheRead: 0.3, cacheCreation: 3.75 },
  "claude-opus-4-7": { input: 15.0, output: 75.0, cacheRead: 1.5, cacheCreation: 18.75 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0, cacheRead: 0.1, cacheCreation: 1.25 }
};

/**
 * Derive cost in USD from token usage.
 *
 * Rate lookup order:
 *  1. ratesOverride[model]  — inline caller override (tests, hot-patch)
 *  2. HARDCODED_RATES[model]
 *
 * Config override via loop.costRates must be resolved by the caller and passed
 * as ratesOverride.
 *
 * Unknown model → returns 0 (never throws).
 */
export function deriveCostUsd(usage: TokenUsage, ratesOverride?: Record<string, ModelRates>): number {
  const rates = ratesOverride?.[usage.model] ?? HARDCODED_RATES[usage.model];
  if (!rates) return 0;

  return (
    (usage.inputTokens * rates.input +
      usage.outputTokens * rates.output +
      usage.cacheReadInputTokens * rates.cacheRead +
      usage.cacheCreationInputTokens * rates.cacheCreation) /
    1_000_000
  );
}

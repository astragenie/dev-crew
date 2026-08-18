// src/scripts/lib/wave/config.mts
// Wave config resolver, validator, and marathon-runner switch.

import type { WaveConfig } from "./types.mjs";

const DEFAULTS: WaveConfig = {
  size: 3,
  sliceCommand: "/crew:orchestrate-slice",
  sliceCommandFallback: "/crew:build",
  fixCommand: "/crew:fix",
  maxParallel: 3,
  dispatchTimeoutMs: 30 * 60 * 1000,
  postMergeTestCmd: "bun test src/tests/ --parallel --timeout 60000",
  maxWaveAttempts: 2,
  subagentType: "general-purpose",
  artifactsRoot: ".claude/artifacts/loop/waves"
};

const SLASH_CMD_RE = /^\/[a-z][a-z0-9:-]*$/;

export function resolveWaveConfig(loopJson: { wave?: Partial<WaveConfig> }): WaveConfig {
  return { ...DEFAULTS, ...(loopJson.wave ?? {}) };
}

export type ValidationResult = { ok: boolean; errors: string[] };

export function validateWaveConfig(cfg: Partial<WaveConfig>): ValidationResult {
  const errors: string[] = [];
  const merged = { ...DEFAULTS, ...cfg };

  if (merged.size < 1) {
    errors.push(`wave.size must be >= 1 (got ${merged.size})`);
  }

  if (!SLASH_CMD_RE.test(merged.sliceCommand)) {
    errors.push(
      `wave.sliceCommand must match /^\\/[a-z][a-z0-9:-]*$/ (got "${merged.sliceCommand}")`
    );
  }

  if (merged.maxParallel > merged.size) {
    errors.push(`wave.maxParallel (${merged.maxParallel}) must be <= wave.size (${merged.size})`);
  }

  if (merged.maxWaveAttempts < 1) {
    errors.push(`wave.maxWaveAttempts must be >= 1 (got ${merged.maxWaveAttempts})`);
  }

  return { ok: errors.length === 0, errors };
}

export function resolveMarathonRunner(loopJson: {
  marathonRunner?: string;
}): "sequential" | "wave" {
  const v = loopJson.marathonRunner;
  if (v === "wave") return "wave";
  if (v === "sequential") return "sequential";
  if (v !== undefined) {
    console.warn(`unknown marathonRunner "${v}"; falling back to "sequential"`);
  }
  return "sequential";
}

// Minimal, dependency-free feature-flag reader for hooks that run via plain
// `node` (no build step) — these cannot import the compiled TS
// features-service.mjs, so this mirrors its resolution rule instead:
// explicit `features.<name>.enabled` wins, else the registered default.
//
// Crash-safe by construction: any read/parse error resolves to the same
// default (fail-open), matching the features-service default-ON policy.

import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Defaults for the flags actually consumed by plain-.mjs hooks. This MUST
 * stay in sync with the `default` field of the same names in
 * `src/scripts/lib/features-service.mts` — a corresponding parity test in
 * `src/tests/features-service.test.mts` ("hook-consumed flag defaults
 * match feature-flag-lite's HOOK_FLAG_DEFAULTS") fails the suite if this
 * map drifts from the registry. P2.1 kernel-merge folds this file and the
 * TS registry into one service, at which point this map goes away.
 */
export const HOOK_FLAG_DEFAULTS = {
  "version-check": true,
  "bootstrap-context": true,
  "dispatch-guard-block": true
};

/**
 * Resolve whether `name` is enabled by reading `<cwd>/.claude/loop.json`.
 * Returns the registered default (or `true` if `name` isn't in
 * HOOK_FLAG_DEFAULTS) on any missing file, parse error, or malformed
 * entry — hooks must never crash or block session start on config issues.
 */
export function isFeatureEnabledLite(name, cwd = process.cwd()) {
  const fallback = Object.prototype.hasOwnProperty.call(HOOK_FLAG_DEFAULTS, name)
    ? HOOK_FLAG_DEFAULTS[name]
    : true;
  try {
    const configPath = path.join(cwd, ".claude", "loop.json");
    const raw = readFileSync(configPath, "utf8");
    const config = JSON.parse(raw);
    const enabled = config?.features?.[name]?.enabled;
    return typeof enabled === "boolean" ? enabled : fallback;
  } catch {
    return fallback;
  }
}

/** Best-effort stdin JSON payload read (Claude Code pipes {cwd, ...} to every hook). */
export function readHookPayload() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

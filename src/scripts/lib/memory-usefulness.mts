// Memory usefulness telemetry (FEAT-263 Phase 3d) — a bounded, fail-silent
// read of the astramem daemon's `/health` usefulness block
// (served_7d/used_7d/rate_7d) for the loop-snapshot.md "Memory usefulness"
// line. Consumed by memory-snapshot.mts; kept as its own module since
// memory-snapshot.mts is already near the repo's ~400-line split guidance.
//
// Respects the same `memory.enabled: "never"` kill switch as every other
// memory touchpoint (via memory-sink.mts's readMemoryConfig — consumed, not
// modified) and never throws or blocks the snapshot render. When the daemon
// is unreachable, disabled, or the call exceeds its bound, callers should
// render "n/a" — this module returns `null` for all of those cases.

import { readMemoryConfig } from "./memory-sink.mjs";

export interface MemoryUsefulnessSummary {
  served: number;
  used: number;
  /** null when the daemon has not computed a rate yet (e.g. zero served). */
  rate: number | null;
}

/** Bounded wallclock cap for the /health read — the snapshot render must
 * never stall waiting on a slow/unreachable daemon. */
export const DEFAULT_USEFULNESS_FETCH_CAP_MS = 2000;

/**
 * Fetch the daemon's usefulness summary. Fail-silent: `memory.enabled:
 * "never"`/"off" variants, no reachable daemon, a non-2xx/timeout, or any
 * other error all resolve to `null` rather than throwing. Double-bounded
 * (client-side timeoutMs + an outer Promise.race) so a hanging connection
 * can never hold the snapshot render open past `capMs` — same dual-bound
 * convention as astramem-e2e-preflight.mts's boundedFetch().
 */
export async function fetchMemoryUsefulness(
  repoPath: string,
  config: Record<string, any> | null,
  capMs: number = DEFAULT_USEFULNESS_FETCH_CAP_MS
): Promise<MemoryUsefulnessSummary | null> {
  try {
    const memCfg = await readMemoryConfig(repoPath, config ?? null);
    if (memCfg.mode === "off") return null;

    const { resolveDaemonClient } = await import("@astragenie/astramem-client");
    const client = resolveDaemonClient(capMs);
    if (!client) return null;

    const health = await Promise.race([
      client.health(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("memory-usefulness-fetch-timeout")), capMs);
      })
    ]);

    return {
      served: health.usefulness?.served_7d ?? 0,
      used: health.usefulness?.used_7d ?? 0,
      rate: health.usefulness?.rate_7d ?? null
    };
  } catch {
    return null;
  }
}

// Memory transport (FEAT-188 S1b, runner-plugin#357) — thin adapter over the
// shared @astragenie/astramem-client package (plugins-common).
//
// The discovery chain (env plugin root / CLI-path-derived root / dep-mode
// selector) and the wallclock-capped fail-silent send both moved to the
// shared package — the FEAT-188 unification extracted them from this module
// and dev-team's astramem-provider.ts into one implementation. This module
// keeps runner-plugin's local surface (`sendViaProvider`, the injectable
// test seam, the ProviderIngestPayload shape) so callers (memory-sink.mts,
// memory-bridge.mts) and existing tests are unchanged.
//
// Contract (unchanged): NEVER throws, NEVER blocks the caller beyond the
// shared package's cap envelope. Any failure resolves `false` so callers
// fall back to the CLI spawn path.

import { _resetResolveCache, _setWireProvider, rememberSilent } from "@astragenie/astramem-client";

/** Wire payload accepted by astramem's MemoryProvider.remember()
 * (IngestPayloadSchema, astramem-plugin src/contracts/wire.ts). Alias of the
 * shared package's IngestPayload, re-declared to keep this module's public
 * surface stable for existing importers. */
export interface ProviderIngestPayload {
  id: string;
  type: string;
  text: string;
  source?: string | undefined;
  importance?: number | undefined;
  confidence?: number | undefined;
  metadata?: Record<string, unknown> | undefined;
}

/** Minimal structural view of astramem's MemoryProvider — only the surface
 * this transport calls. Kept for the `_setProvider` seam's signature. */
export interface AstramemProvider {
  remember(req: ProviderIngestPayload): Promise<unknown>;
}

/** Test seam: inject a fake provider (or null to simulate absence). Adapts
 * the remember-only local shape onto the shared package's WireProvider. */
export function _setProvider(p: AstramemProvider | null): void {
  if (p === null) {
    _setWireProvider(null);
    return;
  }
  _setWireProvider({
    remember: (req) => p.remember(req),
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });
}

/** Test seam: reset discovery cache + injected provider. */
export function _resetTransportCache(): void {
  _resetResolveCache();
}

/**
 * Shared default wallclock cap (ms) for the memory transport's capture path
 * (`memory-sink.mts::recordMemory`). FEAT-233 / DEC-071: capture and recall
 * used to hardcode their own cap defaults (2000 and 5000 respectively) with
 * no documented relationship between them — this constant is now the single
 * source of truth capture reads (via `memory.capMs` config override, falling
 * back to this value). See DEC-071 for the full reconciled policy.
 */
export const DEFAULT_MEMORY_CAP_MS = 2000;

/**
 * Recall's default wallclock cap (ms) — a documented per-path override of
 * `DEFAULT_MEMORY_CAP_MS`, longer because recall runs once at slice-start
 * (not a hot per-call path like capture) and feeds directly into dispatch
 * quality, so it can afford a larger budget before falling back to an empty
 * result. Read by `slice-linker/start-slice.mts::runRecallHook` as the last
 * fallback in its `memory.recall.timeoutMs` -> `memory.capMs` -> this
 * constant chain. See DEC-071.
 */
export const DEFAULT_RECALL_CAP_MS = 5000;

/**
 * Attempt an in-process `provider.remember()` send. Resolves `true` when the
 * provider accepted the payload, `false` on ANY failure (plugin absent,
 * resolution error, provider rejection, cap exceeded). Never throws.
 *
 * `capMs` is the caller's remaining wallclock budget — one envelope covers
 * resolution + send inside the shared package, so the provider attempt can
 * never starve the caller's CLI fallback (S1b review finding #2).
 *
 * KNOWN LIMIT (FEAT-233 AC-1/AC-2, tracked upstream `astramem-plugin#29`,
 * see `docs/upstream-requests/2026-07-08-astramem-plugin-abortsignal-cancellation.md`):
 * the shared package's `rememberSilent` races the provider call against
 * `capMs`, but the LOSING call is abandoned, not cancelled — astramem-plugin's
 * internal abort timers are neither unref'd nor driven by an `AbortSignal`,
 * so a slow-but-reachable backend can hold this (usually short-lived CLI)
 * process's event loop open for up to that provider's own internal timeout
 * after `sendViaProvider` has already resolved. Do NOT work around this by
 * reimplementing the HTTP client locally (retired per dev-team#172) — the
 * only sanctioned fix is upstream signal/unref support. SEAM: once
 * astramem-plugin#29 ships and `@astragenie/astramem-client` threads an
 * `AbortSignal` through `rememberSilent`'s options, this function would grow
 * an optional `signal?: AbortSignal` parameter forwarded alongside `capMs` —
 * at that point the KNOWN LIMIT note above can be removed.
 */
export async function sendViaProvider(
  payload: ProviderIngestPayload,
  capMs?: number
): Promise<boolean> {
  return rememberSilent(payload, { capMs });
}

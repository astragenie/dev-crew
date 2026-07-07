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
 * Attempt an in-process `provider.remember()` send. Resolves `true` when the
 * provider accepted the payload, `false` on ANY failure (plugin absent,
 * resolution error, provider rejection, cap exceeded). Never throws.
 *
 * `capMs` is the caller's remaining wallclock budget — one envelope covers
 * resolution + send inside the shared package, so the provider attempt can
 * never starve the caller's CLI fallback (S1b review finding #2).
 */
export async function sendViaProvider(
  payload: ProviderIngestPayload,
  capMs?: number
): Promise<boolean> {
  return rememberSilent(payload, { capMs });
}

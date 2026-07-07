// Memory transport (FEAT-188 S1b, runner-plugin#357).
//
// In-process MemoryProvider path for headless learnings capture. Instead of
// shelling `astramem remember` (the pre-S1b transport, retired per
// dev-team#172), this module discovers the installed astramem plugin at
// runtime, dynamic-imports its provider selector, and calls
// `provider.remember(payload)` directly — no subprocess.
//
// Discovery order:
//   1. Injected provider (test seam — `_setProvider`).
//   2. `CLAUDE_PLUGIN_ROOT_MEMORY` env → `<root>/src/lib/selector.ts`.
//   3. Root derived from the resolved CLI binary path
//      (`<root>/bin/astramem` → `<root>`), reusing memory-bridge's
//      `resolveCli()` so PATH-probe hygiene (ASTRAMEM_DISABLE_PATH_PROBE)
//      is inherited.
//
// Fail-silent contract (same as memory-sink / memory-bridge): NEVER throws,
// NEVER blocks the caller beyond CAP_MS. Any failure — plugin absent, import
// error, provider unresolvable, wire-incompat, network — resolves `false` so
// the caller can fall back to the CLI spawn path. Callers keep their existing
// spawn fallback; this module owns only the provider attempt.
//
// The plugin's selector runs a health probe + wire-version compat probe on
// first resolution; both are inside the CAP_MS race. The resolved provider is
// cached module-scope for the process lifetime (mirrors _cliCache).

import path from "node:path";
import { pathToFileURL } from "node:url";

import { resolveCli } from "./memory-bridge.mjs";

const CAP_MS = 2000;

/** Wire payload accepted by astramem's MemoryProvider.remember()
 * (IngestPayloadSchema, astramem-plugin src/contracts/wire.ts). */
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
 * this transport calls. The real interface lives in the plugin
 * (src/contracts/provider.ts); we type it locally because the plugin is
 * discovered at runtime, not compiled against. */
export interface AstramemProvider {
  remember(req: ProviderIngestPayload): Promise<unknown>;
}

interface SelectorModule {
  resolveProvider(opts?: Record<string, unknown>): Promise<{ provider: AstramemProvider }>;
}

// Module-scope cache: null = not yet resolved, false = confirmed unavailable.
let _providerCache: AstramemProvider | false | null = null;
// Test seam: when set, discovery is bypassed entirely.
let _injectedProvider: AstramemProvider | null | undefined;

/** Test seam: inject a fake provider (or null to simulate absence). No-op
 * outside test runs (mirrors astramem-plugin's own seam convention). */
export function _setProvider(p: AstramemProvider | null): void {
  if (!isTestEnv()) return;
  _injectedProvider = p;
}

/** Test seam: reset discovery cache + injected provider. No-op outside
 * test runs. */
export function _resetTransportCache(): void {
  if (!isTestEnv()) return;
  _providerCache = null;
  _injectedProvider = undefined;
}

function isTestEnv(): boolean {
  return process.env["NODE_ENV"] === "test" || Boolean(process.env["BUN_TEST"]);
}

/** Derive candidate plugin roots. Env override first, then the parent of the
 * resolved CLI's bin/ directory. */
async function candidateRoots(): Promise<string[]> {
  const roots: string[] = [];
  const envRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  if (envRoot) roots.push(envRoot);
  const cli = await resolveCli();
  if (cli) {
    // <root>/bin/astramem[.ext] → <root>
    roots.push(path.dirname(path.dirname(cli.path)));
  }
  return roots;
}

/** Import the plugin's selector from a root and resolve a provider. Returns
 * null on any failure. */
async function resolveFromRoot(root: string): Promise<AstramemProvider | null> {
  try {
    const selectorPath = path.join(root, "src", "lib", "selector.ts");
    const mod = (await import(pathToFileURL(selectorPath).href)) as SelectorModule;
    if (typeof mod.resolveProvider !== "function") return null;
    const { provider } = await mod.resolveProvider();
    return provider && typeof provider.remember === "function" ? provider : null;
  } catch {
    return null;
  }
}

/** Resolve (and cache) the in-process provider. Never throws. */
async function resolveProviderCached(): Promise<AstramemProvider | null> {
  if (_injectedProvider !== undefined) return _injectedProvider;
  if (_providerCache !== null) return _providerCache === false ? null : _providerCache;
  for (const root of await candidateRoots()) {
    const provider = await resolveFromRoot(root);
    if (provider) {
      _providerCache = provider;
      return provider;
    }
  }
  _providerCache = false;
  return null;
}

/** Race a promise against a wallclock cap. The loser is abandoned — see the
 * KNOWN LIMIT note on sendViaProvider for the process-liveness caveat. */
async function withCap<T>(p: Promise<T>, fallback: T, capMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const capped = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), capMs);
  });
  try {
    return await Promise.race([p.catch(() => fallback), capped]);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Attempt an in-process `provider.remember()` send. Resolves `true` when the
 * provider accepted the payload, `false` on ANY failure (plugin absent,
 * resolution error, provider rejection, cap exceeded). Never throws.
 *
 * `capMs` is a SINGLE wallclock envelope covering resolution + the send —
 * callers with their own deadline pass the remaining budget so the provider
 * attempt can never starve their fallback path (review finding #2, S1b).
 *
 * KNOWN LIMIT (review finding #1): a losing provider call is abandoned, not
 * cancelled — astramem-plugin's providers carry internal 5s abort timers
 * that are not unref'd and take no AbortSignal, so a slow-but-reachable
 * backend can hold a short-lived CLI process's event loop open up to ~5s
 * after this function has already returned. Fixing that requires an
 * upstream plugin change (signal support or unref'd timers) — tracked as an
 * astramem-plugin issue; do not "fix" it here by reimplementing the HTTP
 * client (retired per dev-team#172).
 */
export async function sendViaProvider(
  payload: ProviderIngestPayload,
  capMs: number = CAP_MS
): Promise<boolean> {
  const deadline = Date.now() + capMs;
  try {
    const provider = await withCap(resolveProviderCached(), null, capMs);
    if (!provider) return false;
    const remaining = deadline - Date.now();
    if (remaining <= 0) return false;
    return await withCap(
      provider.remember(payload).then(() => true),
      false,
      remaining
    );
  } catch {
    return false;
  }
}

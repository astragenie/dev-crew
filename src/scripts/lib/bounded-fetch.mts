// Shared bounded fetch helper (FEAT-263 Phase 2, runner-plugin memory e2e
// smoke suite). TEST-INFRASTRUCTURE ONLY.
//
// Every raw wire call the memory e2e suite (astramem-e2e.test.mts) makes
// directly against the astramem-local daemon (health polls, recall queries,
// remember-roundtrip retrieval) goes through this helper so none of them can
// ever repeat the regression this suite guards against: a live astramem MCP
// call once hung 300s with no response (astramem-local#347). Mirrors the
// exact dual-bound pattern already proven in astramem-e2e-preflight.mts's
// preflightAstramemDaemon() — an AbortSignal fired at `timeoutMs` (the
// well-behaved path any real fetch honors) AND a hard `Promise.race`
// fallback (`timeoutMs + 500ms`) so a connection that ignores the abort
// signal, or a genuinely hung one, still can never stall the caller past a
// bounded window.
//
// Calls that go through @astragenie/astramem-client instead (profileSilent /
// feedbackSilent, used for T4/T5) get their own single-layer AbortController
// bound from that package's AstramemDaemonClient (daemon-client.ts) — this
// helper is for the suite's own direct fetch() calls only.

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface BoundedFetchOptions {
  /** Bounded wallclock cap in ms. Default 10000 — generous enough for a
   * semantic recall under load, per the T3 budget in the Phase 2 plan. */
  timeoutMs?: number;
  /** Override for testing — defaults to the global fetch. */
  fetchImpl?: FetchLike;
}

/** Thrown when neither the AbortSignal nor the underlying fetch resolved
 * before the hard fallback timeout fired. */
export class BoundedFetchTimeoutError extends Error {
  constructor(url: string, timeoutMs: number) {
    super(`boundedFetch exceeded its ${timeoutMs}ms bound: ${url}`);
    this.name = "BoundedFetchTimeoutError";
  }
}

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Fetch `url` under a short bounded timeout. Rejects (never hangs) once
 * `timeoutMs + 500ms` elapses even if `fetchImpl` ignores the abort signal
 * entirely — the exact failure mode this helper regression-guards.
 */
export async function boundedFetch(
  url: string,
  init: RequestInit = {},
  opts: BoundedFetchOptions = {}
): Promise<Response> {
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
  let hardTimer: ReturnType<typeof setTimeout> | undefined;
  const hardTimeout = new Promise<never>((_, reject) => {
    hardTimer = setTimeout(
      () => reject(new BoundedFetchTimeoutError(url, timeoutMs)),
      timeoutMs + 500
    );
  });
  // Attach a no-op catch immediately so an unresolved hardTimeout that loses
  // the race never surfaces as an unhandled rejection once its timer fires.
  hardTimeout.catch(() => undefined);

  try {
    return await Promise.race([
      fetchImpl(url, { ...init, signal: controller.signal }),
      hardTimeout
    ]);
  } finally {
    clearTimeout(abortTimer);
    if (hardTimer) clearTimeout(hardTimer);
  }
}

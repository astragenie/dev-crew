// astramem e2e daemon preflight (SLICE-160 / FEAT-263, runner-plugin#514).
//
// TEST-INFRASTRUCTURE ONLY. This module exists to give the memory e2e test
// suite a fast, bounded health check against the astramem-local daemon
// before exercising real MCP tool calls, so a missing/hung daemon fails
// fast with an actionable message instead of an opaque ECONNREFUSED or a
// multi-minute hang. It intentionally does NOT touch the fail-silent
// runtime transport (memory-transport.mts / memory-sink.mts) — those must
// stay silent-degrade for production dispatch paths; this preflight is a
// loud, test-only gate, a separate concern.
//
// Complementary to memory-doctor.mts::probeMemory(): that probe shells out
// to `astramem doctor --json`, whose payload shape has no field reporting
// actual local/saas reachability (see memory-doctor.mts's module comment) —
// runner:pm found during this slice's review that probeMemory() therefore
// never truthfully reports whether the daemon is actually listening. This
// module closes that gap with a direct HTTP GET against the daemon's own
// /health endpoint.

/** Minimal fetch-shaped seam so tests never need a live daemon. */
export type FetchLike = (
  url: string,
  init?: { signal?: AbortSignal }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface PreflightOptions {
  /** Override for testing — defaults to the global fetch. */
  fetchImpl?: FetchLike;
  /** Override the health-check URL outright (defaults derived from MEMORY_API_URL / 127.0.0.1:7777). */
  url?: string;
  /** Bounded wallclock cap in ms. Default 2000, per AbortSignal.timeout(2000) in the AC text. */
  timeoutMs?: number;
  /**
   * Opt-in stricter health bar (FEAT-263 Phase 2): additionally requires
   * `embed.ok === true` AND `status === "ok"`. Default (`false`) preserves
   * the original behavior — `degraded` (embed down) still counts as
   * reachable/healthy, since FTS-only recall keeps working without a live
   * embedder. Semantic-recall-dependent tests are meaningless under a dead
   * embedder, so those callers should opt into `strict: true` instead of
   * relying on the permissive default.
   */
  strict?: boolean;
}

export interface PreflightResult {
  /** True once a well-formed HTTP response was received (even if `ok` is false). */
  reachable: boolean;
  /** The daemon-reported `status` field, or null when unreachable/unparseable. */
  status: string | null;
  /** True only when reachable AND status is one of ok/starting/degraded. */
  ok: boolean;
  /** Human-readable outcome — actionable start-command hint on any failure path. */
  message: string;
}

const DEFAULT_TIMEOUT_MS = 2000;
const DEFAULT_BASE_URL = "http://127.0.0.1:7777";
const ACCEPTED_STATUSES = new Set(["ok", "starting", "degraded"]);

const START_HINT =
  "Start the astramem daemon before running the memory e2e suite: " +
  "`node dist/cli/index.js reinstall` (first-time setup) or " +
  "`node dist/cli/index.js serve --port 7777` (already installed).";

function resolveUrl(opts: PreflightOptions): string {
  if (opts.url) return opts.url;
  const base = process.env.MEMORY_API_URL || DEFAULT_BASE_URL;
  return `${base.replace(/\/$/, "")}/health`;
}

function actionableMessage(reason: string): string {
  return `astramem daemon preflight failed (${reason}). ${START_HINT}`;
}

/** Extract a `status` string out of an arbitrary /health JSON body, or null. */
function extractStatus(body: unknown): string | null {
  if (body === null || typeof body !== "object") return null;
  const status = (body as Record<string, unknown>).status;
  return typeof status === "string" ? status : null;
}

/** Extract `embed.ok` out of an arbitrary /health JSON body, or null when absent/malformed. */
function extractEmbedOk(body: unknown): boolean | null {
  if (body === null || typeof body !== "object") return null;
  const embed = (body as Record<string, unknown>).embed;
  if (embed === null || typeof embed !== "object") return null;
  const ok = (embed as Record<string, unknown>).ok;
  return typeof ok === "boolean" ? ok : null;
}

async function readHealthResponse(
  response: {
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  },
  strict: boolean
): Promise<PreflightResult> {
  if (!response.ok) {
    return {
      reachable: false,
      status: null,
      ok: false,
      message: actionableMessage(`HTTP ${response.status}`)
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      reachable: true,
      status: null,
      ok: false,
      message: actionableMessage("unparseable /health response body")
    };
  }

  const status = extractStatus(body);
  if (status !== null && ACCEPTED_STATUSES.has(status)) {
    if (strict) {
      const embedOk = extractEmbedOk(body);
      if (status !== "ok" || embedOk !== true) {
        return {
          reachable: true,
          status,
          ok: false,
          message: actionableMessage(
            `strict mode requires status "ok" and embed.ok true ` +
              `(got status="${status}", embed.ok=${embedOk === null ? "<missing>" : embedOk})`
          )
        };
      }
    }
    return {
      reachable: true,
      status,
      ok: true,
      message: `astramem daemon healthy (status: ${status})`
    };
  }
  return {
    reachable: true,
    status,
    ok: false,
    message: actionableMessage(`unrecognized status "${status ?? "<missing>"}"`)
  };
}

/**
 * GET `${MEMORY_API_URL || 'http://127.0.0.1:7777'}/health` under a short
 * bounded timeout. Never rejects — every path resolves a PreflightResult.
 *
 * Bounded two ways: an AbortSignal fired at `timeoutMs` (the well-behaved
 * path any real fetch honors) AND a hard `Promise.race` fallback timeout
 * (`timeoutMs + 500ms`) so a `fetchImpl` that ignores the abort signal —
 * or a genuinely hung connection, the exact failure mode this slice
 * regression-guards (an astramem MCP call once hung 300s with no response)
 * — still can never stall the caller past a bounded window.
 */
export async function preflightAstramemDaemon(
  opts: PreflightOptions = {}
): Promise<PreflightResult> {
  const url = resolveUrl(opts);
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const strict = opts.strict ?? false;
  const fetchImpl = opts.fetchImpl ?? (globalThis.fetch as unknown as FetchLike);

  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), timeoutMs);
  let hardTimer: ReturnType<typeof setTimeout> | undefined;
  const hardTimeout = new Promise<never>((_, reject) => {
    hardTimer = setTimeout(
      () => reject(new Error("astramem preflight exceeded bounded timeout")),
      timeoutMs + 500
    );
  });
  // Attach a no-op catch immediately so an unresolved hardTimeout that loses
  // the race never surfaces as an unhandled rejection once its timer fires.
  hardTimeout.catch(() => undefined);

  try {
    const response = await Promise.race([
      fetchImpl(url, { signal: controller.signal }),
      hardTimeout
    ]);
    return await readHealthResponse(response, strict);
  } catch (err) {
    return {
      reachable: false,
      status: null,
      ok: false,
      message: actionableMessage(err instanceof Error ? err.message : String(err))
    };
  } finally {
    clearTimeout(abortTimer);
    if (hardTimer) clearTimeout(hardTimer);
  }
}

/** Resolved e2e mode — whether the memory e2e suite should skip or require the daemon. */
export type AstramemE2eMode = "skip" | "require";

const REQUIRE_VALUES = new Set(["1", "true", "require"]);

/**
 * Resolve ASTRAMEM_E2E into skip|require. Unset, "0", "false", "skip", or
 * any unrecognized value all resolve to "skip" (the safe default — the e2e
 * suite never runs against a real daemon unless explicitly opted in).
 */
export function astramemE2eMode(env: NodeJS.ProcessEnv = process.env): AstramemE2eMode {
  const raw = env.ASTRAMEM_E2E?.trim().toLowerCase();
  return raw !== undefined && REQUIRE_VALUES.has(raw) ? "require" : "skip";
}

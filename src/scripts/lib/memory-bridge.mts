// Memory bridge shim (runner-plugin#288).
//
// Fire-and-forget consumer of the `astramem` CLI shipped by the astramem
// plugin (live since v0.5.x; this repo has observed it at v0.6.0 — see
// docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md, #324).
// Runner discovers the CLI via env or PATH — never manages providers, auth,
// or bearer tokens, or picks local-vs-SaaS. All of that lives in astramem's
// own provider selector.
//
// Fail-silent contract: emit() NEVER throws and NEVER blocks > 2s.
// CLI absent → no-op. Provider failure → swallowed in astramem itself.
//
// FEAT-223 / DEC-067: astramem's real subcommand surface is
// ingest-transcript | recall | remember | health | config | doctor | connect
// — there is no generic single-event "ingest" subcommand (#324), so emit()
// persists GEPA payloads through `remember` instead (see buildRememberArgs()
// below for the exact mapping):
//   --type     <- payload.event. `remember` does not validate/coerce --type;
//                 this is a DIFFERENT free-string vocabulary than
//                 memory-sink.mts's closed MemoryKind enum
//                 (decision|lesson|note|failure) — both live under the same
//                 flag on the wire, they are not meant to unify.
//   --content  <- payload.feedback, sanitized + capped (memory-sanitize.mts,
//                 shared with memory-sink.mts).
//   --metadata <- a bounded JSON object (sliceId/featId/score/phase/source/
//                 prompt_version + summarized input/output).
//   (no --agent: GepaPayload carries no agent field, unlike memory-sink.mts's
//   writers, which pass one when the caller has a role.)
//
// IMPORTANT — --metadata is WRITE-ONLY. astramem's RecallHitSchema has no
// `metadata` field and its response schema is non-strict, so Zod silently
// strips whatever is sent there — nothing placed in --metadata ever comes
// back out via `recall`, for any consumer. Do not "fix" recall later
// expecting GEPA fields to reappear; that round trip does not exist in the
// real CLI. This is fine for emit()'s purpose: the GEPA optimizer never
// reads astramem — it reads its own local JSONL store (gepa-core
// file-store) — so recall fidelity through astramem was never required
// here. recallPrior() in memory-recall.mts is unaffected by any of this —
// its `recall` invocation already matches the real CLI.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { sanitizeArg, sanitizeContent } from "./memory-sanitize.mjs";

/** GEPA-shaped payload for memory ingestion (trainset-ready day 1). */
export interface GepaPayload {
  /** ISO 8601 timestamp. */
  ts: string;
  slice_id: string;
  feat_id: string;
  source: "close" | "phase-gate" | "start" | "triage" | "recall";
  event: "slice_close" | "phase_gate_fail" | "slice_started" | "triage_shift" | "recall_used";
  /** Composite grade score in range 0..1. */
  score: number;
  /** Human-readable lessons, surprises, or failing check summary. */
  feedback: string;
  /** Structured input context (AC text, dispatch instruction, etc.). */
  input: Record<string, unknown>;
  /** Structured output context (changed files, decisions, exit code, etc.). */
  output: Record<string, unknown>;
  /** Git sha7 of the dispatched agent file. */
  prompt_version: string;
  // ---------------------------------------------------------------------------
  // Scaffold for deferred reviewer + verifier hooks (runner-plugin#290).
  // Fields are optional — no callers in this slice. Reserved for the follow-up
  // dev-team integration described in docs/sop/cross-plugin-memory-hooks.md.
  // ---------------------------------------------------------------------------
  /** Agent id of the reviewer that produced a spec_review event (deferred). */
  reviewer_id?: string;
  /** Agent id of the verifier that produced a verify event (deferred). */
  verifier_id?: string;
  /** Per-AC pass/fail verdicts from a verifier run (deferred). */
  ac_results?: Array<{
    ac_id: string;
    status: "PASS" | "FAIL";
    evidence_file_line?: string;
  }>;
}

// Module-scope cache: null = not yet resolved, false = confirmed absent.
let _cliCache: { path: string } | false | null = null;

// Candidate binary filenames under `<pluginRoot>/bin/` for the env-pinned
// override, tried in order. On win32 a bare `astramem` (no extension) is
// frequently NOT what's on disk — real installs and test fixtures alike
// commonly ship `astramem.cmd` or `astramem.exe` on Windows. Checking only
// the extensionless name meant the env override silently failed to resolve
// on Windows, falling through to the PATH probe below and picking up a
// real, globally-installed `astramem` binary instead of the test's isolated
// fake CLI (TEST-HYGIENE: real daemon writes leaking from test fixtures —
// see memory-bridge.test.mts regression coverage).
const WIN32_CLI_CANDIDATES = ["astramem.exe", "astramem.cmd", "astramem.bat", "astramem"];
const POSIX_CLI_CANDIDATES = ["astramem"];

/** Resolve the env-pinned `<pluginRoot>/bin/astramem[.ext]` binary, trying
 * every platform-appropriate candidate extension. Returns null if none
 * resolve. */
async function resolveEnvOverride(pluginRoot: string): Promise<{ path: string } | null> {
  const binDir = path.join(pluginRoot, "bin");
  const candidates = process.platform === "win32" ? WIN32_CLI_CANDIDATES : POSIX_CLI_CANDIDATES;
  for (const name of candidates) {
    const candidate = path.join(binDir, name);
    try {
      await fs.access(candidate, fs.constants.X_OK);
      return { path: candidate };
    } catch {
      // Try next candidate.
    }
  }
  return null;
}

/**
 * Resolve the astramem CLI binary. Checks env-pinned plugin root first,
 * then falls back to PATH. Caches result for the process lifetime.
 * Returns null when the CLI cannot be located — never throws.
 */
export async function resolveCli(): Promise<{ path: string } | null> {
  if (_cliCache !== null) {
    return _cliCache === false ? null : _cliCache;
  }

  // 1. Plugin-root env override (memory-plugin installs here).
  const pluginRoot = process.env["CLAUDE_PLUGIN_ROOT_MEMORY"];
  if (pluginRoot) {
    const found = await resolveEnvOverride(pluginRoot);
    if (found) {
      _cliCache = found;
      return _cliCache;
    }
    // Not found at plugin root under any candidate extension — fall through.
  }

  // 2. PATH probe via `which` / `where`. Test-isolation escape hatch: when
  // ASTRAMEM_DISABLE_PATH_PROBE is set, skip this fallback entirely so no
  // test can ever discover a real, globally-installed astramem CLI just
  // because it happens to be on PATH (memory-plugin ships one; local dev
  // machines commonly have it installed + running as a daemon). Production
  // dispatch paths never set this flag, so real PATH discovery is
  // unaffected. See bunfig.toml `[test].preload` — every test process sets
  // this flag before any test file runs.
  if (process.env["ASTRAMEM_DISABLE_PATH_PROBE"]) {
    _cliCache = false;
    return null;
  }

  const whichCmd = process.platform === "win32" ? "where" : "which";
  const found = await new Promise<string | null>((resolve) => {
    const proc = spawn(whichCmd, ["astramem"], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    proc.stdout?.on("data", (chunk: Buffer) => {
      out += chunk.toString();
    });
    proc.on("close", (code) => {
      const line = out.split(/\r?\n/)[0]?.trim() ?? "";
      resolve(code === 0 && line.length > 0 ? line : null);
    });
    proc.on("error", () => resolve(null));
  });

  _cliCache = found ? { path: found } : false;
  return _cliCache === false ? null : _cliCache;
}

/** Test seam: reset module-scope cache (used in unit tests). */
export function _resetCliCache(): void {
  _cliCache = null;
}

// Caps for the summarized `input`/`output` blocks folded into --metadata
// (FEAT-223 / DEC-067). Both fields are caller-supplied
// `Record<string, unknown>` of unbounded shape (AC text, changed-file lists,
// dispatch instructions, ...), and --metadata is passed as a literal argv
// string by every spawn path here — Windows caps a command line at ~32KB.
// These caps keep the summarized JSON tiny relative to that limit regardless
// of what a caller passes in.
const METADATA_STRING_CAP = 300;
const METADATA_ARRAY_CAP = 10;
const METADATA_KEY_CAP = 20;
const METADATA_DEPTH_CAP = 3;

/** Recursively cap a structured value (payload.input / payload.output) so an
 * arbitrarily large caller-supplied object can never blow up --metadata's
 * argv size: strings are sanitized + capped, arrays/objects are capped by
 * length/key-count, and depth bottoms out at a truncation marker rather than
 * recursing unbounded. */
function summarizeStructured(value: unknown, depth = 0): unknown {
  if (depth >= METADATA_DEPTH_CAP) return "[capped: max depth]";
  if (typeof value === "string") return sanitizeContent(value, METADATA_STRING_CAP);
  if (Array.isArray(value)) {
    return value.slice(0, METADATA_ARRAY_CAP).map((item) => summarizeStructured(item, depth + 1));
  }
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>).slice(
      0,
      METADATA_KEY_CAP
    )) {
      out[sanitizeArg(key, 64)] = summarizeStructured(val, depth + 1);
    }
    return out;
  }
  return value; // number | boolean | null | undefined pass through as-is.
}

/**
 * Build the `astramem remember` argv for a GEPA payload (FEAT-223 / DEC-067).
 * Pure — no I/O — so the wire mapping is unit-testable without spawning a
 * CLI. See the module docstring for the field mapping and the --metadata
 * write-only caveat.
 */
export function buildRememberArgs(payload: GepaPayload): string[] {
  const metadata = {
    sliceId: payload.slice_id,
    featId: payload.feat_id,
    score: payload.score,
    phase: payload.event,
    source: payload.source,
    prompt_version: payload.prompt_version,
    input: summarizeStructured(payload.input),
    output: summarizeStructured(payload.output)
  };
  return [
    "remember",
    "--type",
    payload.event,
    "--content",
    sanitizeContent(payload.feedback),
    "--metadata",
    JSON.stringify(metadata)
  ];
}

/**
 * Emit a GEPA payload to astramem. Fire-and-forget with a 2s wallclock cap.
 * Swallows ALL errors — network, ENOENT, timeout, non-zero exit, bad JSON.
 * Never throws. Never blocks > 2s wallclock. Child process is killed via
 * AbortSignal when the cap fires so the test runtime doesn't wait for stragglers.
 */
export async function emit(payload: GepaPayload): Promise<void> {
  try {
    const cli = await resolveCli();
    if (!cli) return;

    const args = buildRememberArgs(payload);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      await spawnRemember(cli.path, args, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Fail-silent: any error (including serialisation) is swallowed.
  }
}

/** Spawn `astramem remember <args>` with the given argv. Resolves on close,
 * error, or the caller's abort signal — never rejects. Mirrors
 * memory-sink.mts::spawnRemember. */
async function spawnRemember(cliPath: string, args: string[], signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      const proc = spawn(cliPath, args, {
        stdio: "ignore",
        detached: false,
        signal
      });
      proc.on("close", done);
      proc.on("error", done);
    } catch {
      done();
    }
  });
}

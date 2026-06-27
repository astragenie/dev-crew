// Memory bridge shim (runner-plugin#288).
//
// Fire-and-forget consumer of the `astramem` CLI provided by memory-plugin.
// Runner discovers the CLI via env or PATH — never manages providers, auth,
// or bearer tokens. All of that lives in memory-plugin.
//
// Fail-silent contract: emit() NEVER throws and NEVER blocks > 2s.
// CLI absent → no-op. Provider failure → swallowed in astramem itself.
//
// Dormant until memory-plugin v0.4 ships astramem.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

/** GEPA-shaped payload for memory ingestion (trainset-ready day 1). */
export interface GepaPayload {
  /** ISO 8601 timestamp. */
  ts: string;
  slice_id: string;
  feat_id: string;
  source: "close" | "phase-gate" | "start" | "triage";
  event: "slice_close" | "phase_gate_fail" | "slice_started" | "triage_shift";
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
    const candidate = path.join(pluginRoot, "bin", "astramem");
    try {
      await fs.access(candidate, fs.constants.X_OK);
      _cliCache = { path: candidate };
      return _cliCache;
    } catch {
      // Not found at plugin root — fall through to PATH probe.
    }
  }

  // 2. PATH probe via `which` / `where`.
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

    const json = JSON.stringify(payload);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      await spawnIngest(cli.path, json, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    // Fail-silent: any error (including serialisation) is swallowed.
  }
}

async function spawnIngest(cliPath: string, json: string, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = (): void => {
      if (settled) return;
      settled = true;
      resolve();
    };
    try {
      const proc = spawn(cliPath, ["ingest", "--json", json], {
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

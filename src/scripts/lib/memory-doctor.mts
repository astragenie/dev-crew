// Memory doctor probe (runner-plugin#292).
//
// Spawns `astramem doctor --json` and returns a structured MemoryStatus.
// 3s wallclock cap via AbortController.
//
// FEAT-235: every capture/recall hot path migrated onto the shared
// @astragenie/astramem-client, and the CLI-spawn transport
// (memory-bridge.mts) was retired — but this diagnostic stays CLI-based on
// purpose. The client's resolveWireProvider() resolves an in-process
// WireProvider object (its health() only reports {ok: boolean}); it has no
// equivalent for the rich `doctor --json` shape this module reports
// (env_vars / pending.rejected_count / etc). resolveCli() now lives in the
// standalone astramem-cli-resolver.mts leaf, extracted from memory-bridge.mts
// before that module was deleted, so this probe keeps its full signal set.
//
// Never throws. Returns a valid MemoryStatus on ALL paths (disabled, cli_missing,
// unreachable, unknown, not_configured, or ok).
//
// FEAT-224: the real astramem CLI (0.6.0) activates JSON mode on
// `args.includes('--json')`, not `--format json`, and its `doctor --json`
// payload shape is `env_vars | local_url | local_url_source | pending |
// deprecation_hits` — it never reports whether the local/saas probe actually
// succeeded (that result is text-only, printed in the human-readable report).
// So "ok" cannot be truthfully derived from this shape at all; mapDoctorOutput()
// below never returns "ok" and reports "unknown" when nothing indicates a
// problem. See docs/research/2026-07-06-memory-bridge-astramem-v6-findings.md.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { resolveCli } from "./astramem-cli-resolver.mjs";

/** Structured health report from probeMemory(). */
export interface MemoryStatus {
  cli_present: boolean;
  cli_path?: string;
  provider?: "local" | "saas" | "auto-undetermined";
  health: "ok" | "unreachable" | "not_configured" | "unknown" | "cli_missing" | "disabled";
  version?: string;
  /** Resolved local daemon URL (`local_url` in `doctor --json`). */
  url?: string;
  /** ISO 8601 timestamp of last ingested event, if astramem doctor reports it. */
  last_ingest_at?: string;
  error?: string;
  /** Populated when health !== "ok". */
  fix_hint?: string;
}

const DOCTOR_TIMEOUT_MS = 3000;

/**
 * Read loop.memory.enabled from .claude/loop.json.
 * Returns "never" only when explicitly set; defaults to "auto".
 */
async function readMemoryEnabled(repoPath: string): Promise<string> {
  const loopJsonPath = path.join(repoPath, ".claude", "loop.json");
  try {
    const raw = await fs.readFile(loopJsonPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      "memory" in parsed &&
      parsed.memory !== null &&
      typeof parsed.memory === "object" &&
      "enabled" in parsed.memory &&
      (parsed.memory as Record<string, unknown>).enabled === "never"
    ) {
      return "never";
    }
  } catch {
    // Missing or unparseable loop.json — default auto.
  }
  return "auto";
}

/**
 * Spawn `astramem doctor --json` and collect stdout.
 * Rejects on timeout (AbortSignal), non-zero exit, or spawn error.
 */
function spawnDoctor(cliPath: string, signal: AbortSignal): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;
    let out = "";

    const done = (val: string): void => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    const fail = (err: unknown): void => {
      if (settled) return;
      settled = true;
      reject(err);
    };

    signal.addEventListener("abort", () => fail(new Error("doctor timeout")), { once: true });

    try {
      const proc = spawn(cliPath, ["doctor", "--json"], {
        stdio: ["ignore", "pipe", "ignore"],
        // shell:true needed on Windows to run .cmd wrappers installed by package managers.
        shell: process.platform === "win32",
        signal
      });

      proc.stdout?.on("data", (chunk: Buffer) => {
        out += chunk.toString();
      });
      proc.on("close", (code) => {
        if (code === 0) {
          done(out);
        } else {
          fail(new Error(`astramem doctor exited ${code}`));
        }
      });
      proc.on("error", fail);
    } catch (err) {
      fail(err);
    }
  });
}

/**
 * Derive a truthful health signal from the real `doctor --json` shape.
 *
 * The payload has no field that reports whether the local/saas probe
 * succeeded — that result only exists in the human-readable report. The one
 * positive evidence of a real problem is `pending.rejected_count` (ingest
 * events astramem itself gave up on). Absent that, "not_configured" applies
 * only when nothing about the memory layer was explicitly set (pure
 * defaults); otherwise health is genuinely indeterminate from this shape, so
 * "unknown" is reported rather than guessing "ok".
 */
function deriveHealth(
  rejectedCount: number,
  provider: string | null,
  apiUrl: string | null,
  localUrlSource: unknown
): MemoryStatus["health"] {
  if (rejectedCount > 0) return "unreachable";
  if (provider === null && apiUrl === null && localUrlSource === "default") return "not_configured";
  return "unknown";
}

/** Fix-hint text per derived health value — none of them is "ok". */
function fixHintFor(health: MemoryStatus["health"], rejectedCount: number): string {
  if (health === "unreachable") {
    return `astramem doctor reports ${rejectedCount} rejected pending event(s). Run \`astramem doctor\` for details.`;
  }
  if (health === "not_configured") {
    return "astramem has no explicit provider/URL configuration; running on defaults. Run `astramem config` to set one up.";
  }
  return "astramem doctor --json does not report local/saas reachability directly. Run `astramem doctor` (without --json) for the full diagnostic.";
}

/** Pull `provider` + `apiUrl` out of the real `env_vars` sub-object. */
function extractEnvSignals(envVars: Record<string, unknown>): {
  configuredProvider: "local" | "saas" | null;
  provider: "local" | "saas" | "auto-undetermined";
  apiUrl: string | null;
} {
  const providerRaw = envVars.ASTRAMEM_PROVIDER;
  const configuredProvider: "local" | "saas" | null =
    providerRaw === "local" || providerRaw === "saas" ? providerRaw : null;
  const apiUrl = typeof envVars.MEMORY_API_URL === "string" ? envVars.MEMORY_API_URL : null;
  return { configuredProvider, provider: configuredProvider ?? "auto-undetermined", apiUrl };
}

/** Read `pending.rejected_count` out of the real `pending` sub-object. */
function extractRejectedCount(obj: Record<string, unknown>): number {
  const pendingRaw = obj.pending;
  const pending =
    pendingRaw !== null && typeof pendingRaw === "object"
      ? (pendingRaw as Record<string, unknown>)
      : {};
  return typeof pending.rejected_count === "number" ? pending.rejected_count : 0;
}

/** Map raw astramem `doctor --json` output to MemoryStatus fields. */
function mapDoctorOutput(cliPath: string, raw: string): MemoryStatus {
  try {
    const trimmed = raw.trim();
    if (!trimmed) {
      return {
        cli_present: true,
        cli_path: cliPath,
        health: "unreachable",
        fix_hint: "astramem doctor returned empty output. Run `astramem doctor` manually."
      };
    }
    const parsed: unknown = JSON.parse(trimmed);
    if (parsed === null || typeof parsed !== "object") {
      return {
        cli_present: true,
        cli_path: cliPath,
        health: "unreachable",
        fix_hint: "astramem doctor returned non-object JSON. Run `astramem doctor` manually."
      };
    }
    const obj = parsed as Record<string, unknown>;

    // Real shape (astramem 0.6.0 `src/cli/doctor.ts`):
    //   { env_vars, local_url, local_url_source, pending, deprecation_hits }
    const envVars =
      obj.env_vars !== null && typeof obj.env_vars === "object"
        ? (obj.env_vars as Record<string, unknown>)
        : {};
    const { configuredProvider, provider, apiUrl } = extractEnvSignals(envVars);
    const rejectedCount = extractRejectedCount(obj);
    const health = deriveHealth(rejectedCount, configuredProvider, apiUrl, obj.local_url_source);

    const status: MemoryStatus = {
      cli_present: true,
      cli_path: cliPath,
      health,
      provider,
      fix_hint: fixHintFor(health, rejectedCount)
    };
    if (typeof obj.local_url === "string") status.url = obj.local_url;

    return status;
  } catch {
    return {
      cli_present: true,
      cli_path: cliPath,
      health: "unreachable",
      fix_hint: "astramem doctor returned malformed JSON. Run `astramem doctor` manually."
    };
  }
}

/** Options for probeMemory — primarily used for test seams. */
export interface ProbeMemoryOptions {
  /** Override CLI resolver (test seam). Default: resolveCli from astramem-cli-resolver.mts. */
  _resolveCli?: () => Promise<{ path: string } | null>;
}

/**
 * Probe memory-plugin health. Returns a MemoryStatus for all paths.
 * Never throws. Caps at 3s wallclock via AbortSignal.
 *
 * @param repoPath - absolute path to the repo root (for reading loop.json).
 * @param opts - optional overrides for test seams.
 */
export async function probeMemory(
  repoPath: string,
  opts: ProbeMemoryOptions = {}
): Promise<MemoryStatus> {
  const resolve = opts._resolveCli ?? resolveCli;
  try {
    const enabled = await readMemoryEnabled(repoPath);
    if (enabled === "never") {
      return { cli_present: false, health: "disabled" };
    }

    const cli = await resolve();
    if (!cli) {
      return {
        cli_present: false,
        health: "cli_missing",
        fix_hint:
          "astramem CLI not found. Memory layer activates when memory-plugin v0.4 ships. " +
          'Set loop.memory.enabled = "never" in .claude/loop.json to suppress this message.'
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), DOCTOR_TIMEOUT_MS);
    try {
      const raw = await spawnDoctor(cli.path, controller.signal);
      return mapDoctorOutput(cli.path, raw);
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    // Non-zero exit, timeout, or spawn error.
    let cliPath: string | undefined;
    try {
      const cli = await resolve();
      cliPath = cli?.path;
    } catch {
      // ignore secondary failure
    }
    const base: MemoryStatus = {
      cli_present: cliPath !== undefined,
      health: "unreachable",
      error: err instanceof Error ? err.message : String(err),
      fix_hint:
        "Run `astramem doctor` for details, or `astramem config set provider saas` to switch providers."
    };
    if (cliPath !== undefined) base.cli_path = cliPath;
    return base;
  }
}

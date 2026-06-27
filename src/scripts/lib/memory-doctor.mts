// Memory doctor probe (runner-plugin#292).
//
// Spawns `astramem doctor` and returns a structured MemoryStatus.
// 3s wallclock cap via AbortController — mirrors memory-bridge.mts emit() shape.
//
// Never throws. Returns a valid MemoryStatus on ALL paths (disabled, cli_missing,
// unreachable, or ok).
//
// Dormant until memory-plugin v0.4 ships the astramem CLI.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

import { resolveCli } from "./memory-bridge.mjs";

/** Structured health report from probeMemory(). */
export interface MemoryStatus {
  cli_present: boolean;
  cli_path?: string;
  provider?: "local" | "saas" | "auto-undetermined";
  health: "ok" | "unreachable" | "not_configured" | "cli_missing" | "disabled";
  version?: string;
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
      (parsed.memory as Record<string, unknown>)["enabled"] === "never"
    ) {
      return "never";
    }
  } catch {
    // Missing or unparseable loop.json — default auto.
  }
  return "auto";
}

/**
 * Spawn `astramem doctor --format json` and collect stdout.
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
      const proc = spawn(cliPath, ["doctor", "--format", "json"], {
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

/** Map raw astramem doctor JSON output to MemoryStatus fields. */
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

    const providerRaw = obj["provider"];
    const provider: MemoryStatus["provider"] =
      providerRaw === "local" || providerRaw === "saas" || providerRaw === "auto-undetermined"
        ? providerRaw
        : undefined;

    const health: MemoryStatus["health"] =
      obj["health"] === "ok" ? "ok" : obj["health"] === "not_configured" ? "not_configured" : "ok";

    const status: MemoryStatus = {
      cli_present: true,
      cli_path: cliPath,
      health,
      ...(provider !== undefined ? { provider } : {})
    };

    if (typeof obj["version"] === "string") status.version = obj["version"];
    if (typeof obj["url"] === "string") status.url = obj["url"];
    if (typeof obj["last_ingest_at"] === "string") status.last_ingest_at = obj["last_ingest_at"];
    if (typeof obj["error"] === "string") status.error = obj["error"];

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
  /** Override CLI resolver (test seam). Default: resolveCli from memory-bridge. */
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

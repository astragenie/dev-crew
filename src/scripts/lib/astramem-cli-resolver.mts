// astramem CLI path resolver (FEAT-235 extraction from memory-bridge.mts).
//
// The only remaining legitimate CLI-path consumer after FEAT-235 is
// memory-doctor.mts's `astramem doctor --json` health probe — a diagnostic
// with no @astragenie/astramem-client equivalent (the client's
// resolveWireProvider() resolves an in-process WireProvider object, not a
// spawnable binary path). Every capture/recall hot path was migrated onto
// the shared client (memory-transport.mts / memory-gepa.mts / recallSilent);
// this leaf survives ONLY to keep that one diagnostic CLI-based.
//
// Fail-silent contract: resolveCli() never throws. CLI absent -> null.

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

// Module-scope cache: null = not yet resolved, false = confirmed absent.
let _cliCache: { path: string } | false | null = null;

// Candidate binary filenames under `<pluginRoot>/bin/` for the env-pinned
// override, tried in order. On win32 a bare `astramem` (no extension) is
// frequently NOT what's on disk — real installs and test fixtures alike
// commonly ship `astramem.cmd` or `astramem.exe` on Windows. Checking only
// the extensionless name meant the env override silently failed to resolve
// on Windows, falling through to the PATH probe below and picking up a
// real, globally-installed `astramem` binary instead of the test's isolated
// fake CLI (TEST-HYGIENE: real daemon writes leaking from test fixtures).
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
  // unaffected. This same flag also gates astramem-client's own
  // probeCliPath() (resolve.js) — one shared test-isolation contract.
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

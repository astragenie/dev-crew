#!/usr/bin/env node
// SessionStart hook: detect when the locally-installed runner plugin lags
// behind the marketplace manifest, and surface the refresh command.
//
// Why: Claude Code's marketplace clones (~/.claude/plugins/marketplaces/<name>/)
// are NOT auto-refreshed when the upstream GitHub repo ships new versions.
// Until the user runs `/plugin marketplace update astra`, their other
// sessions silently keep installing the stale pinned version.
//
// Plugin id: the runner plugin installs as `runner@astra` (plugin name
// "runner" under the "astra" marketplace, repo astragenie/runner-plugin —
// renamed from the old standalone `loop@loop` marketplace circa the
// loop-to-runner rename). Verified against
// ~/.claude/plugins/installed_plugins.json and
// ~/.claude/plugins/marketplaces/astra/.claude-plugin/marketplace.json.
//
// Incident 2026-06-07: sessions stayed on v0.22.0 for three minor releases.
// This hook closes that observability gap. The hook NEVER auto-installs —
// it only prints additionalContext so the user gets one clear action.
//
// Fail-open: any error inside this hook exits 0 silently. Surfacing an
// install drift is best-effort and must not break SessionStart.

import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { isFeatureEnabledLite, readHookPayload } from "./feature-flag-lite.mjs";

const MIN_BUN_VERSION = "1.3.14";

// Feature gate: features.version-check.enabled === false skips this hook
// entirely (both the bun-version check and the marketplace drift check).
// Fail-open — any error reading the flag resolves to enabled (current
// behavior), per features-service's default-ON policy.
const hookPayload = readHookPayload();
const repoCwd = hookPayload?.cwd || process.cwd();
if (!isFeatureEnabledLite("version-check", repoCwd)) {
  process.exit(0);
}

function safeReadJson(p) {
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function compareSemver(a, b) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const ai = pa[i] ?? 0;
    const bi = pb[i] ?? 0;
    if (ai !== bi) return ai - bi;
  }
  return 0;
}

function emit(message) {
  // SessionStart hooks surface text on stdout as additionalContext.
  process.stdout.write(message);
  process.exit(0);
}

try {
  const bunResult = spawnSync("bun", ["--version"], { encoding: "utf8", windowsHide: true });
  const bunVersion = bunResult.stdout?.trim() || null;
  if (!bunVersion || compareSemver(bunVersion, MIN_BUN_VERSION) < 0) {
    console.warn(
      `\n⚠ runner plugin requires bun >= ${MIN_BUN_VERSION} (found: ${bunVersion ?? "not installed"}).\n` +
        `  Install or upgrade: https://bun.sh\n`
    );
  }
} catch {
  // fail-open
}

try {
  // Testability: RUNNER_VERSION_CHECK_HOME overrides os.homedir() so tests
  // can point at a fixture ~/.claude tree without touching the real one.
  const homeDir = process.env.RUNNER_VERSION_CHECK_HOME || os.homedir();
  const installedPath = path.join(homeDir, ".claude", "plugins", "installed_plugins.json");
  const marketplacePath = path.join(
    homeDir,
    ".claude",
    "plugins",
    "marketplaces",
    "astra",
    ".claude-plugin",
    "marketplace.json"
  );

  if (!existsSync(installedPath) || !existsSync(marketplacePath)) {
    process.exit(0);
  }

  const installed = safeReadJson(installedPath);
  const marketplace = safeReadJson(marketplacePath);
  if (!installed || !marketplace) process.exit(0);

  const entry = installed?.plugins?.["runner@astra"]?.[0];
  if (!entry?.version) process.exit(0);

  const ownEntry = marketplace?.plugins?.find((p) => p.name === "runner");
  if (!ownEntry?.version) process.exit(0);

  const installedV = String(entry.version);
  const marketplaceV = String(ownEntry.version);

  if (compareSemver(installedV, marketplaceV) >= 0) process.exit(0);

  emit(
    [
      "",
      `⚠ runner plugin: installed v${installedV} but marketplace lists v${marketplaceV}.`,
      "  To upgrade in this session:",
      "    1. /plugin marketplace update astra",
      "    2. /plugin install runner@astra",
      "  (See CHANGELOG.md at https://github.com/astragenie/runner-plugin/releases for what changed.)",
      ""
    ].join("\n")
  );
} catch {
  process.exit(0);
}

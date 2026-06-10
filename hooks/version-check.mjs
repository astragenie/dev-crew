#!/usr/bin/env node
// SessionStart hook: detect when the locally-installed loop plugin lags
// behind the marketplace manifest, and surface the refresh command.
//
// Why: Claude Code's marketplace clones (~/.claude/plugins/marketplaces/<name>/)
// are NOT auto-refreshed when the upstream GitHub repo ships new versions.
// Until the user runs `/plugin marketplace update loop`, their other
// sessions silently keep installing the stale pinned version.
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

const MIN_BUN_VERSION = "1.3.14";

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
      `\n⚠ loop plugin requires bun >= ${MIN_BUN_VERSION} (found: ${bunVersion ?? "not installed"}).\n` +
        `  Install or upgrade: https://bun.sh\n`
    );
  }
} catch {
  // fail-open
}

try {
  const homeDir = os.homedir();
  const installedPath = path.join(homeDir, ".claude", "plugins", "installed_plugins.json");
  const marketplacePath = path.join(
    homeDir,
    ".claude",
    "plugins",
    "marketplaces",
    "loop",
    ".claude-plugin",
    "marketplace.json"
  );

  if (!existsSync(installedPath) || !existsSync(marketplacePath)) {
    process.exit(0);
  }

  const installed = safeReadJson(installedPath);
  const marketplace = safeReadJson(marketplacePath);
  if (!installed || !marketplace) process.exit(0);

  const entry = installed?.plugins?.["loop@loop"]?.[0];
  if (!entry?.version) process.exit(0);

  const ownEntry = marketplace?.plugins?.find((p) => p.name === "loop");
  if (!ownEntry?.version) process.exit(0);

  const installedV = String(entry.version);
  const marketplaceV = String(ownEntry.version);

  if (compareSemver(installedV, marketplaceV) >= 0) process.exit(0);

  emit(
    [
      "",
      `⚠ loop plugin: installed v${installedV} but marketplace lists v${marketplaceV}.`,
      "  To upgrade in this session:",
      "    1. /plugin marketplace update loop",
      "    2. /plugin install loop@loop",
      "  (See CHANGELOG.md at https://github.com/sergeymilashico/loop/releases for what changed.)",
      ""
    ].join("\n")
  );
} catch {
  process.exit(0);
}

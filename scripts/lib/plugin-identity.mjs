import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Single source of truth for the plugin and marketplace name. Mirrors the
// pattern from the crew plugin so generated hook scripts and bridge templates
// pull the identity from the manifests instead of hardcoding strings.

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(scriptDir, "..", "..");

let cached = null;

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

export async function getPluginIdentity() {
  if (cached) {
    return cached;
  }

  const marketplaceManifestPath = path.join(pluginRoot, ".claude-plugin", "marketplace.json");
  const pluginManifestPath = path.join(pluginRoot, ".claude-plugin", "plugin.json");

  const [marketplace, plugin] = await Promise.all([
    readJson(marketplaceManifestPath),
    readJson(pluginManifestPath)
  ]);

  if (!marketplace?.name) {
    throw new Error(`Missing "name" field in ${marketplaceManifestPath}`);
  }
  if (!plugin?.name) {
    throw new Error(`Missing "name" field in ${pluginManifestPath}`);
  }

  cached = {
    marketplaceName: marketplace.name,
    pluginName: plugin.name,
    pluginVersion: plugin.version || null,
    pluginRoot
  };
  return cached;
}

// Returns the bash glob pattern used to locate the crew CLI inside Claude
// Code's plugin cache. The crew plugin lives in the `astra` marketplace
// (renamed from `crew-dev` in v0.3.0), which we hardcode here because we
// depend on it. If the user installs crew via a different marketplace,
// override CREW_MARKETPLACE_NAME in the environment.
export function getCrewCliCacheGlob() {
  const marketplaceName = process.env.CREW_MARKETPLACE_NAME || "astra";
  const pluginName = "crew";
  return `$HOME/.claude/plugins/cache/${marketplaceName}/${pluginName}/*/scripts/crew.mjs`;
}

// Find the crew CLI on disk. Returns the path of the newest installed version
// or null if no crew install is found.
export async function findCrewCli() {
  const homedir = process.env.HOME || process.env.USERPROFILE;
  if (!homedir) {
    return null;
  }
  const marketplaceName = process.env.CREW_MARKETPLACE_NAME || "astra";
  const pluginName = "crew";
  const cacheDir = path.join(homedir, ".claude", "plugins", "cache", marketplaceName, pluginName);
  try {
    const versions = (await fs.readdir(cacheDir)).sort().reverse();
    for (const v of versions) {
      const candidate = path.join(cacheDir, v, "scripts", "crew.mjs");
      try {
        await fs.access(candidate);
        return candidate;
      } catch {
        // try next version
      }
    }
  } catch {
    // cache dir missing
  }
  return null;
}

// Minimum compatible crew plugin version. Bump when this plugin starts to
// depend on a crew capability that older versions don't have. v0.3.3 added
// the `--feature` / `--phase` / `--title` flags this plugin now passes
// when invoking crew artifact writers.
export const MIN_CREW_VERSION = "0.3.6";

// Read the crew plugin's version from the plugin.json next to a crew CLI path.
// Returns null if the manifest is missing or unreadable.
export async function getCrewVersion(crewCliPath) {
  if (!crewCliPath) return null;
  const manifestPath = path.resolve(
    path.dirname(crewCliPath),
    "..",
    ".claude-plugin",
    "plugin.json"
  );
  try {
    const manifest = await readJson(manifestPath);
    return manifest?.version || null;
  } catch {
    return null;
  }
}

// Naive semver compare: returns -1/0/1 for a vs b. Treats missing parts as 0.
// Sufficient for the plugin's pre-1.0 version line; does not parse pre-release
// tags. If you ever ship `0.2.0-rc.1`, expand this.
export function compareSemver(a, b) {
  const pa = String(a)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  const pb = String(b)
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

// Test-only helper.
export function _resetCacheForTests() {
  cached = null;
}

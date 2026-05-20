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
// Code's plugin cache. The crew plugin uses a fixed marketplace name
// `crew-dev`, which we hardcode here because we depend on it. If the user
// installs crew via a different marketplace, override CREW_MARKETPLACE_NAME
// in the environment.
export function getCrewCliCacheGlob() {
  const marketplaceName = process.env.CREW_MARKETPLACE_NAME || "crew-dev";
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
  const marketplaceName = process.env.CREW_MARKETPLACE_NAME || "crew-dev";
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

// Test-only helper.
export function _resetCacheForTests() {
  cached = null;
}

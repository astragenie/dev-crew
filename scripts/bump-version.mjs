#!/usr/bin/env node
// Atomically bump the plugin version in BOTH `.claude-plugin/plugin.json`
// AND the own-entry inside `.claude-plugin/marketplace.json`. The lockstep
// invariant is enforced by `validate-manifests.mts`. Manual bumps of either
// file in isolation are the source of marketplace-consumers-stuck-on-old-
// version bugs (incident 2026-06-06: sessions installing via marketplace
// stayed pinned to 0.22.0 while plugin.json shipped through 0.24.1).
//
// Usage:
//   npm run bump-version <new-version>
//   node scripts/bump-version.mjs <new-version>
//
// Exits 1 on bad arg or write failure. Idempotent — re-running with the
// same version is a no-op.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
async function main() {
    const newVersion = process.argv[2];
    if (!newVersion || !SEMVER_RE.test(newVersion)) {
        console.error(`usage: bump-version <semver>   (got "${newVersion ?? ""}")`);
        process.exitCode = 1;
        return;
    }
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const pluginPath = path.join(repoRoot, ".claude-plugin", "plugin.json");
    const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
    const plugin = JSON.parse(await fs.readFile(pluginPath, "utf8"));
    const marketplace = JSON.parse(await fs.readFile(marketplacePath, "utf8"));
    const ownEntry = marketplace.plugins?.find((e) => e.name === plugin.name);
    if (!ownEntry) {
        console.error(`marketplace.json has no entry matching plugin.name="${plugin.name}"`);
        process.exitCode = 1;
        return;
    }
    const oldPluginVersion = plugin.version;
    const oldMarketplaceVersion = ownEntry.version;
    plugin.version = newVersion;
    ownEntry.version = newVersion;
    await fs.writeFile(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
    await fs.writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf8");
    console.log(`plugin.json      ${oldPluginVersion} -> ${newVersion}`);
    console.log(`marketplace.json ${oldMarketplaceVersion} -> ${newVersion}`);
}
await main();

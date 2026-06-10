#!/usr/bin/env node
// Atomically bump the plugin version in all three version files:
//   .claude-plugin/plugin.json        — the plugin manifest
//   .claude-plugin/marketplace.json   — the marketplace entry
//   package.json                      — the npm package
// The lockstep invariant is enforced by `validate-manifests.mts`. Manual
// bumps of any single file are the source of version-drift bugs (incident
// 2026-06-06: marketplace stayed pinned to 0.22.0 while plugin.json shipped
// through 0.24.1).
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

async function main(): Promise<void> {
  const newVersion = process.argv[2];
  if (!newVersion || !SEMVER_RE.test(newVersion)) {
    console.error(`usage: bump-version <semver>   (got "${newVersion ?? ""}")`);
    process.exitCode = 1;
    return;
  }

  // This script lives at src/scripts/ — repo root is two levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const pluginPath = path.join(repoRoot, ".claude-plugin", "plugin.json");
  const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const packagePath = path.join(repoRoot, "package.json");

  const plugin = JSON.parse(await fs.readFile(pluginPath, "utf8"));
  const marketplace = JSON.parse(await fs.readFile(marketplacePath, "utf8"));
  const pkg = JSON.parse(await fs.readFile(packagePath, "utf8"));

  const ownEntry = marketplace.plugins?.find((e: { name: string }) => e.name === plugin.name);
  if (!ownEntry) {
    console.error(`marketplace.json has no entry matching plugin.name="${plugin.name}"`);
    process.exitCode = 1;
    return;
  }

  const oldPluginVersion = plugin.version;
  const oldMarketplaceVersion = ownEntry.version;
  const oldPkgVersion = pkg.version;

  plugin.version = newVersion;
  ownEntry.version = newVersion;
  pkg.version = newVersion;

  await fs.writeFile(pluginPath, JSON.stringify(plugin, null, 2) + "\n", "utf8");
  await fs.writeFile(marketplacePath, JSON.stringify(marketplace, null, 2) + "\n", "utf8");
  await fs.writeFile(packagePath, JSON.stringify(pkg, null, 2) + "\n", "utf8");

  console.log(`plugin.json      ${oldPluginVersion} -> ${newVersion}`);
  console.log(`marketplace.json ${oldMarketplaceVersion} -> ${newVersion}`);
  console.log(`package.json     ${oldPkgVersion} -> ${newVersion}`);
}

await main();

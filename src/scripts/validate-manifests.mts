#!/usr/bin/env node

// Lightweight manifest sanity check. See hero-crew's validator for rationale.
// validateManifests() is exported so tests can call it without spawning.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

export async function validateManifests(repoRoot: string) {
  const failures: string[] = [];
  const fail = (msg: string) => failures.push(msg);

  const plugin = await readJson(path.join(repoRoot, ".claude-plugin", "plugin.json"));
  const marketplace = await readJson(path.join(repoRoot, ".claude-plugin", "marketplace.json"));

  for (const [label, manifest, requiredFields] of [
    ["plugin.json", plugin, ["name", "version", "description", "author", "license"]],
    ["marketplace.json", marketplace, ["name", "owner", "plugins"]]
  ]) {
    for (const field of requiredFields) {
      if (manifest[field] === undefined || manifest[field] === null || manifest[field] === "") {
        fail(`${label}: missing required field "${field}"`);
      }
    }
  }

  if (!SEMVER_RE.test(plugin.version))
    fail(`plugin.json: version "${plugin.version}" is not parseable semver`);

  const ownEntry = marketplace.plugins.find(
    (entry: { name: string; version: string; source?: string }) => entry.name === plugin.name
  );
  if (!ownEntry) {
    fail(`marketplace.json: no entry for own plugin name "${plugin.name}"`);
  } else if (ownEntry.version !== plugin.version) {
    // Lockstep enforcement (reversed v0.24.2). Earlier comment said marketplace
    // drift was acceptable "no consumer." Sessions installing via this repo's
    // marketplace.json silently stayed on the pinned version (0.22.0) and missed
    // v0.23.0..v0.24.1. Use scripts/bump-version.mjs to bump both files atomically.
    fail(
      `version drift: plugin.json="${plugin.version}" vs marketplace.json entry "${plugin.name}"="${ownEntry.version}". ` +
        `Run "npm run bump-version <new-version>" to sync.`
    );
  }

  for (const entry of marketplace.plugins) {
    if (!entry.name) fail(`marketplace.json: a plugins[] entry is missing "name"`);
    if (!entry.version || !SEMVER_RE.test(entry.version)) {
      fail(
        `marketplace.json: entry "${entry.name}" version "${entry.version}" is not parseable semver`
      );
    }
    if (!entry.source) fail(`marketplace.json: entry "${entry.name}" missing "source"`);
  }

  return { ok: failures.length === 0, failures, plugin, marketplace };
}

function isMainEntry() {
  if (!process.argv[1]) return false;
  const entryPath = path.resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

if (isMainEntry()) {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const result = await validateManifests(repoRoot);
  if (!result.ok) {
    console.error("Manifest validation failed:");
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("Manifests OK:");
    console.log(`  plugin.json      ${result.plugin.name}@${result.plugin.version}`);
    console.log(`  marketplace.json (${result.marketplace.plugins.length} entries)`);
    for (const entry of result.marketplace.plugins) {
      console.log(`    - ${entry.name}@${entry.version}`);
    }
  }
}

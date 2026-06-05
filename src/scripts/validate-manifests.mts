#!/usr/bin/env node

// Lightweight manifest sanity check. See hero-crew's validator for rationale.
// validateManifests() is exported so tests can call it without spawning.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

async function readJson(p) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

export async function validateManifests(repoRoot) {
  const failures: any[] = [];
  const fail = (msg) => failures.push(msg);

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

  const ownEntry = marketplace.plugins.find((entry) => entry.name === plugin.name);
  if (!ownEntry) {
    fail(`marketplace.json: no entry for own plugin name "${plugin.name}"`);
  }
  // Version drift between plugin.json and marketplace.json's own entry is allowed.
  // marketplace.json is forward-looking infrastructure for a decoupled install path;
  // the canonical consumer is hero-crew's parent marketplace, which pins loop@version
  // independently. Forcing them in lockstep added release ceremony with no consumer.

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

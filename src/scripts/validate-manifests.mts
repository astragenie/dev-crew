#!/usr/bin/env node

// Lightweight manifest sanity check. See hero-crew's validator for rationale.
// validateManifests() is exported so tests can call it without spawning.

import fs from "node:fs/promises";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePreset, SchemaError } from "./lib/preset-schema.mjs";

const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;

async function readJson(p: string) {
  return JSON.parse(await fs.readFile(p, "utf8"));
}

export function validateAllPresets(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "scripts", "presets");
  const errors: string[] = [];
  if (!existsSync(dir)) return errors;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".json")) continue;
    const full = path.join(dir, entry);
    try {
      const raw = JSON.parse(readFileSync(full, "utf8"));
      validatePreset(raw);
    } catch (err: unknown) {
      if (err instanceof SchemaError || err instanceof SyntaxError) {
        errors.push(`presets/${entry}: ${(err as Error).message}`);
      } else {
        throw err;
      }
    }
  }
  return errors;
}

function validateMarketplaceEntries(
  marketplace: Record<string, any>,
  fail: (msg: string) => void
): void {
  for (const entry of marketplace.plugins) {
    if (!entry.name) fail(`marketplace.json: a plugins[] entry is missing "name"`);
    if (!entry.version || !SEMVER_RE.test(entry.version)) {
      fail(
        `marketplace.json: entry "${entry.name}" version "${entry.version}" is not parseable semver`
      );
    }
    if (!entry.source) fail(`marketplace.json: entry "${entry.name}" missing "source"`);
  }
}

export async function validateManifests(repoRoot: string) {
  const failures: string[] = [];
  const fail = (msg: string) => failures.push(msg);

  const plugin = await readJson(path.join(repoRoot, ".claude-plugin", "plugin.json"));
  const marketplacePath = path.join(repoRoot, ".claude-plugin", "marketplace.json");
  const marketplace = existsSync(marketplacePath) ? await readJson(marketplacePath) : null;
  const pkg = await readJson(path.join(repoRoot, "package.json"));

  for (const field of ["name", "version", "description", "author", "license"]) {
    if (plugin[field] === undefined || plugin[field] === null || plugin[field] === "") {
      fail(`plugin.json: missing required field "${field}"`);
    }
  }

  if (!SEMVER_RE.test(plugin.version))
    fail(`plugin.json: version "${plugin.version}" is not parseable semver`);

  // marketplace.json moved to sergeymilashico/astra-marketplace (4a46687). When
  // a local copy exists (mirror or transitional setup), enforce lockstep with
  // plugin.json. When absent, treat as authoritative-elsewhere and skip.
  if (marketplace) {
    for (const field of ["name", "owner", "plugins"]) {
      if (
        marketplace[field] === undefined ||
        marketplace[field] === null ||
        marketplace[field] === ""
      ) {
        fail(`marketplace.json: missing required field "${field}"`);
      }
    }
    const ownEntry = marketplace.plugins.find(
      (entry: { name: string; version: string; source?: string }) => entry.name === plugin.name
    );
    if (!ownEntry) {
      fail(`marketplace.json: no entry for own plugin name "${plugin.name}"`);
    } else if (ownEntry.version !== plugin.version) {
      fail(
        `version drift: plugin.json="${plugin.version}" vs marketplace.json entry "${plugin.name}"="${ownEntry.version}". ` +
          `Run "npm run bump-version <new-version>" to sync.`
      );
    }
    validateMarketplaceEntries(marketplace, fail);
  }

  if (pkg.version !== plugin.version) {
    fail(
      `version drift: plugin.json="${plugin.version}" vs package.json="${pkg.version}". ` +
        `Run "npm run bump-version <new-version>" to sync all three files.`
    );
  }

  for (const presetErr of validateAllPresets(repoRoot)) {
    fail(presetErr);
  }

  return { ok: failures.length === 0, failures, plugin, marketplace, pkg };
}

function isMainEntry() {
  if (!process.argv[1]) return false;
  const entryPath = path.resolve(process.argv[1]);
  const thisPath = fileURLToPath(import.meta.url);
  return entryPath === thisPath;
}

if (isMainEntry()) {
  // This script lives at src/scripts/ — repo root is two levels up.
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
  const result = await validateManifests(repoRoot);
  if (!result.ok) {
    console.error("Manifest validation failed:");
    for (const f of result.failures) console.error(`  - ${f}`);
    process.exitCode = 1;
  } else {
    console.log("Manifests OK:");
    console.log(`  plugin.json      ${result.plugin.name}@${result.plugin.version}`);
    console.log(`  package.json     ${result.pkg.name}@${result.pkg.version}`);
    if (result.marketplace) {
      console.log(`  marketplace.json (${result.marketplace.plugins.length} entries)`);
      for (const entry of result.marketplace.plugins) {
        console.log(`    - ${entry.name}@${entry.version}`);
      }
    } else {
      console.log(`  marketplace.json (absent — registry at sergeymilashico/astra-marketplace)`);
    }
  }
}

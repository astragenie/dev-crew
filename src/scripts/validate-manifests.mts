#!/usr/bin/env node

// Lightweight manifest sanity check. See hero-crew's validator for rationale.
// validateManifests() is exported so tests can call it without spawning.

import fs from "node:fs/promises";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePreset, SchemaError } from "./lib/preset-schema.mjs";
import { parseFrontmatter } from "./lib/frontmatter.mjs";

// Recursively find all SKILL.md files under a root directory.
function findSkillFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findSkillFiles(full));
    } else if (entry.name === "SKILL.md") {
      results.push(full);
    }
  }
  return results;
}

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

export function validateCommandFrontmatter(repoRoot: string): string[] {
  const dir = path.join(repoRoot, "commands");
  const errors: string[] = [];
  if (!existsSync(dir)) return errors;
  for (const entry of readdirSync(dir)) {
    if (!entry.endsWith(".md")) continue;
    const stem = entry.slice(0, -".md".length);
    const full = path.join(dir, entry);
    const content = readFileSync(full, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    // Validate name
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "name")) {
      errors.push(`commands/${entry}: missing required field "name"`);
    } else if (typeof frontmatter["name"] !== "string" || frontmatter["name"] === "") {
      errors.push(`commands/${entry}: "name" must be a non-empty string`);
    } else if (frontmatter["name"] !== stem) {
      errors.push(
        `commands/${entry}: "name" must equal filename stem "${stem}", got "${frontmatter["name"]}"`
      );
    }
    // Validate description
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "description")) {
      errors.push(`commands/${entry}: missing required field "description"`);
    } else if (
      typeof frontmatter["description"] !== "string" ||
      frontmatter["description"] === ""
    ) {
      errors.push(`commands/${entry}: "description" must be a non-empty string`);
    }
    // Validate auto_execute_steps
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "auto_execute_steps")) {
      errors.push(`commands/${entry}: missing required field "auto_execute_steps"`);
    } else if (typeof frontmatter["auto_execute_steps"] !== "boolean") {
      errors.push(
        `commands/${entry}: "auto_execute_steps" must be a boolean, got ${typeof frontmatter["auto_execute_steps"]}`
      );
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

// marketplace.json moved to sergeymilashico/astra-marketplace (4a46687). When
// a local copy exists (mirror or transitional setup), enforce lockstep with
// plugin.json. When absent, treat as authoritative-elsewhere and skip.
function validateMarketplaceJson(
  marketplace: Record<string, any>,
  plugin: Record<string, any>,
  fail: (msg: string) => void
): void {
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

export function validateSkillFrontmatter(repoRoot: string): string[] {
  const skillsDir = path.join(repoRoot, "skills");
  const errors: string[] = [];
  const files = findSkillFiles(skillsDir);
  for (const file of files) {
    const content = readFileSync(file, "utf8");
    const { frontmatter } = parseFrontmatter(content);
    if (!Object.prototype.hasOwnProperty.call(frontmatter, "keywords")) continue;
    const kw = frontmatter["keywords"];
    if (!Array.isArray(kw)) {
      const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
      errors.push(`${rel}: "keywords" must be an array of strings, got ${typeof kw}`);
      continue;
    }
    for (let i = 0; i < kw.length; i += 1) {
      if (typeof kw[i] !== "string") {
        const rel = path.relative(repoRoot, file).replace(/\\/g, "/");
        errors.push(`${rel}: "keywords[${i}]" must be a string, got ${typeof kw[i]}`);
      }
    }
  }
  return errors;
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

  if (marketplace) {
    validateMarketplaceJson(marketplace, plugin, fail);
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

  for (const cmdErr of validateCommandFrontmatter(repoRoot)) {
    fail(cmdErr);
  }

  for (const skillErr of validateSkillFrontmatter(repoRoot)) {
    fail(skillErr);
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

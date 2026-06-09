#!/usr/bin/env node
// Lightweight manifest sanity check. See hero-crew's validator for rationale.
// validateManifests() is exported so tests can call it without spawning.
import fs from "node:fs/promises";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePreset, SchemaError } from "./lib/preset-schema.mjs";
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
async function readJson(p) {
    return JSON.parse(await fs.readFile(p, "utf8"));
}
export function validateAllPresets(repoRoot) {
    const dir = path.join(repoRoot, "scripts", "presets");
    const errors = [];
    if (!existsSync(dir))
        return errors;
    for (const entry of readdirSync(dir)) {
        if (!entry.endsWith(".json"))
            continue;
        const full = path.join(dir, entry);
        try {
            const raw = JSON.parse(readFileSync(full, "utf8"));
            validatePreset(raw);
        }
        catch (err) {
            if (err instanceof SchemaError || err instanceof SyntaxError) {
                errors.push(`presets/${entry}: ${err.message}`);
            }
            else {
                throw err;
            }
        }
    }
    return errors;
}
function validateMarketplaceEntries(marketplace, fail) {
    for (const entry of marketplace.plugins) {
        if (!entry.name)
            fail(`marketplace.json: a plugins[] entry is missing "name"`);
        if (!entry.version || !SEMVER_RE.test(entry.version)) {
            fail(`marketplace.json: entry "${entry.name}" version "${entry.version}" is not parseable semver`);
        }
        if (!entry.source)
            fail(`marketplace.json: entry "${entry.name}" missing "source"`);
    }
}
export async function validateManifests(repoRoot) {
    const failures = [];
    const fail = (msg) => failures.push(msg);
    const plugin = await readJson(path.join(repoRoot, ".claude-plugin", "plugin.json"));
    const marketplace = await readJson(path.join(repoRoot, ".claude-plugin", "marketplace.json"));
    const pkg = await readJson(path.join(repoRoot, "package.json"));
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
    else if (ownEntry.version !== plugin.version) {
        // Lockstep enforcement (reversed v0.24.2). Earlier comment said marketplace
        // drift was acceptable "no consumer." Sessions installing via this repo's
        // marketplace.json silently stayed on the pinned version (0.22.0) and missed
        // v0.23.0..v0.24.1. Use scripts/bump-version.mjs to bump all three files atomically.
        fail(`version drift: plugin.json="${plugin.version}" vs marketplace.json entry "${plugin.name}"="${ownEntry.version}". ` +
            `Run "npm run bump-version <new-version>" to sync.`);
    }
    if (pkg.version !== plugin.version) {
        fail(`version drift: plugin.json="${plugin.version}" vs package.json="${pkg.version}". ` +
            `Run "npm run bump-version <new-version>" to sync all three files.`);
    }
    validateMarketplaceEntries(marketplace, fail);
    for (const presetErr of validateAllPresets(repoRoot)) {
        fail(presetErr);
    }
    return { ok: failures.length === 0, failures, plugin, marketplace, pkg };
}
function isMainEntry() {
    if (!process.argv[1])
        return false;
    const entryPath = path.resolve(process.argv[1]);
    const thisPath = fileURLToPath(import.meta.url);
    return entryPath === thisPath;
}
if (isMainEntry()) {
    const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
    const result = await validateManifests(repoRoot);
    if (!result.ok) {
        console.error("Manifest validation failed:");
        for (const f of result.failures)
            console.error(`  - ${f}`);
        process.exitCode = 1;
    }
    else {
        console.log("Manifests OK:");
        console.log(`  plugin.json      ${result.plugin.name}@${result.plugin.version}`);
        console.log(`  package.json     ${result.pkg.name}@${result.pkg.version}`);
        console.log(`  marketplace.json (${result.marketplace.plugins.length} entries)`);
        for (const entry of result.marketplace.plugins) {
            console.log(`    - ${entry.name}@${entry.version}`);
        }
    }
}

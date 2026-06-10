import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Loads a per-repo config from .claude/loop.json and merges it on
// top of a built-in preset. Returns the fully-resolved config that downstream
// modules (loop-installer, phase-gate) consume.
//
// Preset shape and override semantics:
// - Top-level keys (loop, stack, reviewers, etc.) are deep-merged for object
//   values and replaced for arrays and primitives.
// - A stack stage set to `null` in the user config disables that stage even if
//   the preset defines a default.
// - Missing keys fall back to the preset value.
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
// Support two execution layouts:
// 1. Emitted (scripts/ tree): src/scripts/lib → scripts/presets
// 2. Direct (src/ tree): src/scripts/lib → scripts/presets (fallback)
let presetDir = path.resolve(scriptDir, "..", "presets");
if (!fs.existsSync(presetDir)) {
    presetDir = path.resolve(scriptDir, "..", "..", "..", "scripts", "presets");
}
export const CONFIG_FILENAME = ".claude/loop.json";
export async function listPresets() {
    const entries = await fsPromises.readdir(presetDir);
    const presets = [];
    for (const entry of entries.sort()) {
        if (!entry.endsWith(".json")) {
            continue;
        }
        const fullPath = path.join(presetDir, entry);
        const raw = await fsPromises.readFile(fullPath, "utf8");
        const parsed = JSON.parse(raw);
        presets.push({
            name: parsed.presetName || path.basename(entry, ".json"),
            description: parsed.description || ""
        });
    }
    return presets;
}
export async function loadPreset(presetName) {
    if (!presetName) {
        throw new Error("Preset name is required.");
    }
    const presetPath = path.join(presetDir, `${presetName}.json`);
    try {
        const raw = await fsPromises.readFile(presetPath, "utf8");
        return JSON.parse(raw);
    }
    catch (err) {
        if (err.code === "ENOENT") {
            const known = (await listPresets()).map((p) => p.name).join(", ");
            throw new Error(`Unknown preset "${presetName}". Known presets: ${known}`);
        }
        throw err;
    }
}
async function readConfigFile(repoPath) {
    const configPath = path.join(repoPath, CONFIG_FILENAME);
    try {
        const raw = await fsPromises.readFile(configPath, "utf8");
        return JSON.parse(raw);
    }
    catch (err) {
        if (err.code === "ENOENT") {
            return null;
        }
        throw err;
    }
}
function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function deepMerge(base, overrides) {
    if (!isPlainObject(overrides)) {
        return (overrides === undefined ? base : overrides);
    }
    const overridesObj = overrides;
    const baseObj = isPlainObject(base) ? base : {};
    const result = { ...baseObj };
    for (const [key, value] of Object.entries(overridesObj)) {
        if (value === null) {
            // Explicit null disables the field even if the preset defined a default.
            result[key] = null;
        }
        else if (isPlainObject(value) && isPlainObject(result[key])) {
            result[key] = deepMerge(result[key], value);
        }
        else {
            result[key] = value;
        }
    }
    return result;
}
export async function resolveConfig(repoPath, options = {}) {
    const userConfig = await readConfigFile(repoPath);
    const presetName = options.preset || userConfig?.preset || "dotnet-aspire-python";
    const preset = await loadPreset(presetName);
    const merged = deepMerge(preset, userConfig || {});
    merged.preset = presetName;
    return merged;
}
export async function writeConfigIfMissing(repoPath, config) {
    const configPath = path.join(repoPath, CONFIG_FILENAME);
    try {
        await fsPromises.access(configPath);
        return { written: false, path: configPath };
    }
    catch {
        // not present — write it
    }
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true });
    await fsPromises.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
    return { written: true, path: configPath };
}
export function configPath(repoPath) {
    return path.join(repoPath, CONFIG_FILENAME);
}

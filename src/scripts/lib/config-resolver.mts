import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { readDevcrewConfigIfPresent } from "./devcrew-config.mjs";

// Resolves the per-repo config from .claude/loop.json.
//
// Post-FEAT-218 (Phase 2): presets are install-time templates only.
// `/devcrew:install --preset X` inlines a preset's full content into
// `.claude/loop.json` once, at scaffold time (see loop-installer.mts) — after
// that, nothing at runtime reads `scripts/presets/*.json` again.
//
// `resolveConfig` has two modes:
// - `options.preset` given (a string): the install-time scaffold path. Loads
//   that named preset and deep-merges it under `.claude/loop.json` (or `{}`
//   for a brand-new repo). This is how `loop-installer.mts` produces the
//   fully-resolved config it then writes to disk.
// - `options.preset` absent (the normal runtime path used by phase-gate,
//   doctor, status, etc.): reads `.claude/loop.json` directly, no preset
//   merge, no hardcoded stack default. Throws a clear error if the file is
//   missing — an unconfigured repo should fail loudly, not silently inherit
//   an arbitrary stack's build/test commands.
//
// Merge semantics (still used by the scaffold path):
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
  const presets: any[] = [];
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

export async function loadPreset(presetName: string) {
  if (!presetName) {
    throw new Error("Preset name is required.");
  }
  const presetPath = path.join(presetDir, `${presetName}.json`);
  try {
    const raw = await fsPromises.readFile(presetPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      const known = (await listPresets()).map((p) => p.name).join(", ");
      throw new Error(`Unknown preset "${presetName}". Known presets: ${known}`);
    }
    throw err;
  }
}

async function readConfigFile(repoPath: string) {
  const configPath = path.join(repoPath, CONFIG_FILENAME);
  try {
    const raw = await fsPromises.readFile(configPath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw err;
  }
}

function isPlainObject(value: unknown) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

// Sibling of `../deep-merge.mts` — that one is the crew/cost-setup style
// merge (arrays concat-and-dedup unless the override wraps a `$replace`
// marker), this one is the preset/config-resolver style merge (arrays are
// always fully replaced by the override, never concatenated). Same name,
// deliberately different semantics for a different caller — do not
// consolidate them without re-checking every call site's expectations.
export function deepMerge(base: unknown, overrides: unknown): Record<string, unknown> {
  if (!isPlainObject(overrides)) {
    return (overrides === undefined ? base : overrides) as Record<string, unknown>;
  }
  const overridesObj = overrides as Record<string, unknown>;
  const baseObj = isPlainObject(base) ? (base as Record<string, unknown>) : {};
  const result: Record<string, unknown> = { ...baseObj };
  for (const [key, value] of Object.entries(overridesObj)) {
    if (value === null) {
      // Explicit null disables the field even if the preset defined a default.
      result[key] = null;
    } else if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export async function resolveConfig(repoPath: string, options: Record<string, unknown> = {}) {
  const userConfig = await readConfigFile(repoPath);

  // Explicit preset: the install-time scaffold path (loop-installer.mts).
  // Never defaults — the caller decides which template to inline.
  if (options.preset) {
    const presetName = options.preset as string;
    const preset = await loadPreset(presetName);
    const merged = deepMerge(preset, userConfig || {});
    merged.preset = presetName;
    return merged;
  }

  // Normal runtime path: .claude/devcrew.json (schemaVersion 2) wins when
  // present — the merged config from the P2 devcrew.json migration
  // (contract §5) — falling back to the legacy .claude/loop.json otherwise.
  // Adopter repos migrate to devcrew.json in P5; until then both shapes are
  // valid and the newer file always takes precedence when it exists. No
  // preset merge, no hardcoded stack default (AC-5) — a repo that hasn't
  // been installed yet must fail clearly rather than silently inherit
  // whatever stack happened to be the default.
  const devcrewConfig = await readDevcrewConfigIfPresent(repoPath);
  if (devcrewConfig) {
    return devcrewConfig;
  }
  if (!userConfig) {
    throw new Error(
      `No ${CONFIG_FILENAME} found in ${repoPath}. Run \`/devcrew:install --preset <name>\` first ` +
        `(see \`/devcrew:list-presets\` for available templates).`
    );
  }
  return userConfig;
}

export async function writeConfigIfMissing(repoPath: string, config: unknown) {
  const configPath = path.join(repoPath, CONFIG_FILENAME);
  try {
    await fsPromises.access(configPath);
    return { written: false, path: configPath };
  } catch {
    // not present — write it
  }
  await fsPromises.mkdir(path.dirname(configPath), { recursive: true });
  await fsPromises.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
  return { written: true, path: configPath };
}

export function configPath(repoPath: string) {
  return path.join(repoPath, CONFIG_FILENAME);
}

// FEAT-271 / SLICE-168: `/devcrew:install --light` support. The preset's
// opt-in `light` block (SLICE-167 — reviewers.ladder trimmed to ["A"] +
// loop.validation.satisfiedByReview: true) is install-time template data
// only (DEC-069); this deep-merges it over the resolved config's `reviewers`
// and `loop` fields so loop-installer.mts can inline the trimmed ladder into
// .claude/loop.json when the flag is passed. Returns a new object — does not
// mutate `config`. Throws if the resolved config has no `light` block (e.g. a
// hand-authored preset that predates FEAT-271) so a mistaken `--light` on an
// unsupported preset fails loudly instead of silently no-op'ing.
export function applyLightLadder(config: Record<string, unknown>): Record<string, unknown> {
  const light = config.light as { reviewers?: unknown; loop?: Record<string, unknown> } | undefined;
  if (!light) {
    throw new Error(
      "--light requested but the resolved preset has no `light` block defined " +
        "(see scripts/presets/*.json for the expected shape)."
    );
  }
  const merged = { ...config };
  if (light.reviewers !== undefined) {
    merged.reviewers = deepMerge(config.reviewers, light.reviewers);
  }
  if (light.loop !== undefined) {
    merged.loop = deepMerge(config.loop, light.loop);
  }
  return merged;
}

type LightBlock = { reviewers?: unknown; loop?: Record<string, unknown> };

// FEAT-271 / SLICE-168 (HIGH fix, 2026-08-02 review): the light-ladder
// fields, mirrored verbatim from every shipped preset's `light` block (see
// scripts/presets/*.json — the block is identical across all six). Used by
// `retrofitLightLadder` below as the last-resort source when an
// already-installed repo's persisted `preset` name can't be resolved back to
// a template file on disk (renamed/removed preset since install, or the repo
// was never scaffolded with an explicit preset name at all). A constant is
// an honest fallback here specifically because the block is identical across
// every preset today — this is not a guess at what an unknown preset wants.
export const DEFAULT_LIGHT_LADDER: LightBlock = {
  reviewers: { ladder: ["A"] },
  loop: { validation: { satisfiedByReview: true } }
};

async function resolveLightBlockForRetrofit(presetName: string | null): Promise<LightBlock> {
  if (presetName) {
    try {
      const preset = await loadPreset(presetName);
      if (isPlainObject(preset?.light)) {
        return preset.light as LightBlock;
      }
    } catch {
      // Preset name unresolved (renamed/removed since install) — fall
      // through to the constant below rather than failing the retrofit.
    }
  }
  return DEFAULT_LIGHT_LADDER;
}

// FEAT-271 / SLICE-168 (HIGH fix): retrofits an ALREADY-installed repo's
// .claude/loop.json in place. `installLoop`'s normal config write
// (`writeConfigIfMissing`) only ever writes a brand-new file — for a repo
// that installed before `--light` existed, that means the flag would
// silently never reach disk, defeating FEAT-271's actual point (retrofitting
// the fleet's already-installed repos, not just seeding new ones). This
// bypasses that existence gate for exactly the two light-ladder fields
// (`reviewers`, `loop.validation`), leaving every other persisted key
// byte-stable — same read-modify-write-if-changed discipline as
// memory-setup.mts's runMemorySetup. Deliberately independent of
// `resolveConfig`'s preset-merge branch: it reads the light block from the
// persisted config's own `preset` name (or an explicit override), so
// `--light` alone — with no `--preset` on the refresh call — still works.
export async function retrofitLightLadder(
  repoPath: string,
  options: { presetOverride?: string | null } = {}
): Promise<{ configPath: string; written: boolean }> {
  const cfgPath = configPath(repoPath);
  const raw = await fsPromises.readFile(cfgPath, "utf8");
  const existing = JSON.parse(raw) as Record<string, unknown>;
  const presetName =
    options.presetOverride || (typeof existing.preset === "string" ? existing.preset : null);
  const light = await resolveLightBlockForRetrofit(presetName);

  const next: Record<string, unknown> = { ...existing };
  if (light.reviewers !== undefined) {
    next.reviewers = deepMerge(existing.reviewers, light.reviewers);
  }
  if (light.loop !== undefined) {
    next.loop = deepMerge(existing.loop, light.loop);
  }

  const nextSerialized = `${JSON.stringify(next, null, 2)}\n`;
  if (nextSerialized === raw) {
    return { configPath: cfgPath, written: false };
  }
  await fsPromises.writeFile(cfgPath, nextSerialized);
  return { configPath: cfgPath, written: true };
}

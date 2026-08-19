import fs from "node:fs/promises";
import path from "node:path";

// devcrew.json schemaVersion 2 — merges .claude/loop.json (preset-inlined
// runner config) and .claude/crew.json (feature-flag toggles) into a single
// document. See docs/planning/p2-seam-contract.md §5/§6 for the field-by-
// field mapping and migrator contract this module implements (FEAT-003 /
// SLICE-13).
//
// The merge is additive: devcrew.json is a superset of loop.json's
// top-level keys (unchanged names/nesting) plus crew.json's `features`
// block (verbatim) plus `schemaVersion: 2` at the document root. loop.json
// carries its own legacy `schemaVersion: 1` field — a *preset*-schema
// version, unrelated in meaning to this document-format version — so it is
// renamed to `presetSchemaVersion` on migration rather than left to collide
// under the same key with a different meaning (contract §5).
//
// P2 scope: this is additive/parallel to the crew-bridge seam work
// (SLICE-11/12) — nothing here deletes or rewrites .claude/loop.json or
// .claude/crew.json; config RESOLUTION (config-resolver.mts) reads
// devcrew.json first when present and falls back to the legacy files
// otherwise. Adopter repos migrate their own configs in P5 (cutover); this
// slice only ships the schema + migrator and runs it once, here, as the
// live proof.

export const DEVCREW_CONFIG_FILENAME = ".claude/devcrew.json";
export const LEGACY_LOOP_CONFIG_FILENAME = ".claude/loop.json";
export const LEGACY_CREW_CONFIG_FILENAME = ".claude/crew.json";
export const DEVCREW_SCHEMA_VERSION = 2;

async function readJsonIfExists(filePath: string): Promise<Record<string, unknown> | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Returns the parsed `.claude/devcrew.json` when it exists AND carries
 * `schemaVersion: 2` — the "new file wins when present" read seam
 * config-resolver.mts's runtime path uses. Returns null (never throws on a
 * missing/stale file) so callers fall back to the legacy loop.json path
 * unconditionally.
 */
export async function readDevcrewConfigIfPresent(
  repoPath: string
): Promise<Record<string, unknown> | null> {
  const parsed = await readJsonIfExists(path.join(repoPath, DEVCREW_CONFIG_FILENAME));
  if (parsed && parsed.schemaVersion === DEVCREW_SCHEMA_VERSION) {
    return parsed;
  }
  return null;
}

export interface DevcrewMigrationResult {
  written: boolean;
  path: string;
  reason: "migrated" | "already-migrated" | "no-source-config";
  backups: string[];
}

/**
 * In-place migrator: reads `.claude/loop.json` + `.claude/crew.json`
 * (either may be absent), writes `.claude/devcrew.json` with the merged
 * shape from contract §5, and leaves a `.bak` copy of every source file it
 * read alongside the original — originals are never deleted, `.bak` files
 * are never deleted either (one-release rollback path per the plan).
 *
 * Idempotent: a repo whose `devcrew.json` already carries
 * `schemaVersion: 2` is a check-then-write no-op — re-running never blindly
 * overwrites an already-migrated file or re-stamps `.bak` copies.
 */
export async function migrateToDevcrewConfig(repoPath: string): Promise<DevcrewMigrationResult> {
  const devcrewPath = path.join(repoPath, DEVCREW_CONFIG_FILENAME);
  const loopPath = path.join(repoPath, LEGACY_LOOP_CONFIG_FILENAME);
  const crewPath = path.join(repoPath, LEGACY_CREW_CONFIG_FILENAME);

  if (await readDevcrewConfigIfPresent(repoPath)) {
    return { written: false, path: devcrewPath, reason: "already-migrated", backups: [] };
  }

  const loopConfig = await readJsonIfExists(loopPath);
  const crewConfig = await readJsonIfExists(crewPath);
  if (!loopConfig && !crewConfig) {
    return { written: false, path: devcrewPath, reason: "no-source-config", backups: [] };
  }

  const merged: Record<string, unknown> = { ...(loopConfig ?? {}) };
  if (loopConfig && "schemaVersion" in loopConfig) {
    merged.presetSchemaVersion = loopConfig.schemaVersion;
  }
  if (crewConfig && typeof crewConfig.features === "object" && crewConfig.features !== null) {
    merged.features = crewConfig.features;
  }
  merged.schemaVersion = DEVCREW_SCHEMA_VERSION;

  await fs.mkdir(path.dirname(devcrewPath), { recursive: true });
  await fs.writeFile(devcrewPath, `${JSON.stringify(merged, null, 2)}\n`);

  const backups: string[] = [];
  if (loopConfig) {
    const bakPath = `${loopPath}.bak`;
    await fs.copyFile(loopPath, bakPath);
    backups.push(bakPath);
  }
  if (crewConfig) {
    const bakPath = `${crewPath}.bak`;
    await fs.copyFile(crewPath, bakPath);
    backups.push(bakPath);
  }

  return { written: true, path: devcrewPath, reason: "migrated", backups };
}

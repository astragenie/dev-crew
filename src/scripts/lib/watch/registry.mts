// watch/registry.mts — read + validate ~/.claude/watch/repos.json.
// Shard-exclusivity is enforced at the schema level: a ghSlug appearing
// under two entries is refused (contract §1 — "this IS the shard-exclusivity
// rule at the schema level"). Cross-machine concurrent-shard-claim is
// explicitly out of scope for B1 (see contract §1).

import fs from "node:fs/promises";
import path from "node:path";

import type { RegistryFile } from "./types.mjs";

export interface RegistryValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Read + JSON-parse the registry file. Throws on read/parse failure — a
 * missing or malformed registry is an operator-config error, not a soft
 * failure (docs/code-conventions.md: throw for programmer/config errors).
 */
export async function readRegistry(registryPath: string): Promise<RegistryFile> {
  const resolved = path.resolve(registryPath);
  let raw: string;
  try {
    raw = await fs.readFile(resolved, "utf-8");
  } catch (err) {
    throw new Error(
      `[watch/registry] could not read registry at ${resolved}: ${(err as Error).message}`
    );
  }
  try {
    return JSON.parse(raw) as RegistryFile;
  } catch (err) {
    throw new Error(
      `[watch/registry] could not parse registry JSON at ${resolved}: ${(err as Error).message}`
    );
  }
}

function requireNonEmptyString(
  value: unknown,
  label: string,
  field: string,
  errors: string[]
): void {
  if (typeof value !== "string" || value.length === 0) {
    errors.push(`${label}.${field} is required and must be a non-empty string`);
  }
}

function validateGhSlugUniqueness(
  ghSlug: unknown,
  label: string,
  idx: number,
  seenSlugs: Map<string, number>,
  errors: string[]
): void {
  if (typeof ghSlug !== "string" || ghSlug.length === 0) {
    errors.push(`${label}.ghSlug is required and must be a non-empty string`);
    return;
  }
  const priorIdx = seenSlugs.get(ghSlug);
  if (priorIdx !== undefined) {
    errors.push(
      `${label}.ghSlug "${ghSlug}" duplicates entries[${priorIdx}] — shard exclusivity ` +
        `violation (a repo cannot appear under two shards at once)`
    );
    return;
  }
  seenSlugs.set(ghSlug, idx);
}

function validateEntryShape(e: Record<string, unknown>, label: string, errors: string[]): void {
  if (!Number.isInteger(e.shard) || (e.shard as number) <= 0) {
    errors.push(`${label}.shard must be a positive integer`);
  }
  if (e.tier !== 1 && e.tier !== 2) {
    errors.push(`${label}.tier must be 1 or 2`);
  }
  requireNonEmptyString(e.tenantId, label, "tenantId", errors);
  requireNonEmptyString(e.appId, label, "appId", errors);
  if (e.checks !== undefined && !Array.isArray(e.checks)) {
    errors.push(`${label}.checks must be an array of strings when present`);
  }
  if (
    e.claimTtlSeconds !== undefined &&
    (typeof e.claimTtlSeconds !== "number" || e.claimTtlSeconds <= 0)
  ) {
    errors.push(`${label}.claimTtlSeconds must be a positive number when present`);
  }
}

function validateEntry(entry: unknown, idx: number, seenSlugs: Map<string, number>): string[] {
  const label = `entries[${idx}]`;
  if (!entry || typeof entry !== "object") {
    return [`${label}: must be an object`];
  }
  const e = entry as Record<string, unknown>;
  const errors: string[] = [];

  requireNonEmptyString(e.path, label, "path", errors);
  validateGhSlugUniqueness(e.ghSlug, label, idx, seenSlugs, errors);
  validateEntryShape(e, label, errors);

  return errors;
}

/**
 * Pure schema + shard-exclusivity validation. Never throws — callers decide
 * whether an invalid registry is fatal (watch/tick.mts throws; a future
 * `/devcrew:watch` CLI may prefer to report and exit).
 */
export function validateRegistry(registry: RegistryFile): RegistryValidationResult {
  if (!registry || typeof registry !== "object") {
    return { ok: false, errors: ["registry root must be an object"] };
  }

  const errors: string[] = [];
  if (typeof registry.controlRepoPath !== "string" || registry.controlRepoPath.length === 0) {
    errors.push("controlRepoPath is required and must be a non-empty string");
  }
  if (!Array.isArray(registry.entries)) {
    errors.push("entries must be an array");
    return { ok: false, errors };
  }

  const seenSlugs = new Map<string, number>();
  registry.entries.forEach((entry, idx) => {
    errors.push(...validateEntry(entry, idx, seenSlugs));
  });

  return { ok: errors.length === 0, errors };
}

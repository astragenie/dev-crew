// skill-catalog.mts — FEAT-230 SLICE-1 (runner-plugin) + FEAT-007/SLICE-35
// (dev-crew) repoint.
//
// Discovers this repo's REAL skill inventory at resolve time by walking
// `<repoPath>/skills/domain/**` recursively, marker file SKILL.md —
// mirroring validate-agent-refs.mts's collectSkillDirNames (this repo's own
// existing "a directory containing SKILL.md is a skill" convention) rather
// than inventing a new walk shape. Verified live against this repo's own
// checkout: both a leaf-at-category skill (skills/domain/security-advisory/
// SKILL.md) and a nested-subcategory skill (skills/domain/ui/react-
// engineering/SKILL.md) resolve to a catalog entry the same way.
//
// Explicitly rejected (runner-plugin contract, Decision 1, Option C): a
// hardcoded skill-name allowlist. validate-agent-refs.mts's
// CREW_KNOWN_TOKENS is documented in its own header as a *tolerated* drift
// surface requiring manual bumps — the same failure shape this module exists
// to eliminate, not a fix for it. No static skill-name list is added here.
//
// FEAT-007/SLICE-35 repoint: the original runner-plugin shape gated
// enumeration on `loop.crewRepoPath` because the skill tree lived in a
// separate `crew` plugin checkout the `runner` plugin had to reach across a
// cross-plugin seam for. That seam no longer exists in this merged repo —
// `skills/domain/**` lives at this repo's own root — so the gate is dead
// code post-merge and has been dropped: `enumerateSkillCatalog` now walks
// `<repoPath>/skills/domain` directly, no config lookup, never returns the
// "not configured" degrade path. `domainRoot` remains overridable (mainly
// for tests) so fixtures don't have to write into this repo's real
// `skills/domain` tree.
//
// Read-only: this module never writes.

import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

/** One entry in the live skill catalog. */
export interface SkillCatalogEntry {
  /** Skill ID — the directory basename that directly contains SKILL.md. */
  id: string;
  /** Path relative to the skills-domain root, POSIX-separated (even on Windows) — carried for logging/fixture provenance, not consumed by the matcher. */
  relPath: string;
}

export interface SkillCatalogOpts {
  /**
   * Explicit override for the skills-domain root directory. Defaults to
   * `<repoPath>/skills/domain`. Tests use this to point at an isolated
   * fixture tree instead of writing into this repo's real skills/domain.
   */
  domainRoot?: string;
}

export interface SkillCatalogResult {
  /**
   * Keyed by skill ID for O(1) membership/lookup. `null` when the resolved
   * skills-domain root does not exist or is unreadable — never throws.
   */
  catalog: Map<string, SkillCatalogEntry> | null;
  /** Present whenever `catalog` is null — a human-readable reason to log. */
  reason?: string;
}

async function isDirectory(dirPath: string): Promise<boolean> {
  try {
    const stat = await fs.stat(dirPath);
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Recursive marker-walk: any directory at any depth that directly contains a
 * SKILL.md file is a skill; its basename is the skill ID. Mirrors
 * validate-agent-refs.mts's collectSkillDirNames — same marker, same
 * unconditional-recurse-into-every-subdirectory shape (a directory can be
 * both a skill itself AND a parent of further nested skills), so leaf-at-
 * category and nested-subcategory shapes are both found uniformly.
 */
async function walkSkillDirs(
  dir: string,
  domainRoot: string,
  out: Map<string, SkillCatalogEntry>
): Promise<void> {
  let entries: Dirent<string>[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    try {
      await fs.access(path.join(full, "SKILL.md"));
      const relPath = path.relative(domainRoot, full).split(path.sep).join("/");
      out.set(entry.name, { id: entry.name, relPath });
    } catch {
      // not a skill dir — keep walking, it may still contain nested skills
    }
    await walkSkillDirs(full, domainRoot, out);
  }
}

/**
 * Enumerate this repo's live skill catalog at `<repoPath>/skills/domain/**`
 * (or `opts.domainRoot` when given). Read-only. Degrades to
 * `{ catalog: null, reason }` — never throws — when the resolved root does
 * not exist or is unreadable.
 */
export async function enumerateSkillCatalog(
  repoPath: string,
  opts: SkillCatalogOpts = {}
): Promise<SkillCatalogResult> {
  const domainRoot = opts.domainRoot ?? path.join(repoPath, "skills", "domain");
  if (!(await isDirectory(domainRoot))) {
    return {
      catalog: null,
      reason: `no skills/domain tree found: ${domainRoot}`
    };
  }
  const catalog = new Map<string, SkillCatalogEntry>();
  await walkSkillDirs(domainRoot, domainRoot, catalog);
  return { catalog };
}

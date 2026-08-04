// skill-catalog.mts — FEAT-230 SLICE-1: live crew skill catalog enumerator.
//
// Contract: .claude/artifacts/crew/runs/2026-07-08-feat230-task-driven-skill-selection-contract.md
// (Decision 1). Discovers crew's REAL skill inventory at resolve time by
// walking <crewRepoPath>/skills/domain/** recursively, marker file SKILL.md —
// mirroring validate-agent-refs.mts's collectSkillDirNames (this repo's own
// existing "a directory containing SKILL.md is a skill" convention) rather
// than inventing a new walk shape. Verified live against a real crew
// checkout: both a leaf-at-category skill (skills/domain/security-advisory/
// SKILL.md) and a nested-subcategory skill (skills/domain/ui/react-
// engineering/SKILL.md) resolve to a catalog entry the same way.
//
// Explicitly rejected (contract Decision 1, Option C): a hardcoded skill-name
// allowlist. validate-agent-refs.mts's CREW_KNOWN_TOKENS is documented in its
// own header as a *tolerated* drift surface requiring manual bumps — the same
// failure shape this FEAT exists to eliminate, not a fix for it. No static
// skill-name list is added here.
//
// Gate: loop.crewRepoPath, reusing eval-generator.mts:65-69's resolution
// shape verbatim (DEC-068 precedent) — absolute-or-repo-joined path, absent
// -> null, never throw. This repo's own .claude/loop.json has NO
// crewRepoPath configured today, so the degrade path below is this repo's
// actual current runtime state, not a hypothetical edge case.
//
// Read-only on crew: this module never writes into crewRepoPath.
//
// NO PRODUCTION CALLER YET. This slice (SLICE-1 of FEAT-230) lands only the
// enumerator. Its planned consumers — SLICE-2 (task-signal to skill
// mapping/matcher table) and SLICE-3 (resolve-skills CLI --slice/--tags
// integration) — have not landed yet. This is a disclosed, intentional seam,
// not a "tested but never wired" defect (see FEAT-281): the export is dead
// code at runtime until SLICE-2/3 land, and that is the correct state for a
// foundation slice to be in.

import fs from "node:fs/promises";
import type { Dirent } from "node:fs";
import path from "node:path";

/** One entry in the live skill catalog. */
export interface SkillCatalogEntry {
  /** Skill ID — the directory basename that directly contains SKILL.md. */
  id: string;
  /** Path relative to `<crewRepoPath>/skills/domain`, POSIX-separated (even on Windows) — carried for future logging/fixture provenance (SLICE-2/5), not consumed by this slice. */
  relPath: string;
}

export interface SkillCatalogOpts {
  config?: { loop?: { crewRepoPath?: string } } | null;
}

export interface SkillCatalogResult {
  /**
   * Keyed by skill ID for O(1) membership/lookup. `null` when
   * `loop.crewRepoPath` is unset, or the resolved path (or its
   * `skills/domain` subtree) is missing/unreadable — never throws.
   */
  catalog: Map<string, SkillCatalogEntry> | null;
  /** Present whenever `catalog` is null — a human-readable reason to log. */
  reason?: string;
}

const CREW_NOT_CONFIGURED_REASON = "crew repo not configured — see loop.crewRepoPath";

/** Mirrors eval-generator.mts:65-69 verbatim (DEC-068 precedent) — absolute-or-joined, absent -> null. */
function resolveCrewRepoPath(repoPath: string, opts: SkillCatalogOpts): string | null {
  const configured = opts.config?.loop?.crewRepoPath;
  if (typeof configured !== "string" || configured.length === 0) return null;
  return path.isAbsolute(configured) ? configured : path.join(repoPath, configured);
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
 * Enumerate crew's live skill catalog at `<crewRepoPath>/skills/domain/**`.
 * Read-only on crew. Gated on `loop.crewRepoPath`; degrades to
 * `{ catalog: null, reason }` — never throws — when unset, or when the
 * resolved path or its `skills/domain` subtree does not exist or is
 * unreadable.
 */
export async function enumerateSkillCatalog(
  repoPath: string,
  opts: SkillCatalogOpts = {}
): Promise<SkillCatalogResult> {
  const crewRepoPath = resolveCrewRepoPath(repoPath, opts);
  if (!crewRepoPath) {
    return { catalog: null, reason: CREW_NOT_CONFIGURED_REASON };
  }
  const domainRoot = path.join(crewRepoPath, "skills", "domain");
  if (!(await isDirectory(domainRoot))) {
    return {
      catalog: null,
      reason: `configured crewRepoPath has no skills/domain: ${domainRoot}`
    };
  }
  const catalog = new Map<string, SkillCatalogEntry>();
  await walkSkillDirs(domainRoot, domainRoot, catalog);
  return { catalog };
}

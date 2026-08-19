// skill-matcher.mts — FEAT-007/SLICE-35 task-signal skill matcher.
//
// Contract: docs/planning/feat-007-skill-matcher-contract.md ("Matcher table
// shape"). Pure function, no I/O: takes a task signal (a FEAT/slice's
// `tags:` frontmatter) and an already-enumerated live catalog
// (skill-catalog.mjs's `enumerateSkillCatalog`), and returns the resolved
// skill ids. Rule table lives separately in skill-matcher-table.mjs (plain
// data) so it can be reviewed/edited without touching matcher logic.
//
// AC-2: a rule-table id absent from the live catalog goes to `unresolved`,
// never silently dropped — callers (the resolve-skills CLI) decide whether
// that's a warning or a hard failure (`--strict`).

import { SKILL_MATCH_TABLE } from "./skill-matcher-table.mjs";
import type { SkillCatalogEntry } from "./skill-catalog.mjs";

/** FEAT/slice frontmatter tags, e.g. ["stack:typescript", "concern:agent-reporting"]. */
export interface TaskSignal {
  tags: string[];
}

export interface SkillMatchRule {
  /** Exact tag string, e.g. "stack:typescript". */
  tag: string;
  /** Candidate skill ids — validated against the live catalog at resolve time. */
  skillIds: string[];
}

export interface SkillMatchResult {
  /** Deduped, catalog-verified. */
  skills: string[];
  /** Distinguishes from legacy skill-resolver.mjs `SkillSource` values. */
  source: "task-signal-matcher";
  /** Rule-table ids absent from the live catalog — AC-2 trigger. */
  unresolved: string[];
}

/**
 * Match `signal.tags` against the rule table, union the candidate skill ids
 * of every matching rule, then split the union against `catalog`:
 * catalog-present ids -> `skills`, catalog-absent ids -> `unresolved`. Tags
 * with no matching rule are silently skipped (not every tag is expected to
 * resolve to a skill). Never throws — a `null` catalog (skills/domain tree
 * missing) puts every candidate id into `unresolved`.
 */
export function matchSkills(
  signal: TaskSignal,
  catalog: Map<string, SkillCatalogEntry> | null
): SkillMatchResult {
  const candidateIds = new Set<string>();
  for (const tag of signal.tags) {
    for (const rule of SKILL_MATCH_TABLE) {
      if (rule.tag !== tag) continue;
      for (const id of rule.skillIds) candidateIds.add(id);
    }
  }

  const skills: string[] = [];
  const unresolved: string[] = [];
  for (const id of candidateIds) {
    if (catalog?.has(id)) {
      skills.push(id);
    } else {
      unresolved.push(id);
    }
  }
  skills.sort();
  unresolved.sort();

  return { skills, source: "task-signal-matcher", unresolved };
}

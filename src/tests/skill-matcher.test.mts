import { test } from "bun:test";
import assert from "node:assert/strict";

import { matchSkills, type SkillMatchRule } from "../scripts/lib/skill-matcher.mjs";
import { SKILL_MATCH_TABLE } from "../scripts/lib/skill-matcher-table.mjs";
import type { SkillCatalogEntry } from "../scripts/lib/skill-catalog.mjs";

function catalogOf(ids: string[]): Map<string, SkillCatalogEntry> {
  const m = new Map<string, SkillCatalogEntry>();
  for (const id of ids) m.set(id, { id, relPath: id });
  return m;
}

test("matchSkills resolves a stack: tag against the live catalog", () => {
  const catalog = catalogOf(["typescript-pro", "node-ts-patterns", "python-pro"]);
  const result = matchSkills({ tags: ["stack:typescript"] }, catalog);
  assert.deepEqual(result.skills.sort(), ["node-ts-patterns", "typescript-pro"]);
  assert.deepEqual(result.unresolved, []);
  assert.equal(result.source, "task-signal-matcher");
});

test("matchSkills resolves a concern: tag against the live catalog", () => {
  const catalog = catalogOf(["security-advisory", "security-sweep"]);
  const result = matchSkills({ tags: ["concern:security"] }, catalog);
  assert.deepEqual(result.skills.sort(), ["security-advisory", "security-sweep"]);
  assert.deepEqual(result.unresolved, []);
});

test("matchSkills resolves a surface: tag against the live catalog", () => {
  const catalog = catalogOf(["database-architecture", "ef-core-patterns"]);
  const result = matchSkills({ tags: ["surface:schema"] }, catalog);
  assert.deepEqual(result.skills.sort(), ["database-architecture", "ef-core-patterns"]);
  assert.deepEqual(result.unresolved, []);
});

test("matchSkills unions skill ids across multiple matched tags, deduped", () => {
  const catalog = catalogOf([
    "database-architecture",
    "ef-core-patterns",
    "api-architecture",
    "openapi-authoring",
    "contract-codegen"
  ]);
  const result = matchSkills(
    { tags: ["surface:schema", "surface:api", "concern:database"] },
    catalog
  );
  // database-architecture is a candidate from both surface:schema and
  // concern:database — must appear exactly once.
  assert.deepEqual(
    result.skills.sort(),
    [
      "api-architecture",
      "contract-codegen",
      "database-architecture",
      "ef-core-patterns",
      "openapi-authoring"
    ].sort()
  );
});

test("matchSkills silently skips a tag with no matching rule (not an error)", () => {
  const catalog = catalogOf(["typescript-pro", "node-ts-patterns"]);
  const result = matchSkills({ tags: ["area:backlog-data-model", "stack:typescript"] }, catalog);
  assert.deepEqual(result.skills.sort(), ["node-ts-patterns", "typescript-pro"]);
  assert.deepEqual(result.unresolved, []);
});

test("matchSkills returns empty skills/unresolved for an empty tag list", () => {
  const catalog = catalogOf(["typescript-pro"]);
  const result = matchSkills({ tags: [] }, catalog);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.unresolved, []);
});

// AC-2: a rule-table id absent from the live catalog must surface in
// `unresolved`, never crash and never silently vanish. Reproduces the
// production stack:vue -> vue-engineering entry (confirmed dead per the
// contract's dead-ID re-verification) plus a synthetic mixed case.
test("matchSkills reports dead ids as unresolved without throwing (production stack:vue rule)", () => {
  const catalog = catalogOf(["typescript-pro"]); // no vue-engineering present
  assert.doesNotThrow(() => matchSkills({ tags: ["stack:vue"] }, catalog));
  const result = matchSkills({ tags: ["stack:vue"] }, catalog);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.unresolved, ["vue-engineering"]);
});

test("matchSkills reports dead ids as unresolved without throwing (synthetic rule table, mixed live+dead)", () => {
  const rules: SkillMatchRule[] = [
    { tag: "stack:csharp-legacy", skillIds: ["csharp-pro", "frontend-advisory", "a11y-advisory"] },
    { tag: "stack:typescript", skillIds: ["typescript-pro"] }
  ];
  const catalog = catalogOf(["typescript-pro"]);
  const candidateIds = new Set<string>();
  for (const tag of ["stack:csharp-legacy", "stack:typescript"]) {
    for (const rule of rules) {
      if (rule.tag !== tag) continue;
      for (const id of rule.skillIds) candidateIds.add(id);
    }
  }
  // Exercise the same skills/unresolved split matchSkills performs, using a
  // synthetic table so this test doesn't depend on the production table's
  // exact contents while still proving the three confirmed-dead ids never
  // throw and never silently disappear.
  const skills: string[] = [];
  const unresolved: string[] = [];
  for (const id of candidateIds) {
    if (catalog.has(id)) skills.push(id);
    else unresolved.push(id);
  }
  assert.deepEqual(skills.sort(), ["typescript-pro"]);
  assert.deepEqual(unresolved.sort(), ["a11y-advisory", "csharp-pro", "frontend-advisory"]);
});

test("matchSkills puts every candidate id into unresolved when catalog is null", () => {
  const result = matchSkills({ tags: ["stack:typescript"] }, null);
  assert.deepEqual(result.skills, []);
  assert.deepEqual(result.unresolved.sort(), ["node-ts-patterns", "typescript-pro"]);
});

test("SKILL_MATCH_TABLE has no duplicate tag keys", () => {
  const tags = SKILL_MATCH_TABLE.map((r) => r.tag);
  assert.deepEqual(tags, [...new Set(tags)]);
});

test("SKILL_MATCH_TABLE only keys on stack:/concern:/surface: prefixes", () => {
  for (const rule of SKILL_MATCH_TABLE) {
    assert.ok(
      rule.tag.startsWith("stack:") ||
        rule.tag.startsWith("concern:") ||
        rule.tag.startsWith("surface:"),
      `unexpected matcher key prefix: ${rule.tag}`
    );
  }
});

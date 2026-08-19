import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { makeTmpRepo } from "./_fixtures.mjs";
import { enumerateSkillCatalog } from "../scripts/lib/skill-catalog.mjs";

/** Write a SKILL.md marker file at `dir` (creating `dir` if needed). */
async function seedSkillDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "SKILL.md"), "---\nname: fixture\n---\nfixture skill\n");
}

/**
 * Build a fixture `skills/domain/**` tree, standing in for this repo's real
 * shape: a leaf-at-category skill, a nested-subcategory skill, and a
 * directory that must be EXCLUDED because it has no SKILL.md of its own
 * (only a sibling reference doc).
 */
async function makeDomainFixture(repo: string): Promise<string> {
  const domain = path.join(repo, "skills", "domain");
  // leaf-at-category skill
  await seedSkillDir(path.join(domain, "security-advisory"));
  // nested-subcategory skill (parent "ui" itself is NOT a skill)
  await seedSkillDir(path.join(domain, "ui", "react-engineering"));
  // a category dir with a SKILL.md-less reference doc alongside a real skill —
  // must not itself be picked up, only its child
  await fs.mkdir(path.join(domain, "contract-codegen", "reference"), { recursive: true });
  await fs.writeFile(
    path.join(domain, "contract-codegen", "reference", "notes.md"),
    "not a skill\n"
  );
  await seedSkillDir(path.join(domain, "contract-codegen"));
  return domain;
}

test("enumerateSkillCatalog finds leaf-at-category and nested-subcategory skills, excludes marker-less dirs", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");
  await makeDomainFixture(repo);

  const result = await enumerateSkillCatalog(repo);

  assert.ok(result.catalog);
  const ids = [...result.catalog!.keys()].sort();
  assert.deepEqual(ids, ["contract-codegen", "react-engineering", "security-advisory"]);
  assert.equal(result.catalog!.get("react-engineering")!.relPath, "ui/react-engineering");
  assert.equal(result.catalog!.get("security-advisory")!.relPath, "security-advisory");
  // the reference/ subdir has no SKILL.md and must not appear
  assert.ok(!result.catalog!.has("reference"));
  // the "ui" parent category itself has no SKILL.md and must not appear
  assert.ok(!result.catalog!.has("ui"));
});

test("enumerateSkillCatalog defaults to <repoPath>/skills/domain with no config lookup", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");
  await seedSkillDir(path.join(repo, "skills", "domain", "python-pro"));

  const result = await enumerateSkillCatalog(repo);

  assert.ok(result.catalog);
  assert.deepEqual([...result.catalog!.keys()], ["python-pro"]);
});

test("enumerateSkillCatalog returns null with a reason when repoPath has no skills/domain", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-empty-");

  const result = await enumerateSkillCatalog(repo);

  assert.equal(result.catalog, null);
  assert.match(result.reason ?? "", /skills\/domain/);
});

test("enumerateSkillCatalog honors an explicit domainRoot override", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");
  const altRoot = path.join(repo, "elsewhere", "skills", "domain");
  await seedSkillDir(path.join(altRoot, "typescript-pro"));

  const result = await enumerateSkillCatalog(repo, { domainRoot: altRoot });

  assert.ok(result.catalog);
  assert.deepEqual([...result.catalog!.keys()], ["typescript-pro"]);
});

test("enumerateSkillCatalog never throws for a nonexistent domainRoot override", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");

  const result = await enumerateSkillCatalog(repo, {
    domainRoot: path.join(repo, "no-such-tree")
  });

  assert.equal(result.catalog, null);
  assert.match(result.reason ?? "", /skills\/domain/);
});

// Neuter-proof: exercises the ACTUAL recursive walk against this repo's own
// real skills/domain tree (not a fixture) — a regression that flattened the
// walk back to a top-level-only listing would fail this test, because
// react-engineering only exists nested under ui/. Also re-verifies the
// FEAT-007 contract's dead-ID finding directly against the live tree: these
// four ids were removed when crew reorganized skills/domain/ and must stay
// absent, or the matcher table's "unresolved" reporting would go silently
// stale.
test("enumerateSkillCatalog against this repo's real skills/domain: nested react-engineering resolves, confirmed-dead ids do not", async () => {
  const repoRoot = path.resolve(".");

  const result = await enumerateSkillCatalog(repoRoot);

  assert.ok(result.catalog, "this repo must have a real skills/domain tree");
  assert.ok(
    result.catalog!.has("react-engineering"),
    "nested skill must be found by the recursive walk"
  );
  assert.equal(result.catalog!.get("react-engineering")!.relPath, "ui/react-engineering");

  for (const deadId of ["csharp-pro", "frontend-advisory", "a11y-advisory", "vue-engineering"]) {
    assert.ok(!result.catalog!.has(deadId), `${deadId} is confirmed dead and must not resolve`);
  }
});

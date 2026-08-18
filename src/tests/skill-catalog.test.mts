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
 * Build a fixture crew checkout under a fresh tmp repo, standing in for
 * `dev-team`'s real `skills/domain/**` shape: a leaf-at-category skill, a
 * nested-subcategory skill, and a directory that must be EXCLUDED because it
 * has no SKILL.md of its own (only a sibling reference doc).
 */
async function makeCrewFixture(): Promise<string> {
  const crewRepo = await makeTmpRepo("skill-catalog-crew-");
  const domain = path.join(crewRepo, "skills", "domain");
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
  return crewRepo;
}

test("enumerateSkillCatalog finds leaf-at-category and nested-subcategory skills, excludes marker-less dirs", async () => {
  const crewRepo = await makeCrewFixture();
  const repo = await makeTmpRepo("skill-catalog-repo-");

  const result = await enumerateSkillCatalog(repo, {
    config: { loop: { crewRepoPath: crewRepo } }
  });

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

test("enumerateSkillCatalog returns null with a reason when crewRepoPath is unset", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");

  const result = await enumerateSkillCatalog(repo, {});

  assert.equal(result.catalog, null);
  assert.match(result.reason ?? "", /crewRepoPath/);
});

test("enumerateSkillCatalog returns null with a reason when config is entirely absent", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");

  const result = await enumerateSkillCatalog(repo);

  assert.equal(result.catalog, null);
  assert.match(result.reason ?? "", /crewRepoPath/);
});

test("enumerateSkillCatalog returns null with a reason when crewRepoPath does not exist", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");
  const nonexistent = path.join(repo, "no-such-crew-checkout");

  const result = await enumerateSkillCatalog(repo, {
    config: { loop: { crewRepoPath: nonexistent } }
  });

  assert.equal(result.catalog, null);
  assert.match(result.reason ?? "", /skills\/domain/);
});

test("enumerateSkillCatalog returns null with a reason when crewRepoPath exists but has no skills/domain", async () => {
  const crewRepo = await makeTmpRepo("skill-catalog-crew-empty-");
  const repo = await makeTmpRepo("skill-catalog-repo-");

  const result = await enumerateSkillCatalog(repo, {
    config: { loop: { crewRepoPath: crewRepo } }
  });

  assert.equal(result.catalog, null);
  assert.match(result.reason ?? "", /skills\/domain/);
});

test("enumerateSkillCatalog never throws for a relative crewRepoPath resolved against repoPath", async () => {
  const repo = await makeTmpRepo("skill-catalog-repo-");
  const domain = path.join(repo, "sibling-crew", "skills", "domain");
  await seedSkillDir(path.join(domain, "python-pro"));

  const result = await enumerateSkillCatalog(repo, {
    config: { loop: { crewRepoPath: "sibling-crew" } }
  });

  assert.ok(result.catalog);
  assert.deepEqual([...result.catalog!.keys()], ["python-pro"]);
});

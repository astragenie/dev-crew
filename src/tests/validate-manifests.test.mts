import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { validateAllPresets, validateSkillFrontmatter } from "../scripts/validate-manifests.mjs";

function tmpRepo(prefix: string): { root: string; presetsDir: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  const presetsDir = path.join(root, "scripts", "presets");
  mkdirSync(presetsDir, { recursive: true });
  return { root, presetsDir };
}

function writePreset(presetsDir: string, name: string, body: unknown | string): void {
  const content = typeof body === "string" ? body : JSON.stringify(body, null, 2);
  writeFileSync(path.join(presetsDir, `${name}.json`), content);
}

const VALID_SPLIT_FALSE = {
  schemaVersion: 1,
  presetName: "ok-split-false",
  projectType: "claude-plugin",
  split: false,
  skills: ["typescript-pro"]
};

const VALID_SPLIT_TRUE = {
  schemaVersion: 1,
  presetName: "ok-split-true",
  projectType: "saas",
  split: true,
  fe: { skills: ["react-engineering"] },
  be: { skills: ["csharp-pro"] }
};

test("validateAllPresets returns empty errors on a clean presets dir", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-clean-");
  writePreset(presetsDir, "p1", VALID_SPLIT_FALSE);
  writePreset(presetsDir, "p2", VALID_SPLIT_TRUE);
  const errors = validateAllPresets(root);
  assert.deepEqual(errors, []);
});

test("validateAllPresets returns empty when presets dir is absent (no-op guard)", () => {
  const root = mkdtempSync(path.join(tmpdir(), "vm-presets-missing-"));
  const errors = validateAllPresets(root);
  assert.deepEqual(errors, []);
});

test("validateAllPresets reports a SchemaError with the offending filename", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-schema-bad-");
  writePreset(presetsDir, "ok", VALID_SPLIT_FALSE);
  writePreset(presetsDir, "broken", {
    ...VALID_SPLIT_FALSE,
    schemaVersion: 99 // unsupported version triggers SchemaError
  });
  const errors = validateAllPresets(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /broken\.json/);
  assert.match(errors[0] ?? "", /schemaVersion/);
});

test("validateAllPresets reports a SyntaxError when the JSON is malformed", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-bad-json-");
  writePreset(presetsDir, "ok", VALID_SPLIT_TRUE);
  writePreset(presetsDir, "syntax-bad", "{not valid json");
  const errors = validateAllPresets(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /syntax-bad\.json/);
});

test("validateAllPresets accumulates multiple errors and ignores non-JSON files", () => {
  const { root, presetsDir } = tmpRepo("vm-presets-multi-bad-");
  writeFileSync(path.join(presetsDir, "README.md"), "# not a preset");
  writePreset(presetsDir, "bad-1", { ...VALID_SPLIT_FALSE, schemaVersion: 0 });
  writePreset(presetsDir, "bad-2", { ...VALID_SPLIT_TRUE, projectType: "spaceship" });
  writePreset(presetsDir, "ok", VALID_SPLIT_FALSE);
  const errors = validateAllPresets(root);
  assert.equal(errors.length, 2);
});

// --- validateSkillFrontmatter / keywords field ---

function tmpSkillRepo(prefix: string): { root: string; skillsDir: string } {
  const root = mkdtempSync(path.join(tmpdir(), prefix));
  const skillsDir = path.join(root, "skills", "my-skill");
  mkdirSync(skillsDir, { recursive: true });
  return { root, skillsDir };
}

function writeSkillMd(skillsDir: string, content: string): void {
  writeFileSync(path.join(skillsDir, "SKILL.md"), content, "utf8");
}

test("validateSkillFrontmatter returns [] when skills dir is absent", () => {
  const root = mkdtempSync(path.join(tmpdir(), "vm-skill-no-dir-"));
  const errors = validateSkillFrontmatter(root);
  assert.deepEqual(errors, []);
});

test("validateSkillFrontmatter returns [] for valid SKILL.md with no keywords field", () => {
  const { root, skillsDir } = tmpSkillRepo("vm-skill-no-kw-");
  writeSkillMd(
    skillsDir,
    "---\nname: my-skill\ndescription: A skill\ntrigger: always_on\n---\n# My Skill\n"
  );
  const errors = validateSkillFrontmatter(root);
  assert.deepEqual(errors, []);
});

test("validateSkillFrontmatter returns [] when keywords is a valid string array", () => {
  const { root, skillsDir } = tmpSkillRepo("vm-skill-kw-valid-");
  writeSkillMd(
    skillsDir,
    "---\nname: my-skill\ndescription: A skill\nkeywords: [kubernetes, azure]\n---\n# My Skill\n"
  );
  const errors = validateSkillFrontmatter(root);
  assert.deepEqual(errors, []);
});

test("validateSkillFrontmatter reports error when keywords is a plain string (not an array)", () => {
  const { root, skillsDir } = tmpSkillRepo("vm-skill-kw-string-");
  writeSkillMd(
    skillsDir,
    "---\nname: my-skill\ndescription: A skill\nkeywords: not-an-array\n---\n# My Skill\n"
  );
  const errors = validateSkillFrontmatter(root);
  assert.equal(errors.length, 1);
  assert.match(errors[0] ?? "", /keywords/);
  assert.match(errors[0] ?? "", /array of strings/);
});

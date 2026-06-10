import { test } from "bun:test";
import assert from "node:assert/strict";

import { parseSkillFrontmatter } from "../scripts/lib/skill-frontmatter.mjs";

test("parseSkillFrontmatter with no trigger field defaults to always_on", () => {
  const input = `---
name: test-skill
description: A test skill
---

# Test Skill

Body content.`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.name, "test-skill");
  assert.equal(meta.description, "A test skill");
  assert.equal(meta.trigger, "always_on");
  assert.deepEqual(meta.globs, []);
});

test("parseSkillFrontmatter with explicit always_on trigger", () => {
  const input = `---
name: always-skill
description: An always-on skill
trigger: always_on
---

# Always On Skill

Body.`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.trigger, "always_on");
  assert.deepEqual(meta.globs, []);
});

test("parseSkillFrontmatter with manual trigger", () => {
  const input = `---
name: manual-skill
description: A manually invoked skill
trigger: manual
---

# Manual Skill

Body.`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.name, "manual-skill");
  assert.equal(meta.trigger, "manual");
  assert.deepEqual(meta.globs, []);
});

test("parseSkillFrontmatter with glob trigger and globs array", () => {
  const input = `---
name: glob-skill
description: A glob-based skill
trigger: glob
globs:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Glob Skill

Body.`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.name, "glob-skill");
  assert.equal(meta.trigger, "glob");
  assert.deepEqual(meta.globs, ["**/*.test.ts", "**/*.spec.ts"]);
});

test("parseSkillFrontmatter with inline globs array", () => {
  const input = `---
name: inline-glob-skill
description: Glob skill with inline array
trigger: glob
globs: ["src/**/*.mts", "tests/**/*.mts"]
---

# Inline Glob Skill`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.trigger, "glob");
  assert.deepEqual(meta.globs, ["src/**/*.mts", "tests/**/*.mts"]);
});

test("parseSkillFrontmatter with model_decision trigger (parsed correctly)", () => {
  const input = `---
name: model-decision-skill
description: A model decision skill
trigger: model_decision
---

# Model Decision Skill`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.name, "model-decision-skill");
  assert.equal(meta.trigger, "model_decision");
  assert.deepEqual(meta.globs, []);
});

test("parseSkillFrontmatter handles missing optional fields", () => {
  const input = `---
name: minimal-skill
---

# Minimal Skill`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.name, "minimal-skill");
  assert.equal(meta.description, "");
  assert.equal(meta.trigger, "always_on");
  assert.deepEqual(meta.globs, []);
});

test("parseSkillFrontmatter with empty globs array", () => {
  const input = `---
name: no-globs-skill
trigger: glob
globs: []
---

Body`;
  const meta = parseSkillFrontmatter(input);
  assert.equal(meta.trigger, "glob");
  assert.deepEqual(meta.globs, []);
});

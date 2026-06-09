import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { loadRules } from "../scripts/lib/rule-loader.mjs";

test("loadRules returns [] when rulesDir does not exist", async () => {
  const nonExistentDir = path.join(os.tmpdir(), "nonexistent-rules-" + Date.now());
  const rules = await loadRules(nonExistentDir);
  assert.deepEqual(rules, []);
});

test("loadRules returns [] when rulesDir is empty", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const rules = await loadRules(tempDir);
    assert.deepEqual(rules, []);
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules parses frontmatter and returns Rule objects with all fields", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const ruleContent = `---
id: rule-1
globs:
  - "**/*.ts"
  - "**/*.tsx"
alwaysApply: false
description: TypeScript files rule
---

# TypeScript Rule

All TypeScript files must follow naming conventions.`;

    await fs.writeFile(path.join(tempDir, "rule-1.md"), ruleContent);

    const rules = await loadRules(tempDir);
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.id, "rule-1");
    assert.deepEqual(rules[0]!.globs, ["**/*.ts", "**/*.tsx"]);
    assert.equal(rules[0]!.alwaysApply, false);
    assert.equal(rules[0]!.description, "TypeScript files rule");
    assert.match(rules[0]!.body, /TypeScript Rule/);
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules defaults globs to [] when absent", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const ruleContent = `---
id: rule-no-globs
alwaysApply: true
description: Always applies
---

Rule body`;

    await fs.writeFile(path.join(tempDir, "rule-no-globs.md"), ruleContent);

    const rules = await loadRules(tempDir);
    assert.equal(rules.length, 1);
    assert.deepEqual(rules[0]!.globs, []);
    assert.equal(rules[0]!.alwaysApply, true);
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules defaults alwaysApply to false when absent", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const ruleContent = `---
id: rule-default-apply
globs:
  - "src/**/*.mts"
description: Default apply
---

Body`;

    await fs.writeFile(path.join(tempDir, "rule-default.md"), ruleContent);

    const rules = await loadRules(tempDir);
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.alwaysApply, false);
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules skips files without an id field", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const ruleContent = `---
globs:
  - "**/*.js"
description: No ID rule
---

Body`;

    await fs.writeFile(path.join(tempDir, "no-id.md"), ruleContent);

    const rules = await loadRules(tempDir);
    assert.deepEqual(rules, []);
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules skips non-.md files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const ruleContent = `---
id: rule-1
---

Body`;

    await fs.writeFile(path.join(tempDir, "rule-1.md"), ruleContent);
    await fs.writeFile(path.join(tempDir, "rule-2.txt"), "not a markdown file");

    const rules = await loadRules(tempDir);
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.id, "rule-1");
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules loads multiple rule files", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const rule1 = `---
id: rule-1
globs: ["**/*.ts"]
---

First rule`;

    const rule2 = `---
id: rule-2
globs: ["**/*.js"]
alwaysApply: true
---

Second rule`;

    await fs.writeFile(path.join(tempDir, "rule-1.md"), rule1);
    await fs.writeFile(path.join(tempDir, "rule-2.md"), rule2);

    const rules = await loadRules(tempDir);
    assert.equal(rules.length, 2);

    const ids = rules.map((r) => r.id).sort();
    assert.deepEqual(ids, ["rule-1", "rule-2"]);
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules defaults description to empty string when absent", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const ruleContent = `---
id: rule-no-desc
---

Body`;

    await fs.writeFile(path.join(tempDir, "rule-no-desc.md"), ruleContent);

    const rules = await loadRules(tempDir);
    assert.equal(rules.length, 1);
    assert.equal(rules[0]!.description, "");
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

test("loadRules handles inline globs array", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rule-loader-"));
  try {
    const ruleContent = `---
id: rule-inline-globs
globs: ["src/**/*.mts", "tests/**/*.mts"]
---

Body`;

    await fs.writeFile(path.join(tempDir, "inline.md"), ruleContent);

    const rules = await loadRules(tempDir);
    assert.equal(rules.length, 1);
    assert.deepEqual(rules[0]!.globs, ["src/**/*.mts", "tests/**/*.mts"]);
  } finally {
    await fs.rm(tempDir, { recursive: true });
  }
});

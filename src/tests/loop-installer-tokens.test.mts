import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSkillActivationBlock,
  buildTokens,
  buildRulesBlock
} from "../scripts/lib/loop-installer-tokens.mjs";
import type { Rule } from "../scripts/lib/rule-loader.mjs";

async function tmpDir(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("buildSkillActivationBlock with empty directory returns empty string", async () => {
  const skillsDir = await tmpDir("skill-test-empty-");
  try {
    const result = await buildSkillActivationBlock(skillsDir);
    assert.equal(result, "");
  } finally {
    await fs.rm(skillsDir, { recursive: true });
  }
});

test("buildSkillActivationBlock with no conditional skills returns empty string", async () => {
  const skillsDir = await tmpDir("skill-test-no-conditional-");
  try {
    // Create a skill with always_on trigger
    const skillDir = path.join(skillsDir, "always-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: always-skill
description: Always on skill
trigger: always_on
---

# Always On Skill`
    );

    const result = await buildSkillActivationBlock(skillsDir);
    assert.equal(result, "");
  } finally {
    await fs.rm(skillsDir, { recursive: true });
  }
});

test("buildSkillActivationBlock with manual trigger skill renders activation note", async () => {
  const skillsDir = await tmpDir("skill-test-manual-");
  try {
    const skillDir = path.join(skillsDir, "manual-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: test:manual-skill
description: A manually invoked skill
trigger: manual
---

# Manual Skill`
    );

    const result = await buildSkillActivationBlock(skillsDir);
    assert.ok(result.includes("## Conditional skill activation"));
    assert.ok(result.includes("**test:manual-skill**"));
    assert.ok(result.includes("only when the user explicitly requests it"));
  } finally {
    await fs.rm(skillsDir, { recursive: true });
  }
});

test("buildSkillActivationBlock with glob trigger and patterns renders pattern instruction", async () => {
  const skillsDir = await tmpDir("skill-test-glob-");
  try {
    const skillDir = path.join(skillsDir, "glob-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: test:glob-skill
description: A glob-based skill
trigger: glob
globs:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Glob Skill`
    );

    const result = await buildSkillActivationBlock(skillsDir);
    assert.ok(result.includes("## Conditional skill activation"));
    assert.ok(result.includes("**test:glob-skill**"));
    assert.ok(result.includes("**/*.test.ts"));
    assert.ok(result.includes("**/*.spec.ts"));
    assert.ok(result.includes("activate when files match"));
  } finally {
    await fs.rm(skillsDir, { recursive: true });
  }
});

test("buildSkillActivationBlock with mixed triggers filters correctly", async () => {
  const skillsDir = await tmpDir("skill-test-mixed-");
  try {
    // Create always_on skill
    let skillDir = path.join(skillsDir, "always-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: always-skill
trigger: always_on
---

# Always On`
    );

    // Create manual skill
    skillDir = path.join(skillsDir, "manual-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: manual-skill
trigger: manual
---

# Manual`
    );

    // Create glob skill
    skillDir = path.join(skillsDir, "glob-skill");
    await fs.mkdir(skillDir, { recursive: true });
    await fs.writeFile(
      path.join(skillDir, "SKILL.md"),
      `---
name: glob-skill
trigger: glob
globs: ["src/**"]
---

# Glob`
    );

    const result = await buildSkillActivationBlock(skillsDir);
    assert.ok(result.includes("**manual-skill**"));
    assert.ok(result.includes("**glob-skill**"));
    assert.ok(!result.includes("always-skill"), "always_on skills should not appear");
  } finally {
    await fs.rm(skillsDir, { recursive: true });
  }
});

test("buildSkillActivationBlock with nonexistent directory returns empty string", async () => {
  const nonexistentDir = path.join(os.tmpdir(), `nonexistent-${Date.now()}`);
  const result = await buildSkillActivationBlock(nonexistentDir);
  assert.equal(result, "");
});

test("buildTokens includes skillActivationBlock when passed", () => {
  const config = {
    productName: "Test Product",
    productDescription: "A test product",
    stackDescription: "Test stack"
  };
  const skillBlock = "## Conditional skill activation\n\n- **test-skill** — manual";
  const tokens = buildTokens(config, { skillActivationBlock: skillBlock });

  assert.equal(tokens.skillActivationBlock, skillBlock);
  assert.equal(tokens.productName, "Test Product");
});

test("buildTokens with no skillActivationBlock extras defaults to empty string", () => {
  const config = {
    productName: "Test Product",
    productDescription: "A test product",
    stackDescription: "Test stack"
  };
  const tokens = buildTokens(config);

  assert.equal(tokens.skillActivationBlock, "");
  assert.equal(tokens.productName, "Test Product");
});

test("buildTokens with undefined skillActivationBlock extras defaults to empty string", () => {
  const config = {
    productName: "Test Product",
    productDescription: "A test product",
    stackDescription: "Test stack"
  };
  const tokens = buildTokens(config, {});

  assert.equal(tokens.skillActivationBlock, "");
});

test("buildRulesBlock returns empty string when rules array is empty", () => {
  const result = buildRulesBlock([], ["**/*.ts"]);
  assert.equal(result, "");
});

test("buildRulesBlock returns empty string when no rules match", () => {
  const rules: Rule[] = [
    {
      id: "rule-1",
      globs: ["**/*.js"],
      alwaysApply: false,
      description: "JavaScript rule",
      body: "JavaScript code style"
    }
  ];
  const result = buildRulesBlock(rules, ["**/*.py"]);
  assert.equal(result, "");
});

test("buildRulesBlock renders rules with alwaysApply true regardless of globs", () => {
  const rules: Rule[] = [
    {
      id: "global-rule",
      globs: [],
      alwaysApply: true,
      description: "Global rule",
      body: "This rule always applies"
    }
  ];
  const result = buildRulesBlock(rules, ["**/*.ts"]);
  assert.ok(result.includes("## Auto-attached rules"));
  assert.ok(result.includes("global-rule"));
  assert.ok(result.includes("Global rule"));
  assert.ok(result.includes("This rule always applies"));
});

test("buildRulesBlock renders rules where globs overlap with inScopeGlobs", () => {
  const rules: Rule[] = [
    {
      id: "ts-rule",
      globs: ["**/*.ts", "**/*.tsx"],
      alwaysApply: false,
      description: "TypeScript rule",
      body: "TypeScript style guide"
    }
  ];
  const result = buildRulesBlock(rules, ["src/**/*.ts"]);
  assert.ok(result.includes("## Auto-attached rules"));
  assert.ok(result.includes("ts-rule"));
  assert.ok(result.includes("TypeScript rule"));
  assert.ok(result.includes("TypeScript style guide"));
});

test("buildRulesBlock renders multiple matching rules", () => {
  const rules: Rule[] = [
    {
      id: "rule-1",
      globs: ["src/**/*.ts"],
      alwaysApply: false,
      description: "Source TypeScript rule",
      body: "Source rules"
    },
    {
      id: "rule-2",
      globs: ["tests/**/*.ts"],
      alwaysApply: false,
      description: "Test TypeScript rule",
      body: "Test rules"
    }
  ];
  const result = buildRulesBlock(rules, ["src/**/*.ts", "tests/**/*.ts"]);
  assert.ok(result.includes("rule-1"));
  assert.ok(result.includes("rule-2"));
  assert.ok(result.includes("Source TypeScript rule"));
  assert.ok(result.includes("Test TypeScript rule"));
});

test("buildRulesBlock includes both alwaysApply and glob-matching rules", () => {
  const rules: Rule[] = [
    {
      id: "always-rule",
      globs: [],
      alwaysApply: true,
      description: "Always apply",
      body: "Always body"
    },
    {
      id: "glob-rule",
      globs: ["**/*.ts"],
      alwaysApply: false,
      description: "Glob match",
      body: "Glob body"
    }
  ];
  const result = buildRulesBlock(rules, ["src/**/*.ts"]);
  assert.ok(result.includes("always-rule"));
  assert.ok(result.includes("glob-rule"));
});

test("buildRulesBlock returns empty string when inScopeGlobs is empty", () => {
  const rules: Rule[] = [
    {
      id: "rule-1",
      globs: ["**/*.ts"],
      alwaysApply: false,
      description: "TypeScript rule",
      body: "Body"
    }
  ];
  const result = buildRulesBlock(rules, []);
  assert.equal(result, "");
});

test("buildRulesBlock skips rule description when empty", () => {
  const rules: Rule[] = [
    {
      id: "rule-no-desc",
      globs: ["**/*.ts"],
      alwaysApply: false,
      description: "",
      body: "Rule body content"
    }
  ];
  const result = buildRulesBlock(rules, ["src/**/*.ts"]);
  assert.ok(result.includes("## Auto-attached rules"));
  assert.ok(result.includes("Rule body content"));
  assert.ok(!result.includes("### rule-no-desc"));
});

test("buildRulesBlock handles rules with globs that match by pattern", () => {
  const rules: Rule[] = [
    {
      id: "docs-rule",
      globs: ["docs/**/*.md"],
      alwaysApply: false,
      description: "Documentation rule",
      body: "Documentation guidelines"
    }
  ];
  const result = buildRulesBlock(rules, ["docs/sop/*.md"]);
  assert.ok(result.includes("docs-rule"));
});

test("buildRulesBlock returns empty string for non-array rules", () => {
  const result = buildRulesBlock(null as any, ["**/*.ts"]);
  assert.equal(result, "");
});

test("buildRulesBlock returns empty string for non-array inScopeGlobs (converts gracefully)", () => {
  const rules = [
    {
      id: "rule-1",
      globs: ["**/*.ts"],
      alwaysApply: false,
      description: "Test",
      body: "Body"
    }
  ];
  const result = buildRulesBlock(rules, null as any);
  assert.equal(result, "");
});

test("buildRulesBlock: rule with empty-string glob does not match any inScopeGlob", () => {
  const rules: Rule[] = [
    {
      id: "empty-glob-rule",
      globs: [""],
      alwaysApply: false,
      description: "Empty glob rule",
      body: "Should not appear"
    }
  ];
  const result = buildRulesBlock(rules, ["src/**/*.ts", "**/*.md", "anything"]);
  assert.equal(result, "");
});

test("buildTokens includes rulesBlock when passed in extras", () => {
  const config = { productName: "Test Product" };
  const rulesBlock = "## Auto-attached rules\n\n### my-rule\n\nBody";
  const tokens = buildTokens(config, { rulesBlock });
  assert.equal(tokens.rulesBlock, rulesBlock);
});

test("buildTokens rulesBlock defaults to empty string when extras omitted", () => {
  const config = { productName: "Test Product" };
  const tokens = buildTokens(config);
  assert.equal(tokens.rulesBlock, "");
});

test("buildTokens rulesBlock defaults to empty string when extras is empty object", () => {
  const config = { productName: "Test Product" };
  const tokens = buildTokens(config, {});
  assert.equal(tokens.rulesBlock, "");
});

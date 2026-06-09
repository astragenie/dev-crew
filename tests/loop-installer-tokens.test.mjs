import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { buildSkillActivationBlock, buildTokens } from "../scripts/lib/loop-installer-tokens.mjs";
async function tmpDir(prefix) {
    return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
test("buildSkillActivationBlock with empty directory returns empty string", async () => {
    const skillsDir = await tmpDir("skill-test-empty-");
    try {
        const result = await buildSkillActivationBlock(skillsDir);
        assert.equal(result, "");
    }
    finally {
        await fs.rm(skillsDir, { recursive: true });
    }
});
test("buildSkillActivationBlock with no conditional skills returns empty string", async () => {
    const skillsDir = await tmpDir("skill-test-no-conditional-");
    try {
        // Create a skill with always_on trigger
        const skillDir = path.join(skillsDir, "always-skill");
        await fs.mkdir(skillDir, { recursive: true });
        await fs.writeFile(path.join(skillDir, "SKILL.md"), `---
name: always-skill
description: Always on skill
trigger: always_on
---

# Always On Skill`);
        const result = await buildSkillActivationBlock(skillsDir);
        assert.equal(result, "");
    }
    finally {
        await fs.rm(skillsDir, { recursive: true });
    }
});
test("buildSkillActivationBlock with manual trigger skill renders activation note", async () => {
    const skillsDir = await tmpDir("skill-test-manual-");
    try {
        const skillDir = path.join(skillsDir, "manual-skill");
        await fs.mkdir(skillDir, { recursive: true });
        await fs.writeFile(path.join(skillDir, "SKILL.md"), `---
name: test:manual-skill
description: A manually invoked skill
trigger: manual
---

# Manual Skill`);
        const result = await buildSkillActivationBlock(skillsDir);
        assert.ok(result.includes("## Conditional skill activation"));
        assert.ok(result.includes("**test:manual-skill**"));
        assert.ok(result.includes("only when the user explicitly requests it"));
    }
    finally {
        await fs.rm(skillsDir, { recursive: true });
    }
});
test("buildSkillActivationBlock with glob trigger and patterns renders pattern instruction", async () => {
    const skillsDir = await tmpDir("skill-test-glob-");
    try {
        const skillDir = path.join(skillsDir, "glob-skill");
        await fs.mkdir(skillDir, { recursive: true });
        await fs.writeFile(path.join(skillDir, "SKILL.md"), `---
name: test:glob-skill
description: A glob-based skill
trigger: glob
globs:
  - "**/*.test.ts"
  - "**/*.spec.ts"
---

# Glob Skill`);
        const result = await buildSkillActivationBlock(skillsDir);
        assert.ok(result.includes("## Conditional skill activation"));
        assert.ok(result.includes("**test:glob-skill**"));
        assert.ok(result.includes("**/*.test.ts"));
        assert.ok(result.includes("**/*.spec.ts"));
        assert.ok(result.includes("activate when files match"));
    }
    finally {
        await fs.rm(skillsDir, { recursive: true });
    }
});
test("buildSkillActivationBlock with mixed triggers filters correctly", async () => {
    const skillsDir = await tmpDir("skill-test-mixed-");
    try {
        // Create always_on skill
        let skillDir = path.join(skillsDir, "always-skill");
        await fs.mkdir(skillDir, { recursive: true });
        await fs.writeFile(path.join(skillDir, "SKILL.md"), `---
name: always-skill
trigger: always_on
---

# Always On`);
        // Create manual skill
        skillDir = path.join(skillsDir, "manual-skill");
        await fs.mkdir(skillDir, { recursive: true });
        await fs.writeFile(path.join(skillDir, "SKILL.md"), `---
name: manual-skill
trigger: manual
---

# Manual`);
        // Create glob skill
        skillDir = path.join(skillsDir, "glob-skill");
        await fs.mkdir(skillDir, { recursive: true });
        await fs.writeFile(path.join(skillDir, "SKILL.md"), `---
name: glob-skill
trigger: glob
globs: ["src/**"]
---

# Glob`);
        const result = await buildSkillActivationBlock(skillsDir);
        assert.ok(result.includes("**manual-skill**"));
        assert.ok(result.includes("**glob-skill**"));
        assert.ok(!result.includes("always-skill"), "always_on skills should not appear");
    }
    finally {
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

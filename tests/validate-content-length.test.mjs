import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateContentLength, AGENT_MAX_LINES, SKILL_MAX_LINES, AGENT_SKIP_PATHS } from "../scripts/validate-content-length.mjs";
async function mkTmp() {
    return await fs.mkdtemp(path.join(os.tmpdir(), "loop-len-"));
}
async function writeFile(root, rel, content) {
    const full = path.join(root, rel);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, content, "utf8");
}
function nLines(n) {
    // n lines = n "\n" chars (wc -l semantics).
    return "x\n".repeat(n);
}
test("ok when no agents/ or skills/ directories exist", async () => {
    const root = await mkTmp();
    const res = await validateContentLength(root);
    assert.equal(res.ok, true);
    assert.equal(res.failures.length, 0);
    assert.equal(res.checks.length, 0);
});
test("ok when all agents and skills are under caps", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/pm.md", nLines(100));
    await writeFile(root, "agents/3rdparty/foo.md", nLines(50));
    await writeFile(root, "skills/x/SKILL.md", nLines(150));
    await writeFile(root, "skills/nested/y/SKILL.md", nLines(80));
    const res = await validateContentLength(root);
    assert.equal(res.ok, true);
    assert.equal(res.failures.length, 0);
    assert.equal(res.checks.length, 4);
});
test("fails when agent exceeds 300 line cap", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/too-long.md", nLines(301));
    const res = await validateContentLength(root);
    assert.equal(res.ok, false);
    assert.equal(res.failures.length, 1);
    assert.match(res.failures[0], /agents\/too-long\.md: 301 lines exceeds agent cap of 300/);
});
test("fails when SKILL.md exceeds 200 line cap", async () => {
    const root = await mkTmp();
    await writeFile(root, "skills/big/SKILL.md", nLines(201));
    const res = await validateContentLength(root);
    assert.equal(res.ok, false);
    assert.equal(res.failures.length, 1);
    assert.match(res.failures[0], /skills\/big\/SKILL\.md: 201 lines exceeds skill cap of 200/);
});
test("exact cap value passes (boundary)", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/edge.md", nLines(300));
    await writeFile(root, "skills/edge/SKILL.md", nLines(200));
    const res = await validateContentLength(root);
    assert.equal(res.ok, true);
});
test("ignores non-SKILL.md files inside skills/ tree", async () => {
    const root = await mkTmp();
    await writeFile(root, "skills/x/SKILL.md", nLines(50));
    await writeFile(root, "skills/x/references/giant.md", nLines(5000));
    const res = await validateContentLength(root);
    assert.equal(res.ok, true);
    assert.equal(res.checks.length, 1);
});
test("supports limit overrides via opts", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/foo.md", nLines(50));
    await writeFile(root, "skills/foo/SKILL.md", nLines(50));
    const strict = await validateContentLength(root, { agentMax: 10, skillMax: 10 });
    assert.equal(strict.ok, false);
    assert.equal(strict.failures.length, 2);
    const lenient = await validateContentLength(root, { agentMax: 1000, skillMax: 1000 });
    assert.equal(lenient.ok, true);
});
test("empty file counts as 0 lines and passes", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/empty.md", "");
    await writeFile(root, "skills/empty/SKILL.md", "");
    const res = await validateContentLength(root);
    assert.equal(res.ok, true);
    const agentCheck = res.checks.find((c) => c.path.endsWith("empty.md") && c.kind === "agent");
    const skillCheck = res.checks.find((c) => c.kind === "skill");
    assert.equal(agentCheck.lines, 0);
    assert.equal(skillCheck.lines, 0);
});
test("default caps are 300 / 200", () => {
    assert.equal(AGENT_MAX_LINES, 300);
    assert.equal(SKILL_MAX_LINES, 200);
});
test("agents/3rdparty/ is exempt from the cap by default", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/pm.md", nLines(50));
    await writeFile(root, "agents/3rdparty/huge.md", nLines(2000));
    const res = await validateContentLength(root);
    assert.equal(res.ok, true);
    const huge = res.checks.find((c) => c.path === "agents/3rdparty/huge.md");
    assert.equal(huge.exempt, true);
});
test("exempt files still appear in checks (visible, not failing)", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/3rdparty/vendored.md", nLines(999));
    const res = await validateContentLength(root);
    assert.equal(res.ok, true);
    assert.equal(res.failures.length, 0);
    assert.equal(res.checks.length, 1);
    assert.equal(res.checks[0].lines, 999);
    assert.equal(res.checks[0].exempt, true);
});
test("owned agents still enforce cap even when exempt path holds a giant file", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/owned.md", nLines(301));
    await writeFile(root, "agents/3rdparty/vendored.md", nLines(5000));
    const res = await validateContentLength(root);
    assert.equal(res.ok, false);
    assert.equal(res.failures.length, 1);
    assert.match(res.failures[0], /agents\/owned\.md: 301 lines/);
});
test("agentSkipPaths opt overrides default exemption list", async () => {
    const root = await mkTmp();
    await writeFile(root, "agents/3rdparty/big.md", nLines(500));
    // Empty skip list => cap applies to all agents/**/*.md.
    const strict = await validateContentLength(root, { agentSkipPaths: [] });
    assert.equal(strict.ok, false);
    assert.match(strict.failures[0], /agents\/3rdparty\/big\.md: 500 lines/);
    // Custom skip list can shield any subtree.
    const custom = await validateContentLength(root, {
        agentSkipPaths: ["agents/3rdparty/"]
    });
    assert.equal(custom.ok, true);
});
test("default AGENT_SKIP_PATHS lists agents/3rdparty/", () => {
    assert.ok(AGENT_SKIP_PATHS.includes("agents/3rdparty/"));
});

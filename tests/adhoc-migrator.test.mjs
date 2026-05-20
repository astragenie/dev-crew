import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseCommandLine, migrateAdhocInstall } from "../scripts/lib/adhoc-migrator.mjs";

async function tmpRepo(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("parseCommandLine splits a simple invocation", () => {
  const parsed = parseCommandLine("dotnet build foo.slnx -c Release");
  assert.deepEqual(parsed, { cmd: "dotnet", args: ["build", "foo.slnx", "-c", "Release"] });
});

test("parseCommandLine respects double quotes for paths with spaces", () => {
  const parsed = parseCommandLine('dotnet test "C:/work/My Solution.slnx" -c Release');
  assert.deepEqual(parsed, { cmd: "dotnet", args: ["test", "C:/work/My Solution.slnx", "-c", "Release"] });
});

test("parseCommandLine returns null for empty input", () => {
  assert.equal(parseCommandLine(""), null);
  assert.equal(parseCommandLine("   "), null);
});

test("migrateAdhocInstall is a no-op when CLAUDE.md has no ad-hoc block", async () => {
  const repo = await tmpRepo("al-migrate-noop-");
  await fs.writeFile(path.join(repo, "CLAUDE.md"), "# Repo\n\nNothing loop-related here.\n");
  const result = await migrateAdhocInstall(repo);
  assert.equal(result.claudeMdRewritten, false);
  assert.equal(result.extractedConfig, null);
});

test("migrateAdhocInstall extracts phase-gate commands + strips ad-hoc block", async () => {
  const repo = await tmpRepo("al-migrate-extract-");
  await fs.writeFile(path.join(repo, "CLAUDE.md"), `# CLAUDE.md

Some intro content.

## Autonomous Loop Instruction — HARD RULE

**Run autonomously until ...**

**Cross-Slice Continuation — HARD RULE: After all ... \`docs/ai-loop/backlog/approved-slices.md\` ... \`docs/ai-loop/slices/pending/\` ...**

**Phase Completion Gate — HARD RULE: When a phase completes:**
1. **C# regression** — \`dotnet build mysolution.slnx -c Release\` then \`dotnet test mysolution.slnx -c Release\`.
2. **Python regression** — \`pytest tests/\` from each agent.
3. **Frontend build** — \`npm run build\` in frontend dir.
4. **Terraform plan** — \`terraform plan\` in infra/envs/dev.
5. Write phase-gate report under .claude/artifacts/crew/validations/.

---

## First Action — Starting the Loop

1. Read MASTER_PROMPT.md
2. Pick highest-priority PENDING slice

---

## Other content that should remain

This section must survive migration.
`);

  const result = await migrateAdhocInstall(repo);
  assert.equal(result.claudeMdRewritten, true);
  assert.ok(result.extractedConfig, "should have extracted commands into a config");
  assert.ok(result.extractedConfig.stack.build.some((c) => c.cmd === "dotnet" && c.args[0] === "build"));
  assert.ok(result.extractedConfig.stack.test.some((c) => c.cmd === "pytest" || (c.cmd === "dotnet" && c.args[0] === "test")));

  const newContent = await fs.readFile(path.join(repo, "CLAUDE.md"), "utf8");
  assert.ok(!newContent.includes("Autonomous Loop Instruction — HARD RULE"), "ad-hoc Autonomous Loop block should be removed");
  assert.ok(!newContent.includes("First Action — Starting the Loop"), "ad-hoc First Action block should be removed");
  assert.ok(newContent.includes("## Other content that should remain"), "unrelated content must be preserved");
  assert.ok(newContent.includes("Some intro content."), "content before the ad-hoc block must be preserved");
});

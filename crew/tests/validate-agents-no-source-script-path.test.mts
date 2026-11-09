// tests/validate-agents-no-source-script-path.test.mts — FEAT-037 SLICE-58
//
// Fixture coverage for the new `no-source-script-path` rule in
// validate-agents.mts: agents/*.md (excluding agents/3rdparty/, which this
// script never scans — enumerateAgents is one-level-only) must not
// reintroduce an invocation-form reference to one of the five legacy
// source-script entry points FEAT-026/FEAT-037 moved to dist/ bundles.
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateAgents } from "../scripts/validate-agents.mjs";

async function makeAgentsDir(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "validate-agents-no-source-path-"));
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(root, name), content, "utf8");
  }
  return root;
}

const FRONTMATTER = `---
name: builder
prompt_id: builder
version: 1.0.0
description: Implementation specialist.
model: sonnet
---

You are the builder on a Claude Code engineering team.

TaskUpdate batching: never run >=3 back-to-back without intervening work.
Coalesce Bash calls: chain related data-collection commands.

## Report contract

Write your handoff via write-handoff.
`;

test("real tree: validateAgents() passes clean (no live no-source-script-path violations)", async () => {
  const result = await validateAgents();
  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
});

test("no-source-script-path: a standalone `bun crew/scripts/crew.mts ...` invocation fails, naming file and line", async () => {
  const invocationLine = '2. `bun crew/scripts/crew.mts audit --repo "$PWD"`';
  const body = `${FRONTMATTER}\n1. First run the audit:\n${invocationLine}\n`;
  const root = await makeAgentsDir({ "builder.md": body });
  const result = await validateAgents(root);
  expect(result.ok).toBe(false);
  const hit = result.errors.find((e) => /no-source-script-path/.test(e));
  expect(
    hit,
    `expected a no-source-script-path error, got: ${result.errors.join("; ")}`
  ).toBeTruthy();
  // AC-4: output must name file and line number — derive the expected line
  // number from the fixture itself so this stays correct if FRONTMATTER grows.
  const expectedLine = body.split("\n").indexOf(invocationLine) + 1;
  expect(hit).toContain(`builder.md:${expectedLine}`);
});

test("no-source-script-path: a fenced bash block invocation of src/scripts/loop.mts fails", async () => {
  const body = `${FRONTMATTER}
\`\`\`bash
bun src/scripts/loop.mts config get loop.marathonRunner --repo "$PWD"
\`\`\`
`;
  const root = await makeAgentsDir({ "builder.md": body });
  const result = await validateAgents(root);
  expect(result.ok).toBe(false);
  const hit = result.errors.find((e) => /no-source-script-path/.test(e));
  expect(
    hit,
    `expected a no-source-script-path error, got: ${result.errors.join("; ")}`
  ).toBeTruthy();
});

test("no-source-script-path: a prose mention of the retired path (not an invocation) passes", async () => {
  const body = `${FRONTMATTER}
## Why no fallback

The regex fallback path (\`bun src/scripts/loop.mts backlog triage\`) was removed 2026-06-11.
`;
  const root = await makeAgentsDir({ "builder.md": body });
  const result = await validateAgents(root);
  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
});

test("no-source-script-path: the correct dist/ form passes", async () => {
  const body = `${FRONTMATTER}
1. \`bun "\${CLAUDE_PLUGIN_ROOT}/dist/crew.js" audit --repo "$PWD"\`
`;
  const root = await makeAgentsDir({ "builder.md": body });
  const result = await validateAgents(root);
  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
});

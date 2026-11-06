// tests/validate-agents-feat-028.test.mts — FEAT-028 AC-3
//
// Fixture coverage for the three validate-agents.mts rule changes this
// FEAT introduced: a brand-new `no-relative-script-path` rule, a brand-new
// `no-prereview-publish` rule (scoped to the four builder-tier agents),
// and a fix to the pre-existing `peer-dispatch` rule's "has Agent tool"
// detection (Codex #6: an ABSENT `tools:` field now defaults to "all
// tools" — including Agent — instead of being treated as "no Agent tool,
// skip the check", which made the rule permanently inert for every real
// agent since none of them declare `tools:` at all).
import { test, expect } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { validateAgents } from "../scripts/validate-agents.mjs";

async function makeAgentsDir(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "validate-agents-feat-028-"));
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(root, name), content, "utf8");
  }
  return root;
}

test("real tree: validateAgents() passes clean (no regressions from the FEAT-028 rule additions)", async () => {
  const result = await validateAgents();
  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
});

test("no-relative-script-path: a `node ./scripts/x.mts` invocation fails naming the rule", async () => {
  const body = `---
name: builder
prompt_id: builder
version: 1.0.0
description: Implementation specialist.
model: sonnet
---

You are the builder on a Claude Code engineering team.

## Report contract

Run \`node ./scripts/x.mts\` before returning.
`;
  const root = await makeAgentsDir({ "builder.md": body });
  const result = await validateAgents(root);
  expect(result.ok).toBe(false);
  expect(
    result.errors.some((e) => /no-relative-script-path/.test(e)),
    `expected a no-relative-script-path error, got: ${result.errors.join("; ")}`
  ).toBeTruthy();
});

test("no-relative-script-path: the \${CLAUDE_PLUGIN_ROOT} form passes", async () => {
  const body = `---
name: builder
prompt_id: builder
version: 1.0.0
description: Implementation specialist.
model: sonnet
---

You are the builder on a Claude Code engineering team.

## Report contract

Run \`bun "\${CLAUDE_PLUGIN_ROOT}/crew/scripts/x.mts"\` before returning.
`;
  const root = await makeAgentsDir({ "builder.md": body });
  const result = await validateAgents(root);
  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
});

test("no-prereview-publish: a builder-tier agent with a bare `gh pr create` fails naming the rule", async () => {
  const body = `---
name: aiplugin-dev
prompt_id: aiplugin-dev
version: 1.0.0
description: Plugin specialist.
model: sonnet
---

You are the aiplugin-dev on a Claude Code engineering team.

## Report contract

Open a PR with \`gh pr create --draft\` before reporting.
`;
  const root = await makeAgentsDir({ "aiplugin-dev.md": body });
  const result = await validateAgents(root);
  expect(result.ok).toBe(false);
  expect(
    result.errors.some((e) => /no-prereview-publish/.test(e)),
    `expected a no-prereview-publish error, got: ${result.errors.join("; ")}`
  ).toBeTruthy();
});

test('no-prereview-publish: the same text inside a "## Ship" section passes', async () => {
  const body = `---
name: aiplugin-dev
prompt_id: aiplugin-dev
version: 1.0.0
description: Plugin specialist.
model: sonnet
---

You are the aiplugin-dev on a Claude Code engineering team.

## Report contract

Return the marker-first block.

## Ship

Open a PR with \`gh pr create --draft\` only after review passes.
`;
  const root = await makeAgentsDir({ "aiplugin-dev.md": body });
  const result = await validateAgents(root);
  expect(result.ok, `unexpected errors: ${result.errors.join("; ")}`).toBe(true);
});

test("peer-dispatch: an allowlisted agent with no tools: field and no Peer dispatch section fails naming the rule", async () => {
  const body = `---
name: qa-expert
prompt_id: qa-expert
version: 1.0.0
description: QA specialist.
model: sonnet
---

You are the qa-expert on a Claude Code engineering team.

## Report contract

Return the marker-first block.
`;
  const root = await makeAgentsDir({ "qa-expert.md": body });
  const result = await validateAgents(root);
  expect(result.ok).toBe(false);
  expect(
    result.errors.some((e) => /peer-dispatch/.test(e)),
    `expected a peer-dispatch error (absent tools: now defaults to Agent-capable), got: ${result.errors.join("; ")}`
  ).toBeTruthy();
});

test("peer-dispatch: the same agent with disallowedTools naming Agent is exempt", async () => {
  const body = `---
name: qa-expert
prompt_id: qa-expert
version: 1.0.0
description: QA specialist.
disallowedTools: [Agent]
model: sonnet
---

You are the qa-expert on a Claude Code engineering team.

## Report contract

Return the marker-first block.
`;
  const root = await makeAgentsDir({ "qa-expert.md": body });
  const result = await validateAgents(root);
  expect(
    result.errors.some((e) => /peer-dispatch/.test(e)),
    `did not expect a peer-dispatch error once disallowedTools names Agent, got: ${result.errors.join("; ")}`
  ).toBeFalsy();
});

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateAgentRefs } from "../scripts/validate-agent-refs.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

async function mkTmp() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-agent-refs-"));
}

async function writeFile(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

test("flags the known phantom crew:builder in dispatch-instruction context", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    ".claude/loop/rules.md",
    "4. **Dispatch `crew:builder` subagent.** Hand it to a `crew:builder` subagent.\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, false);
  const tokens = result.findings.map((f) => f.token);
  assert.ok(
    tokens.includes("crew:builder"),
    `expected crew:builder in findings, got ${tokens.join(", ")}`
  );
});

test("a real crew agent id (crew:fullstack-dev) passes", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    ".claude/loop/rules.md",
    "Dispatch `crew:fullstack-dev` subagent for implementation.\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("a real runner: agent id resolves against the local agents/ directory", async () => {
  const root = await mkTmp();
  await writeFile(root, "agents/architect.md", "# architect\n");
  await writeFile(
    root,
    ".claude/loop/rules.md",
    "Dispatch `runner:architect` subagent for design work.\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("a phantom runner: agent id fails when no matching agent/command/skill exists", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    ".claude/loop/rules.md",
    "Dispatch `runner:ghost-agent` subagent for this step.\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, false);
  const tokens = result.findings.map((f) => f.token);
  assert.ok(tokens.includes("runner:ghost-agent"));
});

test("illustrative mentions outside dispatch-instruction context are not flagged", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "docs/integrations/example.md",
    "namespace prefix stripped, e.g. `crew:builder` -> `builder`, and omitted entirely when unavailable.\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("a negation like 'there is no crew:lead step' is not flagged as a dispatch instruction", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "agents/architect.md",
    "Defer design work. There is no `crew:lead` step in this repo (decommissioned).\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("out-of-scope directories (e.g. docs/audits) are not scanned even with a phantom token", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "docs/audits/2026-01-01-example.md",
    "Dispatch `crew:copywriter` subagent for this step.\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("agents/3rdparty/** is excluded from the scan", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "agents/3rdparty/some-vendored-agent.md",
    "Dispatch `crew:builder` subagent for this step.\n"
  );

  const result = await validateAgentRefs(root);
  assert.equal(result.ok, true);
  assert.equal(result.findings.length, 0);
});

test("the real repo scan is clean after the crew:builder fixes land", async () => {
  const result = await validateAgentRefs(REPO_ROOT);
  assert.equal(
    result.ok,
    true,
    `expected a clean scan, got: ${result.findings.map((f) => `${f.file}:${f.line} "${f.token}"`).join("; ")}`
  );
});

// validate-source-script-path-refs.test.mts — FEAT-037 SLICE-58
//
// Fixture coverage for the commands/*.md + skills/**/SKILL.md +
// templates/** sibling of validate-agents.mts's `no-source-script-path`
// rule. Lives in validate-agent-refs.mts (gate 6) — see that file's
// `findSourceScriptPathRefFindings` for the scan-target rationale.
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { findSourceScriptPathRefFindings } from "../scripts/validate-agent-refs.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Built via concatenation (not a literal) so this fixture's intentional
// `${CLAUDE_PLUGIN_ROOT}` text doesn't trip biome's noTemplateCurlyInString.
const PLUGIN_ROOT_TOKEN = "$" + "{CLAUDE_PLUGIN_ROOT}";

async function mkTmp() {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-source-script-path-refs-"));
}

async function writeFile(root: string, rel: string, content: string) {
  const full = path.join(root, rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf8");
}

test("commands/*.md: a standalone invocation of crew/scripts/crew.mts fails, naming file and line", async () => {
  const root = await mkTmp();
  const invocationLine = '1. `bun crew/scripts/crew.mts audit --repo "$PWD"`';
  await writeFile(root, "commands/adopt.md", `# Adopt\n\n${invocationLine}\n`);

  const findings = await findSourceScriptPathRefFindings(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.file, "commands/adopt.md");
  assert.equal(findings[0]?.line, 3);
  assert.equal(findings[0]?.path, "crew/scripts/crew.mts");
});

test("skills/**/SKILL.md: a fenced invocation of src/scripts/loop.mts fails", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "skills/triage/SKILL.md",
    '# Triage\n\n```bash\nbun src/scripts/loop.mts backlog triage --repo "$PWD"\n```\n'
  );

  const findings = await findSourceScriptPathRefFindings(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.file, "skills/triage/SKILL.md");
  assert.equal(findings[0]?.path, "src/scripts/loop.mts");
});

test("templates/**: a standalone invocation of crew/scripts/report-to-pr.mts fails", async () => {
  const root = await mkTmp();
  const invocationLine = '`bun crew/scripts/report-to-pr.mts --repo "$PWD"`';
  await writeFile(root, "templates/master-prompt.md", `# Master prompt\n\n${invocationLine}\n`);

  const findings = await findSourceScriptPathRefFindings(root);
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.file, "templates/master-prompt.md");
  assert.equal(findings[0]?.path, "crew/scripts/report-to-pr.mts");
});

test("a prose mention of the retired path (not an invocation) passes", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "commands/triage.md",
    "## Why no fallback\n\n" +
      "The regex fallback path (`bun src/scripts/loop.mts backlog triage`) was removed 2026-06-11.\n"
  );

  const findings = await findSourceScriptPathRefFindings(root);
  assert.equal(findings.length, 0);
});

test("the correct dist/ form passes", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "commands/adopt.md",
    `1. \`bun "${PLUGIN_ROOT_TOKEN}/dist/crew.js" audit --repo "$PWD"\`\n`
  );

  const findings = await findSourceScriptPathRefFindings(root);
  assert.equal(findings.length, 0);
});

test("a non-SKILL.md reference doc under skills/ is out of scope (only skills/**/SKILL.md is scanned)", async () => {
  const root = await mkTmp();
  await writeFile(
    root,
    "skills/triage/references/legacy.md",
    '`bun src/scripts/loop.mts backlog triage --repo "$PWD"`\n'
  );

  const findings = await findSourceScriptPathRefFindings(root);
  assert.equal(findings.length, 0);
});

test("agents/*.md is out of scope for this sibling check (owned by validate-agents.mts instead)", async () => {
  const root = await mkTmp();
  await writeFile(root, "agents/builder.md", '`bun crew/scripts/crew.mts audit --repo "$PWD"`\n');

  const findings = await findSourceScriptPathRefFindings(root);
  assert.equal(findings.length, 0);
});

test("real tree: findSourceScriptPathRefFindings() passes clean against the live repo", async () => {
  const findings = await findSourceScriptPathRefFindings(REPO_ROOT);
  assert.equal(
    findings.length,
    0,
    `unexpected live findings: ${findings.map((f) => `${f.file}:${f.line}`).join(", ")}`
  );
});

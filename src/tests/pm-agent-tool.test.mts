// FEAT-195 / SLICE-111 — PM agent gains Agent tool + dispatch-discipline rule.

import fs from "node:fs/promises";
import path from "node:path";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

const PM_MD = path.resolve("agents/pm.md");

async function readPm(): Promise<{ frontmatter: Record<string, any>; body: string }> {
  const raw = await fs.readFile(PM_MD, "utf8");
  return parseFrontmatter(raw);
}

test("agents/pm.md frontmatter tools list includes Agent", async () => {
  const { frontmatter } = await readPm();
  assert.ok(Array.isArray(frontmatter.tools), "tools must be a YAML list");
  assert.ok(
    frontmatter.tools.includes("Agent"),
    `tools must include "Agent" (got ${JSON.stringify(frontmatter.tools)})`
  );
});

// FEAT-198 / SLICE-113 — ToolSearch grant so PM can load the deferred Agent.

test("agents/pm.md frontmatter tools list includes ToolSearch (FEAT-198)", async () => {
  const { frontmatter } = await readPm();
  assert.ok(
    frontmatter.tools.includes("ToolSearch"),
    `tools must include "ToolSearch" so PM can load deferred Agent (got ${JSON.stringify(frontmatter.tools)})`
  );
});

// FEAT-199 / SLICE-114 — model + maxTurns required for deferred Agent surfacing.

test("agents/pm.md frontmatter declares model: opus (FEAT-199)", async () => {
  const { frontmatter } = await readPm();
  assert.equal(
    frontmatter.model,
    "opus",
    `frontmatter must declare model: opus for deferred-tool surfacing (got ${JSON.stringify(frontmatter.model)})`
  );
});

test("agents/pm.md frontmatter declares maxTurns >= 30 (FEAT-199)", async () => {
  const { frontmatter } = await readPm();
  assert.ok(
    typeof frontmatter.maxTurns === "number" && frontmatter.maxTurns >= 30,
    `frontmatter must declare maxTurns >= 30 (got ${JSON.stringify(frontmatter.maxTurns)})`
  );
});

test("agents/pm.md frontmatter description reflects inline AC drafting capability (FEAT-277)", async () => {
  const { frontmatter } = await readPm();
  assert.match(
    frontmatter.description,
    /Read.only on disk|Read.mostly|inline|Given.When.Then|drafts? ACs/i,
    "description must reflect the inline AC drafting capability"
  );
  // The legacy unqualified "Read-only — no code edits" claim must be gone.
  assert.doesNotMatch(
    frontmatter.description,
    /Read.only — no code edits/i,
    "stale 'Read-only — no code edits' wording must be removed"
  );
});

test("agents/pm.md body documents inline AC + SPEC drafting (FEAT-277)", async () => {
  const { body } = await readPm();
  assert.match(
    body,
    /Inline AC \+ SPEC drafting|inline AC|inline drafting/i,
    "body must include the inline AC + SPEC drafting section"
  );
  assert.match(
    body,
    /Given.{0,3}When.{0,3}Then/i,
    "body must mandate Given-When-Then format for ACs"
  );
  // PM must no longer dispatch spec-writer as an active sub-agent.
  assert.doesNotMatch(
    body,
    /Dispatch.*spec-writer|spec-writer.*via.*Agent|fan out.*spec-writer/i,
    "body must not list spec-writer as a live dispatch target (only historical / explanatory mentions allowed)"
  );
});

// FEAT-196 / SLICE-112 test removed v0.43.7 — body prose collapsed; tool grants in
// frontmatter remain authoritative (tests at lines 17 and 28). Operator decided the
// tool/deferred-surface explanation in agent body was confusing PM more than helping.

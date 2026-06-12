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

test("agents/pm.md frontmatter description no longer claims read-only without qualification", async () => {
  const { frontmatter } = await readPm();
  assert.match(
    frontmatter.description,
    /Read.only on disk|Read.mostly|dispatches loop:spec-writer/i,
    "description must reflect the new dispatch capability"
  );
  // The legacy unqualified "Read-only — no code edits" claim must be gone.
  assert.doesNotMatch(
    frontmatter.description,
    /Read.only — no code edits/i,
    "stale 'Read-only — no code edits' wording must be removed"
  );
});

test("agents/pm.md body restricts PM's Agent dispatch scope to loop:spec-writer", async () => {
  const { body } = await readPm();
  assert.match(
    body,
    /Dispatch discipline/i,
    "body must include an explicit dispatch-discipline section"
  );
  assert.match(
    body,
    /loop:spec-writer/,
    "body must name loop:spec-writer as the only allowed inline dispatch"
  );
  // The rule must call out that other in-turn dispatches are a violation.
  assert.match(
    body,
    /discipline violation|MUST NOT|only allowed|do NOT dispatch other/i,
    "body must call other in-turn Agent dispatches a discipline violation"
  );
});

test("agents/pm.md still references the retriage gate that motivates the Agent grant", async () => {
  const { body } = await readPm();
  assert.match(
    body,
    /\/loop:retriage|retriage gate/i,
    "body must cite the /loop:retriage gate so future readers understand the Agent grant"
  );
});

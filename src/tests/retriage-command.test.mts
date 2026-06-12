// FEAT-193 / SLICE-109 — /loop:retriage slash command contract.
// Pins intent (anchors on AC-clarity gate language + 7-step flow + needs-review
// escalation + back-compat reference to /loop:triage). Avoids exact prose to
// stay durable across future copy-edits.

import fs from "node:fs/promises";
import path from "node:path";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

const RETRIAGE_MD = path.resolve("commands/retriage.md");

async function readRetriage(): Promise<{ frontmatter: Record<string, any>; body: string }> {
  const raw = await fs.readFile(RETRIAGE_MD, "utf8");
  return parseFrontmatter(raw);
}

test("commands/retriage.md exists with non-empty pre-flight description", async () => {
  const { frontmatter } = await readRetriage();
  assert.ok(
    typeof frontmatter.description === "string" && frontmatter.description.length > 0,
    "retriage.md must have a non-empty description frontmatter"
  );
  assert.match(
    frontmatter.description,
    /AC.clarity|spec.writer|pre.flight/i,
    "description must reference the AC-clarity gate or spec-writer pre-flight"
  );
  assert.match(
    frontmatter.description,
    /PM|scor/i,
    "description must reference PM scoring"
  );
});

test("retriage.md documents the 7-step AC-clarity gate flow", async () => {
  const { body } = await readRetriage();
  // The body must reference the key gate phases by intent — pin anchors,
  // not exact wording so copy-edits don't false-fail.
  assert.match(body, /AC.clarity/i, "body must label the AC-clarity gate");
  assert.match(
    body,
    /loop:spec-writer/,
    "body must name the loop:spec-writer agent that PM dispatches"
  );
  assert.match(
    body,
    /re.read|re-read/i,
    "body must require PM to re-read the FEAT body after spec-writer returns"
  );
  assert.match(body, /score/i, "body must instruct PM to score after the pre-flight");
  assert.match(
    body,
    /Given.When.Then/i,
    "body must instruct spec-writer to rewrite AC in Given-When-Then form"
  );
});

test("retriage.md documents the failure-escalation rule", async () => {
  const { body } = await readRetriage();
  assert.match(
    body,
    /needs.review/i,
    "body must mention the needs-review escalation"
  );
  assert.match(
    body,
    /scopeNotes/,
    "body must require PM to explain the needs-review verdict in scopeNotes"
  );
  assert.match(
    body,
    /spec.writer.*fail|fail.*spec.writer/i,
    "body must describe what counts as a spec-writer dispatch failure"
  );
});

test("retriage.md references /loop:triage as the unchanged legacy/cheap path", async () => {
  const { body } = await readRetriage();
  assert.match(
    body,
    /\/loop:triage/,
    "body must cite /loop:triage as the back-compat / cheaper alternative"
  );
});

test("retriage.md documents the acClarity field in the return contract", async () => {
  const { body } = await readRetriage();
  assert.match(
    body,
    /acClarity/,
    "body must document the new acClarity field on the PM result contract"
  );
  assert.match(
    body,
    /rewrite/i,
    "body must describe the rewrite boolean"
  );
});

// FEAT-189 / SLICE-103 — `/loop:intake` slash command contract.
// Verifies the file exists, has frontmatter `description:`, documents both
// phases, the decline filter, and the legacy commands as the back-compat
// path. Pins INTENT (anchors on phase + filter language), not exact prose.

import fs from "node:fs/promises";
import path from "node:path";
import { test } from "bun:test";
import { strict as assert } from "node:assert";

import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";

const INTAKE_MD = path.resolve("commands/intake.md");

async function readIntake(): Promise<{ frontmatter: Record<string, any>; body: string }> {
  const raw = await fs.readFile(INTAKE_MD, "utf8");
  return parseFrontmatter(raw);
}

test("commands/intake.md exists with non-empty description frontmatter", async () => {
  const { frontmatter } = await readIntake();
  assert.ok(
    typeof frontmatter.description === "string" && frontmatter.description.length > 0,
    "intake.md must have a non-empty description frontmatter"
  );
  // Frontmatter description must mention both phases so /help output is clear.
  assert.match(
    frontmatter.description,
    /PM|triage/i,
    "description must mention the PM/triage phase"
  );
  assert.match(
    frontmatter.description,
    /architect|enrich/i,
    "description must mention the architect/enrich phase"
  );
});

test("intake.md documents phase ordering (PM-must-finish-before-architect)", async () => {
  const { body } = await readIntake();
  assert.match(body, /Phase 1/i, "body must label Phase 1");
  assert.match(body, /Phase 2/i, "body must label Phase 2");
  // PM-halt-skips-architect rule must be present in some form.
  assert.match(
    body,
    /STOP|stop\.\s|do NOT proceed|halt.*before|do not proceed/i,
    "body must enforce PM-halt-skips-architect ordering"
  );
});

test("intake.md documents decline filter for P4 composite_priority", async () => {
  const { body } = await readIntake();
  assert.match(body, /composite_priority/, "body must reference composite_priority");
  assert.match(body, /"P4"|`P4`|\bP4\b/, "body must mention the literal P4 priority");
  assert.match(
    body,
    /declined|skip|skipped/i,
    "body must describe declined FEATs being skipped"
  );
});

test("intake.md references the legacy commands for back-compat", async () => {
  const { body } = await readIntake();
  assert.match(
    body,
    /commands\/triage\.md|\/loop:triage/,
    "body must reference the legacy /loop:triage path"
  );
  assert.match(
    body,
    /commands\/backlog-enrich\.md|\/loop:backlog-enrich/,
    "body must reference the legacy /loop:backlog-enrich path"
  );
});

test("intake.md describes the final summary contract", async () => {
  const { body } = await readIntake();
  // Final summary should mention the counts so the orchestrating agent knows
  // exactly what to print.
  assert.match(body, /triaged/, "summary must report triaged count");
  assert.match(body, /declined/, "summary must report declined count");
  assert.match(
    body,
    /architect_classified|classified/,
    "summary must report architect-classified count"
  );
});

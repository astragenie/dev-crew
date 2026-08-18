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

// Denylist migration: cherry-picking Skill/ToolSearch/MCP tool names into an
// explicit `tools:` allowlist does not work — the harness silently drops
// those special tools on dispatch. The working pattern (proven by
// crew:reviewer, then agents/architect.md) is a denylist: no `tools:`
// allowlist at all, plus `disallowedTools:` for what the agent must never
// do. Agent + ToolSearch (and Skill + MCP) then inherit automatically.

test("agents/pm.md frontmatter declares no tools allowlist (denylist pattern)", async () => {
  const { frontmatter } = await readPm();
  assert.equal(
    frontmatter.tools,
    undefined,
    `agents/pm.md must not declare a "tools:" allowlist — Agent/ToolSearch/Skill/MCP tools must inherit via the denylist pattern instead (got ${JSON.stringify(frontmatter.tools)})`
  );
});

// FEAT-198 / SLICE-113 — ToolSearch grant so PM can load the deferred Agent.
// Superseded by the denylist migration: Agent/ToolSearch now inherit by
// default (no allowlist above) — this test asserts disallowedTools doesn't
// claw either of them back.

test("agents/pm.md disallowedTools does not deny Agent or ToolSearch (FEAT-198)", async () => {
  const { frontmatter } = await readPm();
  const denied =
    typeof frontmatter.disallowedTools === "string"
      ? frontmatter.disallowedTools.split(",").map((s: string) => s.trim())
      : [];
  assert.ok(
    !denied.includes("Agent") && !denied.includes("ToolSearch"),
    `disallowedTools must not deny Agent or ToolSearch, both must inherit (got ${JSON.stringify(frontmatter.disallowedTools)})`
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

// FEAT-264 / SLICE-1 (AC-1) — PM emits Given-When-Then ACs for EVERY triaged
// FEAT, dropping the former P0/P1-only gate. PM runs as a dispatched Agent()
// with no live-output harness here, so — following this file's established
// pattern (see the two tests above) — the assertion targets the prompt
// contract text in agents/pm.md itself, the artifact pm-apply and the
// operator actually rely on.

test("agents/pm.md drops the P0/P1-only AC gate — a P3-scored FEAT fixture must still get ACs (FEAT-264 AC-1)", async () => {
  const { body } = await readPm();

  // The old caller-enforced table gated ACs behind P0/P1 or --deep/--spec.
  // That exact gating language must be gone.
  assert.doesNotMatch(
    body,
    /Do NOT write ACs for P2\/P3\/P4/i,
    "the former P0/P1-only AC gate ('Do NOT write ACs for P2/P3/P4...') must be removed"
  );
  assert.doesNotMatch(
    body,
    /Priority P2\/P3\/P4, no flags\s*\|\s*No/,
    "the old 'no ACs for P2/P3/P4 without flags' scope-table row must not survive"
  );

  // The new unconditional contract must be present.
  assert.match(
    body,
    /every triaged FEAT/i,
    "body must state ACs are written for every triaged FEAT regardless of priority"
  );

  // Simulate a P3-scored FEAT fixture with no --deep/--spec flag — exactly
  // the case the old gate excluded (FEAT-264 AC-1's named evidence bar).
  // The scope table's only row resolving "No" for acs must be scoped to
  // --spec, never to a bare priority value like P3.
  const p3Fixture = { featureId: "FEAT-999", compositePriority: "P3", flags: [] as string[] };
  const scopeStart = body.indexOf("AC drafting scope");
  assert.ok(scopeStart >= 0, "body must contain an 'AC drafting scope' section");
  const scopeSection = body.slice(scopeStart);
  assert.match(
    scopeSection,
    /Any priority \(P0.{0,3}P4\), no `--spec`\s*\|\s*Yes/,
    `AC drafting scope table must resolve "Yes" for a no-flag fixture at any priority incl. P3 (fixture: ${JSON.stringify(p3Fixture)})`
  );
});

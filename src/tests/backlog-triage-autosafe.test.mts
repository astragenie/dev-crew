// @ts-nocheck
import test from "node:test";
import assert from "node:assert/strict";

import {
  triageEntry,
  detectAcceptanceCriteria,
  detectLegacySchema,
  migrateLegacyScores
} from "../scripts/lib/backlog-triage.mjs";

// ---------------------------------------------------------------------------
// detectAcceptanceCriteria
// ---------------------------------------------------------------------------

test("detectAcceptanceCriteria: 3 checkbox bullets → count=3, hasMin=true", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: do the thing
- [ ] AC-2: verify it
- [ ] AC-3: confirm done
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 3);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: 3 bare dash bullets → count=3, hasMin=true", () => {
  const body = `
## Acceptance Criteria

- First requirement
- Second requirement
- Third requirement
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 3);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: mixed checkbox and bare bullets → count=4, hasMin=true", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: first
- bare bullet
- [x] AC-3: already done
- [ ] AC-4: last
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 4);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: 2 bullets → count=2, hasMin=false", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: only one
- [ ] AC-2: only two
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 2);
  assert.equal(result.hasMin, false);
});

test("detectAcceptanceCriteria: 0 bullets → count=0, hasMin=false", () => {
  const body = `
## Some other section

No bullets here at all.
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 0);
  assert.equal(result.hasMin, false);
});

test("detectAcceptanceCriteria: stops counting at next ## heading", () => {
  const body = `
## Acceptance criteria

- [ ] AC-1: bullet one
- [ ] AC-2: bullet two

## Out of scope

- [ ] not counted
- [ ] also not counted
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 2);
  assert.equal(result.hasMin, false);
});

test("detectAcceptanceCriteria: heading is case-insensitive", () => {
  const body = `
## ACCEPTANCE CRITERIA

- [ ] AC-1: x
- [ ] AC-2: y
- [ ] AC-3: z
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 3);
  assert.equal(result.hasMin, true);
});

test("detectAcceptanceCriteria: no AC heading → count=0, hasMin=false", () => {
  const body = `
## Description

Some description text.

## Notes

- [ ] note one
- [ ] note two
- [ ] note three
`;
  const result = detectAcceptanceCriteria(body);
  assert.equal(result.count, 0);
  assert.equal(result.hasMin, false);
});

// ---------------------------------------------------------------------------
// detectLegacySchema
// ---------------------------------------------------------------------------

test("detectLegacySchema: old-schema keys → true", () => {
  const fm = {
    id: "FEAT-007",
    pm_strategic_fit: 0.4,
    pm_implementation_confidence: 0.5,
    pm_demand_signal: 0.5,
    pm_risk_level: 0.5,
    pm_customer_impact: 0.45
  };
  assert.equal(detectLegacySchema(fm), true);
});

test("detectLegacySchema: only new-schema keys → false", () => {
  const fm = {
    id: "FEAT-001",
    pm_customer_impact: 0.5,
    pm_effort_estimate: 0.5,
    pm_strategic_alignment: 0.5,
    pm_technical_risk: 0.5,
    pm_dependency_depth: 0.5
  };
  assert.equal(detectLegacySchema(fm), false);
});

test("detectLegacySchema: empty frontmatter → false", () => {
  assert.equal(detectLegacySchema({}), false);
});

test("detectLegacySchema: only pm_strategic_fit present → true", () => {
  assert.equal(detectLegacySchema({ pm_strategic_fit: 0.7 }), true);
});

test("detectLegacySchema: only pm_demand_signal present → true", () => {
  assert.equal(detectLegacySchema({ pm_demand_signal: 0.6 }), true);
});

test("detectLegacySchema: only pm_risk_level present → true", () => {
  assert.equal(detectLegacySchema({ pm_risk_level: 0.3 }), true);
});

test("detectLegacySchema: only pm_implementation_confidence present → true", () => {
  assert.equal(detectLegacySchema({ pm_implementation_confidence: 0.8 }), true);
});

// ---------------------------------------------------------------------------
// migrateLegacyScores
// ---------------------------------------------------------------------------

test("migrateLegacyScores: produces pm_legacy_* keys + default new dimensions", () => {
  const fm = {
    pm_strategic_fit: 0.4,
    pm_implementation_confidence: 0.5,
    pm_demand_signal: 0.6,
    pm_risk_level: 0.3,
    pm_customer_impact: 0.45
  };
  const today = "2026-06-04";
  const result = migrateLegacyScores(fm, today);

  assert.equal(result.legacyKeys.pm_legacy_strategic_fit, 0.4);
  assert.equal(result.legacyKeys.pm_legacy_implementation_confidence, 0.5);
  assert.equal(result.legacyKeys.pm_legacy_demand_signal, 0.6);
  assert.equal(result.legacyKeys.pm_legacy_risk_level, 0.3);
  assert.equal(result.legacyKeys.pm_legacy_customer_impact, 0.45);
});

test("migrateLegacyScores: new dimension scores default to 0.5", () => {
  const fm = {
    pm_strategic_fit: 0.4,
    pm_implementation_confidence: 0.5,
    pm_demand_signal: 0.6,
    pm_risk_level: 0.3,
    pm_customer_impact: 0.45
  };
  const today = "2026-06-04";
  const result = migrateLegacyScores(fm, today);

  assert.equal(result.defaultScores.customer_impact, 0.5);
  assert.equal(result.defaultScores.effort_estimate, 0.5);
  assert.equal(result.defaultScores.strategic_alignment, 0.5);
  assert.equal(result.defaultScores.technical_risk, 0.5);
  assert.equal(result.defaultScores.dependency_depth, 0.5);
});

test("migrateLegacyScores: migration_note contains date and schema info", () => {
  const fm = { pm_strategic_fit: 0.4 };
  const today = "2026-06-04";
  const result = migrateLegacyScores(fm, today);

  assert.ok(result.migrationNote.includes("2026-06-04"), "migration note must include the date");
  assert.ok(
    result.migrationNote.includes("pm_legacy_"),
    "migration note must reference pm_legacy_ prefix"
  );
});

// ---------------------------------------------------------------------------
// triageEntry end-to-end
// ---------------------------------------------------------------------------

test("triageEntry: 3+ AC bullets → autonomous_safe: true", () => {
  const entry = {
    body: `## Acceptance criteria\n\n- [ ] AC-1: x\n- [ ] AC-2: y\n- [ ] AC-3: z\n`,
    frontmatter: {}
  };
  const updates = triageEntry(entry);
  assert.equal(updates.autonomous_safe, true);
});

test("triageEntry: 0 AC bullets + no derived_from → autonomous_safe: false", () => {
  const entry = {
    body: "## Description\n\nJust some description with no acceptance criteria.",
    frontmatter: {}
  };
  const updates = triageEntry(entry);
  assert.equal(updates.autonomous_safe, false);
});

test("triageEntry: 0 AC bullets + derived_from: SPEC-001 → autonomous_safe: true (hasSpec wins)", () => {
  const entry = {
    body: "## Description\n\nNo acceptance criteria here.",
    frontmatter: { derived_from: "SPEC-001" }
  };
  const updates = triageEntry(entry);
  assert.equal(updates.autonomous_safe, true);
});

test("triageEntry: legacy schema frontmatter → pm_legacy_* + migration_note + autonomous_safe + new-dim defaults", () => {
  const entry = {
    body: "## Some feature\n\nOld FEAT body.",
    frontmatter: {
      pm_strategic_fit: 0.4,
      pm_implementation_confidence: 0.5,
      pm_demand_signal: 0.6,
      pm_risk_level: 0.3,
      pm_customer_impact: 0.45
    }
  };
  const updates = triageEntry(entry);

  assert.ok("pm_legacy_strategic_fit" in updates, "should have pm_legacy_strategic_fit");
  assert.equal(updates.pm_legacy_strategic_fit, 0.4);
  assert.ok("pm_legacy_implementation_confidence" in updates);
  assert.ok("pm_legacy_demand_signal" in updates);
  assert.ok("pm_legacy_risk_level" in updates);
  assert.ok("pm_legacy_customer_impact" in updates);

  assert.ok("migration_note" in updates, "should have migration_note");
  assert.ok(typeof updates.migration_note === "string");

  assert.ok("autonomous_safe" in updates, "should have autonomous_safe");
  assert.equal(typeof updates.autonomous_safe, "boolean");

  // New dimension defaults
  assert.equal(updates.pm_customer_impact, 0.5);
  assert.equal(updates.pm_effort_estimate, 0.5);
  assert.equal(updates.pm_strategic_alignment, 0.5);
  assert.equal(updates.pm_technical_risk, 0.5);
  assert.equal(updates.pm_dependency_depth, 0.5);
});

test("triageEntry: triage_notes includes heuristic explanation", () => {
  const entry = {
    body: `## Acceptance criteria\n\n- [ ] AC-1: x\n- [ ] AC-2: y\n- [ ] AC-3: z\n`,
    frontmatter: {}
  };
  const updates = triageEntry(entry);
  assert.ok(typeof updates.triage_notes === "string", "triage_notes must be a string");
  assert.ok(
    updates.triage_notes.includes("autonomous_safe inferred"),
    `triage_notes should include 'autonomous_safe inferred', got: ${updates.triage_notes}`
  );
});

test("triageEntry: triage_notes includes heuristic explanation when false", () => {
  const entry = {
    body: "No AC here.",
    frontmatter: {}
  };
  const updates = triageEntry(entry);
  assert.ok(
    updates.triage_notes.includes("autonomous_safe inferred"),
    `triage_notes should include 'autonomous_safe inferred', got: ${updates.triage_notes}`
  );
});

test("triageEntry: 2 AC bullets (below threshold) + no SPEC → autonomous_safe: false", () => {
  const entry = {
    body: `## Acceptance criteria\n\n- [ ] AC-1: only one\n- [ ] AC-2: only two\n`,
    frontmatter: {}
  };
  const updates = triageEntry(entry);
  assert.equal(updates.autonomous_safe, false);
});

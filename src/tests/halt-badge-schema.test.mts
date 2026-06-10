// Schema regression test for halt-badges (FEAT-066 / SLICE-62).
//
// Enforces the SPEC-003 three-way contract:
//   1. HALT_BADGES (FEAT-065 / src/scripts/lib/halt-badges.mts)
//   2. docs/halt-badges.md (FEAT-063 / registry doc)
//   3. assembleStopResult snapshot keys (src/scripts/lib/stop-conditions.mts)
//
// All three must agree on which field names are halt-badges. Drift in any
// direction fails the test, naming the exact fix required.

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { HALT_BADGES } from "../scripts/lib/halt-badges.mjs";
import { checkStopConditions } from "../scripts/lib/stop-conditions.mjs";

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), "..");
const HALT_BADGES_DOC = path.join(REPO_ROOT, "docs", "halt-badges.md");

// Bookkeeping fields that legitimately appear under snapshot.* but are NOT
// halt-badges (they expose loop telemetry, not gate state). When a future
// FEAT adds another bookkeeping field, add it here in the same slice that
// introduces it.
const SNAPSHOT_BOOKKEEPING_ALLOWLIST = new Set([
  "pendingOrTriaged",
  "inProgress",
  "approvedUndecomposed",
  "totalAlerts",
  "warnAlerts",
  "warnAlertsDemoted",
  "iterationCount",
  "iterationCap",
  "costAlerts",
  "crewBlocked",
  "crewEscalated",
  "autoMode",
  "marathonMode"
]);

// ---------------------------------------------------------------------------

test("schema: every HALT_BADGES field has a `### snapshot.<field>` heading in docs/halt-badges.md", async () => {
  const docContent = await fs.readFile(HALT_BADGES_DOC, "utf8");
  for (const badge of HALT_BADGES) {
    const expectedHeading = `### \`snapshot.${badge.field}\``;
    assert.ok(
      docContent.includes(expectedHeading),
      `HALT_BADGES has field "${badge.field}" but docs/halt-badges.md is missing the "### snapshot.${badge.field}" heading. ` +
        `Add the heading per the existing entries' format, OR remove "${badge.field}" from HALT_BADGES in src/scripts/lib/halt-badges.mts.`
    );
  }
});

test("schema: every `### snapshot.<field>` heading in docs/halt-badges.md has a HALT_BADGES entry", async () => {
  const docContent = await fs.readFile(HALT_BADGES_DOC, "utf8");
  const headingPattern = /^### `snapshot\.([a-zA-Z0-9_]+)`/gm;
  const docFields = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = headingPattern.exec(docContent)) !== null) {
    docFields.add(match[1]!);
  }
  const registryFields = new Set(HALT_BADGES.map((b) => b.field));
  for (const docField of docFields) {
    assert.ok(
      registryFields.has(docField),
      `docs/halt-badges.md documents "### snapshot.${docField}" but HALT_BADGES in src/scripts/lib/halt-badges.mts has no entry for "${docField}". ` +
        `Add the registry entry with a render function, OR remove the heading from docs/halt-badges.md.`
    );
  }
});

test("schema: every snapshot.* field emitted by assembleStopResult is either a HALT_BADGES entry or in the bookkeeping allow-list", async () => {
  // Run stop-check against the loop repo (cwd) so we get a real snapshot shape.
  // We do not care about the values — only the field names present.
  const result = await checkStopConditions(REPO_ROOT, {});
  const snapshot = result?.snapshot ?? {};
  const snapshotFields = Object.keys(snapshot);

  const registryFields = new Set(HALT_BADGES.map((b) => b.field));
  for (const field of snapshotFields) {
    const isHaltBadge = registryFields.has(field);
    const isBookkeeping = SNAPSHOT_BOOKKEEPING_ALLOWLIST.has(field);
    assert.ok(
      isHaltBadge || isBookkeeping,
      `assembleStopResult emits snapshot.${field} but it is neither a HALT_BADGES entry nor in the bookkeeping allow-list. ` +
        `If it's a new halt-badge: add it to HALT_BADGES in src/scripts/lib/halt-badges.mts AND to docs/halt-badges.md. ` +
        `If it's a new bookkeeping field: add it to SNAPSHOT_BOOKKEEPING_ALLOWLIST in src/tests/halt-badge-schema.test.mts.`
    );
  }
});

test("schema: stop-check output has the required top-level shape", async () => {
  const result = await checkStopConditions(REPO_ROOT, {});
  for (const requiredKey of [
    "shouldStop",
    "reasons",
    "blockers",
    "suggestions",
    "iterationCapReached",
    "snapshot"
  ]) {
    assert.ok(
      requiredKey in (result ?? {}),
      `stop-check output is missing required top-level key: ${requiredKey}`
    );
  }
});

test("schema: HALT_BADGES is non-empty (else the registry contract is meaningless)", () => {
  assert.ok(HALT_BADGES.length > 0, "HALT_BADGES must contain at least one registered halt-badge");
});

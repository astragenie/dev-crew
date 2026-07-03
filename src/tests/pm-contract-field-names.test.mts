// FEAT-214 AC-2 — pins the field-name contract between agents/pm.md's
// documented JSON output ("featureId", "demandEvidence") and
// skills/triage/SKILL.md's step-5 validation prose, so a future prompt
// edit to either file can't silently drift the two apart again (the
// SLICE-98 lesson: behavior-changing agent-prompt edits need a grep test
// pinning intent, not just prose).

import fs from "node:fs/promises";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

const PM_MD = path.resolve("agents/pm.md");
const TRIAGE_SKILL_MD = path.resolve("skills/triage/SKILL.md");

test("agents/pm.md output contract emits featureId and demandEvidence", async () => {
  const body = await fs.readFile(PM_MD, "utf8");
  assert.match(body, /"featureId"/, "pm.md output contract must document featureId");
  assert.match(body, /"demandEvidence"/, "pm.md output contract must document demandEvidence");
});

test("skills/triage/SKILL.md step 5 validates result.featureId, not result.id/evidence", async () => {
  const body = await fs.readFile(TRIAGE_SKILL_MD, "utf8");
  assert.match(
    body,
    /result\.featureId/,
    "triage SKILL.md validation must reference result.featureId (matching agents/pm.md)"
  );
  assert.doesNotMatch(
    body,
    /result\.id\b/,
    "triage SKILL.md must not validate the stale result.id field name"
  );
  assert.doesNotMatch(
    body,
    /result\.evidence\b/,
    "triage SKILL.md must not validate the stale result.evidence field name"
  );
});

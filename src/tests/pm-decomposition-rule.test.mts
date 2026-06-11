// FEAT-168 / AC-6 — PM agent prompt teaches decomposition.
// Grep agents/pm.md for the rule binding effort_points >= 8 to
// proposed_slices emission (or "needs-review" escalation).

import { test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";

const PM_MD = path.resolve("agents/pm.md");

test("rule-present-in-pm-md: pm.md mandates proposed_slices when effort_points >= 8", async () => {
  const content = await fs.readFile(PM_MD, "utf8");

  assert.match(
    content,
    /FEAT-168/,
    "pm.md must cite FEAT-168 so the rule's provenance is traceable"
  );

  assert.match(
    content,
    /effort_points\s*>=\s*8|effort_points\s*≥\s*8/,
    "pm.md must reference the >= 8 effort_points threshold"
  );

  assert.match(
    content,
    /proposed_slices/,
    "pm.md must instruct emission of a proposed_slices block"
  );

  assert.match(
    content,
    /needs-review/,
    "pm.md must describe the escalation valve when decomposition fails"
  );
});

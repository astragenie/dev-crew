// FEAT-271 / SLICE-167: every install-time preset template must carry a
// documented "light" reviewer-ladder override (single Reviewer A +
// loop.validation.satisfiedByReview: true), mirroring this repo's own proven
// .claude/loop.json setting. This is a batch, mechanical guarantee across all
// preset templates -- the actual `/runner:install --light` flag wiring that
// consumes this data is SLICE-168's deliverable, not this test's concern.
import { test } from "bun:test";
import { strict as assert } from "node:assert";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { validatePreset } from "../scripts/lib/preset-schema.mjs";

const presetsDir = path.resolve("scripts/presets");
const presetFiles = readdirSync(presetsDir).filter((f) => f.endsWith(".json"));

test("every preset template ships with at least one light block", () => {
  assert.ok(presetFiles.length > 0, "expected preset templates under scripts/presets/");
});

for (const file of presetFiles) {
  const presetName = path.basename(file, ".json");
  const raw = JSON.parse(readFileSync(path.join(presetsDir, file), "utf8"));

  test(`preset "${presetName}" declares a valid light block`, () => {
    const preset = validatePreset(raw);
    assert.ok(preset.light, `${presetName}.json is missing a top-level "light" block`);
    assert.deepEqual(preset.light?.reviewers.ladder, ["A"]);
    assert.equal(preset.light?.loop?.validation?.satisfiedByReview, true);
  });

  test(`preset "${presetName}" base reviewers ladder is unchanged (AC-2 backward compat)`, () => {
    const preset = validatePreset(raw);
    assert.deepEqual(preset.reviewers?.ladder, ["A", "B"]);
  });
}

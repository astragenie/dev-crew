// AC-3 gate (FEAT-007 / SLICE-35 fix): every scripts/presets/*.json must only
// reference skill ids that are actually live in this repo's skills/domain
// catalog. This is the CI-side counterpart to skill-matcher.mjs's resolve-time
// `unresolved` reporting — it catches drift in the checked-in preset files
// themselves (the shape of the FEAT's original defect: dotnet-only.json,
// dotnet-react.json, and dotnet-typescript-vue.json referenced csharp-pro,
// frontend-advisory, a11y-advisory, and (for the vue preset) vue-engineering,
// all removed when crew reorganized skills/domain/ — see
// docs/planning/feat-007-skill-matcher-contract.md's dead-ID
// re-verification).
//
// Globs ALL presets (not just the three named above), so a future preset
// file is guarded for free.
//
// `roles.*.skills` entries are deliberately EXCLUDED from the live-catalog
// check: every current preset's role skills are cross-plugin-namespaced ids
// (e.g. "superpowers:verification-before-completion", "loop:loop-discipline",
// "runner:loop-discipline") — those resolve through a different skill source
// entirely (the plugin's own skill tree), not skills/domain, so checking them
// against enumerateSkillCatalog would be comparing apples to a different
// orchard. Only bare (no ":") ids from `skills` / `fe.skills` / `be.skills`
// are project-domain skills and in scope for this gate.
import { test } from "bun:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { enumerateSkillCatalog } from "../scripts/lib/skill-catalog.mjs";

const presetsDir = path.resolve("scripts/presets");
const presetFiles = readdirSync(presetsDir).filter((f) => f.endsWith(".json"));

/** Extract every bare (non-namespaced) skill id a preset references from its
 * `skills` / `fe.skills` / `be.skills` / `roles.*.skills` blocks. Namespaced
 * ids (containing ":") are cross-plugin skill refs, not skills/domain
 * entries, and are excluded — see module header. */
export function extractPresetSkillIds(preset: Record<string, any>): string[] {
  const ids = new Set<string>();
  const collect = (arr: unknown) => {
    if (!Array.isArray(arr)) return;
    for (const id of arr) {
      if (typeof id === "string" && !id.includes(":")) ids.add(id);
    }
  };
  collect(preset.skills);
  collect(preset.fe?.skills);
  collect(preset.be?.skills);
  if (preset.roles && typeof preset.roles === "object") {
    for (const role of Object.values(preset.roles)) {
      collect((role as Record<string, unknown> | undefined)?.skills);
    }
  }
  return [...ids].sort();
}

for (const file of presetFiles) {
  const presetName = path.basename(file, ".json");
  const preset = JSON.parse(readFileSync(path.join(presetsDir, file), "utf8"));
  const skillIds = extractPresetSkillIds(preset);

  test(`preset "${presetName}": every referenced skill id is live in skills/domain`, async () => {
    const repoRoot = path.resolve(".");
    const { catalog } = await enumerateSkillCatalog(repoRoot);
    assert.ok(catalog, "this repo must have a real skills/domain tree to check against");

    const deadIds = skillIds.filter((id) => !catalog!.has(id));
    assert.deepEqual(
      deadIds,
      [],
      `preset "${presetName}" references skill id(s) absent from the live catalog: ${deadIds.join(", ")}`
    );
  });
}

// Neuter proof for the extraction+check logic itself, independent of the
// real preset files' current (green) content: a hand-built preset object
// with a confirmed-dead id must still be caught, and a live id must still
// pass. Complements the real-file tests above, which would only fail if
// someone reintroduces drift into a checked-in preset.
test("extractPresetSkillIds + live-catalog check catches a dead id in a synthetic preset (mixed fe/be/roles)", async () => {
  const syntheticPreset = {
    skills: ["typescript-pro"],
    fe: { skills: ["react-engineering", "csharp-pro"] }, // csharp-pro: confirmed dead
    be: { skills: ["database-architecture"] },
    roles: {
      pm: { skills: ["superpowers:verification-before-completion"] } // namespaced — excluded
    }
  };
  const ids = extractPresetSkillIds(syntheticPreset);
  assert.deepEqual(ids, [
    "csharp-pro",
    "database-architecture",
    "react-engineering",
    "typescript-pro"
  ]);

  const repoRoot = path.resolve(".");
  const { catalog } = await enumerateSkillCatalog(repoRoot);
  const deadIds = ids.filter((id) => !catalog!.has(id));
  assert.deepEqual(deadIds, ["csharp-pro"]);
});

test("extractPresetSkillIds ignores namespaced roles.*.skills entries entirely", () => {
  const preset = {
    roles: {
      pm: { skills: ["superpowers:verification-before-completion", "loop:loop-discipline"] },
      architect: { skills: ["runner:loop-discipline"] }
    }
  };
  assert.deepEqual(extractPresetSkillIds(preset), []);
});

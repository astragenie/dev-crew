// AC-4 golden test (FEAT-218 Phase 2): the builder-dispatch skill-injection
// payload must be byte-identical before and after presets are demoted to
// install-time-only templates.
//
// "Before" = resolveSkills reads scripts/presets/<name>.json directly (the
// pre-Phase-2 shape dev-team's orchestrate-slice.md Step 2.5 still uses today
// — see docs/upstream-requests/2026-07-06-crew-orchestrate-slice-preset-path.md
// for the follow-up that repoints it at .claude/loop.json).
// "After" = the installer has inlined that same preset's full content into a
// repo's .claude/loop.json (loop-installer.mts) and resolveSkills is pointed
// at that file instead. This proves the migration doesn't change the
// resolved-skills contract, independent of whether the source file is a
// named preset template or an installed repo's own config.
import { test } from "bun:test";
import { strict as assert } from "node:assert";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { readdirSync, readFileSync } from "node:fs";

import { resolveSkills, type Variant } from "../scripts/lib/skill-resolver.mjs";
import { resolveConfig } from "../scripts/lib/config-resolver.mjs";

const presetsDir = path.resolve("scripts/presets");
const presetFiles = readdirSync(presetsDir).filter((f) => f.endsWith(".json"));

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

for (const file of presetFiles) {
  const presetName = path.basename(file, ".json");
  const preset = JSON.parse(readFileSync(path.join(presetsDir, file), "utf8"));

  test(`golden: resolved skills for preset "${presetName}" are identical pre/post inlining`, async () => {
    const beforePath = path.join(presetsDir, file);

    const repo = await tmpRepo(`golden-${presetName}-`);
    const inlined = await resolveConfig(repo, { preset: presetName });
    const afterPath = path.join(repo, ".claude", "loop.json");
    await fs.mkdir(path.dirname(afterPath), { recursive: true });
    await fs.writeFile(afterPath, JSON.stringify(inlined));

    const variants: Variant[] = preset.split ? ["fe", "be"] : ["single"];
    if (preset.roles) {
      variants.push(...(Object.keys(preset.roles) as Variant[]));
    }

    for (const variant of variants) {
      const before = resolveSkills({ presetPath: beforePath, variant });
      const after = resolveSkills({ presetPath: afterPath, variant });
      assert.deepEqual(
        after,
        before,
        `variant=${variant} resolved skills must match for preset "${presetName}"`
      );
    }

    await fs.rm(repo, { recursive: true, force: true });
  });
}

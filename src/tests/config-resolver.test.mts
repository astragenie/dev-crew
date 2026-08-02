import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  resolveConfig,
  listPresets,
  writeConfigIfMissing,
  applyLightLadder,
  retrofitLightLadder,
  DEFAULT_LIGHT_LADDER,
  CONFIG_FILENAME
} from "../scripts/lib/config-resolver.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("listPresets returns dotnet-python with required fields", async () => {
  const presets = await listPresets();
  const dotnet = presets.find((p) => p.name === "dotnet-python");
  assert.ok(dotnet, "dotnet-python preset must ship in v1");
  assert.ok(dotnet.description.length > 0);
});

// FEAT-218 Phase 2: resolveConfig no longer defaults to a hardcoded preset
// (AC-5) — an unconfigured repo (no .claude/loop.json, no explicit
// options.preset) must fail clearly instead of silently inheriting a
// wrong-for-most-repos stack.
test("resolveConfig throws a clear error when unconfigured", async () => {
  const repo = await tmpRepo("al-resolve-unconfigured-");
  await assert.rejects(
    () => resolveConfig(repo),
    /No \.claude\/loop\.json found.*\/runner:install --preset/s
  );
});

// Explicit options.preset remains the install-time scaffold path (used by
// loop-installer.mts to inline a template into a fresh .claude/loop.json).
test("resolveConfig with an explicit preset still merges the named template", async () => {
  const repo = await tmpRepo("al-resolve-scaffold-");
  const config = (await resolveConfig(repo, { preset: "dotnet-python" })) as Record<string, any>;
  assert.equal(config.preset, "dotnet-python");
  assert.equal(config.loop.aiLoopRoot, ".claude/artifacts/loop/ai-loop");
  assert.ok(Array.isArray(config.stack.build));
  assert.ok(config.stack.build.length > 0);
});

test("resolveConfig with an explicit preset deep-merges user overrides on top of it", async () => {
  const repo = await tmpRepo("al-resolve-merge-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, CONFIG_FILENAME),
    JSON.stringify({
      productName: "My Test Product",
      stack: {
        test: [{ cmd: "custom-test", args: ["--all"] }]
      }
    })
  );
  const config = (await resolveConfig(repo, { preset: "dotnet-python" })) as Record<string, any>;
  assert.equal(config.productName, "My Test Product");
  assert.equal(
    config.stack.test[0].cmd,
    "custom-test",
    "user test override should replace preset test array"
  );
  assert.ok(config.stack.build.length > 0, "preset build should remain after merge");
});

test("resolveConfig with an explicit preset treats explicit null as disable", async () => {
  const repo = await tmpRepo("al-resolve-null-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(path.join(repo, CONFIG_FILENAME), JSON.stringify({ stack: { build: null } }));
  const config = (await resolveConfig(repo, { preset: "dotnet-python" })) as Record<string, any>;
  assert.equal(
    config.stack.build,
    null,
    "explicit null disables the stage even if preset has a default"
  );
});

test("resolveConfig throws on unknown preset", async () => {
  const repo = await tmpRepo("al-resolve-bad-");
  await assert.rejects(
    () => resolveConfig(repo, { preset: "nonexistent-preset" }),
    /Unknown preset "nonexistent-preset"/
  );
});

// Post-install runtime path: no options.preset given, .claude/loop.json is
// read as-is (no merge) — it is expected to already be self-contained
// because the installer inlined the full template at scaffold time (AC-3).
test("resolveConfig with no explicit preset reads an already self-contained config as-is", async () => {
  const repo = await tmpRepo("al-resolve-self-contained-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const scaffolded = await resolveConfig(repo, { preset: "dotnet-python" });
  await fs.writeFile(path.join(repo, CONFIG_FILENAME), JSON.stringify(scaffolded));
  const config = (await resolveConfig(repo)) as Record<string, any>;
  assert.equal(config.preset, "dotnet-python");
  assert.ok(Array.isArray(config.stack.build));
  assert.ok(config.stack.build.length > 0);
});

test("writeConfigIfMissing does not clobber existing config", async () => {
  const repo = await tmpRepo("al-write-skip-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const original = JSON.stringify({ preset: "dotnet-python", productName: "existing" });
  await fs.writeFile(path.join(repo, CONFIG_FILENAME), original);
  const result = await writeConfigIfMissing(repo, {
    preset: "dotnet-python",
    productName: "new"
  });
  assert.equal(result.written, false);
  const onDisk = await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8");
  assert.equal(onDisk, original);
});

test("writeConfigIfMissing writes new config when missing", async () => {
  const repo = await tmpRepo("al-write-new-");
  const result = await writeConfigIfMissing(repo, {
    preset: "dotnet-python",
    productName: "Fresh"
  });
  assert.equal(result.written, true);
  const parsed = JSON.parse(await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8"));
  assert.equal(parsed.productName, "Fresh");
});

// FEAT-271 / SLICE-168: applyLightLadder is the merge step `/runner:install
// --light` applies on top of resolveConfig's output, before the config is
// inlined into .claude/loop.json.
test("applyLightLadder merges the preset's light block over reviewers and loop.validation", async () => {
  const repo = await tmpRepo("al-light-merge-");
  const config = (await resolveConfig(repo, { preset: "dotnet-python" })) as Record<string, any>;
  assert.deepEqual(config.reviewers.ladder, ["A", "B"], "preset default is unchanged before merge");

  const lightened = applyLightLadder(config) as Record<string, any>;
  assert.deepEqual(lightened.reviewers.ladder, ["A"]);
  assert.equal(lightened.loop.validation.satisfiedByReview, true);
  // Original config object must be untouched (installLoop decides whether to
  // apply the merge; applyLightLadder itself must not have side effects).
  assert.deepEqual(config.reviewers.ladder, ["A", "B"]);
});

test("applyLightLadder throws when the resolved config has no light block", () => {
  assert.throws(() => applyLightLadder({ reviewers: { ladder: ["A", "B"] } }), /no `light` block/);
});

// FEAT-271 / SLICE-168 (HIGH fix): retrofitLightLadder is the read-modify-write
// path an already-installed repo takes, independent of resolveConfig's
// preset-merge branch — it must work with no --preset on the refresh call.
test("retrofitLightLadder resolves the light block from the persisted preset name", async () => {
  const repo = await tmpRepo("al-retrofit-preset-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const seeded = (await resolveConfig(repo, { preset: "dotnet-python" })) as Record<string, any>;
  await fs.writeFile(path.join(repo, CONFIG_FILENAME), `${JSON.stringify(seeded, null, 2)}\n`);

  const result = await retrofitLightLadder(repo);
  assert.equal(result.written, true);
  const onDisk = JSON.parse(await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8"));
  assert.deepEqual(onDisk.reviewers.ladder, ["A"]);
  assert.equal(onDisk.loop.validation.satisfiedByReview, true);
  assert.equal(onDisk.productName, seeded.productName, "unrelated fields must survive untouched");
});

test("retrofitLightLadder falls back to the shared constant when the preset name is unresolvable", async () => {
  const repo = await tmpRepo("al-retrofit-fallback-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  // Hand-authored config: no `preset` field at all (never scaffolded via a
  // named template) — retrofitLightLadder must not throw, it must fall back.
  await fs.writeFile(
    path.join(repo, CONFIG_FILENAME),
    `${JSON.stringify({ reviewers: { ladder: ["A", "B"] }, loop: { aiLoopRoot: "x" } }, null, 2)}\n`
  );

  const result = await retrofitLightLadder(repo);
  assert.equal(result.written, true);
  const onDisk = JSON.parse(await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8"));
  const defaultLadder = DEFAULT_LIGHT_LADDER as Record<string, any>;
  assert.deepEqual(onDisk.reviewers.ladder, defaultLadder.reviewers.ladder);
  assert.equal(
    onDisk.loop.validation.satisfiedByReview,
    defaultLadder.loop.validation.satisfiedByReview
  );
  assert.equal(onDisk.loop.aiLoopRoot, "x", "unrelated loop field must survive untouched");
});

test("retrofitLightLadder is a no-op the second time (byte-identical)", async () => {
  const repo = await tmpRepo("al-retrofit-idempotent-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  const seeded = (await resolveConfig(repo, { preset: "dotnet-python" })) as Record<string, any>;
  await fs.writeFile(path.join(repo, CONFIG_FILENAME), `${JSON.stringify(seeded, null, 2)}\n`);

  await retrofitLightLadder(repo);
  const afterFirst = await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8");
  const second = await retrofitLightLadder(repo);
  const afterSecond = await fs.readFile(path.join(repo, CONFIG_FILENAME), "utf8");

  assert.equal(second.written, false);
  assert.equal(afterFirst, afterSecond);
});

test("default config includes intake budgets", async () => {
  const repo = await tmpRepo("al-intake-budget-");
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, CONFIG_FILENAME),
    JSON.stringify({
      preset: "dotnet-python",
      loop: {
        intakeBudgetUsdPerCall: 1.5,
        intakeBudgetTokensPerCall: 150000
      }
    })
  );
  const cfg = (await resolveConfig(repo)) as Record<string, any>;
  assert.equal(cfg.loop.intakeBudgetUsdPerCall, 1.5);
  assert.equal(cfg.loop.intakeBudgetTokensPerCall, 150000);
});

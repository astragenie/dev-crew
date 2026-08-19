// devcrew.json schemaVersion 2 — migrator + resolution tests (FEAT-003 /
// SLICE-13, docs/planning/p2-seam-contract.md §5/§6).

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  migrateToDevcrewConfig,
  readDevcrewConfigIfPresent,
  DEVCREW_SCHEMA_VERSION
} from "../scripts/lib/devcrew-config.mjs";
import { resolveConfig } from "../scripts/lib/config-resolver.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

const FIXTURE_LOOP_CONFIG = {
  preset: "dotnet-python",
  presetName: "dotnet-python",
  schemaVersion: 1,
  projectType: "claude-plugin",
  productName: "fixture-repo",
  loop: { aiLoopRoot: ".claude/artifacts/loop/ai-loop" },
  stack: { build: [] },
  reviewers: { ladder: ["A", "B"] }
};

const FIXTURE_CREW_CONFIG = {
  features: {
    "cost-hygiene": { enabled: true },
    "push-verify": { enabled: false }
  }
};

async function writeFixtures(
  repo: string,
  opts: { loop?: unknown; crew?: unknown } = {
    loop: FIXTURE_LOOP_CONFIG,
    crew: FIXTURE_CREW_CONFIG
  }
) {
  if (opts.loop !== undefined) {
    await fs.writeFile(path.join(repo, ".claude", "loop.json"), JSON.stringify(opts.loop, null, 2));
  }
  if (opts.crew !== undefined) {
    await fs.writeFile(path.join(repo, ".claude", "crew.json"), JSON.stringify(opts.crew, null, 2));
  }
}

test("migrateToDevcrewConfig: merges loop.json + crew.json into devcrew.json schemaVersion 2", async () => {
  const repo = await tmpRepo("devcrew-migrate-basic-");
  await writeFixtures(repo, { loop: FIXTURE_LOOP_CONFIG, crew: FIXTURE_CREW_CONFIG });

  const result = await migrateToDevcrewConfig(repo);
  assert.equal(result.written, true);
  assert.equal(result.reason, "migrated");

  const merged = JSON.parse(await fs.readFile(path.join(repo, ".claude", "devcrew.json"), "utf8"));
  assert.equal(merged.schemaVersion, DEVCREW_SCHEMA_VERSION);
  // loop.json's own legacy schemaVersion:1 is disambiguated, not dropped.
  assert.equal(merged.presetSchemaVersion, 1);
  // Superset — loop.json's other top-level keys carry over unchanged.
  assert.equal(merged.preset, "dotnet-python");
  assert.equal(merged.productName, "fixture-repo");
  assert.deepEqual(merged.reviewers, { ladder: ["A", "B"] });
  // crew.json's features block merges in verbatim under `features`.
  assert.deepEqual(merged.features, FIXTURE_CREW_CONFIG.features);
});

test("migrateToDevcrewConfig: leaves a .bak of every source file it read, originals untouched", async () => {
  const repo = await tmpRepo("devcrew-migrate-backups-");
  await writeFixtures(repo);
  const loopRaw = await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8");
  const crewRaw = await fs.readFile(path.join(repo, ".claude", "crew.json"), "utf8");

  const result = await migrateToDevcrewConfig(repo);
  assert.equal(result.backups.length, 2);

  const loopBak = await fs.readFile(path.join(repo, ".claude", "loop.json.bak"), "utf8");
  const crewBak = await fs.readFile(path.join(repo, ".claude", "crew.json.bak"), "utf8");
  assert.equal(loopBak, loopRaw, ".bak must be byte-identical to the original loop.json");
  assert.equal(crewBak, crewRaw, ".bak must be byte-identical to the original crew.json");

  // Originals are never deleted — both the source files and the .bak
  // copies must coexist as a one-release rollback path.
  const loopStillThere = await fs
    .access(path.join(repo, ".claude", "loop.json"))
    .then(() => true)
    .catch(() => false);
  const crewStillThere = await fs
    .access(path.join(repo, ".claude", "crew.json"))
    .then(() => true)
    .catch(() => false);
  assert.equal(loopStillThere, true);
  assert.equal(crewStillThere, true);
});

test("migrateToDevcrewConfig: idempotent — a second run against an already-migrated repo is a no-op", async () => {
  const repo = await tmpRepo("devcrew-migrate-idempotent-");
  await writeFixtures(repo);

  const first = await migrateToDevcrewConfig(repo);
  assert.equal(first.written, true);
  const devcrewPath = path.join(repo, ".claude", "devcrew.json");
  const afterFirst = await fs.readFile(devcrewPath, "utf8");

  const second = await migrateToDevcrewConfig(repo);
  assert.equal(second.written, false);
  assert.equal(second.reason, "already-migrated");
  assert.deepEqual(second.backups, []);

  const afterSecond = await fs.readFile(devcrewPath, "utf8");
  assert.equal(afterSecond, afterFirst, "re-running must not rewrite an already-migrated file");
});

test("migrateToDevcrewConfig: no-op with no-source-config when neither loop.json nor crew.json exist", async () => {
  const repo = await tmpRepo("devcrew-migrate-nosource-");
  const result = await migrateToDevcrewConfig(repo);
  assert.equal(result.written, false);
  assert.equal(result.reason, "no-source-config");

  const devcrewExists = await fs
    .access(path.join(repo, ".claude", "devcrew.json"))
    .then(() => true)
    .catch(() => false);
  assert.equal(devcrewExists, false);
});

test("migrateToDevcrewConfig: loop.json alone (no crew.json) migrates without a features block", async () => {
  const repo = await tmpRepo("devcrew-migrate-looponly-");
  await writeFixtures(repo, { loop: FIXTURE_LOOP_CONFIG });

  const result = await migrateToDevcrewConfig(repo);
  assert.equal(result.written, true);
  assert.equal(result.backups.length, 1);

  const merged = JSON.parse(await fs.readFile(path.join(repo, ".claude", "devcrew.json"), "utf8"));
  assert.equal(merged.features, undefined);
  const crewBakExists = await fs
    .access(path.join(repo, ".claude", "crew.json.bak"))
    .then(() => true)
    .catch(() => false);
  assert.equal(crewBakExists, false);
});

test("readDevcrewConfigIfPresent: null when devcrew.json is absent", async () => {
  const repo = await tmpRepo("devcrew-read-absent-");
  assert.equal(await readDevcrewConfigIfPresent(repo), null);
});

test("readDevcrewConfigIfPresent: null when schemaVersion does not match (stale/foreign file)", async () => {
  const repo = await tmpRepo("devcrew-read-stale-");
  await fs.writeFile(
    path.join(repo, ".claude", "devcrew.json"),
    JSON.stringify({ schemaVersion: 1, productName: "stale" })
  );
  assert.equal(await readDevcrewConfigIfPresent(repo), null);
});

test("readDevcrewConfigIfPresent: returns the parsed config when schemaVersion 2", async () => {
  const repo = await tmpRepo("devcrew-read-ok-");
  await writeFixtures(repo);
  await migrateToDevcrewConfig(repo);

  const config = await readDevcrewConfigIfPresent(repo);
  assert.ok(config);
  assert.equal(config!.schemaVersion, DEVCREW_SCHEMA_VERSION);
  assert.equal(config!.productName, "fixture-repo");
});

// ---------------------------------------------------------------------------
// config-resolver.mts integration: "new file wins when present" (contract §5)
// ---------------------------------------------------------------------------

test("resolveConfig: devcrew.json wins over loop.json when both are present", async () => {
  const repo = await tmpRepo("devcrew-resolve-wins-");
  await writeFixtures(repo);
  await migrateToDevcrewConfig(repo);

  // Mutate loop.json after migration so the two files visibly disagree —
  // proves resolveConfig reads devcrew.json, not loop.json, once migrated.
  const loopPath = path.join(repo, ".claude", "loop.json");
  const loopCfg = JSON.parse(await fs.readFile(loopPath, "utf8"));
  loopCfg.productName = "stale-loop-json-value";
  await fs.writeFile(loopPath, JSON.stringify(loopCfg));

  const resolved = await resolveConfig(repo);
  assert.equal(resolved.productName, "fixture-repo");
  assert.equal(resolved.schemaVersion, DEVCREW_SCHEMA_VERSION);
});

test("resolveConfig: falls back to loop.json when no devcrew.json exists (pre-P5 adopter repo)", async () => {
  const repo = await tmpRepo("devcrew-resolve-fallback-");
  await writeFixtures(repo, { loop: FIXTURE_LOOP_CONFIG });

  const resolved = await resolveConfig(repo);
  assert.equal(resolved.productName, "fixture-repo");
  assert.equal(resolved.schemaVersion, 1, "legacy loop.json is returned as-is, unmigrated");
});

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  DEFAULT_CEILING_USD,
  DEFAULT_REGRESSION_MULTIPLIER,
  DEFAULT_REGRESSION_WINDOW,
  DEFAULT_REGRESSION_MIN_SAMPLES,
  parseCostOverrides,
  runCostSetup
} from "../scripts/lib/cost-setup.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}
async function readConfig(repo: string): Promise<Record<string, any>> {
  return JSON.parse(await fs.readFile(path.join(repo, ".claude", "loop.json"), "utf8"));
}

// ─── parseCostOverrides ───────────────────────────────────────────────────

test("parseCostOverrides: empty / null / undefined returns empty object", () => {
  assert.deepEqual(parseCostOverrides(null), {});
  assert.deepEqual(parseCostOverrides(""), {});
  assert.deepEqual(parseCostOverrides(undefined), {});
});

test("parseCostOverrides: parses numeric keys", () => {
  const out = parseCostOverrides("ceilingUsd=200,regressionMultiplier=2.5,regressionWindow=7");
  assert.deepEqual(out, {
    ceilingUsd: 200,
    regressionMultiplier: 2.5,
    regressionWindow: 7
  });
});

test("parseCostOverrides: parses mode + project + aliases", () => {
  const out = parseCostOverrides(
    "regressionMode=expected_usd,project=astrarunner,projectAliases=runner-hardening|memory"
  );
  assert.deepEqual(out, {
    regressionMode: "expected_usd",
    project: "astrarunner",
    projectAliases: ["runner-hardening", "memory"]
  });
});

test("parseCostOverrides: unknown key throws", () => {
  assert.throws(() => parseCostOverrides("notARealKey=1"), /Unknown override/);
});

test("parseCostOverrides: invalid mode throws", () => {
  assert.throws(() => parseCostOverrides("regressionMode=banana"), /must be "median"/);
});

test("parseCostOverrides: missing = throws", () => {
  assert.throws(() => parseCostOverrides("ceilingUsd"), /Expected KEY=VALUE/);
});

// ─── runCostSetup ─────────────────────────────────────────────────────────

test("runCostSetup: empty repo → writes defaults + zero legacy migration", async () => {
  const repo = await tmpRepo("loop-cost-setup-empty-");
  try {
    const result = await runCostSetup(repo);
    assert.equal(result.written, true);
    assert.deepEqual(result.migratedLegacyKeys, []);
    assert.equal(result.effective.ceilingUsd, DEFAULT_CEILING_USD);
    assert.equal(result.effective.regression.multiplier, DEFAULT_REGRESSION_MULTIPLIER);
    assert.equal(result.effective.regression.window, DEFAULT_REGRESSION_WINDOW);
    assert.equal(result.effective.regression.minSamples, DEFAULT_REGRESSION_MIN_SAMPLES);

    const cfg = await readConfig(repo);
    assert.equal(cfg.loop.cost.ceilingUsd, DEFAULT_CEILING_USD);
    assert.equal(cfg.loop.cost.regression.multiplier, DEFAULT_REGRESSION_MULTIPLIER);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runCostSetup: idempotent — second run writes nothing", async () => {
  const repo = await tmpRepo("loop-cost-setup-idem-");
  try {
    const first = await runCostSetup(repo);
    assert.equal(first.written, true);
    const second = await runCostSetup(repo);
    assert.equal(second.written, false, "second invocation must detect no change");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runCostSetup: migrates all legacy flat keys → nested + drops them", async () => {
  const repo = await tmpRepo("loop-cost-setup-migrate-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        preset: "dotnet-aspire-python",
        loop: {
          backlogPath: ".claude/artifacts/loop/backlog",
          costSliceCeiling: 300,
          costStopThreshold: 300,
          costRegressionMultiplier: 15,
          costRegressionWindow: 7,
          costRegressionMinSamples: 4,
          costRegressionMode: "expected_usd",
          costMedianUsdPerPoint: 10,
          costProject: "astrarunner",
          costProjectAliases: ["runner-hardening"]
        },
        stack: {}
      })
    );

    const result = await runCostSetup(repo);
    assert.equal(result.written, true);
    assert.deepEqual(
      result.migratedLegacyKeys.sort(),
      [
        "costMedianUsdPerPoint",
        "costProject",
        "costProjectAliases",
        "costRegressionMinSamples",
        "costRegressionMode",
        "costRegressionMultiplier",
        "costRegressionWindow",
        "costSliceCeiling",
        "costStopThreshold"
      ]
    );
    assert.equal(result.effective.ceilingUsd, 300);
    assert.equal(result.effective.regression.multiplier, 15);
    assert.equal(result.effective.regression.window, 7);
    assert.equal(result.effective.regression.mode, "expected_usd");
    assert.equal(result.effective.regression.project, "astrarunner");

    const cfg = await readConfig(repo);
    // Legacy keys must be gone (including costStopThreshold which is retired).
    assert.equal(cfg.loop.costSliceCeiling, undefined);
    assert.equal(cfg.loop.costStopThreshold, undefined);
    assert.equal(cfg.loop.costRegressionMultiplier, undefined);
    assert.equal(cfg.loop.costProject, undefined);
    // Nested shape present.
    assert.equal(cfg.loop.cost.ceilingUsd, 300);
    assert.equal(cfg.loop.cost.regression.multiplier, 15);
    assert.equal(cfg.loop.cost.regression.project, "astrarunner");
    assert.deepEqual(cfg.loop.cost.regression.projectAliases, ["runner-hardening"]);
    // Non-cost loop keys preserved.
    assert.equal(cfg.loop.backlogPath, ".claude/artifacts/loop/backlog");
    assert.equal(cfg.preset, "dotnet-aspire-python");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runCostSetup: overrides take precedence over both nested + legacy values", async () => {
  const repo = await tmpRepo("loop-cost-setup-override-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({
        loop: {
          cost: { ceilingUsd: 100, regression: { multiplier: 4 } },
          costSliceCeiling: 50
        }
      })
    );
    const result = await runCostSetup(repo, {
      ceilingUsd: 250,
      regressionMultiplier: 2
    });
    assert.equal(result.effective.ceilingUsd, 250);
    assert.equal(result.effective.regression.multiplier, 2);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("runCostSetup: preserves non-loop top-level keys", async () => {
  const repo = await tmpRepo("loop-cost-setup-preserve-");
  try {
    await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
    await fs.writeFile(
      path.join(repo, ".claude", "loop.json"),
      JSON.stringify({ preset: "p", customRoot: { foo: 1 } })
    );
    await runCostSetup(repo);
    const cfg = await readConfig(repo);
    assert.equal(cfg.preset, "p");
    assert.deepEqual(cfg.customRoot, { foo: 1 });
    assert.equal(cfg.loop.cost.ceilingUsd, DEFAULT_CEILING_USD);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

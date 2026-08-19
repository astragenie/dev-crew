// @ts-nocheck
// FEAT-229 — learning-cycle.mts orchestrates the already-shipped FEAT-221
// (mineFailures) + FEAT-222 (generateEvalsForClusters) pieces into one
// runLearningCycle pipeline, plus the `loop.mts learn` CLI entry point and
// the DEC-070 retrospective-completion cadence hook. Covers AC-1..AC-5.
//
// All fixtures are TEMP directories — never the real C:/work/mega/dev-team
// crew checkout (mirrors eval-generator.test.mts's makeCrewRepo pattern).

import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { makeTmpRepo, LOOP_CLI } from "./_fixtures.mjs";
import { logLearning } from "../scripts/lib/learnings.mjs";
import { learningRunsRoot } from "../scripts/lib/paths.mjs";
import { runLearningCycle } from "../scripts/lib/learning-cycle.mjs";

let seedCounter = 0;

/** Seed one failure signal directly via learnings.jsonl (collectLearningSignals reads it). */
async function seedFailure(
  repo: string,
  overrides: {
    failure_class?: string;
    root_cause?: string;
    recommended_fix?: string;
  } = {}
): Promise<void> {
  seedCounter += 1;
  await logLearning(repo, {
    key: `seed-${seedCounter}`,
    insight: `seeded failure signal ${seedCounter}`,
    failure_class: (overrides.failure_class ?? "review_fail") as never,
    root_cause: overrides.root_cause ?? "reviewer missed an AC violation",
    recommended_fix: overrides.recommended_fix ?? "re-check every AC before approving"
  });
}

/** Sibling "crew" checkout fixture with a seeded per-agent eval-spec file. */
async function makeCrewRepo(agent: string): Promise<string> {
  const crewRepo = await makeTmpRepo("lc-crew-");
  await fs.mkdir(path.join(crewRepo, "evals", "agents"), { recursive: true });
  await fs.writeFile(
    path.join(crewRepo, "evals", "agents", `crew-${agent}.yaml`),
    [
      `prompt_id: ${agent}`,
      "tests:",
      "  - name: seed-hand-authored",
      "    fixture: file://evals/fixtures/seed.txt",
      "    assert:",
      "      - type: llm-rubric",
      '        rubric: "seed rubric"',
      ""
    ].join("\n")
  );
  return crewRepo;
}

function learningLoopConfig(overrides: Record<string, unknown> = {}) {
  return {
    loop: {
      learningLoop: {
        enabled: true,
        windowDays: 14,
        ...overrides
      }
    }
  };
}

// ---------------------------------------------------------------------------
// AC-3: disabled / absent config is a byte-identical no-op
// ---------------------------------------------------------------------------

test("runLearningCycle is a no-op when loop.learningLoop is absent", async () => {
  const repo = await makeTmpRepo("lc-ac3-absent-");
  await seedFailure(repo);

  const result = await runLearningCycle(repo, {});
  assert.equal(result, null);

  await assert.rejects(fs.access(learningRunsRoot(repo, null)));
});

test("runLearningCycle is a no-op when loop.learningLoop.enabled is false", async () => {
  const repo = await makeTmpRepo("lc-ac3-disabled-");
  await seedFailure(repo);

  const result = await runLearningCycle(repo, { loop: { learningLoop: { enabled: false } } });
  assert.equal(result, null);

  await assert.rejects(fs.access(learningRunsRoot(repo, null)));
});

// ---------------------------------------------------------------------------
// AC-1: enabled + clustered failures -> lessons + specs + one dated report
// ---------------------------------------------------------------------------

test("runLearningCycle produces candidate lessons, manufactured specs, and one dated report", async () => {
  const repo = await makeTmpRepo("lc-ac1-");
  await seedFailure(repo);
  await seedFailure(repo);
  const crewRepo = await makeCrewRepo("reviewer");

  const config = learningLoopConfig();
  config.loop.crewRepoPath = crewRepo;

  const result = await runLearningCycle(repo, config);

  assert.ok(result, "expected a cycle result, not null");
  assert.equal(result!.clustersFound, 1);
  assert.equal(result!.clustersProcessed, 1);
  assert.equal(result!.clustersDroppedByCap, 0);
  assert.equal(result!.lessonsWritten.length, 1);
  assert.equal(result!.lessonsWritten[0]!.failure_class, "review_fail");
  assert.equal(result!.specsConsidered, 1);
  assert.equal(result!.specsDroppedByCap, 0);
  assert.equal(result!.specResults.length, 1);
  assert.equal(result!.specResults[0]!.status, "written");
  assert.equal(result!.specResults[0]!.agent, "reviewer");
  assert.equal(result!.errors.length, 0);

  const reportContent = await fs.readFile(result!.reportPath, "utf8");
  assert.match(reportContent, /# Learning cycle/);
  assert.match(reportContent, /review_fail/);
  assert.match(reportContent, /Written: 1/);
  assert.equal(path.dirname(result!.reportPath), learningRunsRoot(repo, null));

  const evalSpec = await fs.readFile(
    path.join(crewRepo, "evals", "agents", "crew-reviewer.yaml"),
    "utf8"
  );
  assert.match(evalSpec, /manufactured: true/);
});

// ---------------------------------------------------------------------------
// AC-2: a stage throws -> the other stage still runs; error is logged, never
// propagated to the caller.
// ---------------------------------------------------------------------------

test("runLearningCycle never throws when the mining stage fails, and still writes a report", async () => {
  const repo = await makeTmpRepo("lc-ac2-");
  // Pre-create the mining-report target as a plain FILE (not a directory) so
  // mineFailures's own writeMiningReport -> ensureDir(mkdir recursive) throws
  // ENOTDIR — a realistic, reachable failure mode (e.g. a corrupted artifact
  // tree), not an artificial mock.
  await fs.mkdir(path.dirname(path.join(repo, ".claude/artifacts/loop")), { recursive: true });
  await fs.mkdir(path.join(repo, ".claude/artifacts/loop"), { recursive: true });
  await fs.writeFile(path.join(repo, ".claude/artifacts/loop/mining"), "not a directory");

  const result = await runLearningCycle(repo, learningLoopConfig());

  assert.ok(result, "runLearningCycle must resolve, not throw or reject");
  assert.equal(result!.errors.length, 1);
  assert.equal(result!.errors[0]!.stage, "mine-failures");
  assert.equal(result!.clustersFound, 0);
  assert.equal(result!.lessonsWritten.length, 0);
  assert.equal(result!.specResults.length, 0);

  // The cycle report is still written despite the mining-stage failure.
  const reportContent = await fs.readFile(result!.reportPath, "utf8");
  assert.match(reportContent, /Stage errors \(1\)/);
  assert.match(reportContent, /mine-failures/);
});

test("a misconfigured crew repo skips cleanly (no error, no throw) — resilience, not a stage failure", async () => {
  const repo = await makeTmpRepo("lc-ac2-bad-crew-");
  await seedFailure(repo);
  const config = learningLoopConfig();
  config.loop.crewRepoPath = path.join(repo, "does-not-exist");

  const result = await runLearningCycle(repo, config);

  assert.ok(result);
  assert.equal(result!.errors.length, 0);
  assert.equal(result!.specResults.length, 1);
  assert.equal(result!.specResults[0]!.status, "skipped");
  assert.match(result!.specResults[0]!.reason ?? "", /crew repo not configured\/found/);
});

// ---------------------------------------------------------------------------
// AC-4: re-running the same window is idempotent — no duplicate lessons or specs
// ---------------------------------------------------------------------------

test("runLearningCycle re-run over the same window writes no duplicate lessons or specs", async () => {
  const repo = await makeTmpRepo("lc-ac4-");
  await seedFailure(repo);
  await seedFailure(repo);
  const crewRepo = await makeCrewRepo("reviewer");
  const config = learningLoopConfig();
  config.loop.crewRepoPath = crewRepo;

  const first = await runLearningCycle(repo, config);
  assert.equal(first!.lessonsWritten.length, 1);
  assert.equal(first!.specResults[0]!.status, "written");

  const second = await runLearningCycle(repo, config);
  assert.equal(second!.lessonsWritten.length, 0, "no duplicate candidate lesson on re-run");
  assert.equal(second!.specResults[0]!.status, "skipped");
  assert.match(second!.specResults[0]!.reason ?? "", /already present/);

  const evalSpec = await fs.readFile(
    path.join(crewRepo, "evals", "agents", "crew-reviewer.yaml"),
    "utf8"
  );
  const occurrences = evalSpec.split("manufactured: true").length - 1;
  assert.equal(occurrences, 1, "eval-spec must not accumulate a duplicate manufactured test");
});

// ---------------------------------------------------------------------------
// AC-5: volume caps — processes only up to the cap, and the report records drops
// ---------------------------------------------------------------------------

test("runLearningCycle honors maxClustersPerRun / maxSpecsPerRun and records what was dropped", async () => {
  const repo = await makeTmpRepo("lc-ac5-");
  await seedFailure(repo, { failure_class: "review_fail", root_cause: "cause A" });
  await seedFailure(repo, { failure_class: "validation_fail", root_cause: "cause B" });
  await seedFailure(repo, { failure_class: "hallucinated_ref", root_cause: "cause C" });
  await seedFailure(repo, { failure_class: "bad_patch", root_cause: "cause D" });

  const result = await runLearningCycle(
    repo,
    learningLoopConfig({ maxClustersPerRun: 2, maxSpecsPerRun: 1 })
  );

  assert.ok(result);
  assert.equal(result!.clustersFound, 4);
  assert.equal(result!.clustersProcessed, 2);
  assert.equal(result!.clustersDroppedByCap, 2);
  assert.equal(result!.specsConsidered, 1);
  assert.equal(result!.specsDroppedByCap, 1);

  const reportContent = await fs.readFile(result!.reportPath, "utf8");
  assert.match(reportContent, /Dropped by `maxClustersPerRun` cap: 2/);
  assert.match(reportContent, /Dropped by `maxSpecsPerRun` cap: 1/);
});

// ---------------------------------------------------------------------------
// CLI wiring: `loop.mts learn` subcommand
// ---------------------------------------------------------------------------

async function tmpCliRepo(prefix: string, loopConfig: Record<string, unknown>): Promise<string> {
  const repo = await makeTmpRepo(prefix);
  await fs.writeFile(path.join(repo, ".claude/loop.json"), JSON.stringify({ loop: loopConfig }));
  return repo;
}

test("CLI `learn` subcommand is a no-op when learningLoop is not enabled", async () => {
  const repo = await tmpCliRepo("lc-cli-learn-off-", {});
  const proc = Bun.spawn(["bun", LOOP_CLI, "learn", "--repo", repo], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  assert.equal(code, 0, `expected exit 0; stderr=${stderr}`);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.skipped, true);
});

test("CLI `learn` subcommand runs a live cycle when enabled and writes the report", async () => {
  const repo = await tmpCliRepo("lc-cli-learn-on-", { learningLoop: { enabled: true } });
  await seedFailure(repo);

  const proc = Bun.spawn(["bun", LOOP_CLI, "learn", "--repo", repo], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  assert.equal(code, 0, `expected exit 0; stderr=${stderr}`);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.clustersProcessed, 1);
  assert.ok(await fs.readFile(parsed.reportPath, "utf8"));
});

// ---------------------------------------------------------------------------
// DEC-070: retrospective completion triggers a learning cycle
// ---------------------------------------------------------------------------

test("CLI `retrospective` fires a learning cycle when learningLoop is enabled (DEC-070)", async () => {
  const repo = await tmpCliRepo("lc-cli-retro-on-", { learningLoop: { enabled: true } });
  await seedFailure(repo);

  const proc = Bun.spawn(["bun", LOOP_CLI, "retrospective", "--repo", repo], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  assert.equal(code, 0, `expected exit 0; stderr=${stderr}`);
  const parsed = JSON.parse(stdout);
  assert.ok(parsed.learningCycle, "expected a non-null learningCycle result");
  assert.equal(parsed.learningCycle.clustersProcessed, 1);
});

test("CLI `retrospective` learningCycle stays null when learningLoop is not enabled", async () => {
  const repo = await tmpCliRepo("lc-cli-retro-off-", {});

  const proc = Bun.spawn(["bun", LOOP_CLI, "retrospective", "--repo", repo], {
    stdout: "pipe",
    stderr: "pipe"
  });
  const code = await proc.exited;
  const stdout = await new Response(proc.stdout).text();
  const stderr = await new Response(proc.stderr).text();
  assert.equal(code, 0, `expected exit 0; stderr=${stderr}`);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.learningCycle, null);
});

// ---------------------------------------------------------------------------
// AC-6: the cadence decision is recorded
// ---------------------------------------------------------------------------

// DEC-070.md was runner-plugin's own dogfood decision record — deliberately
// excluded from the dev-crew tree at the SLICE-04 subtree import (see that
// slice's handoff). The self-check asserting its presence no longer applies
// here and was removed rather than ported.

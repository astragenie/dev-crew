// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

import { makeTmpRepo } from "./_fixtures.mjs";
import type { FailureCluster } from "../scripts/lib/failure-classifier.mjs";
import {
  computeClusterHash,
  generateEvalsForClusters,
  FAILURE_CLASS_AGENT_MAP
} from "../scripts/lib/eval-generator.mjs";

const SEED_TEST_BLOCK = [
  "tests:",
  "  - name: seed-hand-authored",
  "    fixture: file://evals/fixtures/seed.txt",
  "    assert:",
  "      - type: llm-rubric",
  '        rubric: "seed rubric"',
  ""
].join("\n");

/** Sibling "crew" (dev-team) checkout fixture — separate from the loop repo under test. */
async function makeCrewRepo(prefix = "crew-fixture-"): Promise<string> {
  const crewRepo = await makeTmpRepo(prefix);
  await fs.mkdir(path.join(crewRepo, "evals", "agents"), { recursive: true });
  return crewRepo;
}

async function seedEvalSpec(
  crewRepo: string,
  agent: string,
  extra: { trailingKey?: boolean } = {}
): Promise<string> {
  const file = path.join(crewRepo, "evals", "agents", `crew-${agent}.yaml`);
  const trailing = extra.trailingKey ? "\nbudget:\n  daily_cap_usd: 5.00\n" : "";
  await fs.writeFile(file, `prompt_id: ${agent}\n${SEED_TEST_BLOCK}${trailing}`);
  return file;
}

function makeCluster(overrides: Partial<FailureCluster> = {}): FailureCluster {
  return {
    failure_class: "review_fail",
    count: 3,
    exemplar_ids: ["SLICE-01@2026-07-01T00:00:00.000Z"],
    first_seen: "2026-07-01T00:00:00.000Z",
    last_seen: "2026-07-02T00:00:00.000Z",
    representative_root_cause: "reviewer approved a diff that broke the AC-2 contract",
    representative_fix: "reviewer must re-check every AC line against the diff before approving",
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// computeClusterHash — pure dedup-key helper
// ---------------------------------------------------------------------------

test("computeClusterHash is deterministic and reuses normalizeRootCause", () => {
  const a = computeClusterHash("review_fail", "  Some Root   Cause  ");
  const b = computeClusterHash("review_fail", "some root cause");
  assert.equal(a, b);
  assert.equal(a.length, 16);
});

test("computeClusterHash differs across failure_class and root cause", () => {
  const a = computeClusterHash("review_fail", "same cause");
  const b = computeClusterHash("validation_fail", "same cause");
  const c = computeClusterHash("review_fail", "different cause");
  assert.notEqual(a, b);
  assert.notEqual(a, c);
});

// ---------------------------------------------------------------------------
// AC-1 / AC-2: valid append, provenance + manufactured marker + traceable rubric
// ---------------------------------------------------------------------------

test("generateEvalsForClusters appends a manufactured test entry with provenance and marker", async () => {
  const repo = await makeTmpRepo("eg-ac1-");
  const crewRepo = await makeCrewRepo();
  const targetFile = await seedEvalSpec(crewRepo, "reviewer");
  const cluster = makeCluster();

  const results = await generateEvalsForClusters(repo, [cluster], {
    config: { loop: { crewRepoPath: crewRepo } },
    nowIso: "2026-07-06T00:00:00.000Z"
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]!.status, "written");
  assert.equal(results[0]!.agent, "reviewer");
  assert.equal(results[0]!.targetFile, targetFile);
  const expectedHash = computeClusterHash(cluster.failure_class, cluster.representative_root_cause);
  assert.equal(results[0]!.clusterHash, expectedHash);

  const updated = await fs.readFile(targetFile, "utf8");
  assert.match(updated, new RegExp(`name: manufactured-review_fail-${expectedHash}`));
  assert.match(updated, /manufactured: true/);
  assert.match(updated, /provenance:\s*\n\s+generator: loop-eval-generator/);
  assert.match(updated, /failure_class: review_fail/);
  assert.match(updated, new RegExp(`cluster_hash: ${expectedHash}`));
  assert.match(updated, /source_run_id: SLICE-01@2026-07-01T00:00:00\.000Z/);
  assert.match(updated, /generated_at: 2026-07-06T00:00:00\.000Z/);
  assert.match(
    updated,
    new RegExp(`fixture: file://evals/fixtures/manufactured-${expectedHash}\\.txt`)
  );
  assert.match(updated, /type: llm-rubric/);
  // AC-2: rubric traceable to representative_fix.
  assert.match(updated, /reviewer must re-check every AC line against the diff before approving/);

  // The manufactured fixture itself was written alongside the YAML edit.
  const fixturePath = path.join(crewRepo, "evals", "fixtures", `manufactured-${expectedHash}.txt`);
  const fixtureContent = await fs.readFile(fixturePath, "utf8");
  assert.match(fixtureContent, /reviewer approved a diff that broke the AC-2 contract/);

  // AC-5: hand-authored entry survives untouched, same tests: array.
  assert.match(updated, /name: seed-hand-authored/);
});

// ---------------------------------------------------------------------------
// AC-3: idempotent on cluster_hash
// ---------------------------------------------------------------------------

test("generateEvalsForClusters is idempotent — second run on the same cluster skips with no duplicate", async () => {
  const repo = await makeTmpRepo("eg-ac3-");
  const crewRepo = await makeCrewRepo();
  const targetFile = await seedEvalSpec(crewRepo, "reviewer");
  const cluster = makeCluster();
  const opts = { config: { loop: { crewRepoPath: crewRepo } } };

  const first = await generateEvalsForClusters(repo, [cluster], opts);
  assert.equal(first[0]!.status, "written");

  const second = await generateEvalsForClusters(repo, [cluster], opts);
  assert.equal(second[0]!.status, "skipped");
  assert.match(second[0]!.reason ?? "", /already present.*AC-3/);

  const finalContent = await fs.readFile(targetFile, "utf8");
  const occurrences = finalContent.split("name: manufactured-review_fail-").length - 1;
  assert.equal(occurrences, 1);
});

// ---------------------------------------------------------------------------
// AC-4: unmapped failure_class skips without malformed output; never throws
// ---------------------------------------------------------------------------

test("unmapped failure_class skips with a logged reason and writes nothing", async () => {
  const repo = await makeTmpRepo("eg-ac4-unmapped-");
  const crewRepo = await makeCrewRepo();
  await seedEvalSpec(crewRepo, "reviewer");
  const cluster = makeCluster({
    failure_class: "bad_tool_use",
    representative_root_cause: "wrong tool used"
  });

  const results = await generateEvalsForClusters(repo, [cluster], {
    config: { loop: { crewRepoPath: crewRepo } }
  });

  assert.equal(results[0]!.status, "skipped");
  assert.match(results[0]!.reason ?? "", /no mapped agent-under-test/);
  assert.equal(results[0]!.agent, undefined);

  const fixturesDir = path.join(crewRepo, "evals", "fixtures");
  await assert.rejects(fs.stat(fixturesDir));
});

test("all 5 unmapped failure classes skip; all 4 mapped classes resolve to the DEC-068 agent table", () => {
  const mapped: Record<string, string> = {
    review_fail: "reviewer",
    validation_fail: "verifier",
    hallucinated_ref: "refactor",
    bad_patch: "fullstack-dev"
  };
  const unmapped = [
    "bad_tool_use",
    "ignored_policy",
    "stale_context",
    "subagent_incomplete",
    "other"
  ];
  for (const [failureClass, agent] of Object.entries(mapped)) {
    assert.equal(FAILURE_CLASS_AGENT_MAP[failureClass as never], agent);
  }
  for (const failureClass of unmapped) {
    assert.equal(FAILURE_CLASS_AGENT_MAP[failureClass as never], undefined);
  }
});

test("missing target agent eval-spec file skips cleanly instead of throwing", async () => {
  const repo = await makeTmpRepo("eg-ac4-missing-file-");
  const crewRepo = await makeCrewRepo(); // evals/agents/ exists but crew-fullstack-dev.yaml does not
  const cluster = makeCluster({
    failure_class: "bad_patch",
    representative_root_cause: "patch dropped an unrelated file's changes"
  });

  const results = await generateEvalsForClusters(repo, [cluster], {
    config: { loop: { crewRepoPath: crewRepo } }
  });

  assert.equal(results[0]!.status, "skipped");
  assert.equal(results[0]!.agent, "fullstack-dev");
  assert.match(results[0]!.reason ?? "", /target eval-spec file not found/);
});

// ---------------------------------------------------------------------------
// DEC-068 §7 — absent/missing loop.crewRepoPath skips ALL clusters, never throws
// ---------------------------------------------------------------------------

test("absent loop.crewRepoPath config skips every cluster with a logged reason", async () => {
  const repo = await makeTmpRepo("eg-no-config-");
  const clusters = [makeCluster(), makeCluster({ failure_class: "validation_fail" })];

  const results = await generateEvalsForClusters(repo, clusters, {});

  assert.equal(results.length, 2);
  for (const r of results) {
    assert.equal(r.status, "skipped");
    assert.match(r.reason ?? "", /crew repo not configured\/found/);
  }
});

test("configured crewRepoPath with no evals/agents dir skips cleanly", async () => {
  const repo = await makeTmpRepo("eg-bad-crewrepo-");
  const bogusCrewRepo = await makeTmpRepo("eg-bogus-crew-"); // no evals/agents subdir

  const results = await generateEvalsForClusters(repo, [makeCluster()], {
    config: { loop: { crewRepoPath: bogusCrewRepo } }
  });

  assert.equal(results[0]!.status, "skipped");
  assert.match(results[0]!.reason ?? "", /crew repo not configured\/found/);
});

// ---------------------------------------------------------------------------
// Routing (DEC-068 §3): append into the existing file, never fork a new one
// ---------------------------------------------------------------------------

test("appends before a trailing top-level key instead of engulfing it", async () => {
  const repo = await makeTmpRepo("eg-trailing-key-");
  const crewRepo = await makeCrewRepo();
  const targetFile = await seedEvalSpec(crewRepo, "verifier", { trailingKey: true });
  const cluster = makeCluster({
    failure_class: "validation_fail",
    representative_root_cause: "validator passed a run with a failing AC"
  });

  const results = await generateEvalsForClusters(repo, [cluster], {
    config: { loop: { crewRepoPath: crewRepo } }
  });
  assert.equal(results[0]!.status, "written");

  const updated = await fs.readFile(targetFile, "utf8");
  const manufacturedIdx = updated.indexOf("manufactured: true");
  const budgetIdx = updated.indexOf("budget:");
  assert.ok(manufacturedIdx > -1 && budgetIdx > -1);
  assert.ok(
    manufacturedIdx < budgetIdx,
    "manufactured entry must land inside tests:, before the trailing key"
  );
});

test("no second file is ever created for an agent that already has one", async () => {
  const repo = await makeTmpRepo("eg-no-fork-");
  const crewRepo = await makeCrewRepo();
  await seedEvalSpec(crewRepo, "reviewer");

  await generateEvalsForClusters(repo, [makeCluster()], {
    config: { loop: { crewRepoPath: crewRepo } }
  });

  const agentsDir = path.join(crewRepo, "evals", "agents");
  const entries = await fs.readdir(agentsDir);
  assert.deepEqual(entries, ["crew-reviewer.yaml"]);
});

// ---------------------------------------------------------------------------
// Batch behavior — one bad cluster never aborts the rest
// ---------------------------------------------------------------------------

test("a batch with mixed mapped/unmapped clusters resolves each independently", async () => {
  const repo = await makeTmpRepo("eg-batch-");
  const crewRepo = await makeCrewRepo();
  await seedEvalSpec(crewRepo, "reviewer");
  await seedEvalSpec(crewRepo, "verifier");

  const clusters = [
    makeCluster({ failure_class: "review_fail" }),
    makeCluster({ failure_class: "other", representative_root_cause: "unclassifiable" }),
    makeCluster({
      failure_class: "validation_fail",
      representative_root_cause: "validator missed a regression"
    })
  ];

  const results = await generateEvalsForClusters(repo, clusters, {
    config: { loop: { crewRepoPath: crewRepo } }
  });

  assert.equal(results.length, 3);
  assert.equal(results[0]!.status, "written");
  assert.equal(results[1]!.status, "skipped");
  assert.equal(results[2]!.status, "written");
});

// ---------------------------------------------------------------------------
// AC-6: the contract decision is recorded
// ---------------------------------------------------------------------------

test("DEC-068 contract record exists for FEAT-222", async () => {
  const decPath = path.resolve("./.claude/artifacts/loop/decisions/DEC-068.md");
  const raw = await fs.readFile(decPath, "utf8");
  assert.match(raw, /status: accepted/);
  assert.match(raw, /FEAT-222/);
});

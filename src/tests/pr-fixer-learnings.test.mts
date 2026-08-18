// FEAT-188 / S1b — AC-2: runner:pr-fix circuit-breaker trips are captured
// into the persistent learnings store (reuses learnings.mts::logLearning —
// the same store + astramem mirror grade-writer.mts already uses). This was
// genuinely absent before S1b: the bridge's event table had no pr-fix event.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { runPrFix } from "../scripts/lib/pr-fixer.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  return repo;
}

async function readLearnings(repo: string) {
  const learningsPath = path.join(repo, ".claude/artifacts/loop/learnings.jsonl");
  try {
    const raw = await fs.readFile(learningsPath, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch {
    return [];
  }
}

function mockGhExecWithFailure() {
  return () =>
    JSON.stringify({
      title: "Test PR",
      state: "OPEN",
      statusCheckRollup: [{ name: "test", conclusion: "FAILURE" }],
      reviews: [],
      comments: []
    });
}

test("runPrFix captures a learnings entry when a category's circuit breaker trips", async () => {
  const repo = await tmpRepo("prfix-learnings-trip-");
  const result = await runPrFix(repo, 42, {
    ghExec: mockGhExecWithFailure(),
    maxAttemptsPerCategory: 3,
    priorAttempts: { test_failure: 3 },
    config: { stack: {} }
  });

  const plan = result.plans.find((p: any) => p.category === "test_failure");
  assert.ok(plan?.circuitBroken, "expected the test_failure plan to be circuit-broken");

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 1);
  assert.match(entries[0].insight, /Circuit breaker tripped for "test_failure" on PR #42/);
  assert.equal(entries[0].source, "pr-fix");
  assert.deepEqual(entries[0].tags, ["pr-fix", "circuit-breaker", "test_failure"]);
});

test("runPrFix does not capture when no category is circuit-broken", async () => {
  const repo = await tmpRepo("prfix-learnings-notrip-");
  await runPrFix(repo, 43, {
    ghExec: mockGhExecWithFailure(),
    maxAttemptsPerCategory: 3,
    priorAttempts: { test_failure: 1 },
    config: { stack: {} }
  });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 0);
});

test("runPrFix re-polling the same tripped category does not duplicate the learnings row", async () => {
  const repo = await tmpRepo("prfix-learnings-dedupe-");
  const opts = {
    ghExec: mockGhExecWithFailure(),
    maxAttemptsPerCategory: 3,
    priorAttempts: { test_failure: 3 },
    config: { stack: {} }
  };
  await runPrFix(repo, 44, opts);
  await runPrFix(repo, 44, opts);

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 1, "re-polling an unchanged trip must not duplicate");
});

test("runPrFix skips capture entirely when no config is supplied (test/back-compat safety)", async () => {
  const repo = await tmpRepo("prfix-learnings-noconfig-");
  await runPrFix(repo, 45, {
    ghExec: mockGhExecWithFailure(),
    maxAttemptsPerCategory: 3,
    priorAttempts: { test_failure: 3 }
  });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 0, "no config supplied means no filesystem side effect");
});

test("runPrFix skips capture when learnings-capture feature is explicitly disabled", async () => {
  const repo = await tmpRepo("prfix-learnings-disabled-");
  await runPrFix(repo, 46, {
    ghExec: mockGhExecWithFailure(),
    maxAttemptsPerCategory: 3,
    priorAttempts: { test_failure: 3 },
    config: { features: { "learnings-capture": { enabled: false } } }
  });

  const entries = await readLearnings(repo);
  assert.equal(entries.length, 0);
});

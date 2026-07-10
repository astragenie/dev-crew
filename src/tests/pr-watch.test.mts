// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  readPrWatchConfig,
  parsePrState,
  parsePrMergeInfo,
  parseChecks,
  classifyChecks,
  buildBuilderPrompt,
  runPrWatch
} from "../scripts/lib/pr-watch.mjs";

// ---------------------------------------------------------------------------
// Helpers

const TEST_PR_URL = "https://github.com/o/r/pull/1";

function makeExec(overrides = {}) {
  return {
    viewPr: async () => JSON.stringify({ state: "OPEN", title: "my PR" }),
    listChecks: async () =>
      JSON.stringify([{ name: "ci", status: "success", conclusion: "success", detailsUrl: "" }]),
    fetchLog: async () => "",
    dispatchBuilder: async () => 0,
    listReviews: async () => JSON.stringify({ reviews: [] }),
    sleep: async () => {},
    ...overrides
  };
}

const BASE_CONFIG = {
  pollIntervalSeconds: 30,
  maxRetries: 3,
  maxCostUsd: 5.0,
  postGreenMergePolls: 3
};

// ---------------------------------------------------------------------------
// TC-001 — Happy path: all-green on first poll

test("TC-001: all-green on first poll", async () => {
  const exec = makeExec();
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec);
  assert.equal(result.outcome, "all-green");
});

// ---------------------------------------------------------------------------
// TC-002 — PR already merged before first poll

test("TC-002: PR already merged before first poll", async () => {
  let listChecksCalled = false;
  const exec = makeExec({
    viewPr: async () =>
      JSON.stringify({
        state: "MERGED",
        title: "my PR",
        mergedAt: "2026-07-09T09:30:00.000Z",
        number: 42
      }),
    listChecks: async () => {
      listChecksCalled = true;
      return JSON.stringify([]);
    }
  });
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec);
  assert.equal(result.outcome, "pr-merged");
  assert.equal(listChecksCalled, false);
  if (result.outcome === "pr-merged") {
    assert.equal(result.mergedAt, "2026-07-09T09:30:00.000Z");
    assert.equal(result.prNumber, 42);
  }
});

test("TC-002b: PR merged without mergedAt/number in gh output degrades to null", async () => {
  const exec = makeExec({
    viewPr: async () => JSON.stringify({ state: "MERGED", title: "my PR" })
  });
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec);
  assert.equal(result.outcome, "pr-merged");
  if (result.outcome === "pr-merged") {
    assert.equal(result.mergedAt, null);
    assert.equal(result.prNumber, null);
  }
});

// ---------------------------------------------------------------------------
// TC-011..013 — waitForMergeAfterGreen (FEAT-494 unblock: pr.merged on the
// real GitHub-native-auto-merge lifecycle, not just "already merged before
// the first poll").

test("TC-011: waitForMergeAfterGreen defaults to false — all-green with no extra viewPr calls", async () => {
  let viewPrCalls = 0;
  const exec = makeExec({
    viewPr: async () => {
      viewPrCalls++;
      return JSON.stringify({ state: "OPEN", title: "my PR" });
    }
  });
  // 4th positional arg omitted — exercises the default.
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec);
  assert.equal(result.outcome, "all-green");
  assert.equal(viewPrCalls, 1, "no post-green viewPr polling when the flag is not passed");
});

test("TC-012: waitForMergeAfterGreen=true detects a merge that completes shortly after checks go green", async () => {
  let viewPrCalls = 0;
  const exec = makeExec({
    viewPr: async () => {
      viewPrCalls++;
      // 1st call: initial state check (OPEN). 2nd call: post-green poll — merged by now.
      if (viewPrCalls === 1) {
        return JSON.stringify({ state: "OPEN", title: "my PR" });
      }
      return JSON.stringify({
        state: "MERGED",
        title: "my PR",
        mergedAt: "2026-07-09T09:31:00.000Z",
        number: 55
      });
    }
  });
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec, true);
  assert.equal(result.outcome, "pr-merged");
  assert.equal(viewPrCalls, 2);
  if (result.outcome === "pr-merged") {
    assert.equal(result.mergedAt, "2026-07-09T09:31:00.000Z");
    assert.equal(result.prNumber, 55);
  }
});

test("TC-013: waitForMergeAfterGreen=true exhausts postGreenMergePolls and falls back to all-green", async () => {
  let viewPrCalls = 0;
  const exec = makeExec({
    viewPr: async () => {
      viewPrCalls++;
      return JSON.stringify({ state: "OPEN", title: "my PR" });
    }
  });
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec, true);
  assert.equal(result.outcome, "all-green");
  // 1 initial state check + postGreenMergePolls (3) post-green polls.
  assert.equal(viewPrCalls, 1 + BASE_CONFIG.postGreenMergePolls);
});

test("TC-013b: readPrWatchConfig defaults postGreenMergePolls to 3", () => {
  const config = readPrWatchConfig(null);
  assert.equal(config.postGreenMergePolls, 3);
});

test("TC-013c: readPrWatchConfig honors a configured postGreenMergePolls", () => {
  const config = readPrWatchConfig({
    loop: { prWatch: { postGreenMergePolls: 1 } }
  });
  assert.equal(config.postGreenMergePolls, 1);
});

// ---------------------------------------------------------------------------
// TC-003 — Max retries reached

test("TC-003: max retries reached", async () => {
  let dispatchCount = 0;
  const exec = makeExec({
    listChecks: async () =>
      JSON.stringify([{ name: "lint", status: "failure", conclusion: "failure", detailsUrl: "" }]),
    dispatchBuilder: async () => {
      dispatchCount++;
      return 0.5;
    }
  });
  const config = { pollIntervalSeconds: 10, maxRetries: 2, maxCostUsd: 5.0 };
  const result = await runPrWatch(TEST_PR_URL, config, false, exec);
  assert.equal(result.outcome, "max-retries");
  assert.equal(result.retriesUsed, 2);
  assert.equal(dispatchCount, 2);
});

// ---------------------------------------------------------------------------
// TC-004 — Cost ceiling exceeded after one dispatch

test("TC-004: cost ceiling exceeded after one dispatch", async () => {
  const exec = makeExec({
    listChecks: async () =>
      JSON.stringify([{ name: "test", status: "failure", conclusion: "failure", detailsUrl: "" }]),
    dispatchBuilder: async () => 6.0
  });
  const config = { pollIntervalSeconds: 10, maxRetries: 3, maxCostUsd: 5.0 };
  const result = await runPrWatch(TEST_PR_URL, config, false, exec);
  assert.equal(result.outcome, "cost-exceeded");
  assert.equal(result.cumulativeCostUsd, 6.0);
});

// ---------------------------------------------------------------------------
// TC-005 — PR closed during watch

test("TC-005: PR closed during watch", async () => {
  const exec = makeExec({
    viewPr: async () => JSON.stringify({ state: "CLOSED", title: "t" })
  });
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec);
  assert.equal(result.outcome, "pr-closed");
});

// ---------------------------------------------------------------------------
// TC-006 — Unknown check status does not increment retry counter

test("TC-006: unknown check status does not increment retry counter", async () => {
  let callCount = 0;
  let dispatchCalled = false;
  const exec = makeExec({
    listChecks: async () => {
      callCount++;
      if (callCount === 1) {
        return JSON.stringify([{ name: "x", status: "", conclusion: null, detailsUrl: "" }]);
      }
      return JSON.stringify([
        { name: "ci", status: "success", conclusion: "success", detailsUrl: "" }
      ]);
    },
    dispatchBuilder: async () => {
      dispatchCalled = true;
      return 0;
    }
  });
  const config = { pollIntervalSeconds: 10, maxRetries: 1, maxCostUsd: 5.0 };
  const result = await runPrWatch(TEST_PR_URL, config, false, exec);
  assert.equal(result.outcome, "all-green");
  assert.equal(dispatchCalled, false);
});

// ---------------------------------------------------------------------------
// TC-007 — Empty check suite exits cleanly

test("TC-007: empty check suite exits cleanly", async () => {
  let dispatchCalled = false;
  const exec = makeExec({
    listChecks: async () => JSON.stringify([]),
    dispatchBuilder: async () => {
      dispatchCalled = true;
      return 0;
    }
  });
  const result = await runPrWatch(TEST_PR_URL, BASE_CONFIG, false, exec);
  assert.equal(result.outcome, "no-checks");
  assert.equal(dispatchCalled, false);
});

// ---------------------------------------------------------------------------
// TC-008 — pollIntervalSeconds < 10 is clamped

test("TC-008: pollIntervalSeconds < 10 is clamped to 10", () => {
  const config = readPrWatchConfig({
    loop: { prWatch: { pollIntervalSeconds: 5, maxRetries: 3, maxCostUsd: 5.0 } }
  });
  assert.equal(config.pollIntervalSeconds, 10);
});

// ---------------------------------------------------------------------------
// TC-009 — maxRetries = 0 (poll-only mode), failing then success, no dispatch

test("TC-009: maxRetries=0 poll-only mode never dispatches builder", async () => {
  let callCount = 0;
  let dispatchCalled = false;
  const exec = makeExec({
    listChecks: async () => {
      callCount++;
      if (callCount === 1) {
        return JSON.stringify([
          { name: "lint", status: "failure", conclusion: "failure", detailsUrl: "" }
        ]);
      }
      return JSON.stringify([
        { name: "lint", status: "success", conclusion: "success", detailsUrl: "" }
      ]);
    },
    dispatchBuilder: async () => {
      dispatchCalled = true;
      return 0;
    }
  });
  const config = { pollIntervalSeconds: 10, maxRetries: 0, maxCostUsd: 5.0 };
  const result = await runPrWatch(TEST_PR_URL, config, false, exec);
  assert.equal(result.outcome, "all-green");
  assert.equal(dispatchCalled, false);
});

// ---------------------------------------------------------------------------
// TC-010 — classifyChecks with mixed known and unknown statuses

test("TC-010: classifyChecks returns pending for mixed known/unknown statuses", () => {
  const checks = [
    { name: "a", status: "success", conclusion: "success", detailsUrl: "" },
    { name: "b", status: "queued", conclusion: null, detailsUrl: "" }
  ];
  const result = classifyChecks(checks);
  assert.equal(result, "pending");
});

// ---------------------------------------------------------------------------
// Extra unit tests for pure functions

test("parsePrState returns OPEN for open PR", () => {
  const state = parsePrState(JSON.stringify({ state: "OPEN", title: "t" }));
  assert.equal(state, "OPEN");
});

test("parsePrState throws on missing state field", () => {
  assert.throws(
    () => parsePrState(JSON.stringify({ title: "t" })),
    (err) => {
      assert.ok(err.message.includes("state"));
      return true;
    }
  );
});

test("parsePrMergeInfo extracts mergedAt and number", () => {
  const info = parsePrMergeInfo(
    JSON.stringify({ state: "MERGED", mergedAt: "2026-07-09T09:30:00.000Z", number: 99 })
  );
  assert.equal(info.mergedAt, "2026-07-09T09:30:00.000Z");
  assert.equal(info.prNumber, 99);
});

test("parsePrMergeInfo returns nulls when fields are absent", () => {
  const info = parsePrMergeInfo(JSON.stringify({ state: "MERGED" }));
  assert.equal(info.mergedAt, null);
  assert.equal(info.prNumber, null);
});

test("parsePrMergeInfo returns nulls on unparsable JSON instead of throwing", () => {
  const info = parsePrMergeInfo("not json");
  assert.equal(info.mergedAt, null);
  assert.equal(info.prNumber, null);
});

test("parseChecks returns empty array for empty JSON array", () => {
  const checks = parseChecks("[]");
  assert.deepEqual(checks, []);
});

test("parseChecks throws on non-array JSON", () => {
  assert.throws(
    () => parseChecks(JSON.stringify({ name: "x" })),
    (err) => {
      assert.ok(err.message.includes("array"));
      return true;
    }
  );
});

test("buildBuilderPrompt excludes human comments when allowHumanComments=false", () => {
  const prompt = buildBuilderPrompt({
    prUrl: TEST_PR_URL,
    failingChecks: [{ name: "lint", logExcerpt: "error here" }],
    humanComments: ["Please fix the indentation"],
    allowHumanComments: false
  });
  assert.ok(!prompt.includes("Please fix the indentation"));
});

test("buildBuilderPrompt includes human comments when allowHumanComments=true", () => {
  const prompt = buildBuilderPrompt({
    prUrl: TEST_PR_URL,
    failingChecks: [{ name: "lint", logExcerpt: "" }],
    humanComments: ["Fix this", "And that"],
    allowHumanComments: true
  });
  assert.ok(prompt.includes("Fix this"));
  assert.ok(prompt.includes("And that"));
});

test("buildBuilderPrompt truncates to max 5 human comments when allowHumanComments=true", () => {
  const comments = ["c1", "c2", "c3", "c4", "c5", "c6"];
  const prompt = buildBuilderPrompt({
    prUrl: TEST_PR_URL,
    failingChecks: [],
    humanComments: comments,
    allowHumanComments: true
  });
  assert.ok(!prompt.includes("c6"));
});

test("readPrWatchConfig returns defaults when config is null", () => {
  const config = readPrWatchConfig(null);
  assert.equal(config.pollIntervalSeconds, 30);
  assert.equal(config.maxRetries, 3);
  assert.equal(config.maxCostUsd, 5.0);
});

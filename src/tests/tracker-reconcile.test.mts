// @ts-nocheck
// runner#427 — `loop github reconcile`: one-time (re-runnable) backlog
// cleanup for the drift `loop github drift` (#485) can detect but never
// acts on. Runner alone carries 125 `done`-but-`OPEN` tracker issues.
//
// Mirrors the DI patterns already established by:
//   - task-store-sync-drift.test.mts (tmpDriftRepo/writeFeat fixtures,
//     ghExec injection, CLI-level runGithubSubcommand assertions)
//   - tracker-close-sync.test.mts (fakeProvider/throwingProvider shape for
//     TaskStoreProvider-level unit tests, never a real gh/Linear call)
//
// Coverage required by the runner#427 dispatch (each bullet maps to at
// least one test below):
//   - dry-run performs ZERO writes (the single most important test here)
//   - --apply closes exactly the identified set
//   - idempotent re-run
//   - soft-fail on a throwing provider
//   - --limit respected
//   - tracker-only issues never touched
//   - done local-only FEATs skipped, live ones published
//   - Noop provider exits cleanly
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  buildReconcilePlan,
  applyReconcilePlan,
  type DriftReport,
  type ReconcilePlan
} from "../scripts/lib/task-store/tracker-reconcile.mjs";
import { runGithubSubcommand } from "../scripts/loop.mjs";

// ---------------------------------------------------------------------------
// Fixtures — shared with task-store-sync-drift.test.mts's conventions.
// ---------------------------------------------------------------------------

async function tmpDriftRepo() {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "gh-reconcile-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({ github: { enabled: true, repo: "org/testrepo" } })
  );
  return repo;
}

async function writeFeat(repo, id, { state = "done", body, extraFm = "" } = {}) {
  const dir = path.join(repo, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(
    filePath,
    `---\nid: ${id}\n${extraFm}---\n${body ?? "## Description\n\nSome feature.\n"}`
  );
  return filePath;
}

function emptyReport(overrides: Partial<DriftReport> = {}): DriftReport {
  return {
    supported: true,
    reason: null,
    checked: 0,
    trackerOnly: [],
    localOnly: [],
    statusMismatches: [],
    bodyDrift: [],
    ...overrides
  };
}

function fakeProvider() {
  const calls: { method: string; args: any[] }[] = [];
  return {
    calls,
    async closeSlice(...args: any[]) {
      calls.push({ method: "closeSlice", args });
    },
    async postSliceComment(...args: any[]) {
      calls.push({ method: "postSliceComment", args });
    },
    async publishFeature(...args: any[]) {
      calls.push({ method: "publishFeature", args });
      return 9001; // fake new issue number
    }
  };
}

function throwingProvider(message = "500 Internal Server Error: tracker unavailable") {
  return {
    async closeSlice() {
      throw new Error(message);
    },
    async postSliceComment() {
      throw new Error(message);
    },
    async publishFeature() {
      throw new Error(message);
    }
  };
}

// A minimal stateful fake `gh` CLI for the CLI-level (runGithubSubcommand)
// tests. Records every invocation so a test can assert "zero mutating calls"
// precisely. Unhandled commands throw (matches task-store-sync-drift.test.mts's
// convention) so an accidental extra call surfaces loudly instead of silently
// returning garbage.
function fakeGhExec(issueListJson: string) {
  const calls: string[][] = [];
  const exec = (args: string[]) => {
    calls.push(args);
    if (args[0] === "--version") return "gh version 2.0";
    if (args[0] === "label" && args[1] === "list") return "[]";
    if (args[0] === "label" && args[1] === "create") return "";
    if (args[0] === "issue" && args[1] === "list") return issueListJson;
    if (args[0] === "issue" && args[1] === "close") return "";
    if (args[0] === "issue" && args[1] === "edit") return "";
    if (args[0] === "issue" && args[1] === "comment") return "";
    if (args[0] === "issue" && args[1] === "create")
      return "https://github.com/org/testrepo/issues/999";
    if (args[0] === "pr" && args[1] === "list") return "[]";
    throw new Error(`unexpected ghExec call: ${JSON.stringify(args)}`);
  };
  exec.calls = calls;
  return exec;
}

function mutatingCalls(calls: string[][]) {
  return calls.filter(
    (c) =>
      (c[0] === "issue" && ["close", "edit", "comment", "create"].includes(c[1])) ||
      (c[0] === "label" && c[1] === "create")
  );
}

// ---------------------------------------------------------------------------
// buildReconcilePlan — pure planning, zero provider calls.
// ---------------------------------------------------------------------------

test("buildReconcilePlan classifies done+OPEN mismatches as close candidates, other shapes stay report-only", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-100", {
    state: "done",
    extraFm: "github_issue: 55\ncompleted_at: 2026-07-01\nslices: [SLICE-100a, SLICE-100b]\n"
  });
  const report = emptyReport({
    statusMismatches: [
      { id: "FEAT-100", number: 55, localStatus: "done", trackerState: "OPEN" },
      { id: "FEAT-101", number: 56, localStatus: "in-progress", trackerState: "CLOSED" }
    ]
  });

  const plan = await buildReconcilePlan(repo, null, report);

  assert.equal(plan.supported, true);
  assert.equal(plan.close.length, 1);
  assert.deepEqual(plan.close[0], {
    id: "FEAT-100",
    number: 55,
    completedAt: "2026-07-01",
    slices: ["SLICE-100a", "SLICE-100b"]
  });
  assert.equal(plan.otherStatusMismatches.length, 1);
  assert.equal(plan.otherStatusMismatches[0].id, "FEAT-101");
});

test("buildReconcilePlan publishes only live local-only FEATs, skips done ones by design", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-200", { state: "pending" }); // live -> publish
  await writeFeat(repo, "FEAT-201", { state: "done" }); // done -> skip, not published

  const report = emptyReport({
    localOnly: [
      { id: "FEAT-200", title: "Live feature" },
      { id: "FEAT-201", title: "Already-shipped feature" }
    ]
  });

  const plan = await buildReconcilePlan(repo, null, report);

  assert.equal(plan.publish.length, 1);
  assert.equal(plan.publish[0].id, "FEAT-200");
  assert.equal(plan.publish[0].status, "pending");
  assert.equal(plan.skippedPublish.length, 1);
  assert.equal(plan.skippedPublish[0].id, "FEAT-201");
  assert.match(plan.skippedPublish[0].reason, /already done/);
});

test("buildReconcilePlan cross-matches local-only FEATs against tracker-only issue titles — re-run after apply is a no-op (idempotency)", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-300", { state: "triaged" });

  // First pass: FEAT-300 has never been published anywhere.
  const before = emptyReport({
    localOnly: [{ id: "FEAT-300", title: "Not yet published" }]
  });
  const plan1 = await buildReconcilePlan(repo, null, before);
  assert.equal(plan1.publish.length, 1);
  assert.equal(plan1.publish[0].id, "FEAT-300");
  assert.equal(plan1.skippedPublish.length, 0);

  // Simulated post-apply state: the tracker now has an issue titled
  // "FEAT-300: ..." (created by the first apply), and checkSyncDrift still
  // reports it under localOnly (reconcile never writes github_issue back to
  // the local file — see the module's idempotency-without-a-local-write
  // contract) AND under trackerOnly (no local match by github_issue).
  const after = emptyReport({
    localOnly: [{ id: "FEAT-300", title: "Not yet published" }],
    trackerOnly: [{ number: 77, title: "FEAT-300: Not yet published" }]
  });
  const plan2 = await buildReconcilePlan(repo, null, after);

  assert.equal(plan2.publish.length, 0, "must not re-publish — a clean no-op re-run");
  assert.equal(plan2.skippedPublish.length, 1);
  assert.match(plan2.skippedPublish[0].reason, /#77/);
  // The matched issue is consumed as a prior-publish match, not surfaced as
  // an unrelated tracker-only issue.
  assert.equal(plan2.trackerOnly.length, 0);
});

test("buildReconcilePlan --limit caps close[] and publish[] independently, never caps skippedPublish/trackerOnly", async () => {
  const repo = await tmpDriftRepo();
  for (const n of [1, 2, 3]) {
    await writeFeat(repo, `FEAT-40${n}`, {
      state: "done",
      extraFm: `github_issue: ${n}\n`
    });
  }
  for (const n of [1, 2, 3]) {
    await writeFeat(repo, `FEAT-41${n}`, { state: "pending" });
  }
  const report = emptyReport({
    statusMismatches: [1, 2, 3].map((n) => ({
      id: `FEAT-40${n}`,
      number: n,
      localStatus: "done",
      trackerState: "OPEN"
    })),
    localOnly: [1, 2, 3].map((n) => ({ id: `FEAT-41${n}`, title: `Live ${n}` })),
    trackerOnly: [{ number: 500, title: "Genuinely tracker-only" }]
  });

  const plan = await buildReconcilePlan(repo, null, report, { limit: 2 });

  assert.equal(plan.close.length, 2);
  assert.equal(plan.publish.length, 2);
  assert.equal(plan.trackerOnly.length, 1, "trackerOnly is report-only and never capped");
});

test("buildReconcilePlan returns the empty/unsupported shape when the drift report itself is unsupported", async () => {
  const repo = await tmpDriftRepo();
  const report = emptyReport({ supported: false, reason: "gh CLI not installed" });

  const plan = await buildReconcilePlan(repo, null, report);

  assert.equal(plan.supported, false);
  assert.equal(plan.reason, "gh CLI not installed");
  assert.deepEqual(plan.close, []);
  assert.deepEqual(plan.publish, []);
});

// ---------------------------------------------------------------------------
// applyReconcilePlan — the only place writes happen. Fake TaskStoreProvider,
// never a real gh/Linear call.
// ---------------------------------------------------------------------------

test("applyReconcilePlan closes exactly the plan's close[] set and publishes exactly the plan's publish[] set — nothing else", async () => {
  const provider = fakeProvider();
  const plan: ReconcilePlan = {
    supported: true,
    reason: null,
    close: [{ id: "FEAT-500", number: 55, completedAt: "2026-07-01", slices: [] }],
    publish: [{ feat: { id: "FEAT-501" }, id: "FEAT-501", title: "Live one", status: "pending" }],
    skippedPublish: [{ id: "FEAT-502", title: "Done one", reason: "already done" }],
    trackerOnly: [{ number: 999, title: "Unrelated" }],
    otherStatusMismatches: []
  };

  const result = await applyReconcilePlan(provider, plan, { sleepMs: 0 });

  assert.equal(result.closed.length, 1);
  assert.equal(result.closed[0].ok, true);
  assert.equal(result.closed[0].number, 55);
  assert.equal(result.published.length, 1);
  assert.equal(result.published[0].ok, true);
  assert.equal(result.published[0].number, 9001);

  const closeCall = provider.calls.find((c) => c.method === "closeSlice");
  assert.ok(closeCall);
  assert.equal(closeCall.args[0], 55);
  const commentCall = provider.calls.find((c) => c.method === "postSliceComment");
  assert.ok(commentCall);
  assert.equal(commentCall.args[0], 55);
  const publishCall = provider.calls.find((c) => c.method === "publishFeature");
  assert.ok(publishCall);
  assert.deepEqual(publishCall.args[0], { id: "FEAT-501" });

  // Nothing beyond the 3 expected calls (close + comment + publish) fired —
  // skippedPublish and trackerOnly items were never touched.
  assert.equal(provider.calls.length, 3);
});

test("applyReconcilePlan soft-fails per item on a throwing provider — records ok:false, never throws, continues to the next item", async () => {
  const provider = throwingProvider();
  const plan: ReconcilePlan = {
    supported: true,
    reason: null,
    close: [
      { id: "FEAT-600", number: 10, completedAt: null, slices: [] },
      { id: "FEAT-601", number: 11, completedAt: null, slices: [] }
    ],
    publish: [],
    skippedPublish: [],
    trackerOnly: [],
    otherStatusMismatches: []
  };

  const result = await applyReconcilePlan(provider, plan, { sleepMs: 0 });

  assert.equal(
    result.closed.length,
    2,
    "both items processed — one item's failure must not abort the batch"
  );
  for (const c of result.closed) {
    assert.equal(c.ok, false);
    assert.match(c.error, /tracker unavailable/);
  }
});

test("applyReconcilePlan never calls the provider for trackerOnly or skippedPublish items — report-only stays report-only", async () => {
  const provider = fakeProvider();
  const plan: ReconcilePlan = {
    supported: true,
    reason: null,
    close: [],
    publish: [],
    skippedPublish: [{ id: "FEAT-700", title: "Done one", reason: "already done" }],
    trackerOnly: [
      { number: 1, title: "Ad-hoc work item A" },
      { number: 2, title: "Ad-hoc work item B" }
    ],
    otherStatusMismatches: []
  };

  const result = await applyReconcilePlan(provider, plan, { sleepMs: 0 });

  assert.equal(provider.calls.length, 0, "zero provider calls for report-only items");
  assert.deepEqual(result.closed, []);
  assert.deepEqual(result.published, []);
});

// ---------------------------------------------------------------------------
// CLI wiring — `loop github reconcile`. Fake gh CLI (execFileSync-shaped),
// never a real network call.
// ---------------------------------------------------------------------------

const DONE_BUT_OPEN_ISSUE = JSON.stringify([
  { number: 55, title: "Still open upstream", state: "OPEN", body: "" }
]);

test("github reconcile subcommand in dry-run (the default, no --apply) makes ZERO mutating gh calls even with drift present", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-800", { state: "done", extraFm: "github_issue: 55\n" });
  await writeFeat(repo, "FEAT-801", { state: "pending" }); // local-only, would publish under --apply

  const ghExec = fakeGhExec(DONE_BUT_OPEN_ISSUE);
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec };

  const result = await runGithubSubcommand(repo, ["reconcile"], {}, config);

  assert.equal(result.applied, false);
  assert.equal(result.close.length, 1, "the plan is still computed and reported in dry-run");
  assert.equal(
    mutatingCalls(ghExec.calls).length,
    0,
    "dry-run must make zero close/comment/create/edit calls"
  );
});

test("github reconcile subcommand with --apply performs exactly the mutating gh calls for the identified close set", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-810", { state: "done", extraFm: "github_issue: 55\n" });

  const ghExec = fakeGhExec(DONE_BUT_OPEN_ISSUE);
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec };

  const result = await runGithubSubcommand(repo, ["reconcile"], { apply: true }, config);

  assert.equal(result.applied, true);
  assert.equal(result.result.closed.length, 1);
  assert.equal(result.result.closed[0].ok, true);
  const closeCall = ghExec.calls.find((c) => c[0] === "issue" && c[1] === "close");
  assert.ok(closeCall, "issue close must have been called");
  assert.equal(closeCall[2], "55");
  const commentCall = ghExec.calls.find((c) => c[0] === "issue" && c[1] === "comment");
  assert.ok(commentCall, "issue comment (evidence) must have been called");
});

test("github reconcile subcommand rejects --dry-run and --apply together", async () => {
  const repo = await tmpDriftRepo();
  const ghExec = fakeGhExec("[]");
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec };

  await assert.rejects(
    () => runGithubSubcommand(repo, ["reconcile"], { dryRun: true, apply: true }, config),
    /mutually exclusive/
  );
});

test("github reconcile subcommand respects --limit", async () => {
  const repo = await tmpDriftRepo();
  await writeFeat(repo, "FEAT-820", { state: "done", extraFm: "github_issue: 20\n" });
  await writeFeat(repo, "FEAT-821", { state: "done", extraFm: "github_issue: 21\n" });

  const twoOpenIssues = JSON.stringify([
    { number: 20, title: "A", state: "OPEN", body: "" },
    { number: 21, title: "B", state: "OPEN", body: "" }
  ]);
  const ghExec = fakeGhExec(twoOpenIssues);
  const config = { github: { enabled: true, repo: "org/testrepo" }, ghExec };

  const result = await runGithubSubcommand(repo, ["reconcile"], { apply: true, limit: 1 }, config);

  assert.equal(result.close.length, 1);
  const closeCalls = ghExec.calls.filter((c) => c[0] === "issue" && c[1] === "close");
  assert.equal(closeCalls.length, 1, "--limit must bound the number of mutating calls too");
});

test("github reconcile subcommand degrades gracefully (no throw) for taskStore.provider=noop", async () => {
  const repo = await tmpDriftRepo();
  const config = { taskStore: { provider: "noop" } };

  const result = await runGithubSubcommand(repo, ["reconcile"], {}, config);

  assert.equal(result.supported, false);
  assert.match(result.reason, /not supported for provider "NoopProvider"/);
});

test("github reconcile subcommand degrades gracefully (no throw) for taskStore.provider=linear", async () => {
  const repo = await tmpDriftRepo();
  const calls: string[][] = [];
  const config = {
    taskStore: { provider: "linear" },
    ghExec: (args: string[]) => {
      calls.push(args);
      return "";
    }
  };

  const result = await runGithubSubcommand(repo, ["reconcile"], {}, config);

  assert.equal(result.supported, false);
  assert.match(result.reason, /not supported for provider "LinearProvider"/);
  assert.equal(calls.length, 0, "must make zero gh calls for a non-github provider");
});

test("github reconcile subcommand on a fully-unconfigured repo resolves silently via NoopProvider, no throw", async () => {
  const repo = await tmpDriftRepo();
  await assert.doesNotReject(() => runGithubSubcommand(repo, ["reconcile"], {}, {}));
  const result = await runGithubSubcommand(repo, ["reconcile"], {}, {});
  assert.equal(result.supported, false);
});

// ─── Regression: duplicate evidence comments on retry (PR #488 review, HIGH) ──
//
// The original closeOneItem wrapped postSliceComment + closeSlice in ONE
// withBackoff closure, with the comment FIRST. A retryable failure in
// closeSlice therefore re-ran the whole closure — reposting the evidence
// comment on every attempt. Across 125 issues that is a lot of duplicate noise
// on the very issues we are tidying up.
//
// Fix: close first (idempotent), comment second, each in its OWN retry scope.

function planWithOneClose(number = 55, id = "FEAT-800") {
  return {
    close: [
      { id, number, localStatus: "done", trackerState: "OPEN", slices: [], completedAt: null }
    ],
    publish: [],
    skippedPublish: [],
    trackerOnly: [],
    otherStatusMismatches: []
  } as any;
}

test("a retried close never reposts the evidence comment (no duplicate comments)", async () => {
  const calls: { method: string; args: any[] }[] = [];
  let closeAttempts = 0;

  const flakyProvider = {
    async closeSlice(...args: any[]) {
      closeAttempts += 1;
      calls.push({ method: "closeSlice", args });
      // Genuine rate-limit error on the first attempt so withBackoff retries.
      if (closeAttempts === 1) throw new Error("API rate limit exceeded");
    },
    async postSliceComment(...args: any[]) {
      calls.push({ method: "postSliceComment", args });
    },
    async publishFeature() {
      return 9001;
    }
  };

  await applyReconcilePlan(flakyProvider as any, planWithOneClose(), { sleepMs: 0 });

  const comments = calls.filter((c) => c.method === "postSliceComment");
  assert.equal(closeAttempts, 2, "close should have been retried exactly once");
  assert.equal(
    comments.length,
    1,
    `evidence comment must post exactly once even though close was retried (got ${comments.length})`
  );

  // Close must precede the comment: a failed comment then leaves a correctly
  // closed issue (cosmetic, re-runnable) rather than an open issue carrying N
  // identical comments.
  const firstClose = calls.findIndex((c) => c.method === "closeSlice");
  const firstComment = calls.findIndex((c) => c.method === "postSliceComment");
  assert.ok(firstClose < firstComment, "closeSlice must run before postSliceComment");
});

test("a bare 403 (permissions, not rate limit) is not retried", async () => {
  let attempts = 0;
  const forbiddenProvider = {
    async closeSlice() {
      attempts += 1;
      throw new Error("403 Forbidden: Resource not accessible by integration");
    },
    async postSliceComment() {},
    async publishFeature() {
      return 1;
    }
  };

  await applyReconcilePlan(forbiddenProvider as any, planWithOneClose(998, "FEAT-998"), {
    sleepMs: 0
  });

  // A permissions failure fails identically on every retry — retrying is
  // pointless, and with a non-idempotent step in the closure it was harmful.
  assert.equal(attempts, 1, "a bare 403 must not be treated as a rate limit and retried");
});

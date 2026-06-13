// @ts-nocheck
// Tests for dispatch-pr-mode.mts — FEAT-173 SLICE-127
// Uses _internals injection to stub git/gh subprocess calls.

import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  dispatchFinalizePr,
  _internals,
  type PrChild,
  type PrResult
} from "../scripts/lib/dispatch-pr-mode.mjs";

const REPO = "/tmp/fake-repo";

// ---------------------------------------------------------------------------
// Helper: build a stub child
// ---------------------------------------------------------------------------

function makeChild(overrides: Partial<PrChild> & { branch: string }): PrChild {
  return {
    branch: overrides.branch,
    worktreePath: overrides.worktreePath ?? `/tmp/wt-${overrides.branch}`,
    status: overrides.status ?? "DONE"
  };
}

// ---------------------------------------------------------------------------
// Test 1: Single DONE child — calls git push + gh pr create with correct args;
//         returns PrResult with mocked URL.
// ---------------------------------------------------------------------------

test("dispatchFinalizePr: single DONE child pushes branch and creates PR", async () => {
  const gitCalls: Array<{ args: string[]; cwd: string }> = [];
  const ghCalls: Array<{ args: string[]; cwd: string }> = [];

  const origGit = _internals.execGit;
  const origGh = _internals.execGh;

  _internals.execGit = (args: string[], cwd: string): string => {
    gitCalls.push({ args, cwd });
    if (args[0] === "log" && args[1] === "-1") return "feat: my commit title";
    if (args[0] === "log" && args[2] === "main..HEAD") return "abc1234 feat: my commit title";
    return "";
  };
  _internals.execGh = (args: string[], cwd: string): string => {
    ghCalls.push({ args, cwd });
    return "https://github.com/owner/repo/pull/42";
  };

  try {
    const child = makeChild({ branch: "feat/FEAT-173-A", status: "DONE" });
    const results: PrResult[] = await dispatchFinalizePr([child], REPO);

    assert.equal(results.length, 1);
    assert.equal(results[0]!.branch, "feat/FEAT-173-A");
    assert.equal(results[0]!.prUrl, "https://github.com/owner/repo/pull/42");
    assert.equal(results[0]!.error, undefined);

    // Verify git push was called with correct args
    const pushCall = gitCalls.find((c) => c.args[0] === "push");
    assert.ok(pushCall, "git push must be called");
    assert.deepEqual(pushCall!.args, ["push", "origin", "feat/FEAT-173-A"]);

    // Verify gh pr create was called
    assert.equal(ghCalls.length, 1);
    const ghArgs = ghCalls[0]!.args;
    assert.equal(ghArgs[0], "pr");
    assert.equal(ghArgs[1], "create");
    assert.ok(ghArgs.includes("--title"), "must pass --title");
    assert.ok(ghArgs.includes("--body"), "must pass --body");
    assert.ok(ghArgs.includes("--head"), "must pass --head");
    assert.ok(ghArgs.includes("--base"), "must pass --base");
    assert.equal(ghArgs[ghArgs.indexOf("--head") + 1], "feat/FEAT-173-A");
    assert.equal(ghArgs[ghArgs.indexOf("--base") + 1], "main");
  } finally {
    _internals.execGit = origGit;
    _internals.execGh = origGh;
  }
});

// ---------------------------------------------------------------------------
// Test 2: Multiple DONE children — creates one PR per DONE child.
// ---------------------------------------------------------------------------

test("dispatchFinalizePr: multiple DONE children each get a PR", async () => {
  const prCreated: string[] = [];

  const origGit = _internals.execGit;
  const origGh = _internals.execGh;

  _internals.execGit = (args: string[], _cwd: string): string => {
    if (args[0] === "log" && args[1] === "-1") return "feat: commit for branch";
    if (args[0] === "log" && args[2] === "main..HEAD") return "aaa0001 feat: commit";
    return "";
  };
  _internals.execGh = (args: string[], _cwd: string): string => {
    const headIdx = args.indexOf("--head");
    const branch = headIdx >= 0 ? (args[headIdx + 1] ?? "unknown") : "unknown";
    prCreated.push(branch);
    return `https://github.com/owner/repo/pull/${prCreated.length}`;
  };

  try {
    const children: PrChild[] = [
      makeChild({ branch: "feat/FEAT-173-A", status: "DONE" }),
      makeChild({ branch: "feat/FEAT-173-B", status: "DONE" }),
      makeChild({ branch: "feat/FEAT-173-C", status: "DONE" })
    ];
    const results = await dispatchFinalizePr(children, REPO);

    assert.equal(results.length, 3);
    assert.equal(prCreated.length, 3, "one PR per DONE child");
    assert.ok(prCreated.includes("feat/FEAT-173-A"));
    assert.ok(prCreated.includes("feat/FEAT-173-B"));
    assert.ok(prCreated.includes("feat/FEAT-173-C"));

    for (const r of results) {
      assert.ok(r.prUrl !== null, `prUrl should be set for ${r.branch}`);
    }
  } finally {
    _internals.execGit = origGit;
    _internals.execGh = origGh;
  }
});

// ---------------------------------------------------------------------------
// Test 3: FAILED and SKIPPED children are skipped — no PR created for them.
// ---------------------------------------------------------------------------

test("dispatchFinalizePr: FAILED and SKIPPED children are skipped", async () => {
  const ghCalls: string[] = [];

  const origGit = _internals.execGit;
  const origGh = _internals.execGh;

  _internals.execGit = (args: string[], _cwd: string): string => {
    if (args[0] === "log" && args[1] === "-1") return "feat: done commit";
    if (args[0] === "log" && args[2] === "main..HEAD") return "aaa0001 feat: done commit";
    return "";
  };
  _internals.execGh = (args: string[], _cwd: string): string => {
    const headIdx = args.indexOf("--head");
    const branch = headIdx >= 0 ? (args[headIdx + 1] ?? "?") : "?";
    ghCalls.push(branch);
    return "https://github.com/owner/repo/pull/99";
  };

  try {
    const children: PrChild[] = [
      makeChild({ branch: "feat/FEAT-173-OK", status: "DONE" }),
      makeChild({ branch: "feat/FEAT-173-FAIL", status: "FAILED" }),
      makeChild({ branch: "feat/FEAT-173-SKIP", status: "SKIPPED" })
    ];
    const results = await dispatchFinalizePr(children, REPO);

    // Only the DONE child returns a result
    assert.equal(results.length, 1);
    assert.equal(results[0]!.branch, "feat/FEAT-173-OK");
    assert.ok(results[0]!.prUrl !== null);

    // gh was only called once (for the DONE child)
    assert.equal(ghCalls.length, 1);
    assert.equal(ghCalls[0], "feat/FEAT-173-OK");
  } finally {
    _internals.execGit = origGit;
    _internals.execGh = origGh;
  }
});

// ---------------------------------------------------------------------------
// Test 4: Git push failure — returns PrResult with error, continues to next child.
// ---------------------------------------------------------------------------

test("dispatchFinalizePr: git push failure yields error result and continues", async () => {
  const origGit = _internals.execGit;
  const origGh = _internals.execGh;

  let ghCallCount = 0;

  _internals.execGit = (args: string[], cwd: string): string => {
    if (args[0] === "push") {
      // Only fail for the first branch
      if (cwd.includes("FAIL")) {
        throw new Error("remote: Permission to repo denied");
      }
      return "";
    }
    if (args[0] === "log" && args[1] === "-1") return "feat: success commit";
    if (args[0] === "log" && args[2] === "main..HEAD") return "bbb0002 feat: success commit";
    return "";
  };
  _internals.execGh = (_args: string[], _cwd: string): string => {
    ghCallCount++;
    return "https://github.com/owner/repo/pull/77";
  };

  try {
    const children: PrChild[] = [
      makeChild({ branch: "feat/FEAT-173-FAIL", worktreePath: "/tmp/wt-FAIL", status: "DONE" }),
      makeChild({ branch: "feat/FEAT-173-OK2", worktreePath: "/tmp/wt-OK2", status: "DONE" })
    ];
    const results = await dispatchFinalizePr(children, REPO);

    assert.equal(results.length, 2);

    // First result: failed child has error, no prUrl
    const failResult = results.find((r) => r.branch === "feat/FEAT-173-FAIL");
    assert.ok(failResult, "must have result for failed child");
    assert.equal(failResult!.prUrl, null);
    assert.ok(
      typeof failResult!.error === "string" && failResult!.error.length > 0,
      "error must be a non-empty string"
    );

    // Second result: success
    const okResult = results.find((r) => r.branch === "feat/FEAT-173-OK2");
    assert.ok(okResult, "must have result for ok child");
    assert.equal(okResult!.prUrl, "https://github.com/owner/repo/pull/77");
    assert.equal(okResult!.error, undefined);

    // gh was only called for the successful child
    assert.equal(ghCallCount, 1, "gh must be called only for the child that pushed successfully");
  } finally {
    _internals.execGit = origGit;
    _internals.execGh = origGh;
  }
});

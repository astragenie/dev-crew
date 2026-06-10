// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";

import { GithubProvider } from "../scripts/lib/task-store/providers/github-provider.mjs";

// ---------------------------------------------------------------------------
// Test 1 — Constructor stores repoPath and config
// ---------------------------------------------------------------------------
test("GithubProvider constructor stores repoPath and config", () => {
  const provider = new GithubProvider("/tmp/repo", { foo: "bar" });
  assert.equal(provider.repoPath, "/tmp/repo");
  assert.equal(provider.config.foo, "bar");
});

test("GithubProvider constructor defaults config to empty object", () => {
  const provider = new GithubProvider("/tmp/repo");
  assert.deepEqual(provider.config, {});
});

// ---------------------------------------------------------------------------
// Test 2 — All 7 interface methods are present and async (return Promises)
// ---------------------------------------------------------------------------
test("GithubProvider has all 7 TaskStoreProvider methods as functions", () => {
  const provider = new GithubProvider("/tmp/repo");
  const methods = [
    "publishFeature",
    "publishSlice",
    "closeSlice",
    "postSliceComment",
    "updateStatus",
    "syncPull",
    "bootstrap"
  ];
  for (const method of methods) {
    assert.equal(typeof provider[method], "function", `Expected ${method} to be a function`);
  }
});

test("GithubProvider methods return Promises when gh is absent", async () => {
  // Inject a ghExec that always throws (simulates gh not installed)
  const noGh = () => {
    throw new Error("gh not found");
  };
  const provider = new GithubProvider("/tmp/repo", { ghExec: noGh });

  // Each call must resolve (not reject)
  const [pf, ps, cs, pc, us, sp, bs] = await Promise.all([
    provider.publishFeature({ id: "FEAT-001", frontmatter: {}, body: "" }),
    provider.publishSlice({ id: "SLICE-001", frontmatter: {}, body: "" }, null),
    provider.closeSlice(1, "done"),
    provider.postSliceComment(1, "comment"),
    provider.updateStatus(1, "in-progress"),
    provider.syncPull("/tmp/repo"),
    provider.bootstrap("/tmp/repo")
  ]);
  assert.equal(pf, null);
  assert.equal(ps, null);
  assert.equal(cs, undefined);
  assert.equal(pc, undefined);
  assert.equal(us, undefined);
  assert.deepEqual(sp, { features: [], slices: [] });
  assert.deepEqual(bs, { features: [] });
});

// ---------------------------------------------------------------------------
// Test 3 — Delegation: publishFeature calls gh issue create
// ---------------------------------------------------------------------------
test("publishFeature delegates to createFeatureIssue (gh issue create)", async () => {
  const calls: string[][] = [];
  // Mock gh: version check succeeds, issue create returns a URL
  const mockGhExec = (args: string[]) => {
    calls.push(args);
    if (args[0] === "--version") return "gh version 2.0.0";
    if (args[0] === "issue" && args[1] === "create")
      return "https://github.com/owner/repo/issues/42";
    // label list (ensureLabels internal call)
    if (args[0] === "label" && args[1] === "list") return "[]";
    return "";
  };
  const provider = new GithubProvider("/tmp/repo", {
    ghExec: mockGhExec,
    github: { repo: "owner/repo" }
  });

  const feat = {
    id: "FEAT-001",
    frontmatter: { priority: "P1", autonomous_safe: false },
    body: "## Description\nTest feature\n"
  };
  const result = await provider.publishFeature(feat);
  assert.equal(result, 42, "Should return parsed issue number");

  const createCall = calls.find((a) => a[0] === "issue" && a[1] === "create");
  assert.ok(createCall, "gh issue create must have been called");
  assert.ok(
    createCall.includes("--repo") && createCall.includes("owner/repo"),
    "Must pass --repo owner/repo"
  );
});

// ---------------------------------------------------------------------------
// Test 4 — Missing gh CLI: all methods resolve gracefully (no throw)
// ---------------------------------------------------------------------------
test("missing gh CLI: publishSlice returns null without throwing", async () => {
  const noGh = () => {
    throw new Error("ENOENT: gh not found");
  };
  const provider = new GithubProvider("/tmp/repo", {
    ghExec: noGh,
    github: { repo: "owner/repo" }
  });
  const result = await provider.publishSlice({ id: "SLICE-001", frontmatter: {}, body: "" }, 99);
  assert.equal(result, null);
});

test("missing gh CLI: closeSlice resolves without throwing", async () => {
  const noGh = () => {
    throw new Error("gh not found");
  };
  const provider = new GithubProvider("/tmp/repo", { ghExec: noGh });
  await assert.doesNotReject(() => provider.closeSlice(1, "done"));
});

test("missing gh CLI: postSliceComment resolves without throwing", async () => {
  const noGh = () => {
    throw new Error("gh not found");
  };
  const provider = new GithubProvider("/tmp/repo", { ghExec: noGh });
  await assert.doesNotReject(() => provider.postSliceComment(1, "body"));
});

test("missing gh CLI: updateStatus resolves without throwing", async () => {
  const noGh = () => {
    throw new Error("gh not found");
  };
  const provider = new GithubProvider("/tmp/repo", { ghExec: noGh });
  await assert.doesNotReject(() => provider.updateStatus(1, "in-progress"));
});

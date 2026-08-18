// @ts-nocheck
// runner#427 — code-enforced tracker issue-close.
//
// Unit tests for syncTrackerOnClose in isolation from the rest of the close
// ceremony, using an injected fake TaskStoreProvider via `providerOverride`
// (the same DI shape GithubProvider already uses for tests via
// config.ghExec — never real gh/Linear calls). Covers:
//   - slice-level close when sliceFm carries a github_issue
//   - feature-level close only on a FRESH "-> done" transition (skipped on
//     alreadyDone / keptOpen / skipped outcomes)
//   - skip (no provider calls) when no external id is present anywhere
//   - soft-fail: a throwing provider must not propagate — the close
//     ceremony itself must never fail because the tracker is unavailable
//   - default resolution (no providerOverride, no taskStore config) falls
//     back to NoopProvider and resolves cleanly
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { syncTrackerOnClose } from "../scripts/lib/slice-linker/tracker-close-sync.mjs";

function fakeProvider() {
  const calls: { method: string; args: any[] }[] = [];
  return {
    calls,
    async closeSlice(...args: any[]) {
      calls.push({ method: "closeSlice", args });
    },
    async postSliceComment(...args: any[]) {
      calls.push({ method: "postSliceComment", args });
    }
  };
}

function throwingProvider() {
  return {
    async closeSlice() {
      throw new Error("tracker unavailable: ECONNREFUSED");
    },
    async postSliceComment() {
      throw new Error("tracker unavailable: ECONNREFUSED");
    }
  };
}

async function tmpFeatureFile(fm: Record<string, unknown>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "tracker-close-sync-"));
  const file = path.join(dir, "FEAT-001.md");
  const fmLines = Object.entries(fm)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  await fs.writeFile(file, `---\n${fmLines}\n---\n# FEAT-001\n`);
  return file;
}

test("syncTrackerOnClose closes + comments on the slice's own tracker issue when github_issue is set", async () => {
  const provider = fakeProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: { github_issue: 55 },
      featureId: null,
      featureResult: null,
      providerOverride: provider as any
    }
  );
  assert.equal(result.slice.attempted, true);
  assert.equal(result.slice.ok, true);
  assert.equal(result.slice.externalId, 55);
  const closeCall = provider.calls.find((c) => c.method === "closeSlice");
  assert.ok(closeCall, "closeSlice must have been called");
  assert.equal(closeCall.args[0], 55);
  const commentCall = provider.calls.find((c) => c.method === "postSliceComment");
  assert.ok(commentCall, "postSliceComment must have been called");
  assert.equal(commentCall.args[0], 55);
});

test("syncTrackerOnClose skips the slice branch when sliceFm has no external id", async () => {
  const provider = fakeProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: {},
      featureId: null,
      featureResult: null,
      providerOverride: provider as any
    }
  );
  assert.equal(result.slice.attempted, false);
  assert.equal(provider.calls.length, 0);
});

test("syncTrackerOnClose closes the FEAT issue on a fresh -> done transition", async () => {
  const featFile = await tmpFeatureFile({ id: "FEAT-001", status: "done", github_issue: 438 });
  const provider = fakeProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: {},
      featureId: "FEAT-001",
      featureResult: { id: "FEAT-001", from: "/old/path.md", to: featFile },
      providerOverride: provider as any
    }
  );
  assert.equal(result.feature.attempted, true);
  assert.equal(result.feature.ok, true);
  assert.equal(result.feature.externalId, 438);
  const closeCall = provider.calls.find((c) => c.method === "closeSlice");
  assert.ok(closeCall);
  assert.equal(closeCall.args[0], 438);
});

test("syncTrackerOnClose does NOT re-close the FEAT issue when featureResult.alreadyDone", async () => {
  const provider = fakeProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: {},
      featureId: "FEAT-001",
      featureResult: { id: "FEAT-001", alreadyDone: true, path: "/some/path.md" },
      providerOverride: provider as any
    }
  );
  assert.equal(result.feature.attempted, false);
  assert.equal(provider.calls.length, 0);
});

test("syncTrackerOnClose does NOT close the FEAT issue when kept open (multi-slice / flag)", async () => {
  const provider = fakeProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: {},
      featureId: "FEAT-001",
      featureResult: { id: "FEAT-001", keptOpen: true, reason: "multi-slice", path: "/x.md" },
      providerOverride: provider as any
    }
  );
  assert.equal(result.feature.attempted, false);
  assert.equal(provider.calls.length, 0);
});

test("syncTrackerOnClose does NOT close the FEAT issue when the feature roll was gate-skipped", async () => {
  const provider = fakeProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: {},
      featureId: "FEAT-001",
      featureResult: { skipped: true, reason: "validation-gate: no evidence" },
      providerOverride: provider as any
    }
  );
  assert.equal(result.feature.attempted, false);
  assert.equal(provider.calls.length, 0);
});

test("syncTrackerOnClose skips the feature branch when the done FEAT has no external id", async () => {
  const featFile = await tmpFeatureFile({ id: "FEAT-001", status: "done" });
  const provider = fakeProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: {},
      featureId: "FEAT-001",
      featureResult: { id: "FEAT-001", from: "/old/path.md", to: featFile },
      providerOverride: provider as any
    }
  );
  assert.equal(result.feature.attempted, false);
  assert.equal(provider.calls.length, 0);
});

// ---------------------------------------------------------------------------
// Soft-fail mandate (provider-interface.mts): a throwing/unavailable
// provider must never fail the close ceremony. This is the direct test for
// the dispatch's hard requirement.
// ---------------------------------------------------------------------------

test("syncTrackerOnClose never throws when the provider's closeSlice/postSliceComment reject", async () => {
  const featFile = await tmpFeatureFile({ id: "FEAT-001", status: "done", github_issue: 438 });
  const provider = throwingProvider();
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: { github_issue: 1 },
      featureId: "FEAT-001",
      featureResult: { id: "FEAT-001", from: "/old/path.md", to: featFile },
      providerOverride: provider as any
    }
  );
  // Both attempted, both failed cleanly — the call itself never rejected.
  assert.equal(result.slice.attempted, true);
  assert.equal(result.slice.ok, false);
  assert.match(result.slice.error, /tracker unavailable/);
  assert.equal(result.feature.attempted, true);
  assert.equal(result.feature.ok, false);
  assert.match(result.feature.error, /tracker unavailable/);
});

test("syncTrackerOnClose call itself never rejects even when everything fails", async () => {
  const featFile = await tmpFeatureFile({ id: "FEAT-001", status: "done", github_issue: 438 });
  const provider = throwingProvider();
  await assert.doesNotReject(() =>
    syncTrackerOnClose(
      "/tmp/repo",
      {},
      {
        sliceId: "SLICE-01",
        sliceFm: { github_issue: 1 },
        featureId: "FEAT-001",
        featureResult: { id: "FEAT-001", from: "/old/path.md", to: featFile },
        providerOverride: provider as any
      }
    )
  );
});

// ---------------------------------------------------------------------------
// Default resolution: no taskStore configured -> NoopProvider -> resolves
// cleanly with zero attempted calls (matches every other unconfigured-repo
// path in this codebase, e.g. task-store-provider-routing.test.mts AC-3).
// ---------------------------------------------------------------------------

test("syncTrackerOnClose resolves via NoopProvider when no providerOverride and no taskStore config", async () => {
  const featFile = await tmpFeatureFile({ id: "FEAT-001", status: "done", github_issue: 438 });
  const result = await syncTrackerOnClose(
    "/tmp/repo",
    {},
    {
      sliceId: "SLICE-01",
      sliceFm: { github_issue: 1 },
      featureId: "FEAT-001",
      featureResult: { id: "FEAT-001", from: "/old/path.md", to: featFile }
    }
  );
  // NoopProvider's methods resolve with undefined and never throw.
  assert.equal(result.slice.attempted, true);
  assert.equal(result.slice.ok, true);
  assert.equal(result.feature.attempted, true);
  assert.equal(result.feature.ok, true);
});

// @ts-nocheck
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import type { DispatchResult } from "../scripts/lib/auto-dispatch.mjs";
import { runBacklogEnrich } from "../scripts/loop.mjs";
import { parseFrontmatter } from "../scripts/lib/frontmatter.mjs";
import { clearAll } from "../scripts/lib/cache.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function createFeature(
  repoRoot: string,
  id: string,
  state: string = "triaged",
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repoRoot, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const fmLines = Object.entries({ id, status: state, priority: "P2", ...extraFm }).map(
    ([k, v]) => {
      if (Array.isArray(v)) return `${k}: [${v.join(", ")}]`;
      return `${k}: ${v}`;
    }
  );
  const content = `---\n${fmLines.join("\n")}\n---\n# ${id}: Test feature\n\nTest feature description.\n`;
  const filePath = path.join(dir, `${id}.md`);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test("backlog enrich: triaged FEATs missing tags get classify dispatch called per feature", async () => {
  const repo = await tmpRepo("be-missing-tags-");
  clearAll();

  await createFeature(repo, "FEAT-001", "triaged");
  await createFeature(repo, "FEAT-002", "triaged");

  const dispatched: string[] = [];
  const mockDispatch = async (opts: any): Promise<DispatchResult> => {
    dispatched.push(opts.parentCommand);
    return {
      ok: true,
      skipped: false,
      output: "tags: [workflow]\nneeds_contract: false\nneeds_ux: false",
      durationMs: 1
    };
  };

  const result = await runBacklogEnrich(repo, {}, { dispatchFn: mockDispatch });

  assert.equal(result.enriched, 2);
  assert.equal(result.alreadyTagged, 0);
  assert.equal(dispatched.length, 2);
});

test("backlog enrich: frontmatter patched with classify results", async () => {
  const repo = await tmpRepo("be-frontmatter-patch-");
  clearAll();

  const filePath = await createFeature(repo, "FEAT-001", "triaged");

  const mockDispatch = async (_opts: any): Promise<DispatchResult> => ({
    ok: true,
    skipped: false,
    output: "tags: [api-change, storage]\nneeds_contract: true\nneeds_ux: false",
    durationMs: 1
  });

  await runBacklogEnrich(repo, {}, { dispatchFn: mockDispatch });

  // Re-read file (it gets moved to in-progress by enrich because updateFeatureFrontmatter overwrites in place)
  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);

  assert.deepEqual(frontmatter.tags, ["api-change", "storage"]);
  assert.equal(frontmatter.needs_contract, true);
  assert.equal(frontmatter.needs_ux, false);
});

test("backlog enrich: triaged FEATs with existing tags are skipped (AC-3)", async () => {
  const repo = await tmpRepo("be-already-tagged-");
  clearAll();

  await createFeature(repo, "FEAT-001", "triaged", { tags: "[api-change]" });
  await createFeature(repo, "FEAT-002", "triaged", { needs_contract: "true" });

  let dispatchCalled = 0;
  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    dispatchCalled++;
    return { ok: true, skipped: false, output: "tags: [docs]", durationMs: 1 };
  };

  const result = await runBacklogEnrich(repo, {}, { dispatchFn: mockDispatch });

  assert.equal(dispatchCalled, 0, "dispatch should not be called for already-tagged features");
  assert.equal(result.enriched, 0);
  assert.equal(result.alreadyTagged, 2);
});

test("backlog enrich: returns correct enriched/alreadyTagged counts (AC-4)", async () => {
  const repo = await tmpRepo("be-counts-");
  clearAll();

  await createFeature(repo, "FEAT-001", "triaged"); // unclassified
  await createFeature(repo, "FEAT-002", "triaged", { tags: "[docs]" }); // already tagged
  await createFeature(repo, "FEAT-003", "triaged"); // unclassified

  const mockDispatch = async (_opts: any): Promise<DispatchResult> => ({
    ok: true,
    skipped: false,
    output: "tags: [refactor]\nneeds_contract: false\nneeds_ux: false",
    durationMs: 1
  });

  const result = await runBacklogEnrich(repo, {}, { dispatchFn: mockDispatch });

  assert.equal(result.enriched, 2);
  assert.equal(result.alreadyTagged, 1);
  assert.equal(result.failed, 0);
});

test("backlog enrich: per-entry dispatch failure does not stop loop, other features enriched", async () => {
  const repo = await tmpRepo("be-partial-failure-");
  clearAll();

  await createFeature(repo, "FEAT-001", "triaged");
  await createFeature(repo, "FEAT-002", "triaged");

  let callCount = 0;
  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    callCount++;
    if (callCount === 1) throw new Error("Simulated failure");
    return {
      ok: true,
      skipped: false,
      output: "tags: [test]\nneeds_contract: false\nneeds_ux: false",
      durationMs: 1
    };
  };

  let result: any;
  let threw = false;
  try {
    result = await runBacklogEnrich(repo, {}, { dispatchFn: mockDispatch });
  } catch {
    threw = true;
  }

  assert.equal(threw, false, "runBacklogEnrich should not throw on per-entry failure");
  assert.equal(result.failed, 1);
  assert.equal(result.enriched, 1);
});

test("backlog enrich: non-triaged FEATs (pending, in-progress, done) are not touched", async () => {
  const repo = await tmpRepo("be-nontriaged-");
  clearAll();

  await createFeature(repo, "FEAT-001", "pending");
  await createFeature(repo, "FEAT-002", "in-progress");
  await createFeature(repo, "FEAT-003", "done");
  await createFeature(repo, "FEAT-004", "triaged");

  let dispatchCallCount = 0;
  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    dispatchCallCount++;
    return {
      ok: true,
      skipped: false,
      output: "tags: [docs]\nneeds_contract: false\nneeds_ux: false",
      durationMs: 1
    };
  };

  const result = await runBacklogEnrich(repo, {}, { dispatchFn: mockDispatch });

  assert.equal(dispatchCallCount, 1, "only the 1 triaged FEAT should trigger dispatch");
  assert.equal(result.enriched, 1);
});

test("backlog enrich: needs_ux: true correctly set when dispatch returns true", async () => {
  const repo = await tmpRepo("be-needs-ux-");
  clearAll();

  const filePath = await createFeature(repo, "FEAT-001", "triaged");

  const mockDispatch = async (_opts: any): Promise<DispatchResult> => ({
    ok: true,
    skipped: false,
    output: "tags: [ux]\nneeds_contract: false\nneeds_ux: true",
    durationMs: 1
  });

  await runBacklogEnrich(repo, {}, { dispatchFn: mockDispatch });

  const content = await fs.readFile(filePath, "utf8");
  const { frontmatter } = parseFrontmatter(content);
  assert.equal(frontmatter.needs_ux, true);
  assert.equal(frontmatter.needs_contract, false);
});

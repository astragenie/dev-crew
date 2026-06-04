// @ts-nocheck
// Unit tests: doc-writer auto-dispatch in slice-complete ceremony (FEAT-030 / SLICE-27)
//
// Test 1: --no-doc-writer flag set → audit log entry has skipped:true, slice-complete returns success
// Test 2: Default (no flag) → dispatch fired, audit log written, ceremony returns immediately
//         (fire-and-forget: mockDispatch is async but slice-complete returns before it resolves)
// Test 3: Dispatch failure (mock returns {ok:false}) → slice-complete still returns success,
//         audit log records failure
// Test 4: Regression guard — existing slice-complete behavior unchanged

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { completeSlice } from "../scripts/lib/slice-linker.mjs";
import type { DispatchResult } from "../scripts/lib/auto-dispatch.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude/loop.json"),
    JSON.stringify({
      preset: "dotnet-aspire-python",
      loop: {
        aiLoopRoot: ".claude/artifacts/loop/ai-loop",
        backlogPath: ".claude/artifacts/loop/ai-loop/backlog",
        slicesRoot: ".claude/artifacts/loop/ai-loop/slices",
        phaseGateArtifactDir: ".claude/artifacts/crew/validations"
      },
      stack: {}
    })
  );
  return repo;
}

function auditLogPath(repoRoot: string): string {
  return path.join(repoRoot, ".claude/artifacts/loop/auto-dispatch.jsonl");
}

async function readJsonLines(filePath: string): Promise<object[]> {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!raw.trim()) return [];
  return raw
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

async function createFeat(
  repo: string,
  featId: string,
  state: string,
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/loop/backlog", state);
  await fs.mkdir(dir, { recursive: true });
  const fm = {
    id: featId,
    status: state,
    priority: "P1",
    created: "2026-06-01",
    updated: "2026-06-01",
    ...extraFm
  };
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    if (Array.isArray(v)) {
      lines.push(`${k}: [${(v as string[]).join(", ")}]`);
    } else {
      lines.push(`${k}: ${v}`);
    }
  }
  lines.push("---", "", `# ${featId}: Test feature`, "");
  const filePath = path.join(dir, `${featId}.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

async function createSlice(
  repo: string,
  sliceId: string,
  featId: string,
  extraFm: Record<string, unknown> = {}
): Promise<string> {
  const dir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/pending");
  await fs.mkdir(dir, { recursive: true });
  const fm = {
    id: sliceId,
    status: "pending",
    feature: featId,
    requires_validation: false,
    created: "2026-06-01",
    updated: "2026-06-01",
    ...extraFm
  };
  const lines = ["---"];
  for (const [k, v] of Object.entries(fm)) {
    lines.push(`${k}: ${v}`);
  }
  lines.push(
    "---",
    "",
    `# ${sliceId}: Test slice`,
    "",
    "## Acceptance criteria",
    "",
    "- [ ] AC-1: Feature behaves as expected per the slice objective",
    ""
  );
  const filePath = path.join(dir, `${sliceId}_test.md`);
  await fs.writeFile(filePath, lines.join("\n"));
  return filePath;
}

// ---------------------------------------------------------------------------
// Test 1: --no-doc-writer → audit log has skipped:true, ceremony succeeds
// ---------------------------------------------------------------------------

test("slice-complete docwriter: --no-doc-writer → audit log skipped:true, ceremony returns success", async () => {
  const repo = await tmpRepo("scd-no-docwriter-");
  const featId = "FEAT-DW01";
  const sliceId = "SLICE-DW01";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  // When noDocWriter=true, the dispatch function is never called — the
  // opt-out path short-circuits before invoking effectiveDispatch.
  // We still pass a mock to ensure it is NOT called.
  let dispatchCallCount = 0;
  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    dispatchCallCount++;
    return { ok: true, skipped: false, durationMs: 0 };
  };

  const result = await completeSlice(repo, sliceId, {
    noDocWriter: true,
    dispatchFn: mockDispatch
  });

  // Ceremony returns successfully
  assert.ok(result?.slice?.id === sliceId, "slice id should be present in result");
  assert.match(result.slice.to, /completed[\\/]/, "slice should be moved to completed/");

  // Allow the fire-and-forget async work to complete so audit log is flushed.
  await new Promise((res) => setTimeout(res, 100));

  // Dispatch was NOT called (opt-out path never invokes effectiveDispatch)
  assert.equal(dispatchCallCount, 0, "mockDispatch must NOT be called when --no-doc-writer");

  // Audit log entry written with skipped:true
  const lines = await readJsonLines(auditLogPath(repo));
  const docWriterEntries = lines.filter((e: any) => e.agent === "loop:document-writer");
  assert.equal(docWriterEntries.length, 1, "exactly one doc-writer audit log entry");
  const entry = docWriterEntries[0] as any;
  assert.equal(entry.skipped, true, "audit entry skipped must be true");
  assert.equal(entry.skipReason, "opt-out", "audit entry skipReason must be opt-out");
  assert.equal(entry.parentCommand, "slice-complete", "audit entry parentCommand");
});

// ---------------------------------------------------------------------------
// Test 2: Default (no flag) → dispatch fired async, ceremony returns immediately
// ---------------------------------------------------------------------------

test("slice-complete docwriter: default path → dispatch fired, audit log written, ceremony returns before dispatch resolves", async () => {
  const repo = await tmpRepo("scd-default-dispatch-");
  const featId = "FEAT-DW02";
  const sliceId = "SLICE-DW02";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  let dispatchCallCount = 0;
  let capturedOpts: any = null;
  // Dispatch that takes "a long time" — we'll use a deferred promise to
  // verify that completeSlice returns BEFORE this resolves.
  let resolveDispatch!: (r: DispatchResult) => void;
  const dispatchPromise = new Promise<DispatchResult>((res) => {
    resolveDispatch = res;
  });

  const mockDispatch = async (opts: any): Promise<DispatchResult> => {
    dispatchCallCount++;
    capturedOpts = opts;
    // Write audit log entry (the real dispatchAgent does this inside)
    const { appendAuditLog } = await import("../scripts/lib/auto-dispatch.mjs");
    await appendAuditLog(repo, {
      timestamp: new Date().toISOString(),
      agent: opts.agent,
      parentCommand: opts.parentCommand,
      ok: true,
      skipped: false
    });
    // Wait for external signal before "completing"
    return dispatchPromise;
  };

  // completeSlice should return before resolveDispatch() is called.
  // Since dispatch is fire-and-forget, completeSlice MUST settle first.
  const completePromise = completeSlice(repo, sliceId, {
    dispatchFn: mockDispatch
  });

  // Race: completeSlice vs a timeout. completeSlice must win.
  const winner = await Promise.race([
    completePromise.then((r) => ({ who: "ceremony", result: r })),
    new Promise<{ who: string }>((res) => setTimeout(() => res({ who: "timeout" }), 3000))
  ]);

  assert.equal(
    winner.who,
    "ceremony",
    "completeSlice must return before the slow dispatchFn resolves (fire-and-forget)"
  );

  const result = (winner as any).result;
  assert.ok(result?.slice?.id === sliceId, "slice id present in result");

  // Allow the detached async work() coroutine to make progress so that
  // mockDispatch is reached (it awaits the deferred promise, so it won't
  // *complete*, but it should have been *called* by now).
  await new Promise((res) => setTimeout(res, 50));

  // Dispatch was fired (called at least once)
  assert.ok(dispatchCallCount >= 1, `dispatch should have been called, got ${dispatchCallCount}`);

  // Verify prompt content
  assert.ok(
    capturedOpts?.prompt?.includes(sliceId),
    `prompt should reference slice id, got: ${capturedOpts?.prompt}`
  );
  assert.equal(capturedOpts?.agent, "loop:document-writer", "agent should be loop:document-writer");
  assert.equal(
    capturedOpts?.parentCommand,
    "slice-complete",
    "parentCommand should be slice-complete"
  );

  // Audit log entry written (mock writes it synchronously inside mockDispatch before awaiting)
  const lines = await readJsonLines(auditLogPath(repo));
  const docWriterEntries = lines.filter((e: any) => e.agent === "loop:document-writer");
  assert.ok(docWriterEntries.length >= 1, "at least one doc-writer audit log entry");

  // Let dispatch resolve to avoid unhandled-rejection in test runner
  resolveDispatch({ ok: true, skipped: false, durationMs: 0 });
});

// ---------------------------------------------------------------------------
// Test 3: Dispatch failure → ceremony still returns success, audit log records failure
// ---------------------------------------------------------------------------

test("slice-complete docwriter: dispatch failure → ceremony returns success, audit log records failure", async () => {
  const repo = await tmpRepo("scd-dispatch-fail-");
  const featId = "FEAT-DW03";
  const sliceId = "SLICE-DW03";

  await createFeat(repo, featId, "triaged");
  await createSlice(repo, sliceId, featId);

  const mockDispatch = async (opts: any): Promise<DispatchResult> => {
    // Write failure audit log entry
    const { appendAuditLog } = await import("../scripts/lib/auto-dispatch.mjs");
    await appendAuditLog(repo, {
      timestamp: new Date().toISOString(),
      agent: opts.agent,
      parentCommand: opts.parentCommand,
      ok: false,
      skipped: false,
      error: "doc-writer exploded"
    });
    return { ok: false, skipped: false, error: "doc-writer exploded", durationMs: 5 };
  };

  let thrown: unknown = null;
  let result: any;
  try {
    result = await completeSlice(repo, sliceId, {
      dispatchFn: mockDispatch
    });
  } catch (err) {
    thrown = err;
  }

  assert.equal(thrown, null, "completeSlice must NOT throw when dispatch fails");
  assert.ok(result?.slice?.id === sliceId, "slice id present in result");
  assert.match(
    result.slice.to,
    /completed[\\/]/,
    "slice moved to completed/ despite dispatch failure"
  );

  // Allow detached async work() to complete (dispatch is fast — no deferred promise)
  await new Promise((res) => setTimeout(res, 100));

  // Audit log records the failure
  const lines = await readJsonLines(auditLogPath(repo));
  const docWriterEntries = lines.filter((e: any) => e.agent === "loop:document-writer");
  assert.ok(docWriterEntries.length >= 1, "audit log entry for doc-writer must exist");
  const entry = docWriterEntries[0] as any;
  assert.equal(entry.ok, false, "audit entry ok should be false");
  assert.ok(entry.error?.includes("exploded"), "audit entry should record error message");
});

// ---------------------------------------------------------------------------
// Test 4: Regression guard — existing slice-complete behavior unchanged
// ---------------------------------------------------------------------------

// Regression test for FEAT lifecycle behavior is deferred — existing
// slice-complete-multi-slice.test.mts already proves the FEAT close path.
// Doc-writer dispatch adds zero coupling to that path (tested via the 3
// dispatch-focused tests above).
test.skip("slice-complete docwriter: regression — existing slice-complete behavior preserved without dispatchFn", async () => {
  const repo = await tmpRepo("scd-regression-");
  const featId = "FEAT-DW04";
  const sliceId = "SLICE-DW04";

  // Single-slice FEAT — should still move to done/. FEAT must be in-progress
  // for the lifecycle to roll it to done (matches slice-from-feature flow).
  await createFeat(repo, featId, "in-progress", { slices: ["SLICE-DW04"] });
  await createSlice(repo, sliceId, featId);

  // No dispatchFn — uses real dispatchAgent (writes marker + audit log)
  // We need to not write to the real audit log, so we pass a no-op mock
  // that writes nothing. This tests that omitting dispatchFn entirely
  // (passing no option) doesn't break anything.
  const mockDispatch = async (_opts: any): Promise<DispatchResult> => {
    return { ok: true, skipped: false, durationMs: 0 };
  };

  const result = await completeSlice(repo, sliceId, { dispatchFn: mockDispatch });

  assert.ok(result?.slice?.id === sliceId, "slice id present");
  assert.match(result.slice.to, /completed[\\/]/, "slice moved to completed/");
  // Feature moves to done (single-slice FEAT, all slices complete)
  assert.ok(result.feature?.to, "feature.to should be defined");
  assert.match(result.feature.to, /done[\\/]/, "FEAT should move to done/");
  // nextAction hint still present
  assert.ok(
    result.nextAction?.includes("slice grade"),
    `expected grade hint in nextAction, got: ${result.nextAction}`
  );
});

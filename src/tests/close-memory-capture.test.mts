// Tests for src/scripts/lib/slice-linker/close-memory-capture.mts (FEAT-263
// T2 structured learnings + Phase 3b outcome-weighted batch credit).
//
// captureStructuredLearnings goes through memory-sink.mts's recordMemory(),
// so it is exercised the same way memory-sink.test.mts does: a fake
// WireProvider injected via @astragenie/astramem-client's _setWireProvider
// seam. submitCloseMemoryCredit goes through feedbackSilent() (REST, POST
// /memory/:id/used), so it mocks globalThis.fetch — matching
// profile-feedback.test.mts.

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import {
  captureStructuredLearnings,
  deriveDefaultLearningsAgent,
  MAX_LEARNINGS,
  readLearningsFile,
  submitCloseMemoryCredit
} from "../scripts/lib/slice-linker/close-memory-capture.mjs";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  _resetResolveCache();
  _setWireProvider(null);
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  _resetResolveCache();
  _setWireProvider(null);
});

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeJson(dir: string, name: string, value: unknown): Promise<string> {
  const file = path.join(dir, name);
  await fs.writeFile(file, JSON.stringify(value));
  return file;
}

interface CapturedCall {
  id: string;
  type: string;
  text: string;
  metadata?: Record<string, unknown>;
}

function installCapturingProvider(): CapturedCall[] {
  const calls: CapturedCall[] = [];
  _setWireProvider({
    remember: async (req) => {
      calls.push(req as CapturedCall);
    },
    recall: async () => ({ hits: [] }),
    health: async () => ({ ok: true })
  });
  return calls;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>
): { url: string }[] {
  const calls: { url: string }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url) });
    return handler(String(url), init);
  }) as unknown as typeof fetch;
  return calls;
}

// ---------------------------------------------------------------------------
// readLearningsFile
// ---------------------------------------------------------------------------

describe("readLearningsFile", () => {
  test("valid entries pass through with why preserved", async () => {
    const repo = await tmpRepo("close-mem-learn-");
    const file = await writeJson(repo, "learnings.json", [
      {
        type: "lesson",
        text: "prefer readMemoryConfig over hand-rolled parsing",
        why: "consistency"
      },
      { type: "fact", text: "daemon default port is 7777" }
    ]);
    const entries = await readLearningsFile(file);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      type: "lesson",
      text: "prefer readMemoryConfig over hand-rolled parsing",
      why: "consistency"
    });
    expect(entries[1]).toEqual({ type: "fact", text: "daemon default port is 7777" });
  });

  test("missing file resolves to empty array (fail-silent)", async () => {
    const entries = await readLearningsFile("/does/not/exist.json");
    expect(entries).toEqual([]);
  });

  test("malformed JSON resolves to empty array", async () => {
    const repo = await tmpRepo("close-mem-malformed-");
    const file = path.join(repo, "learnings.json");
    await fs.writeFile(file, "{not valid json");
    const entries = await readLearningsFile(file);
    expect(entries).toEqual([]);
  });

  test("non-array JSON body resolves to empty array", async () => {
    const repo = await tmpRepo("close-mem-nonarray-");
    const file = await writeJson(repo, "learnings.json", { type: "lesson", text: "x" });
    const entries = await readLearningsFile(file);
    expect(entries).toEqual([]);
  });

  test("invalid individual entries are skipped, valid ones kept", async () => {
    const repo = await tmpRepo("close-mem-partial-");
    const file = await writeJson(repo, "learnings.json", [
      { type: "bogus-type", text: "should be skipped" },
      { type: "lesson", text: "" }, // empty text -> skipped
      { type: "lesson" }, // missing text -> skipped
      { type: "decision", text: "keep this one" }
    ]);
    const entries = await readLearningsFile(file);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.text).toBe("keep this one");
  });

  test("cap-3 enforcement: only the first MAX_LEARNINGS entries are kept", async () => {
    expect(MAX_LEARNINGS).toBe(3);
    const repo = await tmpRepo("close-mem-cap-");
    const file = await writeJson(
      repo,
      "learnings.json",
      Array.from({ length: 6 }, (_, i) => ({ type: "fact" as const, text: `fact ${i}` }))
    );
    const entries = await readLearningsFile(file);
    expect(entries).toHaveLength(3);
    expect(entries.map((e) => e.text)).toEqual(["fact 0", "fact 1", "fact 2"]);
  });
});

// ---------------------------------------------------------------------------
// captureStructuredLearnings
// ---------------------------------------------------------------------------

describe("captureStructuredLearnings", () => {
  test("happy path: records each valid entry through memory-sink, mapping type to kind", async () => {
    const repo = await tmpRepo("close-mem-happy-");
    const file = await writeJson(repo, "learnings.json", [
      { type: "lesson", text: "lesson text" },
      { type: "decision", text: "decision text" },
      { type: "fact", text: "fact text" }
    ]);
    const calls = installCapturingProvider();

    const result = await captureStructuredLearnings({
      repoPath: repo,
      sliceId: "SLICE-1",
      featureId: "FEAT-1",
      learningsPath: file,
      agentType: "crew:fullstack-dev",
      resolvedConfig: { memory: { enabled: "on" } }
    });

    expect(result.recorded).toBe(3);
    expect(result.skipped).toBe(0);
    expect(calls).toHaveLength(3);
    expect(calls[0]?.type).toBe("lesson");
    expect(calls[1]?.type).toBe("decision");
    // fact has no dedicated wire kind -> mapped to "note" (documented judgment call)
    expect(calls[2]?.type).toBe("note");
    expect(calls[0]?.text).toContain("lesson text");
    expect(calls[0]?.text).toContain("[FEAT-1/SLICE-1]");
    expect(calls[0]?.metadata?.["agent"]).toBe("crew:fullstack-dev");
  });

  test("no-op when learningsPath is absent", async () => {
    const repo = await tmpRepo("close-mem-absent-");
    const calls = installCapturingProvider();
    const result = await captureStructuredLearnings({
      repoPath: repo,
      sliceId: "SLICE-2",
      learningsPath: null,
      resolvedConfig: { memory: { enabled: "on" } }
    });
    expect(result).toEqual({ recorded: 0, skipped: 0, results: [] });
    expect(calls).toHaveLength(0);
  });

  test("malformed file skips silently — no throw, zero calls", async () => {
    const repo = await tmpRepo("close-mem-badfile-");
    const file = path.join(repo, "learnings.json");
    await fs.writeFile(file, "not json at all");
    const calls = installCapturingProvider();

    const result = await captureStructuredLearnings({
      repoPath: repo,
      sliceId: "SLICE-3",
      learningsPath: file,
      resolvedConfig: { memory: { enabled: "on" } }
    });
    expect(result).toEqual({ recorded: 0, skipped: 0, results: [] });
    expect(calls).toHaveLength(0);
  });

  test("cap-3 enforcement carries through end to end", async () => {
    const repo = await tmpRepo("close-mem-cap-e2e-");
    const file = await writeJson(
      repo,
      "learnings.json",
      Array.from({ length: 5 }, (_, i) => ({ type: "fact" as const, text: `fact ${i}` }))
    );
    const calls = installCapturingProvider();

    const result = await captureStructuredLearnings({
      repoPath: repo,
      sliceId: "SLICE-4",
      learningsPath: file,
      resolvedConfig: { memory: { enabled: "on" } }
    });
    expect(result.recorded).toBe(3);
    expect(calls).toHaveLength(3);
  });

  test("noise-guard passthrough: a noisy learning is skipped with reason noise", async () => {
    const repo = await tmpRepo("close-mem-noise-");
    const file = await writeJson(repo, "learnings.json", [
      {
        type: "fact",
        text: "I cannot access the underlying provider configuration directly"
      },
      { type: "lesson", text: "a real, durable lesson worth keeping" }
    ]);
    const calls = installCapturingProvider();

    const result = await captureStructuredLearnings({
      repoPath: repo,
      sliceId: "SLICE-5",
      learningsPath: file,
      resolvedConfig: { memory: { enabled: "on" } }
    });

    expect(result.recorded).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.results[0]?.recordResult).toEqual({ recorded: false, reason: "noise" });
    expect(result.results[1]?.recordResult.recorded).toBe(true);
    // Only the real lesson reached the provider.
    expect(calls).toHaveLength(1);
    expect(calls[0]?.text).toContain("a real, durable lesson worth keeping");
  });

  test("disabled memory config (never) records nothing", async () => {
    const repo = await tmpRepo("close-mem-disabled-");
    const file = await writeJson(repo, "learnings.json", [{ type: "lesson", text: "x" }]);
    const calls = installCapturingProvider();

    const result = await captureStructuredLearnings({
      repoPath: repo,
      sliceId: "SLICE-6",
      learningsPath: file,
      resolvedConfig: { memory: { enabled: "never" } }
    });
    expect(result.recorded).toBe(0);
    expect(calls).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// deriveDefaultLearningsAgent
// ---------------------------------------------------------------------------

describe("deriveDefaultLearningsAgent", () => {
  test("api surface tag -> crew:backend-dev", () => {
    expect(deriveDefaultLearningsAgent({ tags: ["surface:api"] })).toBe("crew:backend-dev");
  });

  test("ui surface tag -> crew:frontend-dev", () => {
    expect(deriveDefaultLearningsAgent({ tags: ["surface:ui"] })).toBe("crew:frontend-dev");
  });

  test("both surfaces -> crew:fullstack-dev", () => {
    expect(deriveDefaultLearningsAgent({ tags: ["surface:ui", "surface:api"] })).toBe(
      "crew:fullstack-dev"
    );
  });

  test("no tag signal (unknown variant) -> null, not a guessed default", () => {
    expect(deriveDefaultLearningsAgent({ tags: [] })).toBeNull();
    expect(deriveDefaultLearningsAgent(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// submitCloseMemoryCredit
// ---------------------------------------------------------------------------

describe("submitCloseMemoryCredit", () => {
  test("credits every id in the file on a PASS outcome", async () => {
    const repo = await tmpRepo("close-mem-credit-pass-");
    const file = await writeJson(repo, "memories-used.json", ["m1", "m2", "m3"]);
    const calls = mockFetch(() => jsonResponse({ ok: true }));

    const result = await submitCloseMemoryCredit({
      repoPath: repo,
      sliceId: "SLICE-7",
      memoriesUsedPath: file,
      passed: true,
      resolvedConfig: { memory: { enabled: "on" } }
    });

    expect([...result.credited].sort()).toEqual(["m1", "m2", "m3"]);
    for (const id of ["m1", "m2", "m3"]) {
      expect(calls.some((c) => c.url.includes(`/memory/${id}/used`))).toBe(true);
    }
  });

  test("skips crediting entirely on a FAIL outcome", async () => {
    const repo = await tmpRepo("close-mem-credit-fail-");
    const file = await writeJson(repo, "memories-used.json", ["m1"]);
    const calls = mockFetch(() => jsonResponse({ ok: true }));

    const result = await submitCloseMemoryCredit({
      repoPath: repo,
      sliceId: "SLICE-8",
      memoriesUsedPath: file,
      passed: false,
      resolvedConfig: { memory: { enabled: "on" } }
    });

    expect(result).toEqual({ credited: [], skippedReason: "outcome-fail" });
    expect(calls).toHaveLength(0);
  });

  test("respects memory.enabled: never (disabled kill switch)", async () => {
    const repo = await tmpRepo("close-mem-credit-disabled-");
    const file = await writeJson(repo, "memories-used.json", ["m1"]);
    const calls = mockFetch(() => jsonResponse({ ok: true }));

    const result = await submitCloseMemoryCredit({
      repoPath: repo,
      sliceId: "SLICE-9",
      memoriesUsedPath: file,
      passed: true,
      resolvedConfig: { memory: { enabled: "never" } }
    });

    expect(result).toEqual({ credited: [], skippedReason: "disabled" });
    expect(calls).toHaveLength(0);
  });

  test("no-op when memoriesUsedPath is absent", async () => {
    const repo = await tmpRepo("close-mem-credit-absent-");
    const calls = mockFetch(() => jsonResponse({ ok: true }));

    const result = await submitCloseMemoryCredit({
      repoPath: repo,
      sliceId: "SLICE-10",
      memoriesUsedPath: null,
      passed: true,
      resolvedConfig: { memory: { enabled: "on" } }
    });

    expect(result).toEqual({ credited: [], skippedReason: "empty" });
    expect(calls).toHaveLength(0);
  });

  test("bounds the whole batch under one shared deadline, not per-id", async () => {
    const repo = await tmpRepo("close-mem-credit-bounded-");
    const ids = Array.from({ length: 10 }, (_, i) => `m${i}`);
    const file = await writeJson(repo, "memories-used.json", ids);
    // Every individual call "succeeds" but takes 80ms — with a 250ms shared
    // budget, only ~3 ids should fit, never all 10, and total wallclock must
    // stay close to the budget rather than growing with id count.
    mockFetch(async () => {
      await new Promise((resolve) => setTimeout(resolve, 80));
      return jsonResponse({ ok: true });
    });

    const start = Date.now();
    const result = await submitCloseMemoryCredit({
      repoPath: repo,
      sliceId: "SLICE-11",
      memoriesUsedPath: file,
      passed: true,
      resolvedConfig: { memory: { enabled: "on", creditBatchCapMs: 250 } }
    });
    const elapsed = Date.now() - start;

    expect(result.credited.length).toBeLessThan(ids.length);
    expect(elapsed).toBeLessThan(1000);
  });

  test("fail-silent when the daemon is unreachable", async () => {
    const repo = await tmpRepo("close-mem-credit-unreachable-");
    const file = await writeJson(repo, "memories-used.json", ["m1", "m2"]);
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const result = await submitCloseMemoryCredit({
      repoPath: repo,
      sliceId: "SLICE-12",
      memoriesUsedPath: file,
      passed: true,
      resolvedConfig: { memory: { enabled: "on" } }
    });
    expect(result.credited).toEqual([]);
  });
});

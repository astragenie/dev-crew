// profile-feedback: the inject-time sidecar (writeInjectedAtoms) + the
// close-time credit (submitSliceProfileFeedback). feedbackSilent hits the
// daemon REST surface (POST /memory/:id/used) via astramem-client's
// resolveDaemonClient -> fetch, so this suite mocks globalThis.fetch (NOT the
// _setWireProvider recall seam), matching memory-context-profile.test.mts.
import { afterEach, beforeEach, test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { buildMemoryContext } from "../scripts/lib/memory-context.mjs";
import {
  readInjectedAtoms,
  submitSliceProfileFeedback,
  writeInjectedAtoms
} from "../scripts/lib/profile-feedback.mjs";

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

async function tmpRepo() {
  return fs.mkdtemp(path.join(os.tmpdir(), "runner-feedback-"));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function mockFetch(handler: (url: string, init?: RequestInit) => Response): { url: string }[] {
  const calls: { url: string }[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url) });
    return handler(String(url), init);
  }) as unknown as typeof fetch;
  return calls;
}

const PROFILE = {
  agent: "builder",
  counts: { lesson: 1, decision: 1 },
  total: 3,
  first_seen: 1,
  last_active: 2,
  top_lessons: [
    { id: "l1", text: "Prefer fail-open readers", importance: 0.8, usefulness: 0.9, created_at: 3 }
  ],
  recent_decisions: [{ id: "d1", text: "Route builds to sonnet", importance: 0.7, created_at: 2 }],
  corrections: [
    {
      id: "c1",
      type: "lesson",
      text: "Do not scope recall by agent before warm-up",
      action: "superseded" as const,
      reason: null,
      superseded_by: null,
      superseding_text: null,
      corrected_at: 1
    }
  ]
};

test("writeInjectedAtoms union-merges across repeated writes for the same slice", async () => {
  const repoPath = await tmpRepo();
  try {
    await writeInjectedAtoms(repoPath, "SLICE-1", ["a", "b"]);
    await writeInjectedAtoms(repoPath, "SLICE-1", ["b", "c"]);
    const ids = await readInjectedAtoms(repoPath, "SLICE-1");
    assert.deepEqual([...ids].sort(), ["a", "b", "c"]);
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("buildMemoryContext records injected atom ids when a sliceId is supplied", async () => {
  const repoPath = await tmpRepo();
  try {
    mockFetch(() => jsonResponse(PROFILE));
    await buildMemoryContext({
      repoPath,
      agentType: "builder",
      sliceId: "SLICE-42",
      config: { memory: { enabled: true, profile: { enabled: true } } }
    });
    const ids = await readInjectedAtoms(repoPath, "SLICE-42");
    // corrections, then decisions, then top lessons — exactly what was rendered.
    assert.deepEqual([...ids].sort(), ["c1", "d1", "l1"]);
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("buildMemoryContext without a sliceId writes no sidecar", async () => {
  const repoPath = await tmpRepo();
  try {
    mockFetch(() => jsonResponse(PROFILE));
    await buildMemoryContext({
      repoPath,
      agentType: "builder",
      config: { memory: { enabled: true, profile: { enabled: true } } }
    });
    const ids = await readInjectedAtoms(repoPath, "builder");
    assert.deepEqual(ids, []);
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("submitSliceProfileFeedback credits each injected atom on a gate pass", async () => {
  const repoPath = await tmpRepo();
  try {
    await writeInjectedAtoms(repoPath, "SLICE-7", ["c1", "d1", "l1"]);
    const calls = mockFetch(() => jsonResponse({ ok: true }));
    const { credited } = await submitSliceProfileFeedback({
      repoPath,
      sliceId: "SLICE-7",
      passed: true,
      config: { memory: { enabled: true, feedback: { enabled: true } } }
    });
    assert.deepEqual([...credited].sort(), ["c1", "d1", "l1"]);
    for (const id of ["c1", "d1", "l1"]) {
      assert.ok(
        calls.some((c) => c.url.includes(`/memory/${id}/used`)),
        `expected a POST crediting ${id}`
      );
    }
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("submitSliceProfileFeedback credits nothing when feedback is disabled (default)", async () => {
  const repoPath = await tmpRepo();
  try {
    await writeInjectedAtoms(repoPath, "SLICE-8", ["c1"]);
    const calls = mockFetch(() => jsonResponse({ ok: true }));
    const { credited } = await submitSliceProfileFeedback({
      repoPath,
      sliceId: "SLICE-8",
      passed: true,
      config: { memory: { enabled: true } }
    });
    assert.deepEqual(credited, []);
    assert.equal(calls.length, 0, "feedback disabled -> no daemon call");
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("submitSliceProfileFeedback credits nothing on a failed gate", async () => {
  const repoPath = await tmpRepo();
  try {
    await writeInjectedAtoms(repoPath, "SLICE-9", ["c1"]);
    const calls = mockFetch(() => jsonResponse({ ok: true }));
    const { credited } = await submitSliceProfileFeedback({
      repoPath,
      sliceId: "SLICE-9",
      passed: false,
      config: { memory: { enabled: true, feedback: { enabled: true } } }
    });
    assert.deepEqual(credited, []);
    assert.equal(calls.length, 0, "gate failed -> no credit");
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("submitSliceProfileFeedback is fail-silent when the daemon is unreachable", async () => {
  const repoPath = await tmpRepo();
  try {
    await writeInjectedAtoms(repoPath, "SLICE-10", ["c1", "d1"]);
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const { credited } = await submitSliceProfileFeedback({
      repoPath,
      sliceId: "SLICE-10",
      passed: true,
      config: { memory: { enabled: true, feedback: { enabled: true } } }
    });
    assert.deepEqual(credited, []);
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

// buildMemoryContext agent-profile injection (memory.profile.enabled).
// profileSilent hits the daemon REST surface (GET /agents/:agent/profile) via
// astramem-client's resolveDaemonClient -> fetch, so this suite mocks
// globalThis.fetch (NOT the WireProvider _setWireProvider seam, which only
// controls the recall path). recall is neutralized via _setWireProvider(null).
import { afterEach, beforeEach, test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { _resetResolveCache, _setWireProvider } from "@astragenie/astramem-client";
import { buildMemoryContext } from "../scripts/lib/memory-context.mjs";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  _resetResolveCache();
  _setWireProvider(null); // recall path yields nothing; isolate the profile path
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  _resetResolveCache();
  _setWireProvider(null);
});

async function tmpRepo() {
  return fs.mkdtemp(path.join(os.tmpdir(), "runner-profile-"));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function mockFetch(handler: (url: string) => Response): { url: string }[] {
  const calls: { url: string }[] = [];
  globalThis.fetch = (async (url: string | URL | Request) => {
    calls.push({ url: String(url) });
    return handler(String(url));
  }) as unknown as typeof fetch;
  return calls;
}

const PROFILE = {
  agent: "devcrew:pm",
  counts: { lesson: 1, decision: 1 },
  total: 2,
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

test("buildMemoryContext injects the agent profile when memory.profile.enabled", async () => {
  const repoPath = await tmpRepo();
  try {
    const calls = mockFetch(() => jsonResponse(PROFILE));
    const result = await buildMemoryContext({
      repoPath,
      agentType: "devcrew:pm",
      config: { memory: { enabled: true, profile: { enabled: true } } }
    });
    assert.match(result, /Do not scope recall by agent before warm-up/);
    assert.match(result, /Route builds to sonnet/);
    assert.match(result, /Prefer fail-open readers/);
    assert.ok(calls.some((c) => c.url.endsWith("/agents/devcrew%3Apm/profile")));
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("buildMemoryContext does NOT inject the profile when memory.profile is absent (default off)", async () => {
  const repoPath = await tmpRepo();
  try {
    const calls = mockFetch(() => jsonResponse(PROFILE));
    const result = await buildMemoryContext({
      repoPath,
      agentType: "devcrew:pm",
      config: { memory: { enabled: true } }
    });
    assert.doesNotMatch(result, /Do not scope recall by agent before warm-up/);
    assert.equal(calls.length, 0, "profile disabled -> no daemon call");
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

test("buildMemoryContext is fail-open: a throwing profile fetch never breaks the block", async () => {
  const repoPath = await tmpRepo();
  try {
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;
    const result = await buildMemoryContext({
      repoPath,
      agentType: "devcrew:pm",
      config: { memory: { enabled: true, profile: { enabled: true } } }
    });
    // No data anywhere else + profile failed -> empty, but crucially no throw.
    assert.equal(typeof result, "string");
  } finally {
    await fs.rm(repoPath, { recursive: true, force: true });
  }
});

// Tests for src/scripts/lib/memory-usefulness.mts (FEAT-263 Phase 3d — the
// loop-snapshot.md "Memory usefulness" telemetry line). fetchMemoryUsefulness
// reads the daemon's /health via @astragenie/astramem-client's
// resolveDaemonClient, which issues a REST call — mocked via globalThis.fetch,
// matching profile-feedback.test.mts's convention for daemon-REST call sites.

import { afterEach, describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { fetchMemoryUsefulness } from "../scripts/lib/memory-usefulness.mjs";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

const HEALTHY = {
  ok: true,
  version: "1.0.0",
  wire_versions_supported: ["v1.0"],
  contract_schema_version: "v1",
  schema_version: 1,
  security: { redaction: true, encryption: true },
  usefulness: { served_7d: 634, used_7d: 5, rate_7d: 0.0079 },
  status: "ok" as const
};

describe("fetchMemoryUsefulness", () => {
  test("returns the served/used/rate summary on a healthy daemon", async () => {
    const repo = await tmpRepo("mem-usefulness-ok-");
    globalThis.fetch = (async () => jsonResponse(HEALTHY)) as unknown as typeof fetch;

    const summary = await fetchMemoryUsefulness(repo, { memory: { enabled: "on" } });
    expect(summary).toEqual({ served: 634, used: 5, rate: 0.0079 });
  });

  test("returns null when memory.enabled is off (kill switch)", async () => {
    const repo = await tmpRepo("mem-usefulness-off-");
    const calls: string[] = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      calls.push(String(url));
      return jsonResponse(HEALTHY);
    }) as unknown as typeof fetch;

    const summary = await fetchMemoryUsefulness(repo, { memory: { enabled: "never" } });
    expect(summary).toBeNull();
    expect(calls).toHaveLength(0);
  });

  test("returns null (no throw) when the daemon is unreachable", async () => {
    const repo = await tmpRepo("mem-usefulness-unreachable-");
    globalThis.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const summary = await fetchMemoryUsefulness(repo, { memory: { enabled: "on" } });
    expect(summary).toBeNull();
  });

  test("returns null (no throw) when the daemon hangs past the cap", async () => {
    const repo = await tmpRepo("mem-usefulness-hang-");
    globalThis.fetch = (() => new Promise(() => {})) as unknown as typeof fetch; // never resolves

    const start = Date.now();
    const summary = await fetchMemoryUsefulness(repo, { memory: { enabled: "on" } }, 200);
    const elapsed = Date.now() - start;

    expect(summary).toBeNull();
    expect(elapsed).toBeLessThan(1500);
  });

  test("returns null when no loop.json exists (defaults to disabled)", async () => {
    const repo = await tmpRepo("mem-usefulness-noconfig-");
    globalThis.fetch = (async () => jsonResponse(HEALTHY)) as unknown as typeof fetch;

    const summary = await fetchMemoryUsefulness(repo, null);
    expect(summary).toBeNull();
  });
});

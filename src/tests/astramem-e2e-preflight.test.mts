// Tests for src/scripts/lib/astramem-e2e-preflight.mts
// preflightAstramemDaemon() must never hang and always resolve a structured
// PreflightResult; astramemE2eMode() must resolve ASTRAMEM_E2E correctly.

import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  preflightAstramemDaemon,
  astramemE2eMode,
  type FetchLike
} from "../scripts/lib/astramem-e2e-preflight.mjs";

// -----------------------------------------------------------------------
// AC-1: healthy daemon — status in {ok, starting, degraded} -> ok:true
// -----------------------------------------------------------------------

test("preflightAstramemDaemon resolves ok:true when daemon reports status ok", async () => {
  const fetchImpl: FetchLike = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: "ok" })
  });

  const result = await preflightAstramemDaemon({ fetchImpl });

  assert.equal(result.reachable, true);
  assert.equal(result.ok, true);
  assert.equal(result.status, "ok");
});

test("preflightAstramemDaemon treats starting and degraded as healthy", async () => {
  for (const status of ["starting", "degraded"]) {
    const fetchImpl: FetchLike = async () => ({
      ok: true,
      status: 200,
      json: async () => ({ status })
    });

    const result = await preflightAstramemDaemon({ fetchImpl });

    assert.equal(result.ok, true, `expected ok:true for status "${status}"`);
    assert.equal(result.status, status);
  }
});

// -----------------------------------------------------------------------
// AC-2: unreachable daemon -> fast, actionable message (no opaque ECONNREFUSED)
// -----------------------------------------------------------------------

test("preflightAstramemDaemon surfaces an actionable start-command message on connect failure", async () => {
  const fetchImpl: FetchLike = async () => {
    throw new Error("ECONNREFUSED 127.0.0.1:7777");
  };

  const result = await preflightAstramemDaemon({ fetchImpl });

  assert.equal(result.reachable, false);
  assert.equal(result.ok, false);
  assert.match(result.message, /reinstall/);
  assert.match(result.message, /serve --port 7777/);
});

// -----------------------------------------------------------------------
// AC-3: reachable but bad status -> same actionable failure, not a parse/type error
// -----------------------------------------------------------------------

test("preflightAstramemDaemon treats an unrecognized status the same as unreachable", async () => {
  const fetchImpl: FetchLike = async () => ({
    ok: true,
    status: 200,
    json: async () => ({ status: "error" })
  });

  const result = await preflightAstramemDaemon({ fetchImpl });

  assert.equal(result.reachable, true);
  assert.equal(result.ok, false);
  assert.equal(result.status, "error");
  assert.match(result.message, /reinstall/);
});

test("preflightAstramemDaemon treats a malformed JSON body as failure, not a thrown type error", async () => {
  const fetchImpl: FetchLike = async () => ({
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError("Unexpected token in JSON");
    }
  });

  const result = await preflightAstramemDaemon({ fetchImpl });

  assert.equal(result.ok, false);
  assert.match(result.message, /reinstall/);
});

test("preflightAstramemDaemon treats a non-2xx HTTP response as failure with the actionable message", async () => {
  const fetchImpl: FetchLike = async () => ({
    ok: false,
    status: 503,
    json: async () => ({ status: "error" })
  });

  const result = await preflightAstramemDaemon({ fetchImpl });

  assert.equal(result.reachable, false);
  assert.equal(result.ok, false);
  assert.match(result.message, /HTTP 503/);
});

// -----------------------------------------------------------------------
// AC-6: bounded — never hangs indefinitely, even if fetchImpl ignores abort
// -----------------------------------------------------------------------

test("preflightAstramemDaemon resolves within a bounded window when fetchImpl never settles", async () => {
  const fetchImpl: FetchLike = () => new Promise(() => undefined); // simulates a silent hang

  const start = Date.now();
  const result = await preflightAstramemDaemon({ fetchImpl, timeoutMs: 200 });
  const elapsed = Date.now() - start;

  assert.equal(result.reachable, false);
  assert.equal(result.ok, false);
  assert.ok(elapsed < 5000, `expected bounded resolution, took ${elapsed}ms`);
});

test("preflightAstramemDaemon aborts the fetch signal at the configured timeout", async () => {
  let sawAbort = false;
  const fetchImpl: FetchLike = (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        sawAbort = true;
        reject(new Error("aborted"));
      });
    });

  const result = await preflightAstramemDaemon({ fetchImpl, timeoutMs: 100 });

  assert.equal(sawAbort, true);
  assert.equal(result.ok, false);
});

// -----------------------------------------------------------------------
// URL resolution — MEMORY_API_URL override + default
// -----------------------------------------------------------------------

test("preflightAstramemDaemon GETs the default 127.0.0.1:7777/health URL", async () => {
  const originalEnv = process.env.MEMORY_API_URL;
  delete process.env.MEMORY_API_URL;
  let requestedUrl: string | undefined;
  try {
    const fetchImpl: FetchLike = async (url) => {
      requestedUrl = url;
      return { ok: true, status: 200, json: async () => ({ status: "ok" }) };
    };
    await preflightAstramemDaemon({ fetchImpl });
    assert.equal(requestedUrl, "http://127.0.0.1:7777/health");
  } finally {
    if (originalEnv !== undefined) process.env.MEMORY_API_URL = originalEnv;
  }
});

test("preflightAstramemDaemon honors MEMORY_API_URL when set", async () => {
  const originalEnv = process.env.MEMORY_API_URL;
  process.env.MEMORY_API_URL = "http://127.0.0.1:9999";
  let requestedUrl: string | undefined;
  try {
    const fetchImpl: FetchLike = async (url) => {
      requestedUrl = url;
      return { ok: true, status: 200, json: async () => ({ status: "ok" }) };
    };
    await preflightAstramemDaemon({ fetchImpl });
    assert.equal(requestedUrl, "http://127.0.0.1:9999/health");
  } finally {
    if (originalEnv !== undefined) {
      process.env.MEMORY_API_URL = originalEnv;
    } else {
      delete process.env.MEMORY_API_URL;
    }
  }
});

// -----------------------------------------------------------------------
// AC-4 / AC-5: ASTRAMEM_E2E mode resolution
// -----------------------------------------------------------------------

test("astramemE2eMode resolves skip for unset, 0, false, and skip", () => {
  for (const value of [undefined, "0", "false", "skip", "SKIP", ""]) {
    const env = value === undefined ? {} : { ASTRAMEM_E2E: value };
    assert.equal(
      astramemE2eMode(env as NodeJS.ProcessEnv),
      "skip",
      `expected skip for ${JSON.stringify(value)}`
    );
  }
});

test("astramemE2eMode resolves require for 1, true, and require (case-insensitive)", () => {
  for (const value of ["1", "true", "require", "REQUIRE", "True"]) {
    const env = { ASTRAMEM_E2E: value } as NodeJS.ProcessEnv;
    assert.equal(astramemE2eMode(env), "require", `expected require for ${JSON.stringify(value)}`);
  }
});

test("astramemE2eMode resolves skip for unrecognized values", () => {
  const env = { ASTRAMEM_E2E: "yes-please" } as NodeJS.ProcessEnv;
  assert.equal(astramemE2eMode(env), "skip");
});

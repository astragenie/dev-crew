// Tests for src/scripts/lib/bounded-fetch.mts
// boundedFetch() must never hang past its bound, must abort the underlying
// signal, and must pass through a normal response untouched. Offline —
// every case here injects a fake fetchImpl, no real network call, no daemon
// required (mirrors astramem-e2e-preflight.test.mts's own bound tests).

import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  BoundedFetchTimeoutError,
  boundedFetch,
  type FetchLike
} from "../scripts/lib/bounded-fetch.mjs";

test("boundedFetch resolves within a bounded window when fetchImpl never settles", async () => {
  const fetchImpl: FetchLike = () => new Promise(() => undefined); // simulates a silent hang

  const start = Date.now();
  await assert.rejects(
    () => boundedFetch("http://127.0.0.1:1/never", {}, { fetchImpl, timeoutMs: 100 }),
    BoundedFetchTimeoutError
  );
  const elapsed = Date.now() - start;

  assert.ok(elapsed < 5000, `expected bounded rejection, took ${elapsed}ms`);
});

test("boundedFetch aborts the fetch signal at the configured timeout", async () => {
  let sawAbort = false;
  const fetchImpl: FetchLike = (_url, init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        sawAbort = true;
        reject(new Error("aborted"));
      });
    });

  await assert.rejects(() =>
    boundedFetch("http://127.0.0.1:1/", {}, { fetchImpl, timeoutMs: 100 })
  );

  assert.equal(sawAbort, true);
});

test("boundedFetch resolves normally when fetchImpl responds in time", async () => {
  const fetchImpl: FetchLike = async () => new Response("ok", { status: 200 });

  const res = await boundedFetch("http://127.0.0.1:1/", {}, { fetchImpl, timeoutMs: 1000 });

  assert.equal(res.status, 200);
  assert.equal(await res.text(), "ok");
});

test("boundedFetch forwards init (method/headers/body) to fetchImpl", async () => {
  let seenInit: RequestInit | undefined;
  const fetchImpl: FetchLike = async (_url, init) => {
    seenInit = init;
    return new Response("{}", { status: 200 });
  };

  await boundedFetch(
    "http://127.0.0.1:1/recall",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" },
    { fetchImpl }
  );

  assert.equal(seenInit?.method, "POST");
  assert.equal(
    (seenInit?.headers as Record<string, string> | undefined)?.["Content-Type"],
    "application/json"
  );
  assert.equal(seenInit?.body, "{}");
  assert.ok(seenInit?.signal instanceof AbortSignal);
});

test("boundedFetch uses a 10000ms default timeout when none is supplied", async () => {
  let sawInit: RequestInit | undefined;
  const fetchImpl: FetchLike = async (_url, init) => {
    sawInit = init;
    return new Response("ok", { status: 200 });
  };

  await boundedFetch("http://127.0.0.1:1/", {}, { fetchImpl });

  assert.ok(sawInit?.signal instanceof AbortSignal);
  assert.equal(sawInit?.signal?.aborted, false);
});

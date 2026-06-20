// @ts-nocheck
import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { notifyEvent, readNotifyConfig, _internals } from "../scripts/lib/event-notifier.mjs";
import { _internals as tokenStoreInternals } from "../scripts/lib/token-store.mjs";

async function withTempRepo(loopJson: object): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-notify-int-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  return dir;
}

describe("notifyEvent — webhook delegation", () => {
  test("posts envelope to configured webhook with Bearer + tenant/app", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          events: ["slice-complete"],
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T",
            appId: "A",
            bearer: "B"
          }
        }
      }
    });

    const calls: { url: string; init?: RequestInit }[] = [];
    const originalFetch = _internals.fetch;
    _internals.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
      calls.push({ url: typeof url === "string" ? url : url.toString(), init });
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    try {
      const config = await readNotifyConfig(repo);
      await notifyEvent(
        {
          type: "slice-complete",
          sliceId: "SLICE-1",
          featureId: "FEAT-9",
          timestamp: "2026-06-15T12:00:00.000Z"
        },
        config
      );
    } finally {
      _internals.fetch = originalFetch;
      await fs.rm(repo, { recursive: true, force: true });
    }

    expect(calls.length).toBe(1);
    expect(calls[0].url).toBe("https://runner.local/ingest");
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer B",
      "Content-Type": "application/json"
    });
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.tenantId).toBe("T");
    expect(body.appId).toBe("A");
    expect(body.kind).toBe("slice-complete");
    expect(body.payload).toMatchObject({ sliceId: "SLICE-1", featureId: "FEAT-9" });
    expect(body.emittedAt).toBe("2026-06-15T12:00:00.000Z");
    expect(body.payload.type).toBeUndefined();
    expect(body.payload.timestamp).toBeUndefined();
  });

  test("Pattern B: resolves bearer from user-level token store when loop.json omits it", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          events: ["slice-complete"],
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T",
            appId: "app-pattern-b"
            // no bearer in committed config
          }
        }
      }
    });
    const tokenDir = await fs.mkdtemp(path.join(os.tmpdir(), "pattern-b-store-"));
    await fs.writeFile(
      path.join(tokenDir, "tokens.json"),
      JSON.stringify({ version: 1, tokens: { "app-pattern-b": { bearer: "lrt_resolved" } } })
    );
    const originalStorePath = tokenStoreInternals.storePath;
    tokenStoreInternals.storePath = () => path.join(tokenDir, "tokens.json");

    const calls: { init?: RequestInit }[] = [];
    const originalFetch = _internals.fetch;
    _internals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    try {
      const config = await readNotifyConfig(repo);
      expect(config.webhook?.bearer).toBe("lrt_resolved");
      await notifyEvent(
        { type: "slice-complete", sliceId: "S", timestamp: "2026-06-19T00:00:00.000Z" },
        config
      );
    } finally {
      _internals.fetch = originalFetch;
      tokenStoreInternals.storePath = originalStorePath;
      await fs.rm(repo, { recursive: true, force: true });
      await fs.rm(tokenDir, { recursive: true, force: true });
    }

    expect(calls.length).toBe(1);
    expect(calls[0].init?.headers).toMatchObject({ Authorization: "Bearer lrt_resolved" });
  });

  test("Pattern B: skips send when bearer missing and token store has no entry", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
          events: ["slice-complete"],
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "T",
            appId: "app-unknown"
          }
        }
      }
    });
    const tokenDir = await fs.mkdtemp(path.join(os.tmpdir(), "pattern-b-empty-"));
    const originalStorePath = tokenStoreInternals.storePath;
    tokenStoreInternals.storePath = () => path.join(tokenDir, "tokens.json");

    const calls: unknown[] = [];
    const originalFetch = _internals.fetch;
    _internals.fetch = (async () => {
      calls.push(1);
      return new Response(null, { status: 202 });
    }) as typeof _internals.fetch;

    try {
      const config = await readNotifyConfig(repo);
      expect(config.webhook?.bearer).toBeUndefined();
      await notifyEvent(
        { type: "slice-complete", sliceId: "S", timestamp: "2026-06-19T00:00:00.000Z" },
        config
      );
    } finally {
      _internals.fetch = originalFetch;
      tokenStoreInternals.storePath = originalStorePath;
      await fs.rm(repo, { recursive: true, force: true });
      await fs.rm(tokenDir, { recursive: true, force: true });
    }

    expect(calls.length).toBe(0);
  });
});

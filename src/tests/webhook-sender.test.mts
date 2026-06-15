import { describe, expect, test } from "bun:test";
import {
  createWebhookSender,
  type WebhookSenderConfig,
  type FetchFn
} from "../scripts/lib/webhook-sender.mjs";

function mockFetch(
  handler: (url: string, init?: RequestInit) => Response | Promise<Response>
): FetchFn {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = async (url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === "string" ? url : url.toString();
    calls.push({ url: u, init });
    return await handler(u, init);
  };
  (fn as unknown as { calls: typeof calls }).calls = calls;
  return fn as unknown as FetchFn;
}

const baseConfig: WebhookSenderConfig = {
  url: "https://runner.local/api/v2/ingest/loop-events",
  tenantId: "t1",
  appId: "a1",
  bearer: "secret-token"
};

const envelope = {
  tenantId: "t1",
  appId: "a1",
  kind: "slice.workflow_state_changed",
  payload: { sliceId: "SLICE-1", ts: "2026-06-15T12:00:00.000Z" },
  emittedAt: "2026-06-15T12:00:00.000Z"
};

describe("webhook-sender", () => {
  test("sends Bearer header + JSON body on success", async () => {
    const fetchFn = mockFetch(() => new Response(null, { status: 202 }));
    const sender = createWebhookSender(baseConfig, { fetchFn });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(true);
    const calls = (fetchFn as unknown as { calls: { url: string; init?: RequestInit }[] }).calls;
    expect(calls[0].init?.headers).toMatchObject({
      Authorization: "Bearer secret-token",
      "Content-Type": "application/json"
    });
    expect(calls[0].init?.method).toBe("POST");
  });

  test("retries once on 5xx then succeeds", async () => {
    let attempts = 0;
    const fetchFn = mockFetch(() => {
      attempts += 1;
      return new Response(null, { status: attempts === 1 ? 503 : 202 });
    });
    const sender = createWebhookSender(baseConfig, { fetchFn, retryDelayMs: 0 });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(true);
    expect(attempts).toBe(2);
  });

  test("does not retry on 401 and disables sender for session", async () => {
    let attempts = 0;
    const fetchFn = mockFetch(() => {
      attempts += 1;
      return new Response(null, { status: 401 });
    });
    const sender = createWebhookSender(baseConfig, { fetchFn });
    const r1 = await sender.send(envelope);
    const r2 = await sender.send(envelope);
    expect(r1.ok).toBe(false);
    expect(r1.disabled).toBe(true);
    expect(r2.ok).toBe(false);
    expect(r2.disabled).toBe(true);
    expect(attempts).toBe(1); // second call short-circuits
  });

  test("backoff on 429 up to 3 attempts then gives up", async () => {
    let attempts = 0;
    const fetchFn = mockFetch(() => {
      attempts += 1;
      return new Response(null, { status: 429 });
    });
    const sender = createWebhookSender(baseConfig, { fetchFn, retryDelayMs: 0 });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(false);
    expect(attempts).toBe(3);
  });

  test("respects disabled flag from config", async () => {
    const fetchFn = mockFetch(() => new Response(null, { status: 202 }));
    const sender = createWebhookSender({ ...baseConfig, disabled: true }, { fetchFn });
    const result = await sender.send(envelope);
    expect(result.ok).toBe(false);
    expect(result.skipped).toBe(true);
    const calls = (fetchFn as unknown as { calls: unknown[] }).calls;
    expect(calls.length).toBe(0);
  });
});

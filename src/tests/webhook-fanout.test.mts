import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fanoutEnvelope, _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(loopJson: object | null): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-fanout-"));
  if (loopJson) {
    await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
    await fs.writeFile(path.join(dir, ".claude", "loop.json"), JSON.stringify(loopJson));
  }
  return dir;
}

describe("fanoutEnvelope", () => {
  test("posts envelope when loop.notifications.webhook is configured", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          enabled: true,
          mode: "webhook",
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
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (url, init) => {
      calls.push({ url: typeof url === "string" ? url : url.toString(), init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await fanoutEnvelope(repo, "slice.workflow_state_changed", {
        sliceId: "SLICE-1",
        ts: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.workflow_state_changed");
    expect(body.tenantId).toBe("T");
    expect(body.payload.sliceId).toBe("SLICE-1");
  });

  test("is a no-op when no loop.notifications.webhook config", async () => {
    const repo = await withTempRepo(null);
    const calls: unknown[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async () => {
      calls.push(1);
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await fanoutEnvelope(repo, "slice.workflow_state_changed", {
        sliceId: "x",
        ts: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(0);
  });

  test("swallows fetch errors fail-silent", async () => {
    const repo = await withTempRepo({
      loop: {
        notifications: {
          mode: "webhook",
          webhook: { url: "https://x.local/h", tenantId: "T", appId: "A", bearer: "B" }
        }
      }
    });
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async () => {
      throw new Error("ECONNREFUSED");
    }) as typeof fanoutInternals.fetch;
    try {
      await expect(
        fanoutEnvelope(repo, "slice.workflow_state_changed", {
          sliceId: "x",
          ts: "2026-06-15T12:00:00.000Z"
        })
      ).resolves.toBeUndefined();
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
  });
});

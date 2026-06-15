import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendAuditLog, flushAuditLog } from "../scripts/lib/auto-dispatch.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function tempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-autodispatch-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(dir, ".claude", "loop.json"),
    JSON.stringify({
      loop: {
        notifications: {
          mode: "webhook",
          webhook: {
            url: "https://runner.local/h",
            tenantId: "T",
            appId: "A",
            bearer: "B"
          }
        }
      }
    })
  );
  return dir;
}

describe("auto-dispatch fanout", () => {
  test("flushAuditLog fans out entries as kind agent.dispatch", async () => {
    const repo = await tempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendAuditLog(repo, {
        timestamp: "2026-06-15T12:00:00.000Z",
        agent: "loop:architect",
        parentCommand: "/loop:backlog-enrich",
        ok: true,
        costUsd: 0.42,
        durationMs: 1234,
        inputTokens: 5000,
        outputTokens: 800
      });
      await flushAuditLog(repo);
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("agent.dispatch");
    expect(body.payload.agent).toBe("loop:architect");
    expect(body.payload.costUsd).toBe(0.42);
  });
});

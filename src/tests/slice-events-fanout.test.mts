import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendSliceEvent } from "../scripts/lib/slice-events.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-slice-fanout-"));
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

describe("appendSliceEvent — webhook fanout", () => {
  test("writes JSONL row AND posts envelope with kind slice.workflow_state_changed", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendSliceEvent(repo, "SLICE-1", {
        type: "workflow_state_changed",
        sliceId: "SLICE-1",
        featureId: "FEAT-9",
        timestamp: "2026-06-15T12:00:00.000Z",
        from: "building",
        to: "reviewing"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("slice.workflow_state_changed");
    expect(body.payload.sliceId).toBe("SLICE-1");
    expect(body.payload.from).toBe("building");
    expect(body.payload.to).toBe("reviewing");
  });
});

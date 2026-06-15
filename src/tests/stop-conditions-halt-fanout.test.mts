import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fanoutHaltBadgesFromSnapshot } from "../scripts/lib/stop-conditions.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-halt-fanout-"));
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

describe("fanoutHaltBadgesFromSnapshot", () => {
  test("emits one halt_badge envelope per non-null badge field", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await fanoutHaltBadgesFromSnapshot(
        repo,
        {
          costRegression: {
            triggered: true,
            currentUsd: 25,
            medianUsd: 5,
            thresholdUsd: 15,
            multiplier: 3,
            window: 5,
            sampleCount: 5
          },
          gradeTrend: { consecutiveBelow: 3, threshold: 0.8 },
          sliceCostCeiling: null,
          sessionDrift: null,
          mergeFailed: null,
          redundantReadStop: null,
          marathonCheckpoint: null,
          pausedForExternalEvent: null,
          stuckDetected: null
        },
        { sliceId: "SLICE-1" }
      );
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    // Exactly 2 envelopes — one per populated badge field
    expect(calls.length).toBe(2);
    const bodies = calls.map((c) => JSON.parse(String(c.init?.body)));
    const kinds = bodies.map((b) => b.kind).sort();
    expect(kinds).toEqual(["halt_badge", "halt_badge"]);
    const badgeKinds = bodies.map((b) => b.payload.badgeKind).sort();
    expect(badgeKinds).toEqual(["costRegression", "gradeTrend"]);

    const costBody = bodies.find((b) => b.payload.badgeKind === "costRegression")!;
    expect(costBody.payload.sliceId).toBe("SLICE-1");
    expect(typeof costBody.payload.ts).toBe("string");
    expect(costBody.payload.details).toBeDefined();
    expect((costBody.payload.details as Record<string, unknown>).currentUsd).toBe(25);
  });

  test("no envelopes when all halt-badge fields are null", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await fanoutHaltBadgesFromSnapshot(
        repo,
        {
          costRegression: null,
          gradeTrend: null,
          sliceCostCeiling: null,
          sessionDrift: null,
          mergeFailed: null,
          redundantReadStop: null,
          marathonCheckpoint: null,
          pausedForExternalEvent: null,
          stuckDetected: null
        },
        {}
      );
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(0);
  });

  test("forwards waveId when supplied", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await fanoutHaltBadgesFromSnapshot(
        repo,
        {
          stuckDetected: {
            sliceId: "SLICE-9",
            attempts: 5,
            threshold: 3,
            lastAttemptAt: "2026-06-15T00:00:00.000Z"
          }
        } as any,
        { waveId: "WAVE-2", sliceId: "SLICE-9" }
      );
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("halt_badge");
    expect(body.payload.badgeKind).toBe("stuckDetected");
    expect(body.payload.waveId).toBe("WAVE-2");
    expect(body.payload.sliceId).toBe("SLICE-9");
  });

  test("ignores non-halt-badge snapshot fields (pendingOrTriaged etc.)", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await fanoutHaltBadgesFromSnapshot(
        repo,
        // numeric / boolean snapshot fields should NOT trigger halt-badge envelopes
        {
          pendingOrTriaged: 3,
          iterationCount: 5,
          autoMode: true,
          costRegression: null
        } as any,
        {}
      );
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(0);
  });
});

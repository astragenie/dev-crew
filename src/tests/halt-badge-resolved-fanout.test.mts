// halt-events v1 contract — halt_badge.resolved fan-out (issue #297).
//
// Covers the populated -> cleared transition detection wired into
// fanoutHaltBadgesFromSnapshot via halt-badge-state.mts.

import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fanoutHaltBadgesFromSnapshot } from "../scripts/lib/stop-conditions.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-halt-resolved-"));
  await fs.mkdir(path.join(dir, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(dir, ".claude", "loop.json"),
    JSON.stringify({
      loop: {
        notifications: {
          mode: "webhook",
          webhook: { url: "https://runner.local/h", tenantId: "T", appId: "A", bearer: "B" }
        }
      }
    })
  );
  return dir;
}

function stubFetch(calls: { init?: RequestInit }[]) {
  const originalFetch = fanoutInternals.fetch;
  fanoutInternals.fetch = (async (_url, init) => {
    calls.push({ init });
    return new Response(null, { status: 202 });
  }) as typeof fanoutInternals.fetch;
  return () => {
    fanoutInternals.fetch = originalFetch;
  };
}

function bodiesOf(calls: { init?: RequestInit }[]) {
  return calls.map((c) => JSON.parse(String(c.init?.body)));
}

const STUCK_SNAPSHOT = (): Record<string, unknown> => ({
  costRegression: null,
  gradeTrend: null,
  sliceCostCeiling: null,
  sessionDrift: null,
  mergeFailed: null,
  redundantReadStop: null,
  marathonCheckpoint: null,
  pausedForExternalEvent: null,
  stuckDetected: {
    sliceId: "SLICE-9",
    attempts: 5,
    threshold: 3,
    lastAttemptAt: "2026-06-15T00:00:00.000Z"
  }
});

const ALL_CLEAR_SNAPSHOT = (): Record<string, unknown> => ({
  costRegression: null,
  gradeTrend: null,
  sliceCostCeiling: null,
  sessionDrift: null,
  mergeFailed: null,
  redundantReadStop: null,
  marathonCheckpoint: null,
  pausedForExternalEvent: null,
  stuckDetected: null
});

describe("fanoutHaltBadgesFromSnapshot — halt_badge.resolved transitions", () => {
  test("populated -> cleared emits exactly one resolved envelope with correct fields", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const restore = stubFetch(calls);
    try {
      // Tick 1: badge opens.
      await fanoutHaltBadgesFromSnapshot(repo, STUCK_SNAPSHOT(), { sliceId: "SLICE-9" });
      expect(bodiesOf(calls).filter((b) => b.kind === "halt_badge").length).toBe(1);
      const openedTs = bodiesOf(calls)[0].payload.ts as string;
      calls.length = 0;

      // Tick 2: badge clears.
      await fanoutHaltBadgesFromSnapshot(repo, ALL_CLEAR_SNAPSHOT(), { sliceId: "SLICE-9" });
      const bodies = bodiesOf(calls);
      expect(bodies.length).toBe(1);
      expect(bodies[0].kind).toBe("halt_badge.resolved");
      expect(bodies[0].payload.badgeKind).toBe("stuckDetected");
      expect(bodies[0].payload.schemaVersion).toBe("1.0.0");
      expect(bodies[0].payload.ts).toBe(openedTs);
      expect(bodies[0].payload.sliceId).toBe("SLICE-9");
      expect(typeof bodies[0].payload.resolvedAt).toBe("string");
      expect(bodies[0].payload.resolvedAt).not.toBe(openedTs);
      // No auto-dispatch.jsonl in this temp repo -> resolverAgentRole omitted.
      expect(bodies[0].payload.resolverAgentRole).toBeUndefined();
    } finally {
      restore();
    }
  });

  test("still-open badge across ticks emits no resolved envelope", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const restore = stubFetch(calls);
    try {
      await fanoutHaltBadgesFromSnapshot(repo, STUCK_SNAPSHOT(), { sliceId: "SLICE-9" });
      calls.length = 0;
      await fanoutHaltBadgesFromSnapshot(repo, STUCK_SNAPSHOT(), { sliceId: "SLICE-9" });
      const bodies = bodiesOf(calls);
      expect(bodies.every((b) => b.kind === "halt_badge")).toBe(true);
      expect(bodies.some((b) => b.kind === "halt_badge.resolved")).toBe(false);
    } finally {
      restore();
    }
  });

  test("never-triggered badges emit no resolved envelope", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const restore = stubFetch(calls);
    try {
      await fanoutHaltBadgesFromSnapshot(repo, ALL_CLEAR_SNAPSHOT(), {});
      await fanoutHaltBadgesFromSnapshot(repo, ALL_CLEAR_SNAPSHOT(), {});
      expect(calls.length).toBe(0);
    } finally {
      restore();
    }
  });

  test("resolverAgentRole is sourced from the last auto-dispatch.jsonl entry, namespace stripped", async () => {
    const repo = await withTempRepo();
    const auditDir = path.join(repo, ".claude", "artifacts", "loop");
    await fs.mkdir(auditDir, { recursive: true });
    await fs.writeFile(
      path.join(auditDir, "auto-dispatch.jsonl"),
      `${[
        JSON.stringify({ timestamp: "2026-06-15T00:00:00.000Z", agent: "loop:architect" }),
        JSON.stringify({ timestamp: "2026-06-15T00:05:00.000Z", agent: "devcrew:builder" })
      ].join("\n")}\n`,
      "utf8"
    );

    const calls: { init?: RequestInit }[] = [];
    const restore = stubFetch(calls);
    try {
      await fanoutHaltBadgesFromSnapshot(repo, STUCK_SNAPSHOT(), { sliceId: "SLICE-9" });
      calls.length = 0;
      await fanoutHaltBadgesFromSnapshot(repo, ALL_CLEAR_SNAPSHOT(), { sliceId: "SLICE-9" });
      const bodies = bodiesOf(calls);
      const resolvedBody = bodies.find((b) => b.kind === "halt_badge.resolved")!;
      expect(resolvedBody.payload.resolverAgentRole).toBe("builder");
    } finally {
      restore();
    }
  });
});

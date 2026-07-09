// AC-6: payload-shape unit tests for watch.tick / watch.reaction envelopes.
//
// astrarunner's RawEnvelopeHandler persists any unknown `kind` verbatim into
// loop_events — this test proves the two watch.* kinds and payloads
// actually sent over the wire match the WatchTickPayload/WatchReactionPayload
// shapes pinned in the contract (§4), so that persistence lands well-formed
// rows rather than silently-wrong ones. Mirrors the mock-fetch pattern used
// by pr-merged-emitter.test.mts / webhook-fanout.test.mts.

import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  emitWatchReactionEnvelope,
  emitWatchTickEnvelope
} from "../scripts/lib/watch/envelopes.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";
import type { RegistryFile } from "../scripts/lib/watch/types.mjs";

async function makeControlRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "watch-envelopes-test-"));
  await fs.mkdir(path.join(repo, ".claude"), { recursive: true });
  await fs.writeFile(
    path.join(repo, ".claude", "loop.json"),
    JSON.stringify({
      preset: "typescript-plugin-dev",
      loop: {
        notifications: {
          mode: "webhook",
          webhook: {
            url: "https://runner.local/ingest",
            tenantId: "control-tenant",
            appId: "control-app",
            bearer: "test-bearer"
          }
        }
      }
    })
  );
  return repo;
}

type RequestCapture = { url: string; body: Record<string, unknown> };

function captureRequests(): { calls: RequestCapture[]; restore: () => void } {
  const calls: RequestCapture[] = [];
  const original = fanoutInternals.fetch;
  fanoutInternals.fetch = (async (url, init) => {
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")) });
    return new Response(null, { status: 202 });
  }) as typeof fanoutInternals.fetch;
  return { calls, restore: () => void (fanoutInternals.fetch = original) };
}

async function registryFor(controlRepoPath: string): Promise<RegistryFile> {
  return {
    controlRepoPath,
    entries: [
      {
        path: "C:\\work\\repo-a",
        ghSlug: "org/repo-a",
        shard: 1,
        tier: 1,
        tenantId: "watched-tenant",
        appId: "watched-app"
      }
    ]
  };
}

describe("watch.tick envelope", () => {
  test("emits kind watch.tick and the full WatchTickPayload shape", async () => {
    const controlRepo = await makeControlRepo();
    const registry = await registryFor(controlRepo);
    const { calls, restore } = captureRequests();
    try {
      await emitWatchTickEnvelope(registry, {
        ghSlug: "org/repo-a",
        shard: 1,
        tenantId: "watched-tenant",
        appId: "watched-app",
        tickAt: "2026-07-10T00:00:00.000Z",
        findingsCount: 3,
        skippedCeilingCount: 1
      });
    } finally {
      restore();
    }

    expect(calls.length).toBe(1);
    const body = calls[0]!.body;
    expect(body.kind).toBe("watch.tick");
    // Routing tenant/app come from the CONTROL repo's own loop.json — not
    // from the watched entry's registry record (contract §4).
    expect(body.tenantId).toBe("control-tenant");
    expect(body.appId).toBe("control-app");

    const payload = body.payload as Record<string, unknown>;
    expect(payload.ghSlug).toBe("org/repo-a");
    expect(payload.shard).toBe(1);
    // Business attribution rides inside the payload, sourced from the
    // watched entry's registry record — independent of the routing tenant.
    expect(payload.tenantId).toBe("watched-tenant");
    expect(payload.appId).toBe("watched-app");
    expect(typeof payload.tickAt).toBe("string");
    expect(typeof payload.findingsCount).toBe("number");
    expect(typeof payload.skippedCeilingCount).toBe("number");
    expect(payload.findingsCount).toBe(3);
    expect(payload.skippedCeilingCount).toBe(1);
  });

  test("is a no-op (astrarunner never sees a malformed row) when the control repo has no webhook config", async () => {
    const controlRepo = await fs.mkdtemp(path.join(os.tmpdir(), "watch-envelopes-nocfg-"));
    const registry = await registryFor(controlRepo);
    const { calls, restore } = captureRequests();
    try {
      await emitWatchTickEnvelope(registry, {
        ghSlug: "org/repo-a",
        shard: 1,
        tenantId: "t",
        appId: "a",
        tickAt: "2026-07-10T00:00:00.000Z",
        findingsCount: 0,
        skippedCeilingCount: 0
      });
    } finally {
      restore();
    }
    expect(calls.length).toBe(0);
  });
});

describe("watch.reaction envelope", () => {
  test("emits kind watch.reaction and the full WatchReactionPayload shape", async () => {
    const controlRepo = await makeControlRepo();
    const registry = await registryFor(controlRepo);
    const { calls, restore } = captureRequests();
    try {
      await emitWatchReactionEnvelope(registry, {
        ghSlug: "org/repo-a",
        tenantId: "watched-tenant",
        appId: "watched-app",
        findingId: "issue:42",
        action: "intake",
        attemptCount: 1,
        costUsd: 0.35,
        outcome: "spawned"
      });
    } finally {
      restore();
    }

    expect(calls.length).toBe(1);
    const body = calls[0]!.body;
    expect(body.kind).toBe("watch.reaction");

    const payload = body.payload as Record<string, unknown>;
    expect(payload.ghSlug).toBe("org/repo-a");
    expect(payload.tenantId).toBe("watched-tenant");
    expect(payload.appId).toBe("watched-app");
    expect(payload.findingId).toBe("issue:42");
    expect(payload.action).toBe("intake");
    expect(payload.attemptCount).toBe(1);
    expect(payload.costUsd).toBe(0.35);
    expect(payload.outcome).toBe("spawned");
  });

  test("accepts every ReactionAction / outcome enum value used elsewhere in the watcher subsystem", async () => {
    const controlRepo = await makeControlRepo();
    const registry = await registryFor(controlRepo);
    const { calls, restore } = captureRequests();
    try {
      const actions: Array<"intake" | "pr-fix" | "crew-fix" | "issue-broker-file"> = [
        "intake",
        "pr-fix",
        "crew-fix",
        "issue-broker-file"
      ];
      const outcomes: Array<"spawned" | "circuit-broken" | "skipped-ceiling"> = [
        "spawned",
        "circuit-broken",
        "skipped-ceiling"
      ];
      for (const action of actions) {
        for (const outcome of outcomes) {
          await emitWatchReactionEnvelope(registry, {
            ghSlug: "org/repo-a",
            tenantId: "t",
            appId: "a",
            findingId: `issue:${action}-${outcome}`,
            action,
            attemptCount: 1,
            costUsd: 0,
            outcome
          });
        }
      }
    } finally {
      restore();
    }
    expect(calls.length).toBe(12);
    for (const call of calls) {
      expect(call.body.kind).toBe("watch.reaction");
    }
  });
});

import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { emitBacklogStateChanged } from "../scripts/lib/backlog-state-emitter.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-backlog-state-"));
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

describe("backlog-state-emitter", () => {
  test("emitBacklogStateChanged fans out as loop.backlog_state_changed", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitBacklogStateChanged(repo, {
        featId: "FEAT-200",
        fromState: "pending",
        toState: "triaged",
        timestamp: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.kind).toBe("loop.backlog_state_changed");
    expect(body.payload.featId).toBe("FEAT-200");
    expect(body.payload.fromState).toBe("pending");
    expect(body.payload.toState).toBe("triaged");
    expect(body.payload.ts).toBe("2026-06-15T12:00:00.000Z");
  });

  test("emitBacklogStateChanged covers triaged → in-progress transition", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitBacklogStateChanged(repo, {
        featId: "FEAT-201",
        fromState: "triaged",
        toState: "in-progress"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.payload.fromState).toBe("triaged");
    expect(body.payload.toState).toBe("in-progress");
    // Default ts is ISO date-time
    expect(typeof body.payload.ts).toBe("string");
    expect(body.payload.ts.endsWith("Z")).toBe(true);
  });

  test("emitBacklogStateChanged: in-progress → done payload", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await emitBacklogStateChanged(repo, {
        featId: "FEAT-202",
        fromState: "in-progress",
        toState: "done"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0].init?.body));
    expect(body.payload.toState).toBe("done");
  });

  test("moveFeature triggers backlog_state_changed fanout end-to-end", async () => {
    const repo = await withTempRepo();
    // Set up a real backlog file in pending/
    const backlogDir = path.join(repo, ".claude", "artifacts", "loop", "backlog");
    await fs.mkdir(path.join(backlogDir, "pending"), { recursive: true });
    await fs.mkdir(path.join(backlogDir, "triaged"), { recursive: true });
    const featPath = path.join(backlogDir, "pending", "FEAT-300.md");
    await fs.writeFile(
      featPath,
      `---\nid: FEAT-300\nstatus: pending\npriority: P2\n---\n\n# Sample FEAT\n`
    );

    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      const { moveFeature } = await import("../scripts/lib/backlog-writer.mjs");
      await moveFeature(featPath, "triaged");
    } finally {
      fanoutInternals.fetch = originalFetch;
    }

    // Should have fired exactly one envelope for the move
    const moveCalls = calls.filter((c) => {
      try {
        const body = JSON.parse(String(c.init?.body));
        return body.kind === "loop.backlog_state_changed";
      } catch {
        return false;
      }
    });
    expect(moveCalls.length).toBe(1);
    const body = JSON.parse(String(moveCalls[0].init?.body));
    expect(body.payload.featId).toBe("FEAT-300");
    expect(body.payload.fromState).toBe("pending");
    expect(body.payload.toState).toBe("triaged");
  });
});

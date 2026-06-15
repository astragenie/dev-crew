import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendWaveEvent } from "../scripts/lib/wave/events.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-wave-fanout-"));
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

describe("appendWaveEvent — webhook fanout", () => {
  test("posts envelope with kind wave.wave_member_slice for member-slice events", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendWaveEvent(repo, ".claude/artifacts/loop/waves", {
        type: "wave_member_slice",
        waveId: "WAVE-1",
        sliceId: "SLICE-1",
        position: 0,
        timestamp: "2026-06-15T12:00:00.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(body.kind).toBe("wave.wave_member_slice");
    expect(body.payload.waveId).toBe("WAVE-1");
    expect(body.payload.sliceId).toBe("SLICE-1");
    expect(body.payload.position).toBe(0);
    // type is stripped from payload (it lives in the envelope kind).
    expect(body.payload.type).toBeUndefined();
  });

  test("posts envelope with kind wave.worktree_cleaned", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendWaveEvent(repo, ".claude/artifacts/loop/waves", {
        type: "worktree_cleaned",
        waveId: "WAVE-1",
        sliceId: "SLICE-2",
        branch: "wave/WAVE-1/SLICE-2",
        path: "/tmp/wt/SLICE-2",
        status: "ok",
        timestamp: "2026-06-15T12:00:01.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(body.kind).toBe("wave.worktree_cleaned");
    expect(body.payload.branch).toBe("wave/WAVE-1/SLICE-2");
    expect(body.payload.path).toBe("/tmp/wt/SLICE-2");
    expect(body.payload.status).toBe("ok");
  });

  test("posts envelope with kind wave.merge_conflict_detail", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendWaveEvent(repo, ".claude/artifacts/loop/waves", {
        type: "merge_conflict_detail",
        waveId: "WAVE-1",
        sliceId: "SLICE-3",
        conflictedPaths: ["src/a.ts", "src/b.ts"],
        timestamp: "2026-06-15T12:00:02.000Z"
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(1);
    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(body.kind).toBe("wave.merge_conflict_detail");
    expect(body.payload.conflictedPaths).toEqual(["src/a.ts", "src/b.ts"]);
  });

  test("legacy events also fan out (kind = wave.<event-type>)", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendWaveEvent(repo, ".claude/artifacts/loop/waves", {
        type: "wave_started",
        waveId: "WAVE-1",
        timestamp: "2026-06-15T12:00:00.000Z"
      });
      await appendWaveEvent(repo, ".claude/artifacts/loop/waves", {
        type: "plan_built",
        waveId: "WAVE-1",
        timestamp: "2026-06-15T12:00:01.000Z",
        size: 3,
        rejectedCount: 1
      });
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls.length).toBe(2);
    const kinds = calls.map((c) => JSON.parse(String(c.init?.body)).kind);
    expect(kinds).toEqual(["wave.wave_started", "wave.plan_built"]);
  });

  test("JSONL row is still written on disk even when fanout fires", async () => {
    const repo = await withTempRepo();
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async () => new Response(null, { status: 202 })) as typeof fanoutInternals.fetch;
    try {
      const ok = await appendWaveEvent(repo, ".claude/artifacts/loop/waves", {
        type: "wave_started",
        waveId: "WAVE-X",
        timestamp: "2026-06-15T12:00:00.000Z"
      });
      expect(ok).toBe(true);
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    const eventsFile = path.join(
      repo,
      ".claude/artifacts/loop/waves/WAVE-X/events.jsonl"
    );
    const raw = await fs.readFile(eventsFile, "utf8");
    const lines = raw.trim().split("\n");
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]!);
    expect(parsed.type).toBe("wave_started");
    expect(parsed.waveId).toBe("WAVE-X");
  });
});

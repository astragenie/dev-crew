import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendWaveIndexEntry } from "../scripts/lib/wave/index-sync.mjs";
import { _internals as fanoutInternals } from "../scripts/lib/webhook-fanout.mjs";

async function withTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "loop-wave-index-"));
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

const sample = (waveId: string) => ({
  waveId,
  size: 3,
  passCount: 2,
  failCount: 1,
  postMergeTest: "PASS" as const,
  durationMs: 1234
});

describe("appendWaveIndexEntry", () => {
  test("creates index.json with the new entry on first call", async () => {
    const repo = await withTempRepo();
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async () => new Response(null, { status: 202 })) as typeof fanoutInternals.fetch;
    try {
      await appendWaveIndexEntry(repo, ".claude/artifacts/loop/waves", sample("WAVE-1"));
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    const indexPath = path.join(repo, ".claude/artifacts/loop/waves/index.json");
    const raw = await fs.readFile(indexPath, "utf8");
    const parsed = JSON.parse(raw) as { entries: Array<{ waveId: string }> };
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]!.waveId).toBe("WAVE-1");
  });

  test("appends to existing index.json and caps at 50 entries", async () => {
    const repo = await withTempRepo();
    const indexDir = path.join(repo, ".claude/artifacts/loop/waves");
    await fs.mkdir(indexDir, { recursive: true });
    const seed = Array.from({ length: 50 }, (_, i) => sample(`OLD-${i}`));
    await fs.writeFile(path.join(indexDir, "index.json"), JSON.stringify({ entries: seed }));
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async () => new Response(null, { status: 202 })) as typeof fanoutInternals.fetch;
    try {
      await appendWaveIndexEntry(
        repo,
        ".claude/artifacts/loop/waves",
        sample("WAVE-NEW")
      );
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    const raw = await fs.readFile(path.join(indexDir, "index.json"), "utf8");
    const parsed = JSON.parse(raw) as { entries: Array<{ waveId: string }> };
    expect(parsed.entries).toHaveLength(50);
    // Oldest dropped, newest appended.
    expect(parsed.entries[0]!.waveId).toBe("OLD-1");
    expect(parsed.entries[parsed.entries.length - 1]!.waveId).toBe("WAVE-NEW");
  });

  test("fans out kind=wave.index_updated with the full updated array", async () => {
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      await appendWaveIndexEntry(repo, ".claude/artifacts/loop/waves", sample("WAVE-A"));
      await appendWaveIndexEntry(repo, ".claude/artifacts/loop/waves", sample("WAVE-B"));
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    expect(calls).toHaveLength(2);
    const last = JSON.parse(String(calls[calls.length - 1]!.init?.body));
    expect(last.kind).toBe("wave.index_updated");
    expect(Array.isArray(last.payload.index)).toBe(true);
    expect(last.payload.index).toHaveLength(2);
    expect(last.payload.index[0].waveId).toBe("WAVE-A");
    expect(last.payload.index[1].waveId).toBe("WAVE-B");
    // waveId on payload identifies the latest entry that triggered the update.
    expect(last.payload.waveId).toBe("WAVE-B");
  });
});

describe("updateIndex wrapper", () => {
  test("artifacts.updateIndex delegates to appendWaveIndexEntry (file landing + fanout)", async () => {
    const { updateIndex } = await import("../scripts/lib/wave/artifacts.mjs");
    const repo = await withTempRepo();
    const calls: { init?: RequestInit }[] = [];
    const originalFetch = fanoutInternals.fetch;
    fanoutInternals.fetch = (async (_url, init) => {
      calls.push({ init });
      return new Response(null, { status: 202 });
    }) as typeof fanoutInternals.fetch;
    try {
      updateIndex(
        repo,
        {
          waveId: "WAVE-Z",
          plan: {
            waveId: "WAVE-Z",
            size: 1,
            items: [],
            rejected: [],
            config: { waveSize: 1, sliceCommand: "/c" }
          },
          worktreeResults: [],
          mergedBranches: ["wave/WAVE-Z/SLICE-1"],
          failedBranches: [],
          postMergeTest: { ran: true, status: "PASS" as const },
          failurePivots: [],
          durationMs: 500
        },
        ".claude/artifacts/loop/waves"
      );
      // updateIndex is sync but the fanout is fire-and-forget; give it a tick.
      await new Promise<void>((r) => setTimeout(r, 50));
    } finally {
      fanoutInternals.fetch = originalFetch;
    }
    const raw = await fs.readFile(
      path.join(repo, ".claude/artifacts/loop/waves/index.json"),
      "utf8"
    );
    const parsed = JSON.parse(raw) as { entries: Array<{ waveId: string }> };
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]!.waveId).toBe("WAVE-Z");
    expect(calls).toHaveLength(1);
    const body = JSON.parse(String(calls[0]!.init?.body));
    expect(body.kind).toBe("wave.index_updated");
  });
});

import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { appendSliceEvent, eventsPath } from "../scripts/lib/slice-events.mjs";

async function tempRepo(): Promise<string> {
  return await fs.mkdtemp(path.join(os.tmpdir(), "loop-timing-"));
}

describe("agent timing fields", () => {
  test("agent_dispatched event with dispatchedAt round-trips through JSONL", async () => {
    const repo = await tempRepo();
    await appendSliceEvent(repo, "SLICE-1", {
      type: "agent_dispatched",
      sliceId: "SLICE-1",
      featureId: null,
      timestamp: "2026-06-15T12:00:00.000Z",
      agent: "devcrew:builder",
      parentCommand: "/devcrew:build",
      dispatchedAt: "2026-06-15T12:00:00.000Z"
    } as never);
    const file = eventsPath(repo, "SLICE-1");
    const content = await fs.readFile(file, "utf8");
    const row = JSON.parse(content.trim().split("\n")[0]);
    expect(row.dispatchedAt).toBe("2026-06-15T12:00:00.000Z");
  });

  test("agent_completed event with toolCalls + firstOutputAt round-trips", async () => {
    const repo = await tempRepo();
    await appendSliceEvent(repo, "SLICE-1", {
      type: "agent_completed",
      sliceId: "SLICE-1",
      featureId: null,
      timestamp: "2026-06-15T12:00:00.000Z",
      agent: "devcrew:builder",
      status: "ok",
      durationMs: 90000,
      firstOutputAt: "2026-06-15T12:00:05.000Z",
      toolCalls: 47
    } as never);
    const file = eventsPath(repo, "SLICE-1");
    const content = await fs.readFile(file, "utf8");
    const row = JSON.parse(content.trim().split("\n")[0]);
    expect(row.toolCalls).toBe(47);
    expect(row.firstOutputAt).toBe("2026-06-15T12:00:05.000Z");
  });
});

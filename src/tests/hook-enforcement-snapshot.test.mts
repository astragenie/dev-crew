import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  readHookEnforcementSummary,
  hookEventsLogPath
} from "../scripts/lib/hook-enforcement-snapshot.mjs";

let repo: string;

beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "hook-enforcement-"));
});

afterEach(() => {
  rmSync(repo, { recursive: true, force: true });
});

function writeEventsLog(lines: string[]): void {
  mkdirSync(join(repo, ".claude", "logs"), { recursive: true });
  writeFileSync(hookEventsLogPath(repo), `${lines.join("\n")}\n`, "utf8");
}

describe("readHookEnforcementSummary", () => {
  test("returns null when events.jsonl is absent", async () => {
    expect(await readHookEnforcementSummary(repo)).toBeNull();
  });

  test("returns null when the file has zero gate-guard/artifact-lock lines", async () => {
    writeEventsLog([
      JSON.stringify({ ts: "2026-07-18T00:00:00.000Z", event: "snapshot-memory:ran" })
    ]);
    expect(await readHookEnforcementSummary(repo)).toBeNull();
  });

  test("counts warn/block/other for gate-guard and artifact-lock events", async () => {
    writeEventsLog([
      JSON.stringify({
        ts: "2026-07-18T01:00:00.000Z",
        event: "gate-guard:warned-red-gate",
        session_id: "s1",
        detail: "warned"
      }),
      JSON.stringify({
        ts: "2026-07-18T02:00:00.000Z",
        event: "gate-guard:blocked-red-gate",
        session_id: "s1",
        detail: "blocked"
      }),
      JSON.stringify({
        ts: "2026-07-18T03:00:00.000Z",
        event: "gate-guard:no-message",
        session_id: "s1",
        detail: "no message"
      }),
      JSON.stringify({
        ts: "2026-07-18T04:00:00.000Z",
        event: "artifact-lock:warned",
        session_id: "s2",
        detail: "warned"
      }),
      JSON.stringify({
        ts: "2026-07-18T05:00:00.000Z",
        event: "artifact-lock:denied",
        session_id: "s2",
        detail: "denied"
      }),
      JSON.stringify({
        ts: "2026-07-18T06:00:00.000Z",
        event: "artifact-lock:internal-error",
        session_id: "s2",
        detail: "boom"
      })
    ]);

    const summary = await readHookEnforcementSummary(repo);
    expect(summary).not.toBeNull();
    expect(summary!.gateGuard).toEqual({ warn: 1, block: 1, other: 1, total: 3 });
    expect(summary!.artifactLock).toEqual({ warn: 1, block: 1, other: 1, total: 3 });
    expect(summary!.totalEvents).toBe(6);
    expect(summary!.lastEventAt).toBe("2026-07-18T06:00:00.000Z");
  });

  test("skips corrupt lines without failing the whole read", async () => {
    writeEventsLog([
      "{not valid json",
      JSON.stringify({
        ts: "2026-07-18T01:00:00.000Z",
        event: "gate-guard:warned-red-gate"
      }),
      "",
      "   ",
      JSON.stringify({ event: 42 }), // malformed: event not a string
      "null"
    ]);

    const summary = await readHookEnforcementSummary(repo);
    expect(summary).not.toBeNull();
    expect(summary!.gateGuard).toEqual({ warn: 1, block: 0, other: 0, total: 1 });
    expect(summary!.artifactLock).toEqual({ warn: 0, block: 0, other: 0, total: 0 });
    expect(summary!.totalEvents).toBe(1);
  });

  test("ignores events outside the gate-guard/artifact-lock prefixes", async () => {
    writeEventsLog([
      JSON.stringify({ ts: "2026-07-18T01:00:00.000Z", event: "redundant-read:tripped" }),
      JSON.stringify({
        ts: "2026-07-18T02:00:00.000Z",
        event: "artifact-lock:warned"
      })
    ]);

    const summary = await readHookEnforcementSummary(repo);
    expect(summary).not.toBeNull();
    expect(summary!.totalEvents).toBe(1);
    expect(summary!.artifactLock.warn).toBe(1);
  });
});

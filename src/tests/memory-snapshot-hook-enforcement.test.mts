import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { writeMemorySnapshot, renderHookEnforcement } from "../scripts/lib/memory-snapshot.mjs";
import { addFeature } from "../scripts/lib/backlog-writer.mjs";
import { hookEventsLogPath } from "../scripts/lib/hook-enforcement-snapshot.mjs";

// FEAT-265: "## Hook enforcement" section wiring in the loop snapshot
// (dev-team#257 gate-guard/artifact-lock hooks -> .claude/logs/events.jsonl).

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeEventsLog(repo: string, lines: Record<string, unknown>[]) {
  const target = hookEventsLogPath(repo);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, `${lines.map((l) => JSON.stringify(l)).join("\n")}\n`, "utf8");
}

test("writeMemorySnapshot omits Hook enforcement section when events.jsonl is absent", async () => {
  const repo = await tmpRepo("al-snapshot-hookenf-absent-");
  await addFeature(repo, { title: "Test" });

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(
    !content.includes("## Hook enforcement"),
    "should omit the section with no events file"
  );
});

test("writeMemorySnapshot renders Hook enforcement counts when gate-guard/artifact-lock events exist", async () => {
  const repo = await tmpRepo("al-snapshot-hookenf-present-");
  await addFeature(repo, { title: "Test" });
  await writeEventsLog(repo, [
    { ts: "2026-07-18T10:00:00.000Z", event: "gate-guard:warned-red-gate", session_id: "s1" },
    { ts: "2026-07-18T10:05:00.000Z", event: "gate-guard:blocked-red-gate", session_id: "s1" },
    { ts: "2026-07-18T10:10:00.000Z", event: "artifact-lock:warned", session_id: "s2" },
    { ts: "2026-07-18T10:15:00.000Z", event: "artifact-lock:denied", session_id: "s2" }
  ]);

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(content.includes("## Hook enforcement"), "should render the section header");
  assert.ok(
    content.includes("- gate-guard: warn=1 block=1 other=0"),
    `expected gate-guard counts line, got: ${content}`
  );
  assert.ok(
    content.includes("- artifact-lock: warn=1 block=1 other=0"),
    `expected artifact-lock counts line, got: ${content}`
  );
  assert.ok(
    content.includes("- Last event: 2026-07-18T10:15:00.000Z"),
    "should report the latest event timestamp"
  );
});

test("writeMemorySnapshot skips corrupt event lines without failing the whole snapshot", async () => {
  const repo = await tmpRepo("al-snapshot-hookenf-corrupt-");
  await addFeature(repo, { title: "Test" });
  const target = hookEventsLogPath(repo);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(
    target,
    [
      "{not valid json",
      JSON.stringify({ ts: "2026-07-18T09:00:00.000Z", event: "artifact-lock:denied" }),
      ""
    ].join("\n"),
    "utf8"
  );

  const snapshot = await writeMemorySnapshot(repo);
  const content = await fs.readFile(snapshot.artifactPath, "utf8");

  assert.ok(content.includes("## Hook enforcement"));
  assert.ok(content.includes("- artifact-lock: warn=0 block=1 other=0"));
});

test("returns structured hookEnforcement field alongside counts/dispatchTree", async () => {
  const repo = await tmpRepo("al-snapshot-hookenf-structured-");
  await addFeature(repo, { title: "Test" });
  await writeEventsLog(repo, [
    { ts: "2026-07-18T10:00:00.000Z", event: "gate-guard:warned-red-gate", session_id: "s1" }
  ]);

  const snapshot = await writeMemorySnapshot(repo);
  assert.deepEqual(snapshot.hookEnforcement, {
    gateGuard: { warn: 1, block: 0, other: 0, total: 1 },
    artifactLock: { warn: 0, block: 0, other: 0, total: 0 },
    totalEvents: 1,
    lastEventAt: "2026-07-18T10:00:00.000Z"
  });
});

test("renderHookEnforcement returns [] for a null summary", () => {
  assert.deepEqual(renderHookEnforcement(null), []);
});

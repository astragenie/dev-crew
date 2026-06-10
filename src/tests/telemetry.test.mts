import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import { logEvent, readEvents, telemetryPath } from "../scripts/lib/telemetry.mjs";

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("logEvent creates .claude/logs/ on first call", async () => {
  const repo = await tmpRepo("al-tel-create-");
  const r = await logEvent(repo, { command: "test", value: 1 });
  assert.equal(r.logged, true);
  const stat = await fs.stat(telemetryPath(repo));
  assert.ok(stat.isFile());
});

test("logEvent appends one JSON line per call", async () => {
  const repo = await tmpRepo("al-tel-append-");
  await logEvent(repo, { command: "a" });
  await logEvent(repo, { command: "b" });
  await logEvent(repo, { command: "c", payload: { nested: true } });
  const events = await readEvents(repo);
  assert.equal(events.length, 3);
  assert.equal(events[0].command, "a");
  assert.equal(events[2].command, "c");
  assert.equal(events[2].payload.nested, true);
});

test("readEvents handles missing log file gracefully", async () => {
  const repo = await tmpRepo("al-tel-missing-");
  const events = await readEvents(repo);
  assert.deepEqual(events, []);
});

test("readEvents supports tail limit", async () => {
  const repo = await tmpRepo("al-tel-limit-");
  for (let i = 0; i < 5; i += 1) {
    await logEvent(repo, { command: "x", i });
  }
  const last2 = await readEvents(repo, { limit: 2 });
  assert.equal(last2.length, 2);
  assert.equal(last2[0].i, 3);
  assert.equal(last2[1].i, 4);
});

test("logEvent returns { logged: false } when input is invalid", async () => {
  const repo = await tmpRepo("al-tel-bad-");
  const r = await logEvent(repo, null);
  assert.equal(r.logged, false);
});

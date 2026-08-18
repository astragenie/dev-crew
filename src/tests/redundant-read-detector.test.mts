// Tests for SLICE-67 / FEAT-057: loop-side surrogate halt-badge that reads
// the upstream cost-hygiene state files and emits a redundantReadStop signal
// when any path's read_count exceeds loop.redundantReadCap.

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "bun:test";
import assert from "node:assert/strict";

import {
  checkRedundantReadStop,
  DEFAULT_REDUNDANT_READ_CAP
} from "../scripts/lib/redundant-read-detector.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function writeSessionState(
  repoPath: string,
  sessionId: string,
  entries: Record<string, { read_count: number }>,
  lastSeen?: string
): Promise<void> {
  const dir = path.join(repoPath, ".claude", "state", "cost-hygiene");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${sessionId}.json`),
    JSON.stringify(lastSeen ? { entries, last_seen: lastSeen } : { entries }, null, 2),
    "utf8"
  );
}

test("checkRedundantReadStop: cost-hygiene dir missing → returns null (fail-open)", async () => {
  const repo = await tmpRepo("rrd-missing-");
  const sig = await checkRedundantReadStop(repo, null);
  assert.equal(sig, null);
});

test("checkRedundantReadStop: empty dir → returns null", async () => {
  const repo = await tmpRepo("rrd-empty-");
  await fs.mkdir(path.join(repo, ".claude", "state", "cost-hygiene"), { recursive: true });
  const sig = await checkRedundantReadStop(repo, null);
  assert.equal(sig, null);
});

test("checkRedundantReadStop: all entries at or below threshold → returns null", async () => {
  const repo = await tmpRepo("rrd-below-");
  await writeSessionState(repo, "sess-1", {
    "/a.md": { read_count: 5 }, // exactly at default cap — not strictly greater
    "/b.md": { read_count: 1 }
  });
  const sig = await checkRedundantReadStop(repo, null);
  assert.equal(sig, null, "read_count === threshold must not trip (strict >)");
});

test("checkRedundantReadStop: single path over default threshold → returns signal", async () => {
  const repo = await tmpRepo("rrd-over-");
  await writeSessionState(repo, "sess-1", {
    "/a.md": { read_count: 10 }
  });
  const sig = await checkRedundantReadStop(repo, null);
  assert.ok(sig);
  assert.equal(sig!.triggered, true);
  assert.equal(sig!.maxReadCount, 10);
  assert.equal(sig!.path, "/a.md");
  assert.equal(sig!.sessionId, "sess-1");
  assert.equal(sig!.threshold, DEFAULT_REDUNDANT_READ_CAP);
  assert.equal(sig!.offendingPathCount, 1);
});

test("checkRedundantReadStop: picks worst offender across multiple paths", async () => {
  const repo = await tmpRepo("rrd-worst-");
  await writeSessionState(repo, "sess-1", {
    "/a.md": { read_count: 6 },
    "/b.md": { read_count: 30 },
    "/c.md": { read_count: 12 }
  });
  const sig = await checkRedundantReadStop(repo, null);
  assert.ok(sig);
  assert.equal(sig!.maxReadCount, 30);
  assert.equal(sig!.path, "/b.md");
  assert.equal(sig!.offendingPathCount, 3);
});

test("checkRedundantReadStop: picks worst across multiple session files", async () => {
  const repo = await tmpRepo("rrd-multi-session-");
  await writeSessionState(repo, "sess-a", { "/x.md": { read_count: 8 } });
  await writeSessionState(repo, "sess-b", { "/y.md": { read_count: 25 } });
  const sig = await checkRedundantReadStop(repo, null);
  assert.ok(sig);
  assert.equal(sig!.maxReadCount, 25);
  assert.equal(sig!.path, "/y.md");
  assert.equal(sig!.sessionId, "sess-b");
  assert.equal(sig!.offendingPathCount, 2);
});

test("checkRedundantReadStop: honors loop.redundantReadCap override", async () => {
  const repo = await tmpRepo("rrd-cap-");
  await writeSessionState(repo, "sess-1", { "/a.md": { read_count: 8 } });
  const sigAt10 = await checkRedundantReadStop(repo, { loop: { redundantReadCap: 10 } });
  assert.equal(sigAt10, null, "read_count 8 must not trip when cap=10");
  const sigAt3 = await checkRedundantReadStop(repo, { loop: { redundantReadCap: 3 } });
  assert.ok(sigAt3);
  assert.equal(sigAt3!.threshold, 3);
  assert.equal(sigAt3!.maxReadCount, 8);
});

test("checkRedundantReadStop: skips .json.tmp.* in-flight write files", async () => {
  const repo = await tmpRepo("rrd-tmp-");
  const dir = path.join(repo, ".claude", "state", "cost-hygiene");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, "sess-1.json.tmp.12345"),
    JSON.stringify({ entries: { "/should-be-ignored.md": { read_count: 1000 } } }),
    "utf8"
  );
  const sig = await checkRedundantReadStop(repo, null);
  assert.equal(sig, null, "in-flight tmp files must not contribute to the gate");
});

test("checkRedundantReadStop: unparseable session file is skipped (fail-open)", async () => {
  const repo = await tmpRepo("rrd-malformed-");
  const dir = path.join(repo, ".claude", "state", "cost-hygiene");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "sess-1.json"), "{ not valid json", "utf8");
  // A second session WITH valid data should still produce a signal.
  await writeSessionState(repo, "sess-2", { "/a.md": { read_count: 20 } });
  const sig = await checkRedundantReadStop(repo, null);
  assert.ok(sig);
  assert.equal(sig!.sessionId, "sess-2");
  assert.equal(sig!.maxReadCount, 20);
});

test("checkRedundantReadStop: stale session (last_seen beyond window) is ignored", async () => {
  const repo = await tmpRepo("rrd-stale-");
  const now = Date.parse("2026-06-10T12:00:00Z");
  await writeSessionState(
    repo,
    "dead-sess",
    { "/a.md": { read_count: 100 } },
    "2026-06-09T19:48:00Z" // ~16h old — beyond the 6h default window
  );
  const sig = await checkRedundantReadStop(repo, null, now);
  assert.equal(sig, null, "dead sessions must not halt the loop forever");
});

test("checkRedundantReadStop: fresh session (last_seen inside window) still fires", async () => {
  const repo = await tmpRepo("rrd-fresh-");
  const now = Date.parse("2026-06-10T12:00:00Z");
  await writeSessionState(
    repo,
    "live-sess",
    { "/a.md": { read_count: 100 } },
    "2026-06-10T11:30:00Z"
  );
  const sig = await checkRedundantReadStop(repo, null, now);
  assert.ok(sig, "fresh session over cap must fire");
  assert.equal(sig!.sessionId, "live-sess");
});

test("checkRedundantReadStop: missing last_seen treated as fresh (old hook format)", async () => {
  const repo = await tmpRepo("rrd-noseen-");
  await writeSessionState(repo, "old-format", { "/a.md": { read_count: 100 } });
  const sig = await checkRedundantReadStop(repo, null);
  assert.ok(sig, "files without last_seen must still be considered");
});

test("checkRedundantReadStop: honors loop.redundantReadStaleHours override", async () => {
  const repo = await tmpRepo("rrd-stalecfg-");
  const now = Date.parse("2026-06-10T12:00:00Z");
  await writeSessionState(
    repo,
    "sess-1",
    { "/a.md": { read_count: 100 } },
    "2026-06-10T08:00:00Z" // 4h old — fresh by default 6h, stale at 2h
  );
  const fired = await checkRedundantReadStop(repo, null, now);
  assert.ok(fired, "4h-old session is fresh under the 6h default");
  const sig = await checkRedundantReadStop(repo, { loop: { redundantReadStaleHours: 2 } }, now);
  assert.equal(sig, null, "4h-old session is stale under a 2h override");
});

test("checkRedundantReadStop: feature disabled (enabled: false) → returns null even with high read_count", async () => {
  const repo = await tmpRepo("rrd-feature-disabled-");
  await writeSessionState(repo, "sess-1", { "/a.md": { read_count: 99 } });
  const config = { features: { "redundant-read-stop": { enabled: false } } };
  const sig = await checkRedundantReadStop(repo, config);
  assert.equal(sig, null, "feature disabled must skip the gate regardless of read_count");
});

test("checkRedundantReadStop: feature enabled (enabled: true) → fires signal with high read_count", async () => {
  const repo = await tmpRepo("rrd-feature-enabled-");
  await writeSessionState(repo, "sess-1", { "/a.md": { read_count: 99 } });
  const config = {
    features: { "redundant-read-stop": { enabled: true } },
    loop: { redundantReadCap: 5 }
  };
  const sig = await checkRedundantReadStop(repo, config);
  assert.ok(sig, "feature enabled must fire signal when read_count exceeds cap");
  assert.equal(sig!.maxReadCount, 99);
  assert.equal(sig!.threshold, 5);
});

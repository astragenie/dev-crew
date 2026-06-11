import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { writeFanoutMarker, readFanoutMarker } from "../scripts/lib/fanout-marker.mjs";
import { computeTelemetry } from "../scripts/lib/grade-telemetry.mjs";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function tmpRepo(prefix: string) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function scaffoldSlice(repo: string, sliceId: string) {
  const dir = path.join(repo, ".claude/artifacts/loop/ai-loop/slices/in-progress");
  await fs.mkdir(dir, { recursive: true });
  const slug = sliceId.replace(/[^A-Za-z0-9]/g, "_");
  await fs.writeFile(
    path.join(dir, `${slug}.md`),
    `---\nid: ${sliceId}\nfeature: FEAT-185\n---\n# ${sliceId}\n`
  );
}

// ---------------------------------------------------------------------------
// AC-1: writeFanoutMarker writes JSON with expected fields
// ---------------------------------------------------------------------------

test("writeFanoutMarker writes JSON with expected fields", async () => {
  const repo = await tmpRepo("fanout-marker-write-");
  try {
    await writeFanoutMarker(repo, "SLICE-93", 3);
    const markerPath = path.join(repo, ".claude/artifacts/loop/fanout-markers/SLICE-93.json");
    const raw = await fs.readFile(markerPath, "utf8");
    const obj = JSON.parse(raw) as Record<string, unknown>;
    assert.strictEqual(obj.sliceId, "SLICE-93");
    assert.strictEqual(obj.taskCount, 3);
    assert.ok(typeof obj.ts === "string" && obj.ts.length > 0, "ts must be a non-empty string");
    // ts must parse as a valid ISO date
    assert.ok(!Number.isNaN(Date.parse(obj.ts as string)), "ts must be a valid ISO date");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-2: readFanoutMarker returns null when marker is absent
// ---------------------------------------------------------------------------

test("readFanoutMarker returns null when marker is absent", async () => {
  const repo = await tmpRepo("fanout-marker-absent-");
  try {
    const result = await readFanoutMarker(repo, "SLICE-NONEXISTENT");
    assert.strictEqual(result, null);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-3: readFanoutMarker returns object when marker is present
// ---------------------------------------------------------------------------

test("readFanoutMarker returns object when marker is present", async () => {
  const repo = await tmpRepo("fanout-marker-present-");
  try {
    await writeFanoutMarker(repo, "SLICE-93", 3);
    const result = await readFanoutMarker(repo, "SLICE-93");
    assert.ok(result !== null, "result must not be null");
    assert.deepStrictEqual(
      { sliceId: result.sliceId, taskCount: result.taskCount },
      { sliceId: "SLICE-93", taskCount: 3 }
    );
    assert.ok(typeof result.ts === "string" && result.ts.length > 0);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-4: computeTelemetry populates post_builder_fanout: true when marker present
// ---------------------------------------------------------------------------

test("computeTelemetry populates post_builder_fanout: true when marker present", async () => {
  const repo = await tmpRepo("fanout-marker-telemetry-");
  try {
    const sliceId = "SLICE-93";
    await scaffoldSlice(repo, sliceId);
    await writeFanoutMarker(repo, sliceId, 3);
    const telemetry = await computeTelemetry(repo, sliceId, null);
    assert.strictEqual(
      telemetry.post_builder_fanout,
      true,
      "post_builder_fanout must be true when marker is present"
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// AC-5 (bonus): computeTelemetry produces null when marker is absent
// ---------------------------------------------------------------------------

test("computeTelemetry produces post_builder_fanout: null when marker is absent", async () => {
  const repo = await tmpRepo("fanout-marker-telemetry-null-");
  try {
    const sliceId = "SLICE-93";
    await scaffoldSlice(repo, sliceId);
    // No marker written
    const telemetry = await computeTelemetry(repo, sliceId, null);
    assert.strictEqual(
      telemetry.post_builder_fanout,
      null,
      "post_builder_fanout must be null when no marker exists"
    );
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

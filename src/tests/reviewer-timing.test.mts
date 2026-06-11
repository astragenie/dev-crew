import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";

import { detectSerialReviewer } from "../scripts/lib/reviewer-timing.mjs";

async function makeReview(repo: string, ts: string, slice: string) {
  const dir = path.join(repo, ".claude/artifacts/crew/reviews");
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${ts}-review-result-${slice}-x.md`),
    `---\nslice: ${slice}\n---\n# review\n`
  );
}

test("detects serial when span > threshold", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-"));
  try {
    await makeReview(repo, "20260611T100000Z", "slice-99");
    await makeReview(repo, "20260611T100400Z", "slice-99");
    const result = await detectSerialReviewer(repo, "SLICE-99", { thresholdMs: 90000 });
    assert.equal(result.serial, true);
    assert.equal(result.spanMs, 240000);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("no warning when span <= threshold", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-ok-"));
  try {
    await makeReview(repo, "20260611T100000Z", "slice-99");
    await makeReview(repo, "20260611T100030Z", "slice-99");
    const result = await detectSerialReviewer(repo, "SLICE-99", { thresholdMs: 90000 });
    assert.equal(result.serial, false);
    assert.equal(result.spanMs, 30000);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("no-op on single review", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-single-"));
  try {
    await makeReview(repo, "20260611T100000Z", "slice-99");
    const result = await detectSerialReviewer(repo, "SLICE-99", { thresholdMs: 90000 });
    assert.equal(result.serial, false);
    assert.equal(result.spanMs, 0);
    assert.equal(result.reviewCount, 1);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("short sliceId does not collide with longer-id reviews", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-collision-"));
  try {
    // Two reviews for slice-90 — would falsely match SLICE-9 with naive substring.
    await makeReview(repo, "20260611T100000Z", "slice-90");
    await makeReview(repo, "20260611T100400Z", "slice-90");
    const result = await detectSerialReviewer(repo, "SLICE-9", { thresholdMs: 90000 });
    assert.equal(result.serial, false);
    assert.equal(result.reviewCount, 0);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("span exactly at threshold is not serial (strict >)", async () => {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "rev-timing-edge-"));
  try {
    await makeReview(repo, "20260611T100000Z", "slice-99");
    await makeReview(repo, "20260611T100130Z", "slice-99");
    // span = 90000ms, threshold = 90000ms → NOT serial.
    const result = await detectSerialReviewer(repo, "SLICE-99", { thresholdMs: 90000 });
    assert.equal(result.serial, false);
    assert.equal(result.spanMs, 90000);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

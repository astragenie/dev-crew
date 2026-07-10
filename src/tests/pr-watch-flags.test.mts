import { test } from "bun:test";
import assert from "node:assert/strict";

import { parseArgs } from "../scripts/lib/cli-args.mjs";
import { buildPrMergedInput } from "../scripts/lib/pr-merged-emitter.mjs";

// ---------------------------------------------------------------------------
// Regression: --slice-id / --feat-id were read by the "pr-watch" handler
// (loop.mts) but never registered in FLAG_SPEC, so parseArgs threw
// "Unknown argument: --slice-id" before the handler ever ran — the feature
// was not just dead, it broke the command. Covers both halves of the wiring:
// flag parsing (this file's own concern) and the flags -> emitPrMerged
// payload mapping (buildPrMergedInput, extracted from the CLI handler so it
// is testable without spawning a `gh` subprocess).
// ---------------------------------------------------------------------------

const TEST_PR_URL = "https://github.com/o/r/pull/1";

test("parseArgs accepts --slice-id and --feat-id on pr-watch without throwing", () => {
  const { flags, positionals } = parseArgs([
    "pr-watch",
    TEST_PR_URL,
    "--slice-id",
    "SLICE-99",
    "--feat-id",
    "FEAT-200"
  ]);
  assert.equal(positionals[0], TEST_PR_URL);
  assert.equal(flags.sliceId, "SLICE-99");
  assert.equal(flags.featId, "FEAT-200");
});

test("parseArgs defaults sliceId/featId to null when not passed", () => {
  const { flags } = parseArgs(["pr-watch", TEST_PR_URL]);
  assert.equal(flags.sliceId, null);
  assert.equal(flags.featId, null);
});

// ---------------------------------------------------------------------------
// FEAT-494 unblock: --wait-for-merge wires the CLI handler's runPrWatch call
// into the post-green merge-detection path (see pr-watch.mts TC-011..013).
// ---------------------------------------------------------------------------

test("parseArgs accepts --wait-for-merge as a boolean flag on pr-watch", () => {
  const { flags } = parseArgs(["pr-watch", TEST_PR_URL, "--wait-for-merge"]);
  assert.equal(flags.waitForMerge, true);
});

test("parseArgs defaults waitForMerge to false when not passed", () => {
  const { flags } = parseArgs(["pr-watch", TEST_PR_URL]);
  assert.equal(flags.waitForMerge, false);
});

test("buildPrMergedInput forwards sliceId/featId from CLI flags into the emitPrMerged payload", () => {
  const input = buildPrMergedInput(
    TEST_PR_URL,
    { mergedAt: "2026-07-09T09:30:00.000Z", prNumber: 42 },
    { sliceId: "SLICE-99", featId: "FEAT-200" }
  );
  assert.equal(input.prUrl, TEST_PR_URL);
  assert.equal(input.prNumber, 42);
  assert.equal(input.mergedAt, "2026-07-09T09:30:00.000Z");
  assert.equal(input.sliceId, "SLICE-99");
  assert.equal(input.featId, "FEAT-200");
});

test("buildPrMergedInput falls back to null sliceId/featId and a fresh mergedAt when absent", () => {
  const before = Date.now();
  const input = buildPrMergedInput(TEST_PR_URL, { mergedAt: null, prNumber: null }, {});
  const after = Date.now();
  assert.equal(input.prNumber, null);
  assert.equal(input.sliceId, null);
  assert.equal(input.featId, null);
  const mergedAtMs = new Date(input.mergedAt).getTime();
  assert.ok(mergedAtMs >= before && mergedAtMs <= after, "mergedAt should default to now()");
});

// End-to-end: parseArgs output flows straight into buildPrMergedInput,
// mirroring exactly what the "pr-watch" CLI handler does.
test("end-to-end: parseArgs flags flow into buildPrMergedInput unchanged", () => {
  const { flags } = parseArgs([
    "pr-watch",
    TEST_PR_URL,
    "--slice-id",
    "SLICE-1",
    "--feat-id",
    "FEAT-1"
  ]);
  const input = buildPrMergedInput(
    TEST_PR_URL,
    { mergedAt: "2026-07-09T10:00:00.000Z", prNumber: 7 },
    flags
  );
  assert.equal(input.sliceId, "SLICE-1");
  assert.equal(input.featId, "FEAT-1");
});

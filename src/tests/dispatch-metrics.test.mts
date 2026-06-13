import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeDispatchMetrics, readDispatchMetrics } from "../scripts/lib/dispatch-metrics.mjs";

// AC-001: writes file with all required fields
test("writeDispatchMetrics: writes all required fields", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-test-"));
  const metrics = {
    runId: "run-001",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: "complete" as const,
    totalTokens: 100,
    promptTokens: 60,
    completionTokens: 40,
    estimatedCostUsd: 0.01,
    model: "claude-sonnet-4-6",
    childCount: 3
  };
  writeDispatchMetrics(dir, "run-001", metrics);
  const filePath = path.join(dir, ".claude/artifacts/loop/dispatch/run-001/dispatch-metrics.json");
  assert.ok(fs.existsSync(filePath), "file must exist");
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  assert.equal(parsed.runId, "run-001");
  assert.equal(parsed.status, "complete");
  assert.equal(parsed.childCount, 3);
  fs.rmSync(dir, { recursive: true });
});

// AC-002: readDispatchMetrics returns the written data
test("readDispatchMetrics: reads back written metrics", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-test-"));
  const metrics = {
    runId: "run-002",
    startedAt: "2026-06-13T00:00:00.000Z",
    completedAt: "2026-06-13T00:01:00.000Z",
    status: "complete" as const,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    model: "unknown",
    childCount: 1
  };
  writeDispatchMetrics(dir, "run-002", metrics);
  const read = readDispatchMetrics(dir, "run-002");
  assert.ok(read !== null);
  assert.equal(read.runId, "run-002");
  assert.equal(read.model, "unknown");
  fs.rmSync(dir, { recursive: true });
});

// AC-003: partial status on failed run
test("writeDispatchMetrics: partial status written correctly", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-test-"));
  const metrics = {
    runId: "run-fail",
    startedAt: "2026-06-13T00:00:00.000Z",
    completedAt: "2026-06-13T00:00:10.000Z",
    status: "partial" as const,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    model: "unknown",
    childCount: 2
  };
  writeDispatchMetrics(dir, "run-fail", metrics);
  const read = readDispatchMetrics(dir, "run-fail");
  assert.ok(read !== null);
  assert.equal(read.status, "partial");
  fs.rmSync(dir, { recursive: true });
});

// AC-004: non-blocking on write failure
test("writeDispatchMetrics: non-blocking when dir is unwritable", () => {
  // Use a path that cannot be created (file exists as a file where dir is expected)
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-test-"));
  const blockingFile = path.join(dir, ".claude");
  fs.writeFileSync(blockingFile, "block"); // put a FILE where the dir would go
  const metrics = {
    runId: "run-block",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: "complete" as const,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    estimatedCostUsd: 0,
    model: "unknown",
    childCount: 0
  };
  // must not throw
  assert.doesNotThrow(() => writeDispatchMetrics(dir, "run-block", metrics));
  fs.rmSync(dir, { recursive: true });
});

// AC-005: readDispatchMetrics returns null for unknown run
test("readDispatchMetrics: returns null for unknown runId", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dm-test-"));
  const result = readDispatchMetrics(dir, "run-unknown");
  assert.equal(result, null);
  fs.rmSync(dir, { recursive: true });
});

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { recordStep, readTrajectory, trajectoryPath } from "../scripts/lib/trajectory-writer.mjs";

test("recordStep creates trajectory file and appends JSONL line", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
  try {
    const success = await recordStep(tmpDir, "SLICE-01", "slice_start", { title: "Test slice" });
    assert.equal(success, true, "recordStep should return true");

    const filePath = trajectoryPath(tmpDir, "SLICE-01");
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.trim().split("\n");
    assert.equal(lines.length, 1, "should have one line");

    const record = JSON.parse(lines[0]);
    assert.equal(record.type, "slice_start");
    assert.equal(record.sliceId, "SLICE-01");
    assert.equal(record.title, "Test slice");
    assert.ok(record.timestamp, "should have timestamp");
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test("recordStep appends multiple events to same file", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
  try {
    await recordStep(tmpDir, "SLICE-02", "slice_start", { title: "Slice 2" });
    await recordStep(tmpDir, "SLICE-02", "slice_complete", { validationSatisfied: true });

    const filePath = trajectoryPath(tmpDir, "SLICE-02");
    const content = await fs.readFile(filePath, "utf8");
    const lines = content.trim().split("\n");
    assert.equal(lines.length, 2, "should have two lines");

    const record1 = JSON.parse(lines[0]);
    const record2 = JSON.parse(lines[1]);
    assert.equal(record1.type, "slice_start");
    assert.equal(record2.type, "slice_complete");
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test("recordStep includes correct type, sliceId, and timestamp fields", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
  try {
    const beforeTime = new Date().toISOString();
    await recordStep(tmpDir, "SLICE-03", "slice_start", { featureId: "FEAT-001", title: "Test" });
    const afterTime = new Date().toISOString();

    const filePath = trajectoryPath(tmpDir, "SLICE-03");
    const content = await fs.readFile(filePath, "utf8");
    const record = JSON.parse(content.trim());

    assert.equal(record.type, "slice_start");
    assert.equal(record.sliceId, "SLICE-03");
    assert.equal(record.featureId, "FEAT-001");
    assert.equal(record.title, "Test");
    assert.ok(record.timestamp, "should have timestamp");
    assert.ok(
      record.timestamp >= beforeTime && record.timestamp <= afterTime,
      "timestamp should be in range"
    );
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test("readTrajectory returns empty array for missing file", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
  try {
    const steps = await readTrajectory(tmpDir, "SLICE-MISSING");
    assert.equal(Array.isArray(steps), true, "should return array");
    assert.equal(steps.length, 0, "should be empty for missing file");
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

test("readTrajectory parses all recorded events", async () => {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "test-"));
  try {
    await recordStep(tmpDir, "SLICE-04", "slice_start", { title: "Start event" });
    await recordStep(tmpDir, "SLICE-04", "mid_point", { progress: 50 });
    await recordStep(tmpDir, "SLICE-04", "slice_complete", { result: "success" });

    const steps = await readTrajectory(tmpDir, "SLICE-04");
    assert.equal(steps.length, 3, "should have three events");

    assert.equal(steps[0].type, "slice_start");
    assert.equal(steps[0].title, "Start event");

    assert.equal(steps[1].type, "mid_point");
    assert.equal(steps[1].progress, 50);

    assert.equal(steps[2].type, "slice_complete");
    assert.equal(steps[2].result, "success");

    // Verify all have sliceId and timestamp
    steps.forEach((step) => {
      assert.equal(step.sliceId, "SLICE-04");
      assert.ok(step.timestamp);
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true });
  }
});

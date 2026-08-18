// @ts-nocheck
import { test } from "bun:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readMarker, appendTrace } from "../scripts/lib/dispatch-trace.mjs";

test("readMarker: returns null when file missing", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-marker-"));
  const result = readMarker(repo, "run-x", "FE");
  assert.equal(result, null);
});

test("readMarker: returns parsed DispatchResult when valid", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-marker-"));
  const dir = path.join(repo, ".claude/artifacts/loop/dispatch/run-y");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "FE.result.json"),
    JSON.stringify({
      id: "FE",
      status: "DONE",
      branch: "b",
      worktreePath: "/p"
    })
  );
  const result = readMarker(repo, "run-y", "FE");
  assert.equal(result?.status, "DONE");
  assert.equal(result?.id, "FE");
});

test("readMarker: returns null when malformed", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-marker-"));
  const dir = path.join(repo, ".claude/artifacts/loop/dispatch/run-z");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "FE.result.json"), "{ not json");
  const result = readMarker(repo, "run-z", "FE");
  assert.equal(result, null);
});

test("appendTrace: creates trace.jsonl with one line per call", () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "loop-trace-"));
  appendTrace(repo, "run-t", {
    depth: 0,
    childId: "FE",
    status: "DONE",
    durationMs: 100,
    costUsd: null
  });
  appendTrace(repo, "run-t", {
    depth: 0,
    childId: "BE",
    status: "FAILED",
    durationMs: 200,
    costUsd: null
  });
  const log = fs.readFileSync(
    path.join(repo, ".claude/artifacts/loop/dispatch/run-t/trace.jsonl"),
    "utf8"
  );
  const lines = log.trim().split("\n");
  assert.equal(lines.length, 2);
  const e1 = JSON.parse(lines[0]);
  assert.equal(e1.childId, "FE");
  assert.equal(e1.status, "DONE");
  assert.ok(typeof e1.ts === "string");
});

import { test, expect } from "bun:test";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { classifyBashGate, startGateTimer, endGateTimer } from "../scripts/lib/bash-gate-timer.mjs";

test("classifyBashGate returns correct gate for bun run typecheck", () => {
  expect(classifyBashGate("bun run typecheck")).toBe("typecheck");
});

test("classifyBashGate returns correct gate for bun run lint", () => {
  expect(classifyBashGate("bun run lint")).toBe("lint");
});

test("classifyBashGate returns correct gate for bun run format:check", () => {
  expect(classifyBashGate("bun run format:check")).toBe("format:check");
});

test("classifyBashGate returns correct gate for bun audit", () => {
  expect(classifyBashGate("bun audit")).toBe("audit");
});

test("classifyBashGate returns correct gate for bun run verify:all", () => {
  expect(classifyBashGate("bun run verify:all")).toBe("verify:all");
});

test("classifyBashGate returns test for bun test", () => {
  expect(classifyBashGate("bun test")).toBe("test");
});

test("classifyBashGate returns test for bun run test", () => {
  expect(classifyBashGate("bun run test")).toBe("test");
});

test("classifyBashGate returns npm-ci for npm ci", () => {
  expect(classifyBashGate("npm ci")).toBe("npm-ci");
});

test("classifyBashGate returns null for ls -la", () => {
  expect(classifyBashGate("ls -la")).toBe(null);
});

test("classifyBashGate returns null for bun run test:node (Node fallback — must not contaminate test bucket)", () => {
  expect(classifyBashGate("bun run test:node")).toBe(null);
});

test("classifyBashGate returns null for bun audit-fix (colon-suffixed variant)", () => {
  expect(classifyBashGate("bun audit-fix")).toBe(null);
});

test("classifyBashGate returns null for bun run typecheck:strict (colon-suffixed variant)", () => {
  expect(classifyBashGate("bun run typecheck:strict")).toBe(null);
});

test("classifyBashGate returns test for bun run test (regression — still classifies correctly)", () => {
  expect(classifyBashGate("bun run test")).toBe("test");
});

test("classifyBashGate returns audit for bun audit (regression — still classifies correctly)", () => {
  expect(classifyBashGate("bun audit")).toBe("audit");
});

test("startGateTimer returns null for unknown command", () => {
  expect(startGateTimer("ls -la")).toBe(null);
});

test("end-to-end: startGateTimer + endGateTimer writes JSONL row with correct fields", async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "bash-gate-timer-"));
  const logPath = path.join(tmp, "bash-gates.jsonl");
  process.env["CREW_BASH_GATE_LOG"] = logPath;
  try {
    const handle = startGateTimer("bun run lint");
    expect(handle !== null, "startGateTimer should return a handle for known command").toBeTruthy();
    // Sleep 15ms
    await new Promise<void>((r) => setTimeout(r, 15));
    endGateTimer(handle, 0);
    // Allow fire-and-forget append to flush
    await new Promise<void>((r) => setTimeout(r, 50));
    const raw = await fs.readFile(logPath, "utf-8");
    const row = JSON.parse(raw.trim()) as Record<string, unknown>;
    expect(row["gate"]).toBe("lint");
    expect(row["exitCode"]).toBe(0);
    expect(
      typeof row["durationMs"] === "number" && row["durationMs"] >= 10,
      `durationMs ${row["durationMs"]} below floor`
    ).toBeTruthy();
  } finally {
    delete process.env["CREW_BASH_GATE_LOG"];
    await fs.rm(tmp, { recursive: true, force: true });
  }
});

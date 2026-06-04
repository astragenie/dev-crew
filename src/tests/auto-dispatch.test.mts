import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { parseSkipFlag, appendAuditLog, dispatchAgent } from "../scripts/lib/auto-dispatch.mjs";

async function tmpRepo(prefix: string): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

function auditLogPath(repoRoot: string): string {
  return path.join(repoRoot, ".claude/artifacts/loop/auto-dispatch.jsonl");
}

async function readJsonLines(filePath: string): Promise<object[]> {
  const text = await fs.readFile(filePath, "utf8");
  return text
    .trim()
    .split("\n")
    .filter((l) => l.trim().length > 0)
    .map((l) => JSON.parse(l));
}

// --- parseSkipFlag ---

test("parseSkipFlag returns true when flag present in argv", () => {
  assert.equal(parseSkipFlag(["--no-research"], "--no-research"), true);
});

test("parseSkipFlag returns false when flag absent from argv", () => {
  assert.equal(parseSkipFlag(["--other"], "--no-research"), false);
});

test("parseSkipFlag handles multiple independent flags", () => {
  assert.equal(parseSkipFlag(["--no-research", "--no-architect"], "--no-architect"), true);
});

// --- dispatchAgent: opt-out via skipFlag ---

test("dispatchAgent returns skipped=true when skipFlag present, no dispatch, audit entry written", async () => {
  const repo = await tmpRepo("ad-skip-");
  const result = await dispatchAgent({
    agent: "loop:researcher",
    prompt: "research something",
    parentCommand: "backlog-add",
    repoRoot: repo,
    argv: ["--no-research"],
    skipFlag: "--no-research"
  });

  assert.equal(result.ok, true);
  assert.equal(result.skipped, true);
  assert.equal(result.skipReason, "opt-out");
  assert.equal(result.durationMs, 0);

  const lines = await readJsonLines(auditLogPath(repo));
  assert.equal(lines.length, 1);
  const entry = lines[0] as any;
  assert.equal(entry.skipped, true);
  assert.equal(entry.ok, true);
  assert.equal(entry.skipReason, "opt-out");
});

// --- dispatchAgent: dispatch failure isolation ---

test("dispatchAgent returns ok=false on internal failure, does not throw, audit entry written", async () => {
  const repo = await tmpRepo("ad-fail-");

  // Pass a costAdvisor that throws to force internal error path.
  // The module must catch and return { ok: false } rather than propagating.
  const result = await dispatchAgent({
    agent: "loop:researcher",
    prompt: "research something",
    parentCommand: "backlog-add",
    repoRoot: repo,
    costAdvisor: () => {
      throw new Error("advisor exploded");
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.skipped, false);
  assert.ok(typeof result.error === "string" && result.error.length > 0);

  const lines = await readJsonLines(auditLogPath(repo));
  assert.equal(lines.length, 1);
  const entry = lines[0] as any;
  assert.equal(entry.ok, false);
});

// --- dispatchAgent: cost-warn does not skip ---

test("dispatchAgent proceeds when costAdvisor returns warn, logs warning, audit entry ok=true", async () => {
  const repo = await tmpRepo("ad-warn-");
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => warnings.push(args.join(" "));

  try {
    const result = await dispatchAgent({
      agent: "loop:researcher",
      prompt: "research something",
      parentCommand: "backlog-add",
      repoRoot: repo,
      costAdvisor: () => ({ verdict: "warn" as const })
    });

    // Must not be skipped — cost-warn proceeds anyway
    assert.equal(result.skipped, false);
    // A warning must have been logged
    const warnLogged = warnings.some((w) => w.includes("[auto-dispatch] cost-warn"));
    assert.ok(warnLogged, "expected a cost-warn console.warn message");

    const lines = await readJsonLines(auditLogPath(repo));
    assert.equal(lines.length, 1);
    const entry = lines[0] as any;
    assert.equal(entry.ok, true);
  } finally {
    console.warn = originalWarn;
  }
});

// --- appendAuditLog ---

test("appendAuditLog creates auto-dispatch.jsonl on first call", async () => {
  const repo = await tmpRepo("ad-create-");
  const logPath = auditLogPath(repo);

  // File must not exist yet
  await assert.rejects(() => fs.access(logPath));

  await appendAuditLog(repo, {
    timestamp: "2026-01-01T00:00:00.000Z",
    agent: "loop:researcher",
    parentCommand: "test",
    ok: true,
    skipped: false,
    durationMs: 42
  });

  await fs.access(logPath); // must exist now
  const lines = await readJsonLines(logPath);
  assert.equal(lines.length, 1);
});

test("appendAuditLog appends a second JSON line on subsequent call", async () => {
  const repo = await tmpRepo("ad-append-");
  const logPath = auditLogPath(repo);

  const entry = {
    timestamp: "2026-01-01T00:00:00.000Z",
    agent: "loop:researcher",
    parentCommand: "test",
    ok: true,
    skipped: false,
    durationMs: 10
  };

  await appendAuditLog(repo, entry);
  await appendAuditLog(repo, { ...entry, durationMs: 20 });

  const lines = await readJsonLines(logPath);
  assert.equal(lines.length, 2);
});

// --- audit entry shape ---

test("each audit entry contains required keys: timestamp, agent, parentCommand, ok, skipped, durationMs", async () => {
  const repo = await tmpRepo("ad-keys-");
  const logPath = auditLogPath(repo);

  await dispatchAgent({
    agent: "loop:researcher",
    prompt: "check keys",
    parentCommand: "spec-decompose",
    repoRoot: repo,
    argv: ["--no-research"],
    skipFlag: "--no-research"
  });

  const lines = await readJsonLines(logPath);
  assert.equal(lines.length, 1);
  const entry = lines[0] as any;

  for (const key of ["timestamp", "agent", "parentCommand", "ok", "skipped", "durationMs"]) {
    assert.ok(Object.prototype.hasOwnProperty.call(entry, key), `missing key: ${key}`);
  }
  assert.equal(entry.agent, "loop:researcher");
  assert.equal(entry.parentCommand, "spec-decompose");
  assert.equal(typeof entry.timestamp, "string");
  assert.equal(typeof entry.durationMs, "number");
});

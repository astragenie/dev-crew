import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import {
  parseSkipFlag,
  appendAuditLog,
  dispatchAgent,
  flushAuditLog,
  resolveAuditLogPath
} from "../scripts/lib/auto-dispatch.mjs";

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
  try {
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

    await flushAuditLog(repo);
    const lines = await readJsonLines(auditLogPath(repo));
    assert.equal(lines.length, 1);
    const entry = lines[0] as any;
    assert.equal(entry.skipped, true);
    assert.equal(entry.ok, true);
    assert.equal(entry.skipReason, "opt-out");
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// --- dispatchAgent: dispatch failure isolation ---

test("dispatchAgent returns ok=false on internal failure, does not throw, audit entry written", async () => {
  const repo = await tmpRepo("ad-fail-");
  try {
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

    await flushAuditLog(repo);
    const lines = await readJsonLines(auditLogPath(repo));
    assert.equal(lines.length, 1);
    const entry = lines[0] as any;
    assert.equal(entry.ok, false);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
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

    await flushAuditLog(repo);
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
  try {
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

    await flushAuditLog(repo);
    await fs.access(logPath); // must exist now
    const lines = await readJsonLines(logPath);
    assert.equal(lines.length, 1);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("appendAuditLog appends a second JSON line on subsequent call", async () => {
  const repo = await tmpRepo("ad-append-");
  try {
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

    await flushAuditLog(repo);
    const lines = await readJsonLines(logPath);
    assert.equal(lines.length, 2);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// --- audit entry shape ---

test("each audit entry contains required keys: timestamp, agent, parentCommand, ok, skipped, durationMs", async () => {
  const repo = await tmpRepo("ad-keys-");
  try {
    const logPath = auditLogPath(repo);

    await dispatchAgent({
      agent: "loop:researcher",
      prompt: "check keys",
      parentCommand: "spec-decompose",
      repoRoot: repo,
      argv: ["--no-research"],
      skipFlag: "--no-research"
    });

    await flushAuditLog(repo);
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
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// --- resolveAuditLogPath ---

test("resolveAuditLogPath returns default path when opts is empty", () => {
  const repo = "/tmp/test-repo";
  const expected = path.join(repo, ".claude/artifacts/loop/auto-dispatch.jsonl");
  assert.equal(resolveAuditLogPath(repo, {}), expected);
});

test("resolveAuditLogPath returns default path when config has no loop key", () => {
  const repo = "/tmp/test-repo";
  const expected = path.join(repo, ".claude/artifacts/loop/auto-dispatch.jsonl");
  assert.equal(resolveAuditLogPath(repo, { config: {} }), expected);
});

test("resolveAuditLogPath returns default path when config.loop has no auditLogPath", () => {
  const repo = "/tmp/test-repo";
  const expected = path.join(repo, ".claude/artifacts/loop/auto-dispatch.jsonl");
  assert.equal(resolveAuditLogPath(repo, { config: { loop: {} } }), expected);
});

test("resolveAuditLogPath resolves relative auditLogPath against repoRoot", () => {
  const repo = "/tmp/test-repo";
  const expected = path.join(repo, "custom/foo.jsonl");
  assert.equal(
    resolveAuditLogPath(repo, { config: { loop: { auditLogPath: "custom/foo.jsonl" } } }),
    expected
  );
});

test("resolveAuditLogPath uses absolute auditLogPath verbatim", () => {
  const repo = "/tmp/test-repo";
  const absPath = "/abs/path/foo.jsonl";
  assert.equal(resolveAuditLogPath(repo, { config: { loop: { auditLogPath: absPath } } }), absPath);
});

// --- appendAuditLog with opts ---

test("appendAuditLog with no opts writes to default path (regression guard)", async () => {
  const repo = await tmpRepo("ad-noopt-");
  try {
    const entry = { agent: "smoke", ok: true, durationMs: 0 };
    await appendAuditLog(repo, entry);
    await flushAuditLog(repo);
    const logPath = auditLogPath(repo);
    await fs.access(logPath);
    const lines = await readJsonLines(logPath);
    assert.equal(lines.length, 1);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("appendAuditLog with custom relative auditLogPath writes to that path", async () => {
  const repo = await tmpRepo("ad-custom-");
  try {
    const entry = { agent: "smoke", ok: true, durationMs: 0 };
    await appendAuditLog(repo, entry, { config: { loop: { auditLogPath: "custom.jsonl" } } });
    await flushAuditLog(repo, { config: { loop: { auditLogPath: "custom.jsonl" } } });
    const customPath = path.join(repo, "custom.jsonl");
    await fs.access(customPath);
    const lines = await readJsonLines(customPath);
    assert.equal(lines.length, 1);
    // default path must not exist
    await assert.rejects(() => fs.access(auditLogPath(repo)));
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

test("appendAuditLog creates parent dir when custom path dir does not exist", async () => {
  const repo = await tmpRepo("ad-mkdir-");
  try {
    const entry = { agent: "smoke", ok: true, durationMs: 0 };
    await appendAuditLog(repo, entry, {
      config: { loop: { auditLogPath: "deep/nested/dir/audit.jsonl" } }
    });
    await flushAuditLog(repo, {
      config: { loop: { auditLogPath: "deep/nested/dir/audit.jsonl" } }
    });
    const customPath = path.join(repo, "deep/nested/dir/audit.jsonl");
    await fs.access(customPath);
    const lines = await readJsonLines(customPath);
    assert.equal(lines.length, 1);
  } finally {
    await fs.rm(repo, { recursive: true, force: true });
  }
});

// --- slice event emission ---

test("dispatchAgent emits agent_dispatched and agent_completed when sliceId provided", async () => {
  const tmpEventsDir = await fs.mkdtemp(path.join(os.tmpdir(), "dispatch-events-"));
  try {
    await dispatchAgent({
      agent: "crew:builder",
      prompt: "build it",
      parentCommand: "test",
      repoRoot: tmpEventsDir,
      sliceId: "SLICE-10",
      featureId: "FEAT-020"
    });
    const { eventsPath } = await import("../scripts/lib/slice-events.mjs");
    const raw = await fs.readFile(eventsPath(tmpEventsDir, "SLICE-10"), "utf8");
    const lines = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l) => JSON.parse(l));
    const dispatched = lines.find((l: any) => l.type === "agent_dispatched");
    const completed = lines.find((l: any) => l.type === "agent_completed");
    assert.ok(dispatched, "agent_dispatched missing");
    assert.equal(dispatched.agent, "crew:builder");
    assert.equal(dispatched.sliceId, "SLICE-10");
    assert.ok(completed, "agent_completed missing");
    assert.equal(completed.status, "ok");
  } finally {
    await fs.rm(tmpEventsDir, { recursive: true, force: true });
  }
});

test("dispatchAgent emits agent_completed:skipped when skip flag present and sliceId provided", async () => {
  const tmpEventsDir = await fs.mkdtemp(path.join(os.tmpdir(), "dispatch-skip-"));
  try {
    await dispatchAgent({
      agent: "crew:builder",
      prompt: "build it",
      parentCommand: "test",
      repoRoot: tmpEventsDir,
      argv: ["--skip-agent"],
      skipFlag: "--skip-agent",
      sliceId: "SLICE-11",
      featureId: null
    });
    const { eventsPath } = await import("../scripts/lib/slice-events.mjs");
    const raw = await fs.readFile(eventsPath(tmpEventsDir, "SLICE-11"), "utf8").catch(() => "");
    const lines = raw
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((l: any) => JSON.parse(l));
    const completed = lines.find((l: any) => l.type === "agent_completed");
    assert.ok(completed, "agent_completed missing");
    assert.equal(completed.status, "skipped");
  } finally {
    await fs.rm(tmpEventsDir, { recursive: true, force: true });
  }
});

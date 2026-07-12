#!/usr/bin/env node
// SubagentStop / SessionEnd hook: capture-at-close for astramem ingest
// (runner-plugin#394).
//
// Why: the memory daemon's ingest pipeline was starved to zero. The prior
// approach fed a transcript *path* to a deferred/swept reader; for
// worktree + subagent transcripts the `.jsonl` gets deleted by cleanup
// before the sweep runs, so the read raced cleanup and lost every time
// (786 `transcript file not found` in ingest.log on 2026-07-09, 455 of
// them `\subagents\agent-*.jsonl`). This hook closes the race by reading
// the transcript SYNCHRONOUSLY at close — while the file is guaranteed to
// still exist — and handing it to `astramem-local capture claude <path>
// --event <kind>` (astramemory-local FEAT-449), which parses it and
// atomic-writes it to a durable spool for the daemon to drain async. The
// daemon-side `capture` subcommand may not be installed yet on every
// machine during rollout; that's the expected no-cli case below.
//
// Fail-open contract: this hook NEVER blocks Stop/SubagentStop and NEVER
// exits non-zero (exit 2 would force a stop-retry loop). Missing CLI,
// missing transcript, non-zero CLI exit, and timeout all resolve to a
// best-effort stderr note + exit 0.
//
// Gating: reuses the existing `memory.enabled` block in `.claude/loop.json`
// — the same opt-in convention memory-sink.mts / memory-doctor.mts /
// start-slice.mts already apply to every other memory-capture path in this
// repo (absent block, or "off"/"never"/"disabled"/false -> OFF; "auto" |
// "on" | "always" | true -> enabled). No separate feature flag: this hook
// is part of the same memory-capture surface, so it's gated the same way.
// Reimplemented dependency-free here (not imported from memory-sink.mts)
// because hooks/*.mjs run via plain `node` with no build step and cannot
// import the bun-oriented src/scripts/lib/**/*.mts tree (see
// emit-astrarunner-event.mjs header for the same constraint).
//
// Cost (issue-measured, real 941KB/62-turn transcript): ~20-40ms median,
// ~80-150ms p95, ~1-2s worst case (28MB main session). CAPTURE_TIMEOUT_MS
// below caps the worst case so a wedged CLI/daemon can never hang close.

import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const DEFAULT_CAPTURE_TIMEOUT_MS = 4000;
const CAPTURE_TIMEOUT_MS = Number(process.env.CAPTURE_AT_CLOSE_TIMEOUT_MS) || DEFAULT_CAPTURE_TIMEOUT_MS;

// On win32 a bare `astramem-local` is frequently not what's on disk — real
// installs commonly resolve via a `.cmd`/`.exe` wrapper. Mirrors the
// candidate-extension probing in astramem-cli-resolver.mts's WIN32_CLI_CANDIDATES.
const WIN32_CLI_CANDIDATES = [
  "astramem-local.exe",
  "astramem-local.cmd",
  "astramem-local.bat",
  "astramem-local"
];
const POSIX_CLI_CANDIDATES = ["astramem-local"];

function readHookPayload() {
  try {
    return JSON.parse(readFileSync(0, "utf8"));
  } catch {
    return null;
  }
}

function readLoopJsonSync(repoPath) {
  try {
    return JSON.parse(readFileSync(path.join(repoPath, ".claude", "loop.json"), "utf8"));
  } catch {
    return null;
  }
}

/** Mirrors memory-sink.mts's normalizeMode() opt-in default: absent/unknown -> OFF. */
function memoryCaptureEnabled(repoPath) {
  const parsed = readLoopJsonSync(repoPath);
  const enabled = parsed?.memory?.enabled;
  if (enabled === true) return true;
  if (typeof enabled === "string") {
    const v = enabled.toLowerCase();
    if (v === "on" || v === "always" || v === "true" || v === "auto") return true;
  }
  return false;
}

/**
 * Resolve the `astramem-local` CLI. `ASTRAMEM_LOCAL_CLI` is an explicit
 * override (test seam + power-user override, mirrors astramem-cli-resolver's
 * env-pinned path); otherwise probe PATH via `where`/`which`.
 * `ASTRAMEM_DISABLE_PATH_PROBE` mirrors the same test-isolation escape hatch
 * used by astramem-cli-resolver.mts so no test can pick up a real,
 * globally-installed binary. Never throws — returns null when unresolved.
 */
async function resolveCaptureCli() {
  const override = process.env.ASTRAMEM_LOCAL_CLI;
  if (override) {
    try {
      await fs.access(override);
      return override;
    } catch {
      return null;
    }
  }
  if (process.env.ASTRAMEM_DISABLE_PATH_PROBE) return null;

  const whichCmd = process.platform === "win32" ? "where" : "which";
  const candidates = process.platform === "win32" ? WIN32_CLI_CANDIDATES : POSIX_CLI_CANDIDATES;
  for (const name of candidates) {
    const found = await new Promise((resolve) => {
      try {
        const proc = spawn(whichCmd, [name], { stdio: ["ignore", "pipe", "ignore"] });
        let out = "";
        proc.stdout?.on("data", (chunk) => {
          out += chunk.toString();
        });
        proc.on("close", (code) => {
          const line = out.split(/\r?\n/)[0]?.trim() ?? "";
          resolve(code === 0 && line.length > 0 ? line : null);
        });
        proc.on("error", () => resolve(null));
      } catch {
        resolve(null);
      }
    });
    if (found) return found;
  }
  return null;
}

/** Spawn `<cli> capture claude <transcriptPath> --event <eventArg>`, capped
 * at CAPTURE_TIMEOUT_MS. Resolves { ok, reason? } — never rejects. */
function runCapture(cliPath, transcriptPath, eventArg) {
  return new Promise((resolve) => {
    let settled = false;
    let proc;
    const done = (result) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };
    const timer = setTimeout(() => {
      try {
        proc?.kill();
      } catch {
        // best-effort kill on timeout
      }
      done({ ok: false, reason: "timeout" });
    }, CAPTURE_TIMEOUT_MS);

    try {
      proc = spawn(cliPath, ["capture", "claude", transcriptPath, "--event", eventArg], {
        stdio: ["ignore", "ignore", "pipe"],
        // shell:true needed on Windows to run .cmd/.bat wrappers.
        shell: process.platform === "win32",
        windowsHide: true
      });
      let stderr = "";
      proc.stderr?.on("data", (chunk) => {
        stderr += chunk.toString();
      });
      proc.on("close", (code) => {
        clearTimeout(timer);
        done(code === 0 ? { ok: true } : { ok: false, reason: `exit ${code}`, stderr: stderr.trim() });
      });
      proc.on("error", (err) => {
        clearTimeout(timer);
        done({ ok: false, reason: err.message });
      });
    } catch (err) {
      clearTimeout(timer);
      done({ ok: false, reason: err?.message ?? "spawn failed" });
    }
  });
}

/** SubagentStop carries the subagent's own transcript in `agent_transcript_path`
 * (distinct from `transcript_path`, the main session transcript, which is
 * also present but not what we want to capture here). SessionEnd has only
 * the main session's `transcript_path`. Verified against a real captured
 * SubagentStop payload (agent_transcript_path -> `...\subagents\agent-*.jsonl`,
 * matching the exact pattern the ingest.log starvation was tracking). */
function resolveEventKind(payload) {
  const hookEvent = payload?.hook_event_name;
  if (hookEvent === "SubagentStop") {
    return { transcriptPath: payload?.agent_transcript_path || null, eventArg: "subagent_stop" };
  }
  if (hookEvent === "SessionEnd") {
    return { transcriptPath: payload?.transcript_path || null, eventArg: "session_end" };
  }
  return { transcriptPath: null, eventArg: null };
}

async function main() {
  const payload = readHookPayload();
  if (!payload) {
    process.exit(0);
  }

  const repoPath = (typeof payload.cwd === "string" && payload.cwd) || process.cwd();
  if (!memoryCaptureEnabled(repoPath)) {
    process.exit(0);
  }

  const { transcriptPath, eventArg } = resolveEventKind(payload);
  if (!transcriptPath || !eventArg) {
    process.exit(0);
  }

  try {
    await fs.access(transcriptPath);
  } catch {
    // Transcript already gone (or never existed) — matches the CLI's own
    // fail-soft contract; skip the spawn entirely.
    process.exit(0);
  }

  const cliPath = await resolveCaptureCli();
  if (!cliPath) {
    // astramem-local isn't installed, or the installed version predates
    // FEAT-449's `capture` subcommand — expected during rollout. Silent
    // no-op so every session without the daemon doesn't warn on every close.
    process.exit(0);
  }

  const result = await runCapture(cliPath, transcriptPath, eventArg);
  if (!result.ok) {
    process.stderr.write(
      `capture-at-close: astramem-local capture claude failed (${result.reason}) — ingest skipped for this ${eventArg}, non-fatal.\n`
    );
  }
  process.exit(0);
}

main().catch(() => {
  // Absolute last-resort fail-open — this hook must never block close.
  process.exit(0);
});

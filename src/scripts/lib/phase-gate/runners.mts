// Stage / command runners used by runPhaseGate. Extracted from
// phase-gate.mjs during the Tier B-8 split. No side effects beyond
// process execution + healthcheck polling.

import path from "node:path";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);

const MAX_OUTPUT_BYTES = 64 * 1024;
const HEALTHCHECK_TIMEOUT_MS = 30_000;
const HEALTHCHECK_POLL_INTERVAL_MS = 1_000;

export function nowIso() {
  return new Date().toISOString();
}

function tail(text: string, maxBytes = MAX_OUTPUT_BYTES) {
  if (!text) return "";
  const buffer = Buffer.from(text);
  if (buffer.length <= maxBytes) {
    return text;
  }
  return `... (truncated, showing last ${maxBytes} bytes)\n${buffer.slice(buffer.length - maxBytes).toString("utf8")}`;
}

async function runOneCommand(repoPath: string, step: Record<string, any>) {
  const cwd = step.cwd ? path.resolve(repoPath, step.cwd) : repoPath;
  const startedAt = Date.now();
  try {
    const { stdout, stderr } = await execFile(step.cmd, step.args || [], {
      cwd,
      maxBuffer: MAX_OUTPUT_BYTES * 4,
      timeout: step.timeout || 30 * 60 * 1000
    });
    return {
      cmd: step.cmd,
      args: step.args || [],
      cwd: path.relative(repoPath, cwd) || ".",
      exit: 0,
      durationMs: Date.now() - startedAt,
      stdout: tail(stdout),
      stderr: tail(stderr),
      ok: true
    };
  } catch (error) {
    const err = error as Record<string, any>;
    return {
      cmd: step.cmd,
      args: step.args || [],
      cwd: path.relative(repoPath, cwd) || ".",
      exit: typeof err.code === "number" ? err.code : 1,
      durationMs: Date.now() - startedAt,
      stdout: tail(err.stdout || ""),
      stderr: tail(err.stderr || err.message || ""),
      ok: false
    };
  }
}

export async function runStageList(repoPath: string, name: string, steps: Record<string, any>[]) {
  if (!Array.isArray(steps) || steps.length === 0) {
    return { name, skipped: true, runs: [] as Record<string, any>[] };
  }
  const runs: any[] = [];
  for (const step of steps) {
    if (!step || !step.cmd) {
      continue;
    }
    const run = await runOneCommand(repoPath, step);
    runs.push(run);
    if (!run.ok) {
      // Stop the stage list on first failure — typical phase-gate ergonomics.
      break;
    }
  }
  const allOk = runs.length > 0 && runs.every((r) => r.ok);
  return { name, skipped: false, runs, ok: allOk };
}

export async function runSingleStage(repoPath: string, name: string, step: Record<string, any>) {
  if (!step || !step.cmd) {
    return { name, skipped: true, runs: [] as Record<string, any>[] };
  }
  const run = await runOneCommand(repoPath, step);
  return { name, skipped: false, runs: [run], ok: run.ok };
}

function validateHealthcheckUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function pollHealthcheck(url: string) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < HEALTHCHECK_TIMEOUT_MS) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), HEALTHCHECK_POLL_INTERVAL_MS);
      const response = await fetch(url, { signal: ac.signal });
      clearTimeout(timer);
      if (response.ok) {
        return { url, status: response.status, ok: true, durationMs: Date.now() - startedAt };
      }
    } catch {
      // ignore; will retry until timeout
    }
    await new Promise((r) => setTimeout(r, HEALTHCHECK_POLL_INTERVAL_MS));
  }
  return { url, status: null, ok: false, durationMs: Date.now() - startedAt };
}

export async function runAspireStage(repoPath: string, config: Record<string, any>) {
  const aspire = config.stack?.aspireBoot;
  const healthchecks = config.stack?.healthchecks || [];
  if (!aspire || !aspire.cmd) {
    return { name: "aspireBoot", skipped: true, runs: [] as Record<string, any>[] };
  }
  // Aspire boots a long-running process; we don't wait for it to "finish" via
  // execFile. We spawn it detached and rely on healthchecks for liveness.
  // For v1 we run it as a normal child process with a short timeout, then poll
  // healthchecks. Proper detached spawn is a v2 improvement.
  // To avoid hanging the phase-gate, only run aspireBoot if at least one
  // healthcheck URL is configured.
  if (healthchecks.length === 0) {
    return {
      name: "aspireBoot",
      skipped: true,
      reason: "no healthchecks configured; skipping aspireBoot to avoid hanging",
      runs: [] as Record<string, any>[]
    };
  }

  const cwd = aspire.cwd ? path.resolve(repoPath, aspire.cwd) : repoPath;
  const { spawn } = await import("node:child_process");
  const child = spawn(aspire.cmd, aspire.args || [], {
    cwd,
    detached: false,
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    const results: any[] = [];
    for (const rawUrl of healthchecks) {
      const url = validateHealthcheckUrl(rawUrl);
      if (!url) {
        results.push({
          url: rawUrl,
          status: null,
          ok: false,
          error: "invalid url (must be http or https)"
        });
        continue;
      }
      results.push(await pollHealthcheck(url));
    }
    const allOk = results.every((r) => r.ok);
    return {
      name: "aspireBoot",
      skipped: false,
      runs: [
        {
          cmd: aspire.cmd,
          args: aspire.args || [],
          cwd: path.relative(repoPath, cwd) || ".",
          ok: allOk
        }
      ],
      healthchecks: results,
      ok: allOk
    };
  } finally {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

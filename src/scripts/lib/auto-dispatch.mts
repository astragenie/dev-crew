// auto-dispatch.mts — shared module for spawning role agents from loop CLI commands.
//
// Dispatch mechanism: acknowledges dispatch intent immediately and appends an
// audit log entry so callers can observe it. The marker-write path (pending-dispatch/
// directory) was deprecated per DEC-011 — no consumer is planned.

import fs from "node:fs/promises";
import path from "node:path";

export interface DispatchOpts {
  agent: string;
  prompt: string;
  parentCommand: string;
  repoRoot: string;
  argv?: string[];
  skipFlag?: string;
  costAdvisor?: () => { verdict: "ok" | "warn" | "stop" };
  sliceId?: string;
  featureId?: string | null;
}

export interface DispatchResult {
  ok: boolean;
  skipped: boolean;
  skipReason?: string;
  output?: string;
  error?: string;
  costUsd?: number;
  durationMs: number;
}

const AUDIT_LOG_REL = ".claude/artifacts/loop/auto-dispatch.jsonl";

export interface AuditLogOpts {
  config?: { loop?: { auditLogPath?: string } };
}

export function parseSkipFlag(argv: string[], flagName: string): boolean {
  return argv.includes(flagName);
}

export function resolveAuditLogPath(repoRoot: string, opts: AuditLogOpts = {}): string {
  const custom = opts.config?.loop?.auditLogPath;
  if (typeof custom === "string" && custom.length > 0) {
    return path.isAbsolute(custom) ? custom : path.join(repoRoot, custom);
  }
  return path.join(repoRoot, AUDIT_LOG_REL);
}

// Win 10: batch audit log writes — accumulate lines during a command invocation
// and flush once at the end via flushAuditLog().
interface PendingBatch {
  lines: string[];
  resolvedPath: string;
}
const pendingBatches = new Map<string, PendingBatch>();

export async function appendAuditLog(
  repoRoot: string,
  entry: object,
  opts: AuditLogOpts = {}
): Promise<void> {
  const logPath = resolveAuditLogPath(repoRoot, opts);
  const line = JSON.stringify(entry);
  let batch = pendingBatches.get(logPath);
  if (!batch) {
    batch = { lines: [], resolvedPath: logPath };
    pendingBatches.set(logPath, batch);
  }
  batch.lines.push(line);
}

/**
 * Flush all buffered audit log lines to disk in a single appendFile call.
 * Call once per command invocation at completion. Safe to call when no lines
 * are buffered (no-op). Clears the buffer after writing.
 */
export async function flushAuditLog(repoRoot: string, opts: AuditLogOpts = {}): Promise<void> {
  const logPath = resolveAuditLogPath(repoRoot, opts);
  const batch = pendingBatches.get(logPath);
  if (!batch || batch.lines.length === 0) return;
  await fs.mkdir(path.dirname(logPath), { recursive: true });
  await fs.appendFile(logPath, batch.lines.join("\n") + "\n", "utf8");
  pendingBatches.delete(logPath);
}

export async function dispatchAgent(opts: DispatchOpts): Promise<DispatchResult> {
  const { agent, parentCommand, repoRoot, argv = [], skipFlag, costAdvisor, sliceId, featureId } = opts;
  const start = Date.now();

  const buildAuditEntry = (
    partial: Omit<DispatchResult, "durationMs"> & { durationMs?: number }
  ) => ({
    timestamp: new Date().toISOString(),
    agent,
    parentCommand,
    costUsd: partial.costUsd ?? null,
    durationMs: partial.durationMs ?? Date.now() - start,
    ok: partial.ok,
    skipped: partial.skipped,
    skipReason: partial.skipReason ?? null
  });

  const emitEvent = async (event: import("./slice-events.mjs").SliceEvent) => {
    if (!sliceId) return;
    try {
      const { appendSliceEvent } = await import("./slice-events.mjs");
      await appendSliceEvent(repoRoot, sliceId, event);
    } catch {
      // best-effort
    }
  };

  const eventBase = {
    sliceId: sliceId ?? "",
    featureId: featureId ?? null,
    timestamp: new Date().toISOString()
  };

  if (skipFlag && parseSkipFlag(argv, skipFlag)) {
    const result: DispatchResult = {
      ok: true,
      skipped: true,
      skipReason: "opt-out",
      durationMs: 0
    };
    await appendAuditLog(repoRoot, buildAuditEntry(result));
    await emitEvent({
      type: "agent_completed",
      ...eventBase,
      agent,
      status: "skipped",
      reason: "opt-out",
      durationMs: 0
    });
    return result;
  }

  await emitEvent({
    type: "agent_dispatched",
    ...eventBase,
    agent,
    parentCommand
  });

  try {
    // Cost-advisor check: warn but never block dispatch per FEAT-028 design decision.
    if (costAdvisor) {
      const { verdict } = costAdvisor();
      if (verdict === "warn" || verdict === "stop") {
        console.warn(`[auto-dispatch] cost-warn proceeding anyway: ${verdict}`);
      }
    }

    const durationMs = Date.now() - start;
    const result: DispatchResult = {
      ok: true,
      skipped: false,
      output: "<dispatch-acknowledged>",
      durationMs
    };
    await appendAuditLog(repoRoot, buildAuditEntry(result));
    await emitEvent({
      type: "agent_completed",
      ...eventBase,
      timestamp: new Date().toISOString(),
      agent,
      status: "ok",
      durationMs
    });
    return result;
  } catch (err) {
    const durationMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    const result: DispatchResult = { ok: false, skipped: false, error, durationMs };
    await appendAuditLog(repoRoot, buildAuditEntry(result));
    await emitEvent({
      type: "agent_error",
      ...eventBase,
      timestamp: new Date().toISOString(),
      agent,
      error
    });
    return result;
  }
}

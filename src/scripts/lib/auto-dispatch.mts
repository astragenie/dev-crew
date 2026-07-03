// auto-dispatch.mts — shared module for spawning role agents from loop CLI commands.
//
// Dispatch mechanism: acknowledges dispatch intent immediately and appends an
// audit log entry so callers can observe it. The marker-write path (pending-dispatch/
// directory) was deprecated per DEC-011 — no consumer is planned.

import path from "node:path";

import { fanoutEnvelope } from "./webhook-fanout.mjs";
import { appendJsonlBatch } from "./jsonl-append.mjs";

export type DispatchKind = "auto" | "manual" | "wave" | "hierarchical";

const VALID_DISPATCH_KINDS = new Set<string>(["auto", "manual", "wave", "hierarchical"]);

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
  stepType?: string;
  inputTokens?: number | null;
  outputTokens?: number | null;
  dispatchKind?: DispatchKind | null;
  iterationIndex?: number;
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

// Win 10: batch audit log writes — accumulate entries during a command
// invocation and flush once at the end via flushAuditLog(). The batch write
// itself (mkdir + one appendFile call for every buffered line) is delegated
// to the shared appendJsonlBatch helper; the queue-then-flush shape stays
// local since it's orchestration, not JSONL-write mechanics.
interface PendingBatch {
  records: Record<string, unknown>[];
  resolvedPath: string;
}
const pendingBatches = new Map<string, PendingBatch>();

export async function appendAuditLog(
  repoRoot: string,
  entry: object,
  opts: AuditLogOpts = {}
): Promise<void> {
  const logPath = resolveAuditLogPath(repoRoot, opts);
  let batch = pendingBatches.get(logPath);
  if (!batch) {
    batch = { records: [], resolvedPath: logPath };
    pendingBatches.set(logPath, batch);
  }
  batch.records.push(entry as Record<string, unknown>);
}

/**
 * Flush all buffered audit log entries to disk in a single appendFile call.
 * Call once per command invocation at completion. Safe to call when no
 * entries are buffered (no-op). Clears the buffer after writing.
 *
 * L3-2: After the JSONL append succeeds, fan out one webhook envelope per
 * entry as kind `agent.dispatch`. If the JSONL write fails, no fanout happens
 * (entries stay in the buffer until next flush per the existing contract).
 * Each fanout is best-effort and fail-silent — handled by fanoutEnvelope.
 */
export async function flushAuditLog(repoRoot: string, opts: AuditLogOpts = {}): Promise<void> {
  const logPath = resolveAuditLogPath(repoRoot, opts);
  const batch = pendingBatches.get(logPath);
  if (!batch || batch.records.length === 0) return;
  const flushedRecords = batch.records.slice();
  pendingBatches.delete(logPath);
  await appendJsonlBatch(logPath, flushedRecords);

  for (const entry of flushedRecords) {
    await fanoutEnvelope(repoRoot, "agent.dispatch", entry);
  }
}

function resolveDispatchKind(raw: DispatchKind | null | undefined): DispatchKind | null {
  if (raw === undefined || raw === null) return null;
  if (VALID_DISPATCH_KINDS.has(raw)) return raw as DispatchKind;
  console.warn(`[auto-dispatch] unknown dispatchKind "${raw}" — coercing to null`);
  return null;
}

function resolveIterationIndex(raw: number | undefined): number {
  if (raw === undefined) return 0;
  if (raw < 0) {
    console.warn(`[auto-dispatch] negative iterationIndex (${raw}) — clamping to 0`);
    return 0;
  }
  return raw;
}

export async function dispatchAgent(opts: DispatchOpts): Promise<DispatchResult> {
  const {
    agent,
    parentCommand,
    repoRoot,
    argv = [],
    skipFlag,
    costAdvisor,
    sliceId,
    featureId,
    stepType: optsStepType,
    inputTokens: optsInputTokens,
    outputTokens: optsOutputTokens,
    dispatchKind: rawDispatchKind,
    iterationIndex: rawIterationIndex
  } = opts;

  const optsDispatchKind = resolveDispatchKind(rawDispatchKind);
  const optsIterationIndex = resolveIterationIndex(rawIterationIndex);
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
    skipReason: partial.skipReason ?? null,
    stepType: optsStepType ?? "dispatch",
    inputTokens: optsInputTokens ?? null,
    outputTokens: optsOutputTokens ?? null,
    dispatchKind: optsDispatchKind,
    iterationIndex: optsIterationIndex,
    sliceId: opts.sliceId ?? null
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
    parentCommand,
    // L3-1: populate dispatchedAt so downstream consumers can compute
    // wait→start latency without re-deriving from the JSONL row timestamp.
    dispatchedAt: eventBase.timestamp
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

// auto-dispatch.mts — shared module for spawning role agents from loop CLI commands.
//
// Dispatch mechanism: acknowledges dispatch intent immediately and appends an
// audit log entry so callers can observe it. The marker-write path (pending-dispatch/
// directory) was deprecated per DEC-011 — no consumer is planned.
import fs from "node:fs/promises";
import path from "node:path";
const AUDIT_LOG_REL = ".claude/artifacts/loop/auto-dispatch.jsonl";
export function parseSkipFlag(argv, flagName) {
    return argv.includes(flagName);
}
export function resolveAuditLogPath(repoRoot, opts = {}) {
    const custom = opts.config?.loop?.auditLogPath;
    if (typeof custom === "string" && custom.length > 0) {
        return path.isAbsolute(custom) ? custom : path.join(repoRoot, custom);
    }
    return path.join(repoRoot, AUDIT_LOG_REL);
}
const pendingBatches = new Map();
export async function appendAuditLog(repoRoot, entry, opts = {}) {
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
export async function flushAuditLog(repoRoot, opts = {}) {
    const logPath = resolveAuditLogPath(repoRoot, opts);
    const batch = pendingBatches.get(logPath);
    if (!batch || batch.lines.length === 0)
        return;
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, batch.lines.join("\n") + "\n", "utf8");
    pendingBatches.delete(logPath);
}
export async function dispatchAgent(opts) {
    const { agent, parentCommand, repoRoot, argv = [], skipFlag, costAdvisor } = opts;
    const start = Date.now();
    const buildAuditEntry = (partial) => ({
        timestamp: new Date().toISOString(),
        agent,
        parentCommand,
        costUsd: partial.costUsd ?? null,
        durationMs: partial.durationMs ?? Date.now() - start,
        ok: partial.ok,
        skipped: partial.skipped,
        skipReason: partial.skipReason ?? null
    });
    // Opt-out: if caller provided a skip flag and it appears in argv, short-circuit.
    if (skipFlag && parseSkipFlag(argv, skipFlag)) {
        const result = {
            ok: true,
            skipped: true,
            skipReason: "opt-out",
            durationMs: 0
        };
        await appendAuditLog(repoRoot, buildAuditEntry(result));
        return result;
    }
    try {
        // Cost-advisor check: warn but never block dispatch per FEAT-028 design decision.
        if (costAdvisor) {
            const { verdict } = costAdvisor();
            if (verdict === "warn" || verdict === "stop") {
                console.warn(`[auto-dispatch] cost-warn proceeding anyway: ${verdict}`);
            }
        }
        const durationMs = Date.now() - start;
        const result = {
            ok: true,
            skipped: false,
            output: "<dispatch-acknowledged>",
            durationMs
        };
        await appendAuditLog(repoRoot, buildAuditEntry(result));
        return result;
    }
    catch (err) {
        const durationMs = Date.now() - start;
        const error = err instanceof Error ? err.message : String(err);
        const result = { ok: false, skipped: false, error, durationMs };
        await appendAuditLog(repoRoot, buildAuditEntry(result));
        return result;
    }
}

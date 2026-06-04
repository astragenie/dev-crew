// auto-dispatch.mts — shared module for spawning role agents from loop CLI commands.
//
// Dispatch mechanism: writes a pending-dispatch.json marker file under
// <repoRoot>/.claude/artifacts/loop/pending-dispatch/<timestamp>-<agent>.json
// that an outer harness or future SLICE-D picks up. The function returns
// immediately after writing the marker so CLI commands stay non-blocking.
// SLICE-B/C/D will wire real harness consumption; the marker approach is the
// simplest correct contract that lets callers observe dispatch intent
// without requiring an actual sub-process in this scaffolding slice.
import fs from "node:fs/promises";
import path from "node:path";
const AUDIT_LOG_REL = ".claude/artifacts/loop/auto-dispatch.jsonl";
const PENDING_DISPATCH_REL = ".claude/artifacts/loop/pending-dispatch";
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
export async function appendAuditLog(repoRoot, entry, opts = {}) {
    const logPath = resolveAuditLogPath(repoRoot, opts);
    await fs.mkdir(path.dirname(logPath), { recursive: true });
    await fs.appendFile(logPath, JSON.stringify(entry) + "\n", "utf8");
}
export async function dispatchAgent(opts) {
    const { agent, prompt, parentCommand, repoRoot, argv = [], skipFlag, costAdvisor } = opts;
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
        // Write marker file so the outer harness can pick up and execute the dispatch.
        const dispatchDir = path.join(repoRoot, PENDING_DISPATCH_REL);
        await fs.mkdir(dispatchDir, { recursive: true });
        const markerName = `${Date.now()}-${agent.replace(/[^A-Za-z0-9]/g, "-")}.json`;
        const markerPath = path.join(dispatchDir, markerName);
        await fs.writeFile(markerPath, JSON.stringify({ agent, prompt, parentCommand, createdAt: new Date().toISOString() }), "utf8");
        const durationMs = Date.now() - start;
        const result = {
            ok: true,
            skipped: false,
            output: `<marker-written:${path.relative(repoRoot, markerPath).replace(/\\/g, "/")}>`,
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

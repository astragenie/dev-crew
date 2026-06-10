// Loop-side surrogate halt-badge for the upstream check-redundant-read hook
// (hero-crew plugin). Reads the per-session cost-hygiene state file that the
// upstream hook already populates, counts read_count per file path, and
// returns a halt signal when any path's read_count exceeds the configured
// threshold.
//
// Mirrors the cost-regression / slice-cost-ceiling pattern: fail-open
// evaluator that returns a structured signal on trigger and null otherwise.
// stop-conditions.mts wires this into the snapshot + reasons array; the
// renderer in halt-badges.mts surfaces it via `loop brief --explain-halts`.
//
// The upstream hook owns lifecycle of the state files; loop only reads.
//
// Filed against FEAT-057 / SLICE-67. Companion to the still-pending upstream
// request `docs/upstream-requests/2026-06-06-hero-crew-redundant-read-hook-deny.md`.
import fs from "node:fs/promises";
import path from "node:path";
import { isEnabled } from "./features-service.mjs";
export const DEFAULT_REDUNDANT_READ_CAP = 5;
// Sessions whose state hasn't been touched in this many hours are dead — a
// halt signal from them would block the loop forever (the offending session
// can no longer "stop"). Override via loop.redundantReadStaleHours.
export const DEFAULT_REDUNDANT_READ_STALE_HOURS = 6;
const STATE_DIR_REL = path.join(".claude", "state", "cost-hygiene");
function resolveThreshold(config) {
    const raw = config?.loop?.redundantReadCap;
    return typeof raw === "number" && Number.isInteger(raw) && raw > 0
        ? raw
        : DEFAULT_REDUNDANT_READ_CAP;
}
function resolveStaleHours(config) {
    const raw = config?.loop?.redundantReadStaleHours;
    return typeof raw === "number" && Number.isFinite(raw) && raw > 0
        ? raw
        : DEFAULT_REDUNDANT_READ_STALE_HOURS;
}
/**
 * A session is stale when its last_seen is parseable and older than the
 * staleness window. Missing/unparseable last_seen counts as fresh — older
 * hook versions don't write the field, and fail-open there would silence
 * the gate entirely for them.
 */
function isStaleSession(state, staleHours, nowMs) {
    if (typeof state.last_seen !== "string")
        return false;
    const seen = Date.parse(state.last_seen);
    if (Number.isNaN(seen))
        return false;
    return nowMs - seen > staleHours * 3_600_000;
}
/** Read all *.json session state files. Fail-open on any I/O error. */
async function readAllSessionStates(stateDir) {
    let names;
    try {
        names = await fs.readdir(stateDir);
    }
    catch {
        return [];
    }
    const results = [];
    for (const name of names) {
        if (!name.endsWith(".json"))
            continue;
        if (name.includes(".json.tmp."))
            continue; // skip in-flight writes
        const sessionId = name.slice(0, -".json".length);
        try {
            const raw = await fs.readFile(path.join(stateDir, name), "utf8");
            const parsed = JSON.parse(raw);
            if (parsed &&
                typeof parsed === "object" &&
                parsed.entries &&
                typeof parsed.entries === "object") {
                results.push({ sessionId, state: parsed });
            }
        }
        catch {
            // best-effort: skip unreadable / unparseable files
        }
    }
    return results;
}
/**
 * Fail-open evaluator. Returns null when:
 *   - redundant-read-stop feature is disabled (gate off),
 *   - cost-hygiene state directory absent (hook never ran),
 *   - directory empty,
 *   - no entry exceeds the threshold.
 *
 * Returns a RedundantReadSignal when ANY entry has read_count > threshold.
 * Picks the single worst offender (max read_count) for the signal body and
 * reports the total count of offending paths.
 *
 * Sessions whose last_seen is older than loop.redundantReadStaleHours
 * (default 6h) are ignored — they ended; halting the loop on their behalf
 * would block it permanently.
 */
export async function checkRedundantReadStop(repoPath, config, nowMs = Date.now()) {
    // Check if the feature is enabled via the features service. If disabled,
    // gate off regardless of redundantReadCap.
    if (!isEnabled("redundant-read-stop", config)) {
        return null;
    }
    const threshold = resolveThreshold(config);
    const staleHours = resolveStaleHours(config);
    const stateDir = path.join(repoPath, STATE_DIR_REL);
    const sessions = await readAllSessionStates(stateDir);
    if (sessions.length === 0)
        return null;
    let worst = null;
    let offendingPathCount = 0;
    for (const { sessionId, state } of sessions) {
        if (isStaleSession(state, staleHours, nowMs))
            continue;
        for (const [filePath, entry] of Object.entries(state.entries)) {
            const count = typeof entry?.read_count === "number" ? entry.read_count : 0;
            if (count <= threshold)
                continue;
            offendingPathCount += 1;
            if (!worst || count > worst.count) {
                worst = { sessionId, path: filePath, count };
            }
        }
    }
    if (!worst)
        return null;
    return {
        triggered: true,
        maxReadCount: worst.count,
        path: worst.path,
        sessionId: worst.sessionId,
        threshold,
        offendingPathCount
    };
}

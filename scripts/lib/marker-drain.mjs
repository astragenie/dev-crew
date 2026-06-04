// marker-drain.mts — drains stale pending-dispatch marker files at slice-complete.
//
// Marker files accumulate under <repoRoot>/.claude/artifacts/loop/pending-dispatch/
// with no cleanup consumer (surfaced by SLICE-23/27/28 grades). This module
// removes files older than a configurable TTL (default 24 h).
//
// Safety: only operates on filenames matching MARKER_PATTERN. Any file whose
// name does not match is skipped — never deleted.
import fs from "node:fs/promises";
import path from "node:path";
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_DISPATCH_REL = ".claude/artifacts/loop/pending-dispatch";
// Filename must be: 13+ decimal digits, hyphen, lowercase-starting identifier, .json
const MARKER_PATTERN = /^\d{13,}-[a-z][\w-]*\.json$/;
/**
 * Parse the leading millisecond timestamp from a marker filename of the form
 * `<ts>-<agent>.json`. Returns null when the filename does not match.
 */
export function parseMarkerTimestamp(filename) {
    if (!MARKER_PATTERN.test(filename))
        return null;
    const dashIdx = filename.indexOf("-");
    const ts = Number(filename.slice(0, dashIdx));
    return Number.isFinite(ts) ? ts : null;
}
export async function drainPendingDispatchMarkers(repoPath, opts) {
    const ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
    const now = opts?.now ?? Date.now();
    const dispatchDir = path.join(repoPath, PENDING_DISPATCH_REL);
    const result = { scanned: 0, deleted: 0, kept: 0, errors: [] };
    let entries;
    try {
        entries = await fs.readdir(dispatchDir);
    }
    catch (err) {
        if (err?.code === "ENOENT")
            return result;
        throw err;
    }
    for (const entry of entries) {
        const ts = parseMarkerTimestamp(entry);
        if (ts === null)
            continue; // skip non-matching files
        result.scanned++;
        const age = now - ts;
        if (age <= ttlMs) {
            result.kept++;
            continue;
        }
        try {
            await fs.unlink(path.join(dispatchDir, entry));
            result.deleted++;
        }
        catch (unlinkErr) {
            result.errors.push({
                file: entry,
                error: unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr)
            });
        }
    }
    return result;
}

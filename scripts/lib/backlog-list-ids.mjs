/**
 * backlog-list-ids — deterministic enumeration of pending FEAT ids from disk.
 *
 * Used by the /loop:triage skill to hand PM an explicit id list, so PM cannot
 * score features that do not exist (structural anti-hallucination guard).
 */
import { listBacklog, filterBacklog } from "./backlog-parser.mjs";
export async function listPendingFeatureIds(repoPath) {
    const entries = await listBacklog(repoPath);
    const pending = filterBacklog(entries, { status: "pending" });
    return pending.map((e) => String(e.id));
}

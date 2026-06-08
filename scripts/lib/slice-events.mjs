import fs from "node:fs/promises";
import path from "node:path";
import { TRAJECTORY_DIR } from "./trajectory-writer.mjs";
/** Absolute path to the events file for a slice. */
export function eventsPath(repoRoot, sliceId) {
    return path.join(repoRoot, TRAJECTORY_DIR, `${sliceId}-events.jsonl`);
}
/**
 * Append one event to the slice events JSONL.
 * Creates file + directory on first call. Never throws — best-effort.
 */
export async function appendSliceEvent(repoRoot, sliceId, event) {
    try {
        const filePath = eventsPath(repoRoot, sliceId);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.appendFile(filePath, JSON.stringify(event) + "\n");
    }
    catch (err) {
        console.warn(`[slice-events] write failed (${sliceId}): ${err instanceof Error ? err.message : String(err)}`);
    }
}

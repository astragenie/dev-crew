import fs from "node:fs/promises";
import path from "node:path";
export const TRAJECTORY_DIR = ".claude/artifacts/loop/trajectories";
/** Absolute path to the trajectory file for a slice. */
export function trajectoryPath(repoPath, sliceId) {
    return path.join(repoPath, TRAJECTORY_DIR, `${sliceId}-trajectory.jsonl`);
}
const _buffer = new Map();
/**
 * Buffer one step record for the slice trajectory JSONL.
 * Does NOT write to disk immediately — call flushTrajectory to persist.
 * Never throws — returns false on error.
 */
export async function recordStep(repoPath, sliceId, type, data) {
    try {
        const key = `${repoPath}:${sliceId}`;
        const line = JSON.stringify({ type, sliceId, timestamp: new Date().toISOString(), ...data });
        const buf = _buffer.get(key) ?? [];
        buf.push(line);
        _buffer.set(key, buf);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Flush all buffered step records for a slice to disk in a single appendFile call.
 * Clears the buffer after a successful write.
 * No-ops if buffer is empty. Never throws — returns false on error.
 */
export async function flushTrajectory(repoPath, sliceId) {
    const key = `${repoPath}:${sliceId}`;
    const lines = _buffer.get(key);
    if (!lines || lines.length === 0)
        return true;
    try {
        const filePath = trajectoryPath(repoPath, sliceId);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.appendFile(filePath, lines.join("\n") + "\n");
        _buffer.delete(key);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Read all step records from a slice trajectory file.
 * Returns [] if file does not exist.
 */
export async function readTrajectory(repoPath, sliceId) {
    try {
        const filePath = trajectoryPath(repoPath, sliceId);
        const raw = await fs.readFile(filePath, "utf8");
        return raw
            .split("\n")
            .filter(Boolean)
            .map((line) => JSON.parse(line));
    }
    catch {
        return [];
    }
}

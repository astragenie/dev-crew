import fs from "node:fs/promises";
import path from "node:path";

export const TRAJECTORY_DIR = ".claude/artifacts/loop/trajectories";

/** Absolute path to the trajectory file for a slice. */
export function trajectoryPath(repoPath: string, sliceId: string): string {
  return path.join(repoPath, TRAJECTORY_DIR, `${sliceId}-trajectory.jsonl`);
}

/**
 * Append one step record to the slice trajectory JSONL.
 * Creates the file + directory on first call. Never throws — returns false on error.
 */
export async function recordStep(
  repoPath: string,
  sliceId: string,
  type: string,
  data: Record<string, unknown>
): Promise<boolean> {
  try {
    const filePath = trajectoryPath(repoPath, sliceId);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const line = JSON.stringify({ type, sliceId, timestamp: new Date().toISOString(), ...data });
    await fs.appendFile(filePath, line + "\n");
    return true;
  } catch {
    return false;
  }
}

/**
 * Read all step records from a slice trajectory file.
 * Returns [] if file does not exist.
 */
export async function readTrajectory(
  repoPath: string,
  sliceId: string
): Promise<Record<string, unknown>[]> {
  try {
    const filePath = trajectoryPath(repoPath, sliceId);
    const raw = await fs.readFile(filePath, "utf8");
    return raw
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

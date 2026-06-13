import fs from "node:fs/promises";
import path from "node:path";

export interface StuckDetectedSignal {
  sliceId: string;
  attempts: number;
  threshold: number;
  lastAttemptAt: string;
}

const STUCK_FILE_REL = path.join(".claude", "state", "loop", "stuck-detector.json");

export async function checkStuckDetector(repoPath: string): Promise<StuckDetectedSignal | null> {
  const filePath = path.join(repoPath, STUCK_FILE_REL);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    Array.isArray(parsed) ||
    typeof (parsed as any).sliceId !== "string" ||
    typeof (parsed as any).attempts !== "number"
  ) {
    return null;
  }
  const obj = parsed as Record<string, unknown>;

  // Read threshold from loop.json
  let threshold = 3;
  try {
    const loopCfgPath = path.join(repoPath, ".claude", "loop.json");
    const cfgRaw = await fs.readFile(loopCfgPath, "utf8");
    const cfg = JSON.parse(cfgRaw);
    if (typeof cfg?.loop?.stuckDetectorThreshold === "number") {
      threshold = cfg.loop.stuckDetectorThreshold;
    }
  } catch {
    /* use default */
  }

  const attempts = obj.attempts as number;
  if (attempts < threshold) return null;
  return {
    sliceId: obj.sliceId as string,
    attempts,
    threshold,
    lastAttemptAt: typeof obj.lastAttemptAt === "string" ? obj.lastAttemptAt : ""
  };
}
